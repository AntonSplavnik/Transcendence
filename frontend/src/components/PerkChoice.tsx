import type { Perk } from '../systems/PerkSystem'

interface PerkChoiceProps {
  perks: Perk[]
  onSelectPerk: (perk: Perk) => void
}

function PerkChoice({ perks, onSelectPerk }: PerkChoiceProps) {
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 1000,
      display: 'flex',
      gap: '20px',
      padding: '20px',
      background: 'rgba(0, 0, 0, 0.85)',
      borderRadius: '12px',
      border: '3px solid rgba(255, 215, 0, 0.8)',
      boxShadow: '0 0 30px rgba(255, 215, 0, 0.5)',
    }}>
      {/* Titre */}
      <div style={{
        position: 'absolute',
        top: '-30px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#ffdd00',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
        fontFamily: 'monospace',
        whiteSpace: 'nowrap',
      }}>
        ⬆️ LEVEL UP - CHOOSE UPGRADE
      </div>

      {/* Cartes de perks */}
      {perks.map((perk, index) => (
        <div
          key={index}
          onClick={() => onSelectPerk(perk)}
          style={{
            width: '180px',
            padding: '20px',
            background: 'linear-gradient(135deg, rgba(40, 40, 40, 0.9), rgba(20, 20, 20, 0.9))',
            border: '2px solid rgba(100, 255, 100, 0.5)',
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'center',
            fontFamily: 'monospace',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05) translateY(-5px)'
            e.currentTarget.style.borderColor = 'rgba(100, 255, 100, 1)'
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(100, 255, 100, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)'
            e.currentTarget.style.borderColor = 'rgba(100, 255, 100, 0.5)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          {/* Emoji */}
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>
            {perk.emoji}
          </div>

          {/* Nom du perk */}
          <div style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#00ff00',
            marginBottom: '8px',
          }}>
            {perk.name}
          </div>

          {/* Description */}
          <div style={{
            fontSize: '14px',
            color: '#ffffff',
            opacity: 0.9,
          }}>
            {perk.description}
          </div>
        </div>
      ))}
    </div>
  )
}

export default PerkChoice
