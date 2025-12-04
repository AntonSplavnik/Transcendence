import { Scene, MeshBuilder, LinesMesh, Color3 } from '@babylonjs/core'
import { Weapon } from './Weapon'
import type { Player } from '../entities/Player'
import type { Enemy } from '../entities/Enemy'

export class MeleeWeapon extends Weapon {
  private slashLines: LinesMesh[] = []

  constructor(scene: Scene) {
    super(
      'Sword',
      '/assets/weapon_sword.png',
      {
        damage: 0, // Les dégâts viennent du joueur
        attackSpeed: 1.0,
        range: 1, // 1 case de distance
        cooldown: 1000 // 1 seconde
      },
      scene
    )
  }

  attack(player: Player, enemies: Enemy[], currentTime: number): Enemy[] {
    if (!this.canAttack(currentTime)) {
      return []
    }

    const hitEnemies: Enemy[] = []
    const playerPos = player.getGridPosition()

    // Trouver les ennemis dans la portée (1 case)
    enemies.forEach(enemy => {
      const dx = Math.abs(enemy.gridPos.x - playerPos.x)
      const dy = Math.abs(enemy.gridPos.y - playerPos.y)
      
      // Si l'ennemi est à 1 case (adjacent ou diagonal)
      if (dx <= this.stats.range && dy <= this.stats.range && (dx + dy) > 0) {
        hitEnemies.push(enemy)
      }
    })

    // Si on touche au moins un ennemi, déclencher le cooldown et afficher l'effet
    if (hitEnemies.length > 0) {
      this.lastAttackTime = currentTime
      this.createSlashEffect(player, hitEnemies)
    }

    return hitEnemies
  }

  private createSlashEffect(player: Player, hitEnemies: Enemy[]) {
    // Nettoyer les anciens slashes
    this.slashLines.forEach((line: LinesMesh) => line.dispose())
    this.slashLines = []

    const playerPos = player.mesh.position

    // Créer une ligne noire pour chaque ennemi touché
    hitEnemies.forEach(enemy => {
      const enemyPos = enemy.mesh.position
      
      const points = [
        playerPos.clone(),
        enemyPos.clone()
      ]
      
      const slashLine = MeshBuilder.CreateLines(`slash_${Math.random()}`, { points }, this.scene)
      slashLine.color = new Color3(0, 0, 0)
      this.slashLines.push(slashLine)
    })
  }

  update(deltaTime: number, player?: Player, enemies?: Enemy[]): void {
    // Faire disparaître progressivement les lignes de slash
    this.slashLines = this.slashLines.filter(line => {
      const material = line.material as any
      if (material && material.alpha !== undefined) {
        material.alpha -= deltaTime / 200
        if (material.alpha <= 0) {
          line.dispose()
          return false
        }
      }
      return true
    })
  }

  dispose(): void {
    this.slashLines.forEach(line => line.dispose())
    this.slashLines = []
  }
}
