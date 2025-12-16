import { Scene } from '@babylonjs/core'
import { Weapon } from './Weapon'
import { Orb } from './Orb'
import type { Player } from '../entities/Player'
import type { Enemy } from '../entities/Enemy'

// Arme principale : Baguette Magique avec Orbes Tournants
export class OrbWeapon extends Weapon {
  private orbs: Orb[] = []
  private hitEnemiesThisFrame: Set<Enemy> = new Set()
  
  // Système de durée active / cooldown
  private isActive: boolean = true // Les orbes sont-elles actives ?
  private activeTimer: number = 0 // Temps écoulé dans l'état actuel
  private readonly ACTIVE_DURATION: number = 3000 // 3 secondes actives
  private readonly BASE_COOLDOWN: number = 5000 // 5 secondes de cooldown de base

  constructor(scene: Scene) {
    super(
      'Magic Wand',
      '/assets/weapon_spell.png',
      {
        damage: 15, // Dégâts par orbe
        attackSpeed: 1.0,
        range: 2, // Rayon des orbes
        cooldown: 5
      },
      scene
    )

    // Créer 3 orbes espacées uniformément autour du joueur
    const orbCount = 3
    const radius = 2.0 
    const rotationSpeed = Math.PI

    for (let i = 0; i < orbCount; i++) {
      // Calculer l'angle de départ pour espacer uniformément
      // 0°, 120°, 240° pour 3 orbes
      const startAngle = (i / orbCount) * Math.PI * 2

      const orb = new Orb(
        scene,
        startAngle,
        radius,
        rotationSpeed,
        this.stats.damage
      )

      this.orbs.push(orb)
    }

    console.log(`✨ ${orbCount} orbes magiques créées`)
  }

  // Cette méthode est appelée par le système d'armes, mais les orbes attaquent dans update()
  attack(_player: Player, _enemies: Enemy[], _currentTime: number): Enemy[] {
		this.lastAttackTime = _currentTime
    return []
  }

  // Appelé chaque frame pour animer les orbes et détecter les collisions
  update(deltaTime: number, player?: Player, enemies?: Enemy[]): void {
    // Reset les ennemis touchés cette frame
    this.hitEnemiesThisFrame.clear()

    if (!player || !enemies) return

    // 1. Gérer le système de durée active / cooldown
    this.activeTimer += deltaTime

    if (this.isActive) {
      // État ACTIVE : les orbes tournent et attaquent
      if (this.activeTimer >= this.ACTIVE_DURATION) {
        // Fin de la période active, passer en cooldown
        this.isActive = false
        this.activeTimer = 0
        
        // Cacher les orbes
        this.orbs.forEach(orb => {
          orb.mesh.isVisible = false
        })
        
        console.log('✨ Orbes en cooldown')
      }
    } else {
      // État COOLDOWN : les orbes sont invisibles
      // Calculer le cooldown réel basé sur l'attackSpeed du joueur
      const actualCooldown = this.BASE_COOLDOWN / player.getAttackSpeed()
      
      if (this.activeTimer >= actualCooldown) {
        // Fin du cooldown, réactiver les orbes
        this.isActive = true
        this.activeTimer = 0
        
        // Montrer les orbes
        this.orbs.forEach(orb => {
          orb.mesh.isVisible = true
        })
        
        console.log('✨ Orbes réactivées')
      }
    }

    // 2. Si les orbes sont actives, les faire tourner et détecter les collisions
    if (this.isActive) {
      const playerPos = player.getPosition()

      this.orbs.forEach(orb => {
        // Faire tourner l'orbe autour du joueur
        orb.updatePosition(playerPos, deltaTime)

        // Vérifier les collisions avec les ennemis
        const hitEnemies = orb.checkCollisions(enemies)

        // Ajouter les ennemis touchés à notre set
        hitEnemies.forEach(enemy => {
          this.hitEnemiesThisFrame.add(enemy)
        })
      })

      // 3. Appliquer les dégâts aux ennemis touchés
      // (Fait ici pour éviter les dégâts multiples si plusieurs orbes touchent le même ennemi)
      this.hitEnemiesThisFrame.forEach(enemy => {
        const damage = this.stats.damage
        enemy.takeDamage(damage)

        // Note: Le player.addDamage() sera géré dans GameScene
        // car on retourne les ennemis touchés via getHitEnemies()
      })
    }
  }

  // Méthode pour que GameScene récupère les ennemis touchés cette frame
  getHitEnemies(): Enemy[] {
    return Array.from(this.hitEnemiesThisFrame)
  }

  // Nettoyer toutes les ressources
  dispose(): void {
    this.orbs.forEach(orb => orb.dispose())
    this.orbs = []
  }
}