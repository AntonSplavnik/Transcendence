import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh } from '@babylonjs/core'
import type { Enemy } from '../entities/Enemy'

export class Projectile {
  mesh: Mesh
  velocity: Vector3
  damage: number
  lifetime: number = 0
  maxLifetime: number = 3000 // 3 secondes max
  hasHit: boolean = false
  target: Enemy | null = null
  speed: number = 0.02 // Vitesse du projectile

  constructor(
    scene: Scene,
    startPos: Vector3,
    target: Enemy,
    damage: number,
    color: Color3 = new Color3(0.8, 0.6, 0.2) // Couleur dorée par défaut pour les flèches
  ) {
    this.target = target
    this.damage = damage

    // Créer un petit cylindre pour représenter la flèche
    this.mesh = MeshBuilder.CreateCylinder('projectile', {
      height: 0.3,
      diameter: 0.05
    }, scene)
    
    this.mesh.position = startPos.clone()
    this.mesh.position.y = 0.5 // Hauteur de tir

    // Calculer la direction vers la cible
    const targetPos = target.mesh.position.clone()
    targetPos.y = 0.5 // Viser au centre de l'ennemi
    
    const direction = targetPos.subtract(this.mesh.position).normalize()
    this.velocity = direction.scale(this.speed)

    // Orienter la flèche dans la direction du mouvement
    const angle = Math.atan2(direction.x, direction.z)
    this.mesh.rotation.y = -angle
    this.mesh.rotation.x = Math.PI / 2 // Horizontal

    // Matériau
    const material = new StandardMaterial('projectileMat', scene)
    material.diffuseColor = color
    material.emissiveColor = color.scale(0.5)
    this.mesh.material = material
  }

  update(deltaTime: number): boolean {
    this.lifetime += deltaTime

    // Si la flèche a dépassé sa durée de vie max
    if (this.lifetime > this.maxLifetime) {
      return true // Doit être supprimée
    }

    // Si la flèche a déjà touché
    if (this.hasHit) {
      return true
    }

    // Déplacer la flèche
    this.mesh.position.addInPlace(this.velocity.scale(deltaTime))

    // Vérifier la collision avec la cible
    if (this.target && this.target.hp > 0) {
      const distance = Vector3.Distance(this.mesh.position, this.target.mesh.position)
      
      if (distance < 0.3) { // Seuil de collision
        this.hasHit = true
        return true // Doit être supprimée
      }
    } else if (this.target && this.target.hp <= 0) {
      // Si la cible est morte pendant le vol, supprimer la flèche
      return true
    }

    return false // Continuer à vivre
  }

  dispose() {
    this.mesh.dispose()
  }

  // Getter pour savoir si le projectile a touché sa cible
  getHitTarget(): Enemy | null {
    return this.hasHit ? this.target : null
  }
}
