import { Scene, MeshBuilder, StandardMaterial, Mesh, Texture, Color3 } from '@babylonjs/core'
import { gridToWorld } from '../utils/grid'

export class Chest {
  mesh: Mesh
  gridPos: { x: number, y: number }
  opened: boolean = false

  constructor(scene: Scene, gridX: number, gridY: number) {
    // Create mesh - using a plane for 2D sprite
    this.mesh = MeshBuilder.CreatePlane(`chest_${Math.random()}`, { size: 0.7 }, scene)
    this.mesh.position = gridToWorld(gridX, gridY)
    this.mesh.position.y = 0.45 // Légèrement au-dessus du sol
    this.mesh.billboardMode = Mesh.BILLBOARDMODE_ALL // Always face camera

    // Material with texture
    const material = new StandardMaterial(`chestMat_${Math.random()}`, scene)
    const texture = new Texture('/assets/chest.png', scene)
    texture.hasAlpha = true // Support transparency
    material.diffuseTexture = texture
    material.useAlphaFromDiffuseTexture = true
    material.backFaceCulling = false // Visible from both sides
    material.emissiveColor = new Color3(0.2, 0.2, 0.1) // Slight golden glow
    this.mesh.material = material

    // Store grid position
    this.gridPos = { x: gridX, y: gridY }
  }

  // Pour plus tard: ouvrir le coffre
  open() {
    if (this.opened) return
    this.opened = true
    console.log('💰 Chest opened at', this.gridPos)
    // TODO: Drop loot, change texture, etc.
  }

  isOpened(): boolean {
    return this.opened
  }

  dispose() {
    this.mesh.dispose()
  }
}
