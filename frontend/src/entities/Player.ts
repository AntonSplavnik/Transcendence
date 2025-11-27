import { Scene, MeshBuilder, StandardMaterial, Color3, Mesh, Vector3, LinesMesh } from '@babylonjs/core'
import { gridToWorld, worldToGrid, MAP_SIZE } from '../utils/grid'

export class Player {
  mesh: Mesh
  gridPos: { x: number, y: number }
  speed: number = 0.06
  lastAttackTime: number = 0
  attackCooldown: number = 1000 // 1 seconde en millisecondes
  attackRange: number = 1 // 1 case de distance
  slashLines: LinesMesh[] = [] // Pour les effets visuels d'attaque
  
  // Barre de cooldown
  private cooldownBarBackground: Mesh
  private cooldownBarFill: Mesh
  private readonly barWidth = 0.8
  private readonly barHeight = 0.08
  private readonly barYOffset = 0.5 // Au-dessus du joueur

  constructor(scene: Scene, gridX: number, gridY: number) {
    // Create mesh
    this.mesh = MeshBuilder.CreateSphere('player', { diameter: 0.6 }, scene)
    this.mesh.position = gridToWorld(gridX, gridY)

    // Material
    const material = new StandardMaterial('playerMat', scene)
    material.diffuseColor = new Color3(0.9, 0.2, 0.2)
    this.mesh.material = material

    // Initial grid position
    this.gridPos = { x: gridX, y: gridY }

    // Créer la barre de cooldown
    this.createCooldownBar(scene)
  }

  private createCooldownBar(scene: Scene) {
    // Fond de la barre (gris foncé)
    this.cooldownBarBackground = MeshBuilder.CreatePlane(
      'cooldownBarBg',
      { width: this.barWidth, height: this.barHeight },
      scene
    )
    const bgMat = new StandardMaterial('cooldownBarBgMat', scene)
    bgMat.diffuseColor = new Color3(0.2, 0.2, 0.2)
    bgMat.emissiveColor = new Color3(0.2, 0.2, 0.2)
    this.cooldownBarBackground.material = bgMat
    this.cooldownBarBackground.billboardMode = Mesh.BILLBOARDMODE_ALL // Toujours face à la caméra
    
    // Barre de remplissage (bleue)
    this.cooldownBarFill = MeshBuilder.CreatePlane(
      'cooldownBarFill',
      { width: this.barWidth, height: this.barHeight },
      scene
    )
    const fillMat = new StandardMaterial('cooldownBarFillMat', scene)
    fillMat.diffuseColor = new Color3(0.2, 0.5, 1.0) // Bleu
    fillMat.emissiveColor = new Color3(0.2, 0.5, 1.0)
    this.cooldownBarFill.material = fillMat
    this.cooldownBarFill.billboardMode = Mesh.BILLBOARDMODE_ALL
    this.cooldownBarFill.position.z = -0.01 // Légèrement devant le fond
    
    this.updateCooldownBarPosition()
  }

  private updateCooldownBarPosition() {
    const playerPos = this.mesh.position
    const barPos = new Vector3(playerPos.x, playerPos.y + this.barYOffset, playerPos.z)
    
    this.cooldownBarBackground.position = barPos.clone()
    this.cooldownBarFill.position = barPos.clone()
    this.cooldownBarFill.position.z -= 0.01 // Légèrement devant
  }

  updateCooldownBar() {
    const currentTime = Date.now()
    const timeSinceLastAttack = currentTime - this.lastAttackTime
    const progress = Math.min(timeSinceLastAttack / this.attackCooldown, 1.0)
    
    // Mettre à jour la largeur de la barre de remplissage
    this.cooldownBarFill.scaling.x = progress
    
    // Ajuster la position pour que la barre se remplisse de gauche à droite
    const offset = (this.barWidth * (1 - progress)) / 2
    this.cooldownBarFill.position.x = this.cooldownBarBackground.position.x - offset
    
    // Mettre à jour la position des barres
    this.updateCooldownBarPosition()
  }

  move(inputState: { [key: string]: boolean }) {
    const p = this.mesh.position
    
    if (inputState['arrowup'] || inputState['w'] || inputState['z']) p.z -= this.speed
    if (inputState['arrowdown'] || inputState['s']) p.z += this.speed
    if (inputState['arrowleft'] || inputState['a'] || inputState['q']) p.x -= this.speed
    if (inputState['arrowright'] || inputState['d']) p.x += this.speed

    // Clamp inside map bounds
    const bound = MAP_SIZE / 2 - 0.3
    this.mesh.position.x = Math.min(bound, Math.max(-bound, this.mesh.position.x))
    this.mesh.position.z = Math.min(bound, Math.max(-bound, this.mesh.position.z))

    // Update grid position
    const grid = worldToGrid(this.mesh.position)
    this.gridPos.x = grid.x
    this.gridPos.y = grid.y
  }

  getPosition(): Vector3 {
    return this.mesh.position
  }

  // Auto-attack enemies in range
  autoAttack(enemies: any[], scene: Scene): any[] {
    const currentTime = Date.now()
    
    // Check if attack is on cooldown
    if (currentTime - this.lastAttackTime < this.attackCooldown) {
      return []
    }

    const hitEnemies: any[] = []

    // Find enemies within attack range (1 grid cell)
    enemies.forEach(enemy => {
      const dx = Math.abs(enemy.gridPos.x - this.gridPos.x)
      const dy = Math.abs(enemy.gridPos.y - this.gridPos.y)
      
      // If enemy is within 1 grid cell (adjacent or diagonal)
      if (dx <= this.attackRange && dy <= this.attackRange && (dx + dy) > 0) {
        hitEnemies.push(enemy)
      }
    })

    // If we hit at least one enemy, trigger cooldown and show slash
    if (hitEnemies.length > 0) {
      this.lastAttackTime = currentTime
      this.createSlashEffect(hitEnemies, scene)
    }

    return hitEnemies
  }

  private createSlashEffect(hitEnemies: any[], scene: Scene) {
    // Nettoyer les anciens slashes
    this.slashLines.forEach((line: LinesMesh) => line.dispose())
    this.slashLines = []

    const playerPos = this.mesh.position

    // Créer une ligne noire pour chaque ennemi touché
    hitEnemies.forEach(enemy => {
      const enemyPos = enemy.mesh.position
      
      const points = [
        playerPos.clone(),
        enemyPos.clone()
      ]

      const line = MeshBuilder.CreateLines(
        'slash',
        { points },
        scene
      )
      line.color = new Color3(0, 0, 0) // Trait noir

      this.slashLines.push(line)
    })

    // Supprimer les slashes après 100ms (effet rapide)
    setTimeout(() => {
      this.slashLines.forEach((line: LinesMesh) => line.dispose())
      this.slashLines = []
    }, 100)
  }

  dispose() {
    this.slashLines.forEach((line: LinesMesh) => line.dispose())
    this.cooldownBarBackground.dispose()
    this.cooldownBarFill.dispose()
    this.mesh.dispose()
  }
}
