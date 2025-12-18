import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh } from '@babylonjs/core'
import type { Enemy } from '../entities/Enemy'

// Classe pour représenter une orbe individuelle qui tourne autour du joueur
export class Orb {
  mesh: Mesh
  angle: number // Angle actuel de rotation (en radians)
  radius: number // Distance depuis le joueur
  rotationSpeed: number // Vitesse de rotation (radians par seconde)
  damage: number
  hitCooldowns: Map<Enemy, number> = new Map() // Cooldown par ennemi pour éviter les dégâts multiples

  constructor(
    scene: Scene,
    angle: number,
    radius: number,
    rotationSpeed: number,
    damage: number
  ) {
    this.angle = angle
    this.radius = radius
    this.rotationSpeed = rotationSpeed
    this.damage = damage

    // Créer une sphère pour l'orbe
    this.mesh = MeshBuilder.CreateSphere('orb', { diameter: 0.4 }, scene)

    // Matériau magique lumineux
    const material = new StandardMaterial('orbMat', scene)
    material.diffuseColor = new Color3(0.5, 0.2, 1.0) // Violet
    material.emissiveColor = new Color3(0.8, 0.4, 1.0) // Lueur violette
    material.alpha = 0.9
    this.mesh.material = material
  }

  // Mettre à jour la position de l'orbe (fait tourner autour du joueur)
  updatePosition(playerPos: Vector3, deltaTime: number) {
    // 1. Incrémenter l'angle pour faire tourner l'orbe
    this.angle += this.rotationSpeed * (deltaTime / 1000)

    // 2. Calculer la nouvelle position en coordonnées polaires
    // x = rayon × cos(angle)
    // z = rayon × sin(angle)
    const x = playerPos.x + Math.cos(this.angle) * this.radius
    const z = playerPos.z + Math.sin(this.angle) * this.radius

    // 3. Appliquer la position (y = 0.5 pour être à mi-hauteur)
    this.mesh.position.set(x, 0.5, z)
  }

  // Vérifier et gérer les collisions avec les ennemis
  checkCollisions(enemies: Enemy[]): Enemy[] {
    const hitEnemies: Enemy[] = []

    enemies.forEach(enemy => {
      // Calculer la distance entre l'orbe et l'ennemi
      const distance = Vector3.Distance(this.mesh.position, enemy.mesh.position)

      // Si collision détectée (seuil de 0.4 pour orbe de diamètre 0.4)
      if (distance < 0.4 && enemy.hp > 0) {
        // Vérifier le cooldown pour cet ennemi spécifique
        const lastHit = this.hitCooldowns.get(enemy) || 0
        const cooldownTime = 500 // 500ms entre chaque hit sur le même ennemi

        if (Date.now() - lastHit > cooldownTime) {
          // Enregistrer le hit
          this.hitCooldowns.set(enemy, Date.now())
          hitEnemies.push(enemy)
        }
      }
    })

    // Nettoyer les cooldowns des ennemis morts (pour libérer la mémoire)
    this.hitCooldowns.forEach((_, enemy) => {
      if (enemy.hp <= 0) {
        this.hitCooldowns.delete(enemy)
      }
    })

    return hitEnemies
  }

  dispose() {
    this.mesh.dispose()
  }
}
