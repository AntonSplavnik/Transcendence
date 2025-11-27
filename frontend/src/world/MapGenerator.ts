import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh } from '@babylonjs/core'
import { GRID_SIZE, TILE_SIZE, MAP_SIZE } from '../utils/grid'

export class MapGenerator {
  scene: Scene
  ground: Mesh | null = null
  walls: Mesh[] = []
  gridLines: Mesh[] = []

  constructor(scene: Scene) {
    this.scene = scene
  }

  generateMap() {
    this.createGround()
    this.createGrid()
    this.createWalls()
  }

  private createGround() {
    // Create ground
    this.ground = MeshBuilder.CreateGround('ground', { width: MAP_SIZE, height: MAP_SIZE }, this.scene)
    const groundMat = new StandardMaterial('groundMat', this.scene)
    groundMat.diffuseColor = new Color3(0.15, 0.45, 0.15)
    this.ground.material = groundMat
  }

  private createGrid() {
    const lineColor = new Color3(0.2, 0.6, 0.2)
    
    // Vertical lines
    for (let i = 0; i <= GRID_SIZE; i++) {
      const x = -MAP_SIZE / 2 + i * TILE_SIZE
      const points = [
        new Vector3(x, 0.01, -MAP_SIZE / 2),
        new Vector3(x, 0.01, MAP_SIZE / 2)
      ]
      const line = MeshBuilder.CreateLines(`gridV${i}`, { points }, this.scene)
      line.color = lineColor
      this.gridLines.push(line)
    }
    
    // Horizontal lines
    for (let i = 0; i <= GRID_SIZE; i++) {
      const z = -MAP_SIZE / 2 + i * TILE_SIZE
      const points = [
        new Vector3(-MAP_SIZE / 2, 0.01, z),
        new Vector3(MAP_SIZE / 2, 0.01, z)
      ]
      const line = MeshBuilder.CreateLines(`gridH${i}`, { points }, this.scene)
      line.color = lineColor
      this.gridLines.push(line)
    }
  }

  private createWalls() {
    const wallThickness = 0.2
    const wallHeight = 1
    const half = MAP_SIZE / 2

    const wallOptionsH = { width: MAP_SIZE + wallThickness * 2, height: wallHeight, depth: wallThickness }
    const wallOptionsV = { width: wallThickness, height: wallHeight, depth: MAP_SIZE }

    const wallN = MeshBuilder.CreateBox('wallN', wallOptionsH, this.scene)
    wallN.position = new Vector3(0, wallHeight / 2, -half - wallThickness / 2)
    
    const wallS = MeshBuilder.CreateBox('wallS', wallOptionsH, this.scene)
    wallS.position = new Vector3(0, wallHeight / 2, half + wallThickness / 2)
    
    const wallW = MeshBuilder.CreateBox('wallW', wallOptionsV, this.scene)
    wallW.position = new Vector3(-half - wallThickness / 2, wallHeight / 2, 0)
    
    const wallE = MeshBuilder.CreateBox('wallE', wallOptionsV, this.scene)
    wallE.position = new Vector3(half + wallThickness / 2, wallHeight / 2, 0)

    const wallMat = new StandardMaterial('wallMat', this.scene)
    wallMat.diffuseColor = new Color3(0.3, 0.3, 0.3)
    
    this.walls = [wallN, wallS, wallW, wallE]
    this.walls.forEach(wall => wall.material = wallMat)
  }

  dispose() {
    this.ground?.dispose()
    this.walls.forEach(wall => wall.dispose())
    this.gridLines.forEach(line => line.dispose())
  }
}
