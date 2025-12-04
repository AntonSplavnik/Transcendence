import { Scene, MeshBuilder, StandardMaterial, Texture, Mesh, Color3, Vector3 } from '@babylonjs/core'
import { gridToWorld } from '../utils/grid'

export class Fountain {
  mesh: Mesh
  activationCircle: Mesh // Cercle bleu en pointillé pour montrer la zone
  gridPos: { x: number, y: number }
  hasCharge: boolean = true // La fontaine a une charge
  isActivating: boolean = false // Le joueur est en train d'activer
  activationStartTime: number = 0 // Quand l'activation a commencé
  readonly ACTIVATION_TIME = 2000 // 2 secondes pour activer
  readonly ACTIVATION_RADIUS = 1.5 // Rayon d'activation en tiles (plus grand = 1.5 tiles)

  constructor(scene: Scene, gridX: number, gridY: number) {
    // Stocker d'abord la position grid
    this.gridPos = { x: gridX, y: gridY }

    // Créer un plan billboard pour la fontaine
    this.mesh = MeshBuilder.CreatePlane(`fountain_${Math.random()}`, { size: 0.9 }, scene)
    this.mesh.position = gridToWorld(gridX, gridY)
    this.mesh.position.y = 0.45 // Surélevé comme les coffres
    this.mesh.billboardMode = Mesh.BILLBOARDMODE_ALL

    // Matériau avec texture
    const material = new StandardMaterial(`fountainMat_${Math.random()}`, scene)
    const texture = new Texture('/assets/fountain.png', scene)
    texture.hasAlpha = true
    material.diffuseTexture = texture
    material.useAlphaFromDiffuseTexture = true
    material.backFaceCulling = false
    
    // Effet lumineux bleu pour la fontaine (eau magique)
    material.emissiveColor = new Color3(0.2, 0.5, 1.0) // Bleu lumineux
    material.emissiveTexture = texture
    
    this.mesh.material = material

    // Créer le cercle d'activation
    this.activationCircle = this.createActivationCircle(scene)
  }

  private createActivationCircle(scene: Scene): Mesh {
    // Créer un cercle simple au sol
    const worldPos = gridToWorld(this.gridPos.x, this.gridPos.y)
    
    // Créer un cercle avec CreateLines
    const points: Vector3[] = []
    const segments = 32
    
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const x = worldPos.x + Math.cos(angle) * this.ACTIVATION_RADIUS
      const z = worldPos.z + Math.sin(angle) * this.ACTIVATION_RADIUS
      points.push(new Vector3(x, 0.02, z))
    }
    
    const circle = MeshBuilder.CreateLines(`fountainCircle_${Math.random()}`, { 
      points: points
    }, scene)
    circle.color = new Color3(0.3, 0.7, 1.0) // Bleu clair
    circle.isPickable = false
    
    return circle
  }

  // Vérifier si le joueur est dans la zone d'activation (rayon élargi)
  checkPlayerProximity(playerGridPos: { x: number, y: number }): boolean {
    const dx = playerGridPos.x - this.gridPos.x
    const dy = playerGridPos.y - this.gridPos.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    return distance <= this.ACTIVATION_RADIUS
  }

  // Démarrer l'activation (le joueur arrive sur la fontaine)
  startActivation() {
    if (!this.hasCharge) return false
    
    this.isActivating = true
    this.activationStartTime = Date.now()
    console.log('💧 Activation de la fontaine commencée...')
    return true
  }

  // Annuler l'activation (le joueur quitte la fontaine)
  cancelActivation() {
    if (this.isActivating) {
      console.log('❌ Activation de la fontaine annulée')
      this.isActivating = false
      this.activationStartTime = 0
    }
  }

  // Mettre à jour l'état de l'activation
  update(): { completed: boolean, progress: number } {
    if (!this.isActivating || !this.hasCharge) {
      return { completed: false, progress: 0 }
    }

    const elapsed = Date.now() - this.activationStartTime
    const progress = Math.min(elapsed / this.ACTIVATION_TIME, 1.0)

    if (elapsed >= this.ACTIVATION_TIME) {
      // Activation complète !
      this.hasCharge = false
      this.isActivating = false
      
      // Changer l'apparence de la fontaine (désactivée)
      if (this.mesh.material && 'emissiveColor' in this.mesh.material) {
        this.mesh.material.emissiveColor = new Color3(0.1, 0.1, 0.1) // Gris foncé
      }
      if (this.mesh.material && 'alpha' in this.mesh.material) {
        this.mesh.material.alpha = 0.5 // Semi-transparent
      }
      
      // Cacher le cercle d'activation
      this.activationCircle.isVisible = false
      
      console.log('✅ Fontaine activée ! PVs restaurés.')
      return { completed: true, progress: 1.0 }
    }

    return { completed: false, progress }
  }

  getActivationProgress(): number {
    if (!this.isActivating) return 0
    const elapsed = Date.now() - this.activationStartTime
    return Math.min(elapsed / this.ACTIVATION_TIME, 1.0)
  }

  dispose() {
    this.mesh.dispose()
    this.activationCircle.dispose()
  }
}
