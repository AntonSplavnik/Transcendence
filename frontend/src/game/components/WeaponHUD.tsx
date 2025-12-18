import React from 'react'

interface WeaponSlot {
  name: string
  icon: string
}

interface WeaponHUDProps {
  weapons: WeaponSlot[]
  maxWeapons?: number
}

export const WeaponHUD: React.FC<WeaponHUDProps> = ({ weapons, maxWeapons = 3 }) => {
  // Remplir les slots vides
  const slots = [...weapons]
  while (slots.length < maxWeapons) {
    slots.push({ name: '', icon: '' })
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '10px',
      padding: '15px',
      background: 'rgba(0, 0, 0, 0.7)',
      borderRadius: '8px',
      border: '2px solid rgba(255, 255, 255, 0.3)',
    }}>
      {slots.map((weapon, index) => (
        <div
          key={index}
          style={{
            width: '60px',
            height: '60px',
            background: weapon.name ? 'rgba(50, 50, 50, 0.9)' : 'rgba(30, 30, 30, 0.5)',
            border: weapon.name ? '2px solid rgba(200, 150, 50, 0.8)' : '2px solid rgba(100, 100, 100, 0.5)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            imageRendering: 'pixelated',
          }}
        >
          {weapon.name ? (
            <>
              <img
                src={weapon.icon}
                alt={weapon.name}
                style={{
                  width: '40px',
                  height: '40px',
                  imageRendering: 'pixelated',
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: '-15px',
                fontSize: '10px',
                color: 'white',
                textShadow: '1px 1px 2px black',
                whiteSpace: 'nowrap',
              }}>
                {weapon.name}
              </div>
            </>
          ) : (
            <div style={{
              fontSize: '24px',
              color: 'rgba(100, 100, 100, 0.5)',
            }}>
              •
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
