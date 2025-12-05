import { Scene, MeshBuilder, StandardMaterial, Color3, Mesh, Vector3, LinesMesh, DynamicTexture, Texture } from '@babylonjs/core'
import { gridToWorld, worldToGrid, MAP_SIZE } from '../utils/grid'
import type { MapGenerator } from '../world/MapGenerator'
import { generateRandomPerks, PerkType, type Perk } from '../systems/PerkSystem'
import { Weapon } from '../weapons/Weapon'
import { MeleeWeapon } from '../weapons/MeleeWeapon'
import { BowWeapon } from '../weapons/BowWeapon'
import { OrbWeapon } from '../weapons/OrbWeapon'

// Classe pour gérer le texte "LEVEL UP!" flottant
class LevelUpText {
  mesh: Mesh
  lifetime: number = 0
  maxLifetime: number = 2000 // 2 secondes
  velocity: Vector3 = new Vector3(0, 0.015, 0) // Vitesse de montée
  startScale: number = 1.0 // Taille initiale

  constructor(scene: Scene, position: Vector3) {
    // Créer un plan pour afficher le texte
    this.mesh = MeshBuilder.CreatePlane('levelUpText', { size: 2.5 }, scene)
    this.mesh.position = position.clone()
    this.mesh.position.y += 0.8 // Au-dessus du joueur
    this.mesh.billboardMode = Mesh.BILLBOARDMODE_ALL
    this.mesh.scaling.setAll(this.startScale)

    // Créer une texture dynamique pour écrire le texte
    const texture = new DynamicTexture('levelUpTexture', 1024, scene, false)
    const material = new StandardMaterial('levelUpMat', scene)
    
    // Configurer le texte
    const ctx = texture.getContext()
    texture.clear()
    
    // Dessiner le texte "LEVEL UP!"
    const canvas2D = ctx as CanvasRenderingContext2D
    canvas2D.font = 'bold 140px Arial'
    canvas2D.fillStyle = '#ffdd00'
    canvas2D.strokeStyle = '#000000'
    canvas2D.lineWidth = 8
    canvas2D.textAlign = 'center'
    canvas2D.textBaseline = 'middle'
    
    const text = 'LEVEL UP'
    canvas2D.strokeText(text, 512, 512)
    canvas2D.fillText(text, 512, 512)
    
    texture.update()
    
    material.diffuseTexture = texture
    material.emissiveTexture = texture
    material.useAlphaFromDiffuseTexture = true
    material.opacityTexture = texture
    this.mesh.material = material
  }

  update(deltaTime: number): boolean {
    this.lifetime += deltaTime

    // Animer le mouvement vers le haut
    this.mesh.position.addInPlace(this.velocity)

    // Calculer l'opacité et le scale (fade out + shrink)
    const progress = this.lifetime / this.maxLifetime
    if (this.mesh.material && 'alpha' in this.mesh.material) {
      this.mesh.material.alpha = 1 - progress
    }

    // Légère réduction de taille au fil du temps
    const scale = this.startScale * (1 - progress * 0.3)
    this.mesh.scaling.setAll(scale)

    // Retourner true si le texte doit être supprimé
    return this.lifetime >= this.maxLifetime
  }

  dispose() {
    if (this.mesh.material) {
      this.mesh.material.dispose()
    }
    this.mesh.dispose()
  }
}

export class Player {
  mesh: Mesh
  gridPos: { x: number, y: number }
  speed: number = 0.08
  lastAttackTime: number = 0
  attackCooldown: number = 1000 // 1 seconde en millisecondes
  attackRange: number = 1 // 1 case de distance
  slashLines: LinesMesh[] = [] // Pour les effets visuels d'attaque
  scene: Scene // Stocker la scène pour créer les level up texts
  levelUpTexts: LevelUpText[] = [] // Liste des textes de level up actifs
  
  // Système d'armes
  weapons: Weapon[] = [] // Jusqu'à 3 armes équipées
  maxWeapons: number = 3
  
  // Stats du joueur
  xp: number = 0
  level: number = 1
  totalDamageDealt: number = 0 // Dégâts totaux infligés dans cette run
  attackDamage: number = 10 // Dégâts de l'auto-attaque (sera scalé par niveau)
  maxLife: number = 100 // Points de vie maximum
  life: number = 100 // Points de vie actuels
  attackSpeed: number = 1.0 // Vitesse d'attaque (multiplicateur, sera scalé par niveau/perks)
  
  // Système de perks
  pendingPerks: Perk[] | null = null // Perks en attente de choix (null si aucun choix en cours)
  onPerkChoiceReady: ((perks: Perk[]) => void) | null = null // Callback pour notifier GameScene
  
  // Barre de cooldown
  private cooldownBarBackground!: Mesh
  private cooldownBarFill!: Mesh
  private readonly barWidth = 0.8
  private readonly barHeight = 0.08
  private readonly barYOffset = 0.5 // Au-dessus du joueur

  constructor(scene: Scene, gridX: number, gridY: number) {
    this.scene = scene
    // Create mesh - plane avec sprite
    this.mesh = MeshBuilder.CreatePlane('player', { size: 0.6, sideOrientation: Mesh.DOUBLESIDE }, scene)
    this.mesh.position = gridToWorld(gridX, gridY)
    this.mesh.rotation.x = Math.PI / 2 // Rotation pour que le plan soit horizontal

    // Material avec texture
    const material = new StandardMaterial('playerMat', scene)
    const texture = new Texture('/assets/player.png', scene)
    texture.hasAlpha = true
    material.diffuseTexture = texture
    material.emissiveTexture = texture
    material.emissiveColor = new Color3(1, 1, 1)
    material.useAlphaFromDiffuseTexture = true
    this.mesh.material = material

    // Initial grid position
    this.gridPos = { x: gridX, y: gridY }

    // Créer la barre de cooldown
    this.createCooldownBar(scene)
    
    // Initialiser les armes de départ
    this.initializeWeapons()
  }

  private initializeWeapons() {
    // Arme de base : attaque au corps-à-corps
    const meleeWeapon = new MeleeWeapon(this.scene)
    this.weapons.push(meleeWeapon)
    
    // Pour les tests : équiper l'arc directement
    const bowWeapon = new BowWeapon(this.scene)
    this.weapons.push(bowWeapon)
    
    // Pour les tests : équiper la baguette magique avec orbes
    const orbWeapon = new OrbWeapon(this.scene)
    this.weapons.push(orbWeapon)
    
    console.log(`⚔️ ${this.weapons.length} armes équipées`)
  }

  private createCooldownBar(scene: Scene) {
    // Fond de la barre (gris foncé)
    this.cooldownBarBackground = MeshBuilder.CreatePlane(
      'cooldownBarBg',
      { width: this.barWidth, height: this.barHeight },
      scene
    )
    const bgMat = new StandardMaterial('cooldownBarBgMat', scene)
    bgMat.diffuseColor = new Color3(0.2, 0.2, 0.2)
    bgMat.emissiveColor = new Color3(0.2, 0.2, 0.2)
    this.cooldownBarBackground.material = bgMat
    this.cooldownBarBackground.billboardMode = Mesh.BILLBOARDMODE_ALL // Toujours face à la caméra
    
    // Barre de remplissage (bleue)
    this.cooldownBarFill = MeshBuilder.CreatePlane(
      'cooldownBarFill',
      { width: this.barWidth, height: this.barHeight },
      scene
    )
    const fillMat = new StandardMaterial('cooldownBarFillMat', scene)
    fillMat.diffuseColor = new Color3(0.2, 0.5, 1.0) // Bleu
    fillMat.emissiveColor = new Color3(0.2, 0.5, 1.0)
    this.cooldownBarFill.material = fillMat
    this.cooldownBarFill.billboardMode = Mesh.BILLBOARDMODE_ALL
    this.cooldownBarFill.position.z = -0.01 // Légèrement devant le fond
    
    this.updateCooldownBarPosition()
  }

  private updateCooldownBarPosition() {
    const playerPos = this.mesh.position
    const barPos = new Vector3(playerPos.x, playerPos.y + this.barYOffset, playerPos.z)
    
    this.cooldownBarBackground.position = barPos.clone()
    this.cooldownBarFill.position = barPos.clone()
    this.cooldownBarFill.position.z -= 0.01 // Légèrement devant
  }

  updateCooldownBar() {
    const currentTime = Date.now()
    const timeSinceLastAttack = currentTime - this.lastAttackTime
    const progress = Math.min(timeSinceLastAttack / this.attackCooldown, 1.0)
    
    // Mettre à jour la largeur de la barre de remplissage
    this.cooldownBarFill.scaling.x = progress
    
    // Ajuster la position pour que la barre se remplisse de gauche à droite
    const offset = (this.barWidth * (1 - progress)) / 2
    this.cooldownBarFill.position.x = this.cooldownBarBackground.position.x - offset
    
    // Mettre à jour la position des barres
    this.updateCooldownBarPosition()
    
    // Mettre à jour les textes de level up
    this.updateLevelUpTexts()
  }

  private updateLevelUpTexts() {
    // Mettre à jour tous les textes de level up et supprimer les expirés
    this.levelUpTexts = this.levelUpTexts.filter(levelUpText => {
      const shouldRemove = levelUpText.update(16) // ~16ms par frame (60fps)
      if (shouldRemove) {
        levelUpText.dispose()
        return false
      }
      return true
    })
  }

  update(deltaTime: number, enemies?: any[]) {
    // Mettre à jour toutes les armes (animations, projectiles, etc.)
    // Passer le joueur et les ennemis pour les armes qui en ont besoin (comme OrbWeapon)
    this.weapons.forEach(weapon => weapon.update(deltaTime, this, enemies))
    
    // Mettre à jour les textes de level up
    this.levelUpTexts = this.levelUpTexts.filter(text => {
      text.lifetime += deltaTime
      if (text.lifetime >= text.maxLifetime) {
        text.mesh.dispose()
        return false
      }
      
      // Animer le texte (montée + fade out)
      text.mesh.position.addInPlace(text.velocity.scale(deltaTime / 16.67))
      
      const progress = text.lifetime / text.maxLifetime
      const scale = text.startScale * (1 + progress * 0.5)
      text.mesh.scaling.setAll(scale)
      
      const material = text.mesh.material as StandardMaterial
      if (material) {
        material.alpha = 1 - progress
      }
      
      return true
    })
    
    // Mettre à jour la barre de cooldown
    this.updateCooldownBar()
  }

  move(inputState: { [key: string]: boolean }, mapGenerator?: MapGenerator) {
    // Save current position in case we need to revert
    const oldX = this.mesh.position.x
    const oldZ = this.mesh.position.z
    
    // Apply movement (haut/bas inversés)
    if (inputState['arrowup'] || inputState['w'] || inputState['z']) this.mesh.position.z += this.speed
    if (inputState['arrowdown'] || inputState['s']) this.mesh.position.z -= this.speed
    if (inputState['arrowleft'] || inputState['a'] || inputState['q']) this.mesh.position.x -= this.speed
    if (inputState['arrowright'] || inputState['d']) this.mesh.position.x += this.speed

    // Clamp inside map bounds
    const bound = MAP_SIZE / 2 - 0.3
    this.mesh.position.x = Math.min(bound, Math.max(-bound, this.mesh.position.x))
    this.mesh.position.z = Math.min(bound, Math.max(-bound, this.mesh.position.z))

    // Check wall collision if mapGenerator is provided
    if (mapGenerator) {
      const newGrid = worldToGrid(this.mesh.position)
      
      if (!mapGenerator.isWalkable(newGrid.x, newGrid.y)) {
        // Collision detected! Revert to old position
        this.mesh.position.x = oldX
        this.mesh.position.z = oldZ
      }
    }

    // Update grid position
    const grid = worldToGrid(this.mesh.position)
    this.gridPos.x = grid.x
    this.gridPos.y = grid.y
  }

  getPosition(): Vector3 {
    return this.mesh.position
  }

  getGridPosition(): { x: number, y: number } {
    return { x: this.gridPos.x, y: this.gridPos.y }
  }

  // Auto-attack avec toutes les armes équipées
  autoAttack(enemies: any[]): any[] {
    const currentTime = Date.now()
    const allHitEnemies: any[] = []

    // Attaquer avec chaque arme équipée
    this.weapons.forEach(weapon => {
      const hitEnemies = weapon.attack(this, enemies, currentTime)
      
      // Pour les armes à projectiles (comme l'arc), récupérer les ennemis touchés
      if ('getHitEnemies' in weapon && typeof weapon.getHitEnemies === 'function') {
        const projectileHits = (weapon as any).getHitEnemies()
        projectileHits.forEach((enemy: any) => {
          if (!allHitEnemies.includes(enemy)) {
            allHitEnemies.push(enemy)
          }
        })
      }
      
      // Ajouter les ennemis touchés directement
      hitEnemies.forEach(enemy => {
        if (!allHitEnemies.includes(enemy)) {
          allHitEnemies.push(enemy)
        }
      })
    })

    return allHitEnemies
  }

  // Gagner de l'XP
  gainXP(amount: number) {
    this.xp += amount
    
    // Vérifier si on peut level-up
    const xpNeeded = this.getXPNeededForLevel(this.level + 1)
    if (this.xp >= xpNeeded) {
      this.levelUp()
    }
  }

  // Formule hybride pour XP requise par niveau
  getXPNeededForLevel(level: number): number {
    if (level <= 1) {
      return 0 // Level 1 ne nécessite pas d'XP
    } else if (level === 2) {
      return 50 // Level 1→2: 50 XP
    } else if (level === 3) {
      return 100 // Level 2→3: 100 XP (50 + 50)
    } else if (level === 4) {
      return 200 // Level 3→4: 200 XP (100 + 100)
    } else if (level <= 10) {
      // Niveaux intermédiaires: progression de 100 XP par niveau
      return 200 + (level - 4) * 100
    } else {
      // Niveaux avancés: croissance exponentielle
      return Math.floor(800 + 500 * Math.pow(level - 10, 1.8))
    }
  }

  private levelUp() {
    this.level++
    this.attackDamage += 1  // +10% de dégâts par niveau (+1 sur base 10)
    
    console.log(`🎉 LEVEL UP! You are now level ${this.level}!`)
    console.log(`⚔️ Attack damage: ${this.attackDamage} (+10%)`)
    
    // Créer un texte "LEVEL UP!" flottant
    const levelUpText = new LevelUpText(this.scene, this.mesh.position)
    this.levelUpTexts.push(levelUpText)
    
    // Générer 3 perks aléatoires pour le choix
    this.pendingPerks = generateRandomPerks()
    
    // Notifier GameScene qu'un choix de perk est disponible
    if (this.onPerkChoiceReady) {
      this.onPerkChoiceReady(this.pendingPerks)
    }
    
    // L'XP en surplus est conservée pour le prochain niveau
    // On ne reset pas l'XP à 0
  }

  // Appliquer un perk choisi par le joueur
  applyPerk(perk: Perk) {
    switch (perk.type) {
      case PerkType.ATTACK_DAMAGE:
        this.attackDamage += perk.value
        console.log(`⚔️ Attack damage increased to ${this.attackDamage}`)
        break
      case PerkType.MAX_LIFE:
        this.maxLife += perk.value
        console.log(`❤️ Max life increased to ${this.maxLife}`)
        break
      case PerkType.ATTACK_SPEED:
        this.attackSpeed += perk.value
        console.log(`⚡ Attack speed increased to ${this.attackSpeed.toFixed(1)}x`)
        break
      case PerkType.MOVE_SPEED:
        this.speed += perk.value
        console.log(`🏃 Move speed increased to ${this.speed.toFixed(2)}`)
        break
    }
    
    // Réinitialiser les perks en attente
    this.pendingPerks = null
  }

  getXP(): number {
    return this.xp
  }

  getLevel(): number {
    return this.level
  }

  // Retourne l'XP nécessaire pour le niveau actuel
  getCurrentLevelXP(): number {
    return this.getXPNeededForLevel(this.level)
  }

  // Retourne l'XP nécessaire pour le prochain niveau
  getNextLevelXP(): number {
    return this.getXPNeededForLevel(this.level + 1)
  }

  getTotalDamage(): number {
    return this.totalDamageDealt
  }

  getAttackDamage(): number {
    return this.attackDamage
  }

  getMaxLife(): number {
    return this.maxLife
  }

  getAttackSpeed(): number {
    return this.attackSpeed
  }

  // Obtenir les armes équipées pour le HUD
  getEquippedWeapons(): Array<{ name: string; icon: string }> {
    return this.weapons.map(weapon => ({
      name: weapon.name,
      icon: weapon.icon
    }))
  }

  // Ajouter les dégâts infligés au compteur
  addDamage(damage: number) {
    this.totalDamageDealt += damage
  }

  // Recevoir des dégâts
  takeDamage(damage: number): boolean {
    this.life -= damage
    console.log(`🩸 Joueur reçoit ${damage} dégâts! Vie restante: ${this.life}/${this.maxLife}`)
    
    // Retourner true si le joueur est mort
    return this.life <= 0
  }

  getLife(): number {
    return this.life
  }

  // Soigner le joueur (fontaine)
  heal(amount: number) {
    const oldLife = this.life
    this.life = Math.min(this.life + amount, this.maxLife)
    const healed = this.life - oldLife
    console.log(`💚 Joueur soigné de ${healed} PVs! Vie: ${this.life}/${this.maxLife}`)
  }

  // Soigner complètement le joueur
  fullHeal() {
    this.heal(this.maxLife)
  }

  dispose() {
    this.slashLines.forEach((line: LinesMesh) => line.dispose())
    this.levelUpTexts.forEach(text => text.dispose())
    this.cooldownBarBackground.dispose()
    this.cooldownBarFill.dispose()
    this.mesh.dispose()
  }
}
