import { useEffect, useRef, useState } from 'react'
import { Engine, Scene, FreeCamera, Vector3, HemisphericLight } from '@babylonjs/core'
import { Player } from '../entities/Player'
import { Enemy } from '../entities/Enemy'
import { MapGenerator } from '../world/MapGenerator'

function GameScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Engine | null>(null)
  const sceneRef = useRef<Scene | null>(null)
  
  // State pour afficher l'XP dans le HUD
  const [playerXP, setPlayerXP] = useState(0)
  const [playerLevel, setPlayerLevel] = useState(1)
  const [totalDamage, setTotalDamage] = useState(0)
  const [currentLevelXP, setCurrentLevelXP] = useState(0)
  const [nextLevelXP, setNextLevelXP] = useState(0)
  const [attackDamage, setAttackDamage] = useState(1)
  
  // State pour le panneau technique
  const [techPanelOpen, setTechPanelOpen] = useState(false)
  const [monstersKilled, setMonstersKilled] = useState(0)

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
        const damage = player.getAttackDamage()
        const isDead = enemy.takeDamage(damage)
        
        // Incrémenter les dégâts totaux
        player.addDamage(damage)
        
        if (isDead) {
          // Gain XP for killing enemy
          player.gainXP(10)
          
          // Increment monster kill counter
          setMonstersKilled(prev => prev + 1)
          
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

      // Update HUD stats
      setPlayerXP(player.getXP())
      setPlayerLevel(player.getLevel())
      setTotalDamage(player.getTotalDamage())
      setCurrentLevelXP(player.getCurrentLevelXP())
      setNextLevelXP(player.getNextLevelXP())
      setAttackDamage(player.getAttackDamage())

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
      
      {/* HUD gauche (stats principales) */}
      <div style={{ 
        position: 'absolute', 
        top: 10, 
        left: 10, 
        color: 'white', 
        background: 'rgba(0,0,0,0.7)', 
        padding: '15px', 
        borderRadius: '8px',
        fontFamily: 'monospace'
      }}>
        <div style={{ color: '#ff4444' }}>LIFE: 100</div>
        <div style={{ color: '#4488ff' }}>XP: {playerXP - currentLevelXP} / {nextLevelXP - currentLevelXP}</div>
        <div style={{ color: '#ffcc00' }}>LEVEL: {playerLevel}</div>
        <div style={{ fontSize: '0.85em', marginTop: '10px', opacity: 0.8, color: 'white' }}>
          <div>Auto-attack: 1s</div>
          <div>Waves: 10s</div>
        </div>
      </div>

      {/* Bouton pour ouvrir/fermer le panneau technique */}
      <div
        onClick={() => setTechPanelOpen(!techPanelOpen)}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: '240px',
          background: 'rgba(0,0,0,0.85)',
          color: '#00ff00',
          padding: '12px 15px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '14px',
          border: '2px solid rgba(0,255,0,0.3)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          userSelect: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0,0,0,0.95)'
          e.currentTarget.style.borderColor = 'rgba(0,255,0,0.6)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0,0,0,0.85)'
          e.currentTarget.style.borderColor = 'rgba(0,255,0,0.3)'
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          fontWeight: 'bold'
        }}>
          <span>📊 Technical Data</span>
          <span style={{ fontSize: '12px', opacity: 0.7 }}>
            {techPanelOpen ? '▲' : '▼'}
          </span>
        </div>

        {/* Contenu du panneau (visible seulement si ouvert) */}
        {techPanelOpen && (
          <div style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(0,255,0,0.3)',
            animation: 'slideDown 0.3s ease'
          }}>
            {/* Section PLAYER DATA */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: 'bold', 
                color: '#00ff00',
                marginBottom: '8px',
                letterSpacing: '1px'
              }}>
                PLAYER DATA
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Attack damage:</span>
                  <span style={{ color: '#ff8844', fontWeight: 'bold' }}>{attackDamage}</span>
                </div>
              </div>
            </div>

            {/* Ligne de séparation */}
            <div style={{ 
              borderTop: '1px solid rgba(0,255,0,0.3)',
              marginBottom: '12px'
            }}></div>

            {/* Section RUN STATISTICS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Monsters killed:</span>
                <span style={{ color: '#ff4444', fontWeight: 'bold' }}>{monstersKilled}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total damage:</span>
                <span style={{ color: '#ffaa44', fontWeight: 'bold' }}>{totalDamage}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total XP earned:</span>
                <span style={{ color: '#44aaff', fontWeight: 'bold' }}>{playerXP}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GameScene
