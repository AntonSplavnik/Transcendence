import { Scene, HemisphericLight, Vector3 } from '@babylonjs/core'

export class LightingSystem {
  scene: Scene
  ambientLight: HemisphericLight | null = null

  constructor(scene: Scene) {
    this.scene = scene
  }

  setupRoomLighting() {
    // Une seule lumière hémisphérique (très performant, éclaire toute la map uniformément)
    this.ambientLight = new HemisphericLight('mainLight', new Vector3(0, 1, 0), this.scene)
    this.ambientLight.intensity = 1.0
  }

  // Ajuster l'intensité
  setIntensity(intensity: number) {
    if (this.ambientLight) {
      this.ambientLight.intensity = intensity
    }
  }

  // Activer/désactiver les lumières
  toggle(enabled: boolean) {
    this.ambientLight?.setEnabled(enabled)
  }

  dispose() {
    this.ambientLight?.dispose()
  }
}
