# 🎲 Guide ROT.js pour génération de donjons

## Algorithmes disponibles

### 1. **Digger** (Actuellement utilisé)
Crée des salles rectangulaires connectées par des couloirs.

```typescript
new ROT.Map.Digger(width, height, {
  roomWidth: [4, 8],        // Taille min/max des salles en largeur
  roomHeight: [4, 8],       // Taille min/max des salles en hauteur
  corridorLength: [1, 4],   // Longueur min/max des couloirs
  dugPercentage: 0.3,       // % de la map creusée (0.1 = peu de salles, 0.9 = beaucoup)
  timeLimit: 10000          // Temps max de génération (ms)
})
```

**Meilleur pour :** Donjons classiques, style Binding of Isaac

---

### 2. **Uniform**
Génère un donjon uniforme avec des salles de même taille.

```typescript
new ROT.Map.Uniform(width, height, {
  roomWidth: 5,             // Largeur exacte des salles
  roomHeight: 5,            // Hauteur exacte des salles
  roomDugPercentage: 0.3,   // Remplissage des salles
  timeLimit: 10000
})
```

**Meilleur pour :** Donjons réguliers, style rétro

---

### 3. **Rogue**
Génère un donjon style Rogue classique (grille de salles 3×3).

```typescript
new ROT.Map.Rogue(width, height, {
  cellWidth: 7,             // Largeur d'une cellule de grille
  cellHeight: 7,            // Hauteur d'une cellule de grille
  roomWidth: [3, 5],        // Taille des salles dans les cellules
  roomHeight: [3, 5]
})
```

**Meilleur pour :** Donjons structurés, NetHack-like

---

### 4. **Cellular**
Utilise un automate cellulaire (caves organiques).

```typescript
const cellular = new ROT.Map.Cellular(width, height, {
  born: [4, 5, 6, 7, 8],    // Cellules qui naissent
  survive: [2, 3, 4, 5]     // Cellules qui survivent
})

cellular.randomize(0.5)      // 0.5 = 50% de chance de mur au départ
for (let i = 0; i < 5; i++) {
  cellular.create()          // Itérer 5 fois pour lisser
}
```

**Meilleur pour :** Caves naturelles, grottes

---

### 5. **DividedMaze**
Crée un labyrinthe parfait (1 seul chemin entre 2 points).

```typescript
new ROT.Map.DividedMaze(width, height)
```

**Meilleur pour :** Labyrinthes purs, puzzles

---

### 6. **IceyMaze**
Labyrinthe avec des passages plus larges.

```typescript
new ROT.Map.IceyMaze(width, height, {
  regularity: 0.5           // 0 = chaos, 1 = régulier
})
```

**Meilleur pour :** Labyrinthes jouables

---

### 7. **EllerMaze**
Génère un labyrinthe très rapidement.

```typescript
new ROT.Map.EllerMaze(width, height)
```

**Meilleur pour :** Génération rapide, grandes maps

---

## Paramètres avancés Digger

### dugPercentage
- `0.1` : Très peu de salles, beaucoup de murs (claustrophobe)
- `0.3` : Balance classique (recommandé)
- `0.5` : Beaucoup de salles, peu de murs
- `0.7+` : Presque tout est creusé (spacieux)

### roomWidth / roomHeight
- `[3, 5]` : Petites salles (rapide, claustrophobe)
- `[4, 8]` : Salles moyennes (recommandé)
- `[6, 12]` : Grandes salles (spacieux)

### corridorLength
- `[1, 2]` : Couloirs courts (salles proches)
- `[2, 5]` : Couloirs moyens (recommandé)
- `[5, 10]` : Longs couloirs (salles éloignées)

---

## Exemples de configurations

### Donjon claustrophobe (style Dark Souls)
```typescript
roomWidth: [3, 5]
roomHeight: [3, 5]
corridorLength: [1, 3]
dugPercentage: 0.2
```

### Donjon spacieux (style Diablo)
```typescript
roomWidth: [6, 10]
roomHeight: [6, 10]
corridorLength: [2, 6]
dugPercentage: 0.4
```

### Donjon labyrinthique
```typescript
roomWidth: [4, 6]
roomHeight: [4, 6]
corridorLength: [5, 10]
dugPercentage: 0.25
```

---

## Utilisation des salles

### Récupérer les salles
```typescript
const rooms = digger.getRooms()
console.log(`Nombre de salles: ${rooms.length}`)
```

### Propriétés d'une salle
```typescript
const room = rooms[0]
room.getLeft()    // Coordonnée X gauche
room.getRight()   // Coordonnée X droite
room.getTop()     // Coordonnée Y haut
room.getBottom()  // Coordonnée Y bas
room.getCenter()  // [x, y] du centre
```

### Spawn spécial
```typescript
// Joueur dans première salle
const playerPos = mapGenerator.getStartRoomPosition()

// Boss dans dernière salle
const bossPos = mapGenerator.getEndRoomPosition()

// Centre d'une salle spécifique
const center = mapGenerator.getRoomCenter(2)
```

---

## Tips pour roguelite

1. **Première salle = spawn joueur**
2. **Dernière salle = boss/sortie**
3. **Salles intermédiaires = ennemis aléatoires**
4. **Salles spéciales** : Marquer certaines salles pour trésor, shop, etc.

### Exemple de système de salles spéciales
```typescript
// Après génération
const rooms = mapGenerator.rooms

// Première = spawn
const spawnRoom = rooms[0]

// Dernière = boss
const bossRoom = rooms[rooms.length - 1]

// 2-3 salles aléatoires = trésor
const treasureRooms = [
  rooms[Math.floor(Math.random() * rooms.length)],
  rooms[Math.floor(Math.random() * rooms.length)]
]
```
