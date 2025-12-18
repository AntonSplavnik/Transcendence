import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh } from '@babylonjs/core'
import { GRID_SIZE, TILE_SIZE, MAP_SIZE } from '../utils/grid'
import * as ROT from 'rot-js'
import { Chest } from '../entities/Chest'
import { Fountain } from '../entities/Fountain'
import { GroundDecoration } from '../entities/GroundDecoration'
import { WallDecoration, WallDirection } from '../entities/WallDecoration'

export class MapGenerator {
  scene: Scene
  ground: Mesh | null = null
  walls: Mesh[] = []
  gridLines: Mesh[] = []
  dungeonMap: number[][] = [] // 0 = walkable, 1 = wall
  rooms: any[] = [] // Stocker les salles pour spawn spécial
  chests: Chest[] = [] // Coffres générés
  fountains: Fountain[] = [] // Fontaines de vie générées
  groundDecorations: GroundDecoration[] = [] // Décorations de sol
  wallDecorations: WallDecoration[] = [] // Décorations de murs

  constructor(scene: Scene) {
    this.scene = scene
  }

  generateMap() {
    this.generateDungeon()
    // this.createGround() // Sol de base désactivé - on garde juste les décorations
    this.createGrid() // Grid ON / OFF
    this.createDungeonWalls()
    this.generateChests() // Générer les coffres après la création du donjon
    this.generateFountains() // Générer les fontaines de vie
    this.generateGroundDecorations() // Ajouter des décorations au sol
    this.generateWallDecorations() // Ajouter des textures aux murs
  }

  private generateDungeon() {
    console.log('🔧 Starting dungeon generation...')
    
    // Initialize empty map (all walls)
    this.dungeonMap = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(1))

    // ========== CHOISIS TON ALGORITHME ==========
    
    //OPTION 1: DIGGER (Salles + couloirs) - ACTUEL
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

    
    // OPTION 2: CELLULAR (Caves organiques)
    const cellular = new ROT.Map.Cellular(GRID_SIZE, GRID_SIZE)
    cellular.randomize(0.5)  // 50% de murs au départ
    for (let i = 0; i < 5; i++) {
      cellular.create((x, y, value) => {
        this.dungeonMap[y][x] = value
      })
    }
    this.rooms = []

    
    // OPTION 3: ROGUE (Grille de salles)
    // const rogue = new ROT.Map.Rogue(GRID_SIZE, GRID_SIZE, {
    //   cellWidth: 7,
    //   cellHeight: 7,
    //   roomWidth: [3, 5],
    //   roomHeight: [3, 5]
    // })
    // rogue.create((x, y, value) => {
    //   this.dungeonMap[y][x] = value
    // })
    // this.rooms = []
    
    // OPTION 4: MAZE (Labyrinthe pur)
    // const maze = new ROT.Map.DividedMaze(GRID_SIZE, GRID_SIZE)
    // maze.create((x, y, value) => {
    //   this.dungeonMap[y][x] = value
    // })
    // this.rooms = []  // Pas de salles

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

  // Générer 1-2 coffres dans le donjon
  generateChests() {
    const numChests = Math.random() < 0.5 ? 1 : 2 // 1 ou 2 coffres
    
    // Définir les armes disponibles dans l'ordre
    const weaponDrops: ('bow' | 'orb')[] = ['bow', 'orb']
    
    for (let i = 0; i < numChests; i++) {
      // Spawn les coffres dans des salles au milieu du donjon (pas la première ni la dernière)
      let position
      if (this.rooms.length > 2) {
        const roomIndex = 1 + Math.floor(Math.random() * (this.rooms.length - 2))
        position = this.getRandomPositionInRoom(roomIndex)
      } else {
        // Fallback si pas assez de salles
        position = this.getRandomWalkablePosition()
      }
      
      // Assigner l'arme selon l'index pour garantir pas de doublon
      const weaponDrop = weaponDrops[i % weaponDrops.length]
      const chest = new Chest(this.scene, position.x, position.y, weaponDrop)
      this.chests.push(chest)
      
      const weaponName = weaponDrop === 'bow' ? 'Arc' : 'Baguette Magique'
      console.log(`📦 Coffre spawné à (${position.x}, ${position.y}) - Contient: ${weaponName}`)
    }
  }

  // Générer 4 fontaines de vie dans le donjon
  generateFountains() {
    const numFountains = 4 // Toujours 4 fontaines
    const spawnedPositions: { x: number, y: number }[] = [] // Pour éviter de spawn au même endroit
    
    for (let i = 0; i < numFountains; i++) {
      let position: { x: number, y: number }
      let attempts = 0
      const maxAttempts = 50
      
      // Trouver une position unique
      do {
        if (this.rooms.length > 2) {
          // Spawn dans des salles aléatoires
          const roomIndex = Math.floor(Math.random() * this.rooms.length)
          position = this.getRandomPositionInRoom(roomIndex)
        } else {
          position = this.getRandomWalkablePosition()
        }
        attempts++
      } while (
        spawnedPositions.some(p => p.x === position.x && p.y === position.y) &&
        attempts < maxAttempts
      )
      
      spawnedPositions.push(position)
      const fountain = new Fountain(this.scene, position.x, position.y)
      this.fountains.push(fountain)
      console.log(`💧 Fontaine spawné à (${position.x}, ${position.y})`)
    }
  }

  // Générer des décorations de sol aléatoires (15-25% des tiles walkable)
  generateGroundDecorations() {
    const decorationDensity = 0.15 + Math.random() * 10 // 15-25%
    const walkableTiles: { x: number, y: number }[] = []
    
    // Récupérer toutes les tiles walkable
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.dungeonMap[y][x] === 0) {
          walkableTiles.push({ x, y })
        }
      }
    }
    
    // Calculer le nombre de décorations
    const numDecorations = Math.floor(walkableTiles.length * decorationDensity)
    
    // Mélanger les tiles walkable
    for (let i = walkableTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [walkableTiles[i], walkableTiles[j]] = [walkableTiles[j], walkableTiles[i]]
    }
    
    // Placer les décorations
    for (let i = 0; i < numDecorations && i < walkableTiles.length; i++) {
      const tile = walkableTiles[i]
      const textureIndex = Math.floor(Math.random() * 3) + 1 // 1, 2 ou 3
      const decoration = new GroundDecoration(this.scene, tile.x, tile.y, textureIndex)
      this.groundDecorations.push(decoration)
    }
    
    console.log(`🌿 ${numDecorations} décorations de sol générées`)
  }

  private generateWallDecorations() {
    // Parcourir toutes les cases du donjon
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        // Si c'est un mur
        if (this.dungeonMap[y][x] === 1) {
          // Vérifier chaque direction pour voir s'il y a un espace walkable adjacent
          
          // Nord (y-1) - si walkable au nord, afficher face sud du mur
          if (y > 0 && this.dungeonMap[y - 1][x] === 0) {
            const wall = new WallDecoration(this.scene, x, y, WallDirection.NORTH)
            this.wallDecorations.push(wall)
          }
          
          // Sud (y+1) - si walkable au sud, afficher face nord du mur
          if (y < GRID_SIZE - 1 && this.dungeonMap[y + 1][x] === 0) {
            const wall = new WallDecoration(this.scene, x, y, WallDirection.SOUTH)
            this.wallDecorations.push(wall)
          }
          
          // Est (x+1) - si walkable à l'est, afficher face ouest du mur
          if (x < GRID_SIZE - 1 && this.dungeonMap[y][x + 1] === 0) {
            const wall = new WallDecoration(this.scene, x, y, WallDirection.EAST)
            this.wallDecorations.push(wall)
          }
          
          // Ouest (x-1) - si walkable à l'ouest, afficher face est du mur
          if (x > 0 && this.dungeonMap[y][x - 1] === 0) {
            const wall = new WallDecoration(this.scene, x, y, WallDirection.WEST)
            this.wallDecorations.push(wall)
          }
        }
      }
    }
    
    console.log(`🧱 ${this.wallDecorations.length} décorations de mur générées`)
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
    this.chests.forEach(chest => chest.dispose())
    this.fountains.forEach(fountain => fountain.dispose())
    this.groundDecorations.forEach(deco => deco.dispose())
  }
}
