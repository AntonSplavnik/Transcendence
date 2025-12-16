import { Scene } from '@babylonjs/core'
import type { Player } from '../entities/Player'
import type { Enemy } from '../entities/Enemy'

export interface WeaponStats {
  damage: number
  attackSpeed: number // Multiplicateur (1.0 = normal, 2.0 = double vitesse)
  range: number // En tiles (cases de grille)
  cooldown: number // En millisecondes
}

export abstract class Weapon {
  name: string
  icon: string // Chemin vers l'icône de l'arme
  stats: WeaponStats
  lastAttackTime: number = 0
  scene: Scene

  constructor(name: string, icon: string, stats: WeaponStats, scene: Scene) {
    this.name = name
    this.icon = icon
    this.stats = stats
    this.scene = scene
  }

  // Vérifier si l'arme peut attaquer
  canAttack(currentTime: number): boolean {
    const cooldown = this.stats.cooldown / this.stats.attackSpeed
    return currentTime - this.lastAttackTime >= cooldown
  }

  // Méthode abstraite : chaque arme implémente sa propre logique d'attaque
  abstract attack(player: Player, enemies: Enemy[], currentTime: number): Enemy[]

  // Méthode abstraite : chaque arme peut avoir son propre visuel
  // Les paramètres player et enemies sont optionnels pour les armes qui en ont besoin (comme OrbWeapon)
  abstract update(deltaTime: number, player?: Player, enemies?: Enemy[]): void

  // Méthode abstraite : nettoyer les ressources visuelles
  abstract dispose(): void

  // Calculer les dégâts finaux (incluant les bonus du joueur)
  calculateDamage(player: Player): number {
    // Dégâts de base de l'arme + bonus de dégâts du joueur
    return this.stats.damage + player.getAttackDamage()
  }
}
