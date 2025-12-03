import { Scene, MeshBuilder, StandardMaterial, Color3, Mesh, Vector3, Texture, DynamicTexture } from '@babylonjs/core'
import { gridToWorld, worldToGrid } from '../utils/grid'
import type { MapGenerator } from '../world/MapGenerator'
import * as ROT from 'rot-js'

// Classe pour gérer les textes de dégâts flottants
class DamageText {
  mesh: Mesh
  lifetime: number = 0
  maxLifetime: number = 1000 // 1 seconde
  velocity: Vector3 = new Vector3(0, 0.01, 0) // Vitesse de montée

  constructor(scene: Scene, position: Vector3, damage: number) {
    // Créer un plan pour afficher le texte
    this.mesh = MeshBuilder.CreatePlane('damageText', { size: 0.5 }, scene)
    this.mesh.position = position.clone()
    this.mesh.position.y += 0.3 // Au-dessus de l'ennemi
    this.mesh.billboardMode = Mesh.BILLBOARDMODE_ALL

    // Créer une texture dynamique pour écrire le texte
    const texture = new DynamicTexture('damageTexture', 256, scene, false)
    const material = new StandardMaterial('damageMat', scene)
    
    // Configurer le texte
    const ctx = texture.getContext()
    texture.clear()
    
    // Dessiner le texte
    const canvas2D = ctx as CanvasRenderingContext2D
    canvas2D.font = 'bold 120px Arial'
    canvas2D.fillStyle = '#ff3333'
    canvas2D.strokeStyle = '#000000'
    canvas2D.lineWidth = 50
    canvas2D.textAlign = 'center'
    canvas2D.textBaseline = 'middle'
    
    const text = `-${damage}`
    canvas2D.strokeText(text, 128, 128)
    canvas2D.fillText(text, 128, 128)
    
    texture.update()
    
    material.diffuseTexture = texture
    material.emissiveTexture = texture
    material.useAlphaFromDiffuseTexture = true
    material.opacityTexture = texture
    this.mesh.material = material
  }

  update(deltaTime: number): boolean {
    this.lifetime += deltaTime

    // Animer le mouvement vers le haut
    this.mesh.position.addInPlace(this.velocity)

    // Calculer l'opacité (fade out)
    const progress = this.lifetime / this.maxLifetime
    if (this.mesh.material && 'alpha' in this.mesh.material) {
      this.mesh.material.alpha = 1 - progress
    }

    // Retourner true si le texte doit être supprimé
    return this.lifetime >= this.maxLifetime
  }

  dispose() {
    if (this.mesh.material) {
      this.mesh.material.dispose()
    }
    this.mesh.dispose()
  }
}

export class Enemy {
  mesh: Mesh
  gridPos: { x: number, y: number }
  hp: number
  maxHp: number
  speed: number = 0.02
  scene: Scene // Stocker la scène pour créer les damage texts
  damageTexts: DamageText[] = [] // Liste des textes de dégâts actifs
  
  // Pathfinding
  private path: number[][] = [] // Chemin calculé [x, y][]
  private pathUpdateCooldown: number = 0
  private readonly PATH_UPDATE_INTERVAL = 500 // Recalculer le chemin toutes les 500ms
  
  // Barre de vie
  private healthBarBackground!: Mesh
  private healthBarFill!: Mesh
  private readonly barWidth = 0.6
  private readonly barHeight = 0.06
  private readonly barYOffset = 0.4 // Au-dessus de l'ennemi

  constructor(scene: Scene, gridX: number, gridY: number, hp: number = 30) {
    this.scene = scene
    // Create mesh - using a plane instead of sphere for 2D sprite
    this.mesh = MeshBuilder.CreatePlane(`enemy_${Math.random()}`, { size: 0.8 }, scene)
    this.mesh.position = gridToWorld(gridX, gridY)
    this.mesh.billboardMode = Mesh.BILLBOARDMODE_ALL // Always face camera

    // Material with texture
    const material = new StandardMaterial(`enemyMat_${Math.random()}`, scene)
    const texture = new Texture('/assets/enemy.png', scene)
    texture.hasAlpha = true // Support transparency
    material.diffuseTexture = texture
    material.useAlphaFromDiffuseTexture = true
    material.backFaceCulling = false // Visible from both sides
    this.mesh.material = material

    // Initial state
    this.gridPos = { x: gridX, y: gridY }
    this.hp = hp
    this.maxHp = hp

    // Créer la barre de vie
    this.createHealthBar(scene)
  }

  private createHealthBar(scene: Scene) {
    // Fond de la barre (gris foncé)
    this.healthBarBackground = MeshBuilder.CreatePlane(
      'healthBarBg',
      { width: this.barWidth, height: this.barHeight },
      scene
    )
    const bgMat = new StandardMaterial('healthBarBgMat', scene)
    bgMat.diffuseColor = new Color3(0.2, 0.2, 0.2)
    bgMat.emissiveColor = new Color3(0.2, 0.2, 0.2)
    this.healthBarBackground.material = bgMat
    this.healthBarBackground.billboardMode = Mesh.BILLBOARDMODE_ALL
    
    // Barre de remplissage (rouge)
    this.healthBarFill = MeshBuilder.CreatePlane(
      'healthBarFill',
      { width: this.barWidth, height: this.barHeight },
      scene
    )
    const fillMat = new StandardMaterial('healthBarFillMat', scene)
    fillMat.diffuseColor = new Color3(0.9, 0.1, 0.1) // Rouge
    fillMat.emissiveColor = new Color3(0.9, 0.1, 0.1)
    this.healthBarFill.material = fillMat
    this.healthBarFill.billboardMode = Mesh.BILLBOARDMODE_ALL
    this.healthBarFill.position.z = -0.01
    
    this.updateHealthBarPosition()
  }

  private updateHealthBarPosition() {
    const enemyPos = this.mesh.position
    const barPos = new Vector3(enemyPos.x, enemyPos.y + this.barYOffset, enemyPos.z)
    
    this.healthBarBackground.position = barPos.clone()
    this.healthBarFill.position = barPos.clone()
    this.healthBarFill.position.z -= 0.01
  }

  private updateHealthBar() {
    const healthPercent = Math.max(0, this.hp / this.maxHp)
    
    // Mettre à jour la largeur de la barre de vie
    this.healthBarFill.scaling.x = healthPercent
    
    // Ajuster la position pour que la barre se vide de droite à gauche
    const offset = (this.barWidth * (1 - healthPercent)) / 2
    this.healthBarFill.position.x = this.healthBarBackground.position.x - offset
    
    // Mettre à jour la position des barres
    this.updateHealthBarPosition()
  }

  update(playerPosition: Vector3, mapGenerator?: MapGenerator) {
    if (!mapGenerator) {
      // Fallback: comportement simple sans pathfinding
      this.simpleMovement(playerPosition)
      this.updateHealthBar()
      this.updateDamageTexts()
      return
    }

    const currentTime = Date.now()
    const playerGrid = worldToGrid(playerPosition)

    // Recalculer le chemin périodiquement
    if (currentTime - this.pathUpdateCooldown >= this.PATH_UPDATE_INTERVAL) {
      this.calculatePath(playerGrid, mapGenerator)
      this.pathUpdateCooldown = currentTime
    }

    // Suivre le chemin calculé
    if (this.path.length > 1) {
      // Le prochain point du chemin (index 1 car index 0 est notre position actuelle)
      const nextStep = this.path[1]
      const targetPos = gridToWorld(nextStep[0], nextStep[1])

      // Se déplacer vers le prochain point
      const dx = targetPos.x - this.mesh.position.x
      const dz = targetPos.z - this.mesh.position.z
      const distance = Math.sqrt(dx * dx + dz * dz)

      if (distance > 0.1) {
        // Déplacement vers le point
        this.mesh.position.x += (dx / distance) * this.speed
        this.mesh.position.z += (dz / distance) * this.speed
      } else {
        // Point atteint, on passe au suivant
        this.path.shift()
      }

      // Update grid position
      const grid = worldToGrid(this.mesh.position)
      this.gridPos.x = grid.x
      this.gridPos.y = grid.y
    } else {
      // Pas de chemin, on essaie le mouvement simple
      this.simpleMovement(playerPosition)
    }

    // Update health bar position and damage texts
    this.updateHealthBar()
    this.updateDamageTexts()
  }

  private updateDamageTexts() {
    // Mettre à jour tous les textes de dégâts et supprimer les expirés
    this.damageTexts = this.damageTexts.filter(damageText => {
      const shouldRemove = damageText.update(16) // ~16ms par frame (60fps)
      if (shouldRemove) {
        damageText.dispose()
        return false
      }
      return true
    })
  }

  private calculatePath(targetGrid: { x: number, y: number }, mapGenerator: MapGenerator) {
    // Utiliser A* de ROT.js pour calculer le chemin
    const astar = new ROT.Path.AStar(
      targetGrid.x, 
      targetGrid.y, 
      (x, y) => mapGenerator.isWalkable(x, y), // Callback pour vérifier si walkable
      { topology: 8 } // Permet diagonales
    )

    const path: number[][] = []
    astar.compute(this.gridPos.x, this.gridPos.y, (x, y) => {
      path.push([x, y])
    })

    this.path = path
  }

  private simpleMovement(playerPosition: Vector3) {
    const dx = playerPosition.x - this.mesh.position.x
    const dz = playerPosition.z - this.mesh.position.z
    const distance = Math.sqrt(dx * dx + dz * dz)

    if (distance > 0.5) {
      this.mesh.position.x += (dx / distance) * this.speed
      this.mesh.position.z += (dz / distance) * this.speed

      const grid = worldToGrid(this.mesh.position)
      this.gridPos.x = grid.x
      this.gridPos.y = grid.y
    }
  }

  takeDamage(damage: number): boolean {
    this.hp -= damage
    this.updateHealthBar() // Mettre à jour la barre de vie immédiatement
    
    // Créer un texte de dégâts flottant
    const damageText = new DamageText(this.scene, this.mesh.position, damage)
    this.damageTexts.push(damageText)
    
    return this.hp <= 0
  }

  dispose() {
    // Nettoyer tous les textes de dégâts
    this.damageTexts.forEach(dt => dt.dispose())
    this.damageTexts = []
    
    this.healthBarBackground.dispose()
    this.healthBarFill.dispose()
    this.mesh.dispose()
  }
}
