import { Scene, MeshBuilder, StandardMaterial, Mesh, Texture, Color3, Vector3 } from '@babylonjs/core'
import { gridToWorld } from '../utils/grid'

export type WeaponDrop = 'melee' | 'orb'

export class Chest {
  mesh: Mesh
  activationCircle: Mesh
  gridPos: { x: number, y: number }
  opened: boolean = false
  isActivating: boolean = false
  activationStartTime: number = 0
  readonly ACTIVATION_TIME = 2000 // 2 secondes pour ouvrir
  readonly ACTIVATION_RADIUS = 1.5 // Rayon d'activation en tiles
  weaponDrop: WeaponDrop // Quelle arme ce coffre contient

  constructor(scene: Scene, gridX: number, gridY: number, weaponDrop?: WeaponDrop) {
    this.gridPos = { x: gridX, y: gridY }
    
    // Utiliser l'arme fournie ou en déterminer une aléatoirement
    this.weaponDrop = weaponDrop ?? (Math.random() < 0.5 ? 'melee' : 'orb')
    
    // Create mesh - using a plane for 2D sprite
    this.mesh = MeshBuilder.CreatePlane(`chest_${Math.random()}`, { size: 0.7 }, scene)
    this.mesh.position = gridToWorld(gridX, gridY)
    this.mesh.position.y = 0.45 // Légèrement au-dessus du sol
    this.mesh.billboardMode = Mesh.BILLBOARDMODE_ALL // Always face camera

    // Material with texture
    const material = new StandardMaterial(`chestMat_${Math.random()}`, scene)
    const texture = new Texture('/assets/chest.png', scene)
    texture.hasAlpha = true // Support transparency
    material.diffuseTexture = texture
    material.useAlphaFromDiffuseTexture = true
    material.backFaceCulling = false // Visible from both sides
    material.emissiveColor = new Color3(0.8, 0.6, 0.2) // Lueur dorée
    this.mesh.material = material

    // Créer le cercle d'activation
    this.activationCircle = this.createActivationCircle(scene)
  }

  private createActivationCircle(scene: Scene): Mesh {
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
    
    const circle = MeshBuilder.CreateLines(`chestCircle_${Math.random()}`, { 
      points: points
    }, scene)
    circle.color = new Color3(1.0, 0.8, 0.2) // Doré
    circle.isPickable = false
    
    return circle
  }

  // Vérifier si le joueur est dans la zone d'activation
  checkPlayerProximity(playerGridPos: { x: number, y: number }): boolean {
    const dx = playerGridPos.x - this.gridPos.x
    const dy = playerGridPos.y - this.gridPos.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    return distance <= this.ACTIVATION_RADIUS
  }

  // Démarrer l'activation
  startActivation() {
    if (this.opened) return false
    
    this.isActivating = true
    this.activationStartTime = Date.now()
    console.log('💰 Ouverture du coffre commencée...')
    return true
  }

  // Annuler l'activation
  cancelActivation() {
    if (this.isActivating) {
      console.log('❌ Ouverture du coffre annulée')
      this.isActivating = false
      this.activationStartTime = 0
    }
  }

  // Mettre à jour l'état de l'activation
  update(): { completed: boolean, progress: number, weaponDrop?: WeaponDrop } {
    if (!this.isActivating || this.opened) {
      return { completed: false, progress: 0 }
    }

    const elapsed = Date.now() - this.activationStartTime
    const progress = Math.min(elapsed / this.ACTIVATION_TIME, 1.0)

    if (elapsed >= this.ACTIVATION_TIME) {
      // Ouverture complète !
      this.opened = true
      this.isActivating = false
      
      // Changer la texture pour montrer un coffre ouvert
      if (this.mesh.material && this.mesh.material instanceof StandardMaterial) {
        const openTexture = new Texture('/assets/chest_open.png', this.mesh.material.getScene())
        openTexture.hasAlpha = true
        this.mesh.material.diffuseTexture = openTexture
        this.mesh.material.emissiveColor = new Color3(0.3, 0.3, 0.2) // Lueur réduite
      }
      
      // Cacher le cercle d'activation
      this.activationCircle.isVisible = false
      
      const weaponName = this.weaponDrop === 'melee' ? 'Épée' : 'Baguette Magique'
      console.log(`✅ Coffre ouvert ! Arme obtenue: ${weaponName}`)
      return { completed: true, progress: 1.0, weaponDrop: this.weaponDrop }
    }

    return { completed: false, progress }
  }

  getActivationProgress(): number {
    if (!this.isActivating) return 0
    const elapsed = Date.now() - this.activationStartTime
    return Math.min(elapsed / this.ACTIVATION_TIME, 1.0)
  }

  isOpened(): boolean {
    return this.opened
  }

  dispose() {
    this.mesh.dispose()
    this.activationCircle.dispose()
  }
}
