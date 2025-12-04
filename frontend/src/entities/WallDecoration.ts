import { Scene, MeshBuilder, StandardMaterial, Texture, Mesh } from '@babylonjs/core'
import { gridToWorld, TILE_SIZE } from '../utils/grid'

export enum WallDirection {
  NORTH = 'north', // Face visible vers le Sud (mur au nord de la case)
  SOUTH = 'south', // Face visible vers le Nord (mur au sud de la case)
  EAST = 'east',   // Face visible vers l'Ouest (mur à l'est de la case)
  WEST = 'west'    // Face visible vers l'Est (mur à l'ouest de la case)
}

export class WallDecoration {
  mesh: Mesh

  constructor(scene: Scene, gridX: number, gridY: number, direction: WallDirection) {
    // Créer un plan vertical pour le mur
    this.mesh = MeshBuilder.CreatePlane(`wallDeco_${Math.random()}`, { 
      width: TILE_SIZE, 
      height: 1.0 
    }, scene)

    // Position de base au centre de la case
    const worldPos = gridToWorld(gridX, gridY)
    
    // Ajuster la position et rotation selon la direction
    let textureName = ''
    switch (direction) {
      case WallDirection.NORTH:
        // Mur au nord de la case (face visible vers le sud)
        this.mesh.position.set(worldPos.x, 0.5, worldPos.z - TILE_SIZE / 2)
        this.mesh.rotation.y = 0 // Face vers le sud
        textureName = 'wall_front.png'
        break
      
      case WallDirection.SOUTH:
        // Mur au sud de la case (face visible vers le nord)
        this.mesh.position.set(worldPos.x, 0.5, worldPos.z + TILE_SIZE / 2)
        this.mesh.rotation.y = Math.PI // Face vers le nord
        textureName = 'wall_front.png'
        break
      
      case WallDirection.EAST:
        // Mur à l'est de la case (face visible vers l'ouest)
        this.mesh.position.set(worldPos.x + TILE_SIZE / 2, 0.5, worldPos.z)
        this.mesh.rotation.y = -Math.PI / 2 // Face vers l'ouest
        textureName = 'wall_front.png'
        break
      
      case WallDirection.WEST:
        // Mur à l'ouest de la case (face visible vers l'est)
        this.mesh.position.set(worldPos.x - TILE_SIZE / 2, 0.5, worldPos.z)
        this.mesh.rotation.y = Math.PI / 2 // Face vers l'est
        textureName = 'wall_front.png'
        break
    }

    // Matériau avec texture
    const material = new StandardMaterial(`wallDecoMat_${Math.random()}`, scene)
    const texture = new Texture(`/assets/${textureName}`, scene)
    texture.hasAlpha = true
    material.diffuseTexture = texture
    material.useAlphaFromDiffuseTexture = true
    material.backFaceCulling = false // Visible des deux côtés

    this.mesh.material = material
    this.mesh.isPickable = false // Ne pas interférer avec les clics
  }

  dispose() {
    this.mesh.dispose()
  }
}
