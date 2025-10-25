export default class LoadManager {
    constructor(experience) {
        this.experience = experience
        this.modal = experience.modal
        this.resources = experience.resources

        // Bind progress to update modal if resources are loading
        this._onResourceProgress = (e) => {
            const pct = e?.detail ?? 0
            if (this._currentLevel !== undefined) {
                this.modal.show({ icon: '⏳', message: `Cargando nivel ${this._currentLevel}...\n${pct}%` })
            } else {
                this.modal.show({ icon: '⏳', message: `Cargando recursos...\n${pct}%` })
            }
        }

        window.addEventListener('resource-progress', this._onResourceProgress)
        this.resources.on('ready', () => {
            // recursos listos
            this.modal.hide()
        })
    }

    async loadLevel(level) {
        this._currentLevel = level
        try {
            this.modal.show({ icon: '⏳', message: `Cargando nivel ${level}...\n0%` })

            // Ensure scene cleared first
            try {
                this.experience.world.clearCurrentScene()
            } catch (e) {
                console.warn('LoadManager: clearCurrentScene falló', e)
            }

            // Delegate to world loader
            await this.experience.world.loadLevel(level)

            // Hide modal on success
            this.modal.hide()
            this._currentLevel = undefined
        } catch (err) {
            console.error('LoadManager: error cargando nivel', err)
            this.modal.show({
                icon: '❌',
                message: `Error cargando nivel ${level}\n${err?.message || err}`,
                buttons: [
                    { text: '🔁 Reintentar', onClick: () => this.loadLevel(level) },
                    { text: '❌ Cancelar', onClick: () => this.modal.hide() }
                ]
            })
        } finally {
            this._currentLevel = undefined
        }
    }

    destroy() {
        window.removeEventListener('resource-progress', this._onResourceProgress)
    }
}
