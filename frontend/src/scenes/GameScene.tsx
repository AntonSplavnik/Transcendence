import { useEffect, useRef } from 'react'
import { Engine, Scene, FreeCamera, Vector3, HemisphericLight } from '@babylonjs/core'
import { Player } from '../entities/Player'
import { Enemy } from '../entities/Enemy'
import { MapGenerator } from '../world/MapGenerator'
import { GRID_SIZE } from '../utils/grid'

function GameScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Engine | null>(null)
  const sceneRef = useRef<Scene | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // Create Babylon engine and scene
    const engine = new Engine(canvasRef.current, true)
    engineRef.current = engine

    const scene = new Scene(engine)
    sceneRef.current = scene

    // Simple ambient light (très performant)
    new HemisphericLight('light', new Vector3(0, 1, 0), scene)

    // Generate map (ground + grid + walls)
    const mapGenerator = new MapGenerator(scene)
    mapGenerator.generateMap()

    // Create player at a random walkable position
    const playerSpawn = mapGenerator.getRandomWalkablePosition()
    const player = new Player(scene, playerSpawn.x, playerSpawn.y)

    // Camera setup (follows player with offset)
    const cameraOffsetY = 20
    const cameraOffsetZ = -10
    const camera = new FreeCamera('camera', new Vector3(0, cameraOffsetY, cameraOffsetZ), scene)
    camera.setTarget(player.getPosition())
    camera.attachControl(canvasRef.current, true)

    // Spawn enemies at random walkable positions
    const enemies: Enemy[] = []
    for (let i = 0; i < 5; i++) {
      const spawnPos = mapGenerator.getRandomWalkablePosition()
      enemies.push(new Enemy(scene, spawnPos.x, spawnPos.y))
    }

    // Wave spawning system
    let waveNumber = 1
    let lastWaveTime = Date.now()
    const WAVE_INTERVAL = 10000 // 10 secondes
    const ENEMIES_PER_WAVE = 5

    const spawnWave = () => {
      console.log(`🌊 Wave ${waveNumber} spawning!`)
      
      for (let i = 0; i < ENEMIES_PER_WAVE; i++) {
        // Spawn à une position aléatoire walkable
        const spawnPos = mapGenerator.getRandomWalkablePosition()
        enemies.push(new Enemy(scene, spawnPos.x, spawnPos.y))
      }

      waveNumber++
    }

    // Input handling
    const inputState: { [key: string]: boolean } = {}
    const keyDown = (e: KeyboardEvent) => { inputState[e.key.toLowerCase()] = true }
    const keyUp = (e: KeyboardEvent) => { inputState[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)

    // Game loop
    engine.runRenderLoop(() => {
      // Check if it's time to spawn a new wave
      const currentTime = Date.now()
      if (currentTime - lastWaveTime >= WAVE_INTERVAL) {
        spawnWave()
        lastWaveTime = currentTime
      }

      // Update player (with wall collision)
      player.move(inputState, mapGenerator)

      // Update cooldown bar
      player.updateCooldownBar()

      // Player auto-attack
      const hitEnemies = player.autoAttack(enemies, scene)
      
      // Deal damage to hit enemies
      hitEnemies.forEach(enemy => {
        const isDead = enemy.takeDamage(1)
        if (isDead) {
          // Remove dead enemy
          const index = enemies.indexOf(enemy)
          if (index > -1) {
            enemies.splice(index, 1)
            enemy.dispose()
          }
        }
      })

      // Update enemies (AI with wall collision)
      enemies.forEach(enemy => {
        enemy.update(player.getPosition(), mapGenerator)
      })

      // Update camera to follow player
      camera.position.x = player.getPosition().x
      camera.position.y = player.getPosition().y + cameraOffsetY
      camera.position.z = player.getPosition().z + cameraOffsetZ
      camera.setTarget(player.getPosition())

      scene.render()
    })

    // Cleanup
    return () => {
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      player.dispose()
      enemies.forEach(enemy => enemy.dispose())
      mapGenerator.dispose()
      // lightingSystem.dispose() // Désactivé
      scene.dispose()
      engine.dispose()
    }
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      {/* HUD React (vie, XP, chat, etc.) */}
      <div style={{ position: 'absolute', top: 10, left: 10, color: 'white', background: 'rgba(0,0,0,0.5)', padding: '10px' }}>
        <div>LIFE: 100</div>
        <div>XP: 0</div>
        <div>Auto-attack: Every 1s (Range: 1 tile)</div>
        <div>Wave spawns: Every 10s (5 enemies)</div>
      </div>
    </div>
  )
}

export default GameScene
