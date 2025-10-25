export default class LevelManager {
    constructor(experience) {
        this.experience = experience;
        this.currentLevel = 1;  // Inicias en el nivel 1
        this.totalLevels = 2;   // Total de niveles 
    }

    nextLevel() {
        if (this.currentLevel < this.totalLevels) {
            this.currentLevel++;
            this.experience.world.clearCurrentScene();
            // Use loadManager if available so user sees loading state and can retry
            if (this.experience.loadManager && typeof this.experience.loadManager.loadLevel === 'function') {
                this.experience.loadManager.loadLevel(this.currentLevel)
            } else {
                this.experience.world.loadLevel(this.currentLevel)
            }
    
            // Espera breve para que el nivel se cargue y luego reubicar al robot
            setTimeout(() => {
                this.experience.world.resetRobotPosition({ x: -17, y: 1.5, z: -67 }) //  Ajusta esta coordenada según el mundo nuevo
            }, 1000)
        }
    }
    

    resetLevel() {
        this.currentLevel = 1;
        if (this.experience.loadManager && typeof this.experience.loadManager.loadLevel === 'function') {
            this.experience.loadManager.loadLevel(this.currentLevel)
        } else {
            this.experience.world.loadLevel(this.currentLevel)
        }
    }


    getCurrentLevelTargetPoints() {
        return this.pointsToComplete?.[this.currentLevel] || 2;
    }
    
}
