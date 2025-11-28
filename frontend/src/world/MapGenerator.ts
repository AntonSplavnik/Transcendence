import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh, Texture } from '@babylonjs/core'
import { GRID_SIZE, TILE_SIZE, MAP_SIZE } from '../utils/grid'
import * as ROT from 'rot-js'

export class MapGenerator {
  scene: Scene
  ground: Mesh | null = null
  walls: Mesh[] = []
  gridLines: Mesh[] = []
  dungeonMap: number[][] = [] // 0 = walkable, 1 = wall
  rooms: any[] = [] // Stocker les salles pour spawn spécial

  constructor(scene: Scene) {
    this.scene = scene
  }

  generateMap() {
    this.generateDungeon()
    this.createGround()
    this.createGrid()
    this.createDungeonWalls()
  }

  private generateDungeon() {
    console.log('🔧 Starting dungeon generation...')
    
    // Initialize empty map (all walls)
    this.dungeonMap = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(1))

    // ========== CHOISIS TON ALGORITHME ==========
    
    // 🏰 OPTION 1: DIGGER (Salles + couloirs) - ACTUEL
    // const digger = new ROT.Map.Digger(GRID_SIZE, GRID_SIZE, {
    //   roomWidth: [4, 8],        // [min, max] largeur des salles
    //   roomHeight: [4, 8],       // [min, max] hauteur des salles
    //   corridorLength: [1, 4],   // [min, max] longueur des couloirs
    //   dugPercentage: 10,       // % creusé (0.2 = peu, 0.5 = beaucoup)
    //   timeLimit: 10000
    // })
    // digger.create((x, y, value) => {
    //   this.dungeonMap[y][x] = value
    // })
    // this.rooms = digger.getRooms()

    
    // 🌿 OPTION 2: CELLULAR (Caves organiques)
    const cellular = new ROT.Map.Cellular(GRID_SIZE, GRID_SIZE)
    cellular.randomize(0.5)  // 50% de murs au départ
    for (let i = 0; i < 5; i++) {
      cellular.create((x, y, value) => {
        this.dungeonMap[y][x] = value
      })
    }
    this.rooms = []  // Pas de salles avec Cellular
    /*
    // 🎲 OPTION 3: ROGUE (Grille de salles)
    const rogue = new ROT.Map.Rogue(GRID_SIZE, GRID_SIZE, {
      cellWidth: 7,
      cellHeight: 7,
      roomWidth: [3, 5],
      roomHeight: [3, 5]
    })
    rogue.create((x, y, value) => {
      this.dungeonMap[y][x] = value
    })
    this.rooms = rogue.getRooms()
    
    // 🌀 OPTION 4: MAZE (Labyrinthe pur)
    const maze = new ROT.Map.DividedMaze(GRID_SIZE, GRID_SIZE)
    maze.create((x, y, value) => {
      this.dungeonMap[y][x] = value
    })
    this.rooms = []  // Pas de salles
    */

    console.log(`🏰 Dungeon generated! Rooms: ${this.rooms.length}`)
  }

  // Get a random walkable position for spawning
  getRandomWalkablePosition(): { x: number, y: number } {
    const walkablePositions: { x: number, y: number }[] = []
    
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.dungeonMap[y][x] === 0) {
          walkablePositions.push({ x, y })
        }
      }
    }

    if (walkablePositions.length === 0) {
      console.warn('⚠️ No walkable positions found! Using center fallback.')
      return { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }
    }

    const pos = walkablePositions[Math.floor(Math.random() * walkablePositions.length)]
    console.log(`✅ Spawn position found: (${pos.x}, ${pos.y})`)
    return pos
  }

  // Spawn dans une salle spécifique (pour boss, trésor, etc.)
  getRandomPositionInRoom(roomIndex: number): { x: number, y: number } {
    if (roomIndex >= this.rooms.length) {
      return this.getRandomWalkablePosition()
    }

    const room = this.rooms[roomIndex]
    const x = room.getLeft() + Math.floor(Math.random() * (room.getRight() - room.getLeft()))
    const y = room.getTop() + Math.floor(Math.random() * (room.getBottom() - room.getTop()))
    
    return { x, y }
  }

  // Spawn dans la première salle (pour le joueur)
  getStartRoomPosition(): { x: number, y: number } {
    return this.getRandomPositionInRoom(0)
  }

  // Spawn dans la dernière salle (pour boss/sortie)
  getEndRoomPosition(): { x: number, y: number } {
    return this.getRandomPositionInRoom(this.rooms.length - 1)
  }

  // Obtenir le centre d'une salle
  getRoomCenter(roomIndex: number): { x: number, y: number } {
    if (roomIndex >= this.rooms.length) {
      return { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }
    }

    const room = this.rooms[roomIndex]
    return {
      x: Math.floor((room.getLeft() + room.getRight()) / 2),
      y: Math.floor((room.getTop() + room.getBottom()) / 2)
    }
  }

  isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false
    return this.dungeonMap[y][x] === 0
  }

  private createGround() {
    // Create ground
    this.ground = MeshBuilder.CreateGround('ground', { width: MAP_SIZE, height: MAP_SIZE }, this.scene)
    const groundMat = new StandardMaterial('groundMat', this.scene)
    
    // Apply texture
    const texture = new Texture('/assets/ground.png', this.scene)
    texture.uScale = GRID_SIZE // Repeat texture for each grid cell
    texture.vScale = GRID_SIZE
    groundMat.diffuseTexture = texture
    
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

  private createDungeonWalls() {
    const wallHeight = 1
    const wallMat = new StandardMaterial('wallMat', this.scene)
    wallMat.diffuseColor = new Color3(0.3, 0.3, 0.3)

    // Create a wall cube for each wall tile
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.dungeonMap[y][x] === 1) {
          // This is a wall tile
          const wall = MeshBuilder.CreateBox(
            `wall_${x}_${y}`,
            { width: TILE_SIZE, height: wallHeight, depth: TILE_SIZE },
            this.scene
          )
          
          // Position the wall
          wall.position = new Vector3(
            -MAP_SIZE / 2 + x * TILE_SIZE + TILE_SIZE / 2,
            wallHeight / 2,
            -MAP_SIZE / 2 + y * TILE_SIZE + TILE_SIZE / 2
          )
          
          wall.material = wallMat
          this.walls.push(wall)
        }
      }
    }

    console.log(`🧱 Created ${this.walls.length} wall blocks`)
  }

  dispose() {
    this.ground?.dispose()
    this.walls.forEach(wall => wall.dispose())
    this.gridLines.forEach(line => line.dispose())
  }
}
