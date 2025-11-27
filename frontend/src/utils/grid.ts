import { Vector3 } from '@babylonjs/core'

// Grid configuration constants
export const GRID_SIZE = 20  // nombre de cases par côté
export const TILE_SIZE = 1   // taille d'une case en unités Babylon
export const MAP_SIZE = GRID_SIZE * TILE_SIZE

// Convert grid coordinates to world position
export const gridToWorld = (gridX: number, gridY: number): Vector3 => {
  const x = -MAP_SIZE / 2 + gridX * TILE_SIZE + TILE_SIZE / 2
  const z = -MAP_SIZE / 2 + gridY * TILE_SIZE + TILE_SIZE / 2
  return new Vector3(x, 0.3, z)
}

// Convert world position to grid coordinates
export const worldToGrid = (pos: Vector3): { x: number, y: number } => {
  const x = Math.floor((pos.x + MAP_SIZE / 2) / TILE_SIZE)
  const y = Math.floor((pos.z + MAP_SIZE / 2) / TILE_SIZE)
  return { 
    x: Math.max(0, Math.min(GRID_SIZE - 1, x)), 
    y: Math.max(0, Math.min(GRID_SIZE - 1, y)) 
  }
}

// Check if grid position is valid
export const isValidGridPos = (x: number, y: number): boolean => {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE
}
