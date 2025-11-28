import { Scene, MeshBuilder, StandardMaterial, Color3, Mesh, Vector3, Texture } from '@babylonjs/core'
import { gridToWorld, worldToGrid } from '../utils/grid'
import type { MapGenerator } from '../world/MapGenerator'

export class Enemy {
  mesh: Mesh
  gridPos: { x: number, y: number }
  hp: number
  maxHp: number
  speed: number = 0.02
  
  // Barre de vie
  private healthBarBackground: Mesh
  private healthBarFill: Mesh
  private readonly barWidth = 0.6
  private readonly barHeight = 0.06
  private readonly barYOffset = 0.4 // Au-dessus de l'ennemi

  constructor(scene: Scene, gridX: number, gridY: number, hp: number = 3) {
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
    // Calculate direction to player
    const dx = playerPosition.x - this.mesh.position.x
    const dz = playerPosition.z - this.mesh.position.z
    const distance = Math.sqrt(dx * dx + dz * dz)

    // Move towards player if not too close
    if (distance > 0.5) {
      // Save old position
      const oldX = this.mesh.position.x
      const oldZ = this.mesh.position.z
      
      // Try to move
      this.mesh.position.x += (dx / distance) * this.speed
      this.mesh.position.z += (dz / distance) * this.speed

      // Check wall collision if mapGenerator is provided
      if (mapGenerator) {
        const newGrid = worldToGrid(this.mesh.position)
        
        if (!mapGenerator.isWalkable(newGrid.x, newGrid.y)) {
          // Collision detected! Revert to old position
          this.mesh.position.x = oldX
          this.mesh.position.z = oldZ
        }
      }

      // Update grid position
      const grid = worldToGrid(this.mesh.position)
      this.gridPos.x = grid.x
      this.gridPos.y = grid.y
    }

    // Update health bar position
    this.updateHealthBar()
  }

  takeDamage(damage: number): boolean {
    this.hp -= damage
    this.updateHealthBar() // Mettre à jour la barre de vie immédiatement
    return this.hp <= 0
  }

  dispose() {
    this.healthBarBackground.dispose()
    this.healthBarFill.dispose()
    this.mesh.dispose()
  }
}
