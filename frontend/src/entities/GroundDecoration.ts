import { Scene, MeshBuilder, StandardMaterial, Texture, Mesh } from '@babylonjs/core'
import { gridToWorld } from '../utils/grid'

export class GroundDecoration {
  mesh: Mesh

  constructor(scene: Scene, gridX: number, gridY: number, textureIndex: number) {
    // Créer un petit plan au sol
    this.mesh = MeshBuilder.CreatePlane(`groundDeco_${Math.random()}`, { size: 1.0 }, scene)
    const worldPos = gridToWorld(gridX, gridY)
    this.mesh.position.set(worldPos.x, -0.1, worldPos.z) // Légèrement au-dessus du sol
    this.mesh.rotation.x = Math.PI / 2 // Rotation pour être horizontal

    // Matériau avec texture
    const material = new StandardMaterial(`groundDecoMat_${Math.random()}`, scene)
    const texture = new Texture(`/assets/ground_${textureIndex}.png`, scene)
    texture.hasAlpha = true
    material.diffuseTexture = texture
    material.useAlphaFromDiffuseTexture = true
    material.backFaceCulling = false

    this.mesh.material = material
    this.mesh.isPickable = false // Ne pas interférer avec les clics
  }

  dispose() {
    this.mesh.dispose()
  }
}
