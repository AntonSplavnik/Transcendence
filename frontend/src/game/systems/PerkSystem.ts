// Système de perks pour le level-up

export enum PerkType {
  ATTACK_DAMAGE = 'ATTACK_DAMAGE',
  MAX_LIFE = 'MAX_LIFE',
  ATTACK_SPEED = 'ATTACK_SPEED',
  MOVE_SPEED = 'MOVE_SPEED',
}

export interface Perk {
  type: PerkType
  name: string
  description: string
  emoji: string
  value: number // Valeur de l'amélioration
}

// Définition des perks disponibles
export const PERK_DEFINITIONS: Record<PerkType, Omit<Perk, 'value'>> = {
  [PerkType.ATTACK_DAMAGE]: {
    type: PerkType.ATTACK_DAMAGE,
    name: 'Attack Damage',
    description: '+2 damage',
    emoji: '⚔️',
  },
  [PerkType.MAX_LIFE]: {
    type: PerkType.MAX_LIFE,
    name: 'Max Life',
    description: '+20 HP',
    emoji: '❤️',
  },
  [PerkType.ATTACK_SPEED]: {
    type: PerkType.ATTACK_SPEED,
    name: 'Attack Speed',
    description: '+10% speed',
    emoji: '⚡',
  },
  [PerkType.MOVE_SPEED]: {
    type: PerkType.MOVE_SPEED,
    name: 'Move Speed',
    description: '+0.01 speed',
    emoji: '🏃',
  },
}

// Valeurs des améliorations
export const PERK_VALUES: Record<PerkType, number> = {
  [PerkType.ATTACK_DAMAGE]: 2,    // +20% damage (sur base 10)
  [PerkType.MAX_LIFE]: 20,         // +20% life (sur base 100)
  [PerkType.ATTACK_SPEED]: 0.1,   // +10% attack speed
  [PerkType.MOVE_SPEED]: 0.01,    // +0.01 move speed (sur base 0.08)
}

// Génère 3 perks aléatoires (peut contenir des doublons pour simplicité)
export function generateRandomPerks(): Perk[] {
  const perkTypes = Object.values(PerkType)
  const selectedPerks: Perk[] = []

  // Sélectionner 3 perks aléatoires
  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(Math.random() * perkTypes.length)
    const perkType = perkTypes[randomIndex]
    const definition = PERK_DEFINITIONS[perkType]
    
    selectedPerks.push({
      ...definition,
      value: PERK_VALUES[perkType],
    })
  }

  return selectedPerks
}
