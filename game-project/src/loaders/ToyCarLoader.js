import * as THREE from 'three'
import Prize from '../Experience/World/Prize.js'

export default class ToyCarLoader {
    constructor(experience, world = null) {
        this.experience = experience
        this.world = world
        this.scene = experience.scene
        this.resources = experience.resources
        this.prizes = []
        this.modelKey = 'plane_lev1.001'
    }

    async loadFromURL(apiUrl) {
        // Intenta cargar desde el API remoto, si falla cae al fallback local
        try {
            const res = await fetch(apiUrl)
            if (res.ok) {
                const ct = res.headers.get('content-type') || ''
                if (!ct.includes('application/json')) throw new Error('Respuesta no JSON')
                const data = await res.json()
                if (data && data.blocks) {
                    const preciseModels = await this._fetchPreciseModels()
                    await this._processBlocks(data.blocks, preciseModels)
                    return
                }
            }
        } catch {
            console.warn('ToyCarLoader: no se pudo cargar desde API, fallback local')
        }

        // Fallback local
        try {
            const localUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/data/toy_car_blocks.json'
            const res2 = await fetch(localUrl)
            if (!res2.ok) throw new Error(`No se pudo cargar ${localUrl}`)
            const ct2 = res2.headers.get('content-type') || ''
            if (!ct2.includes('application/json')) throw new Error('Contenido no JSON en fallback')
            const allBlocks = await res2.json()
            const filtered = Array.isArray(allBlocks) ? allBlocks : []
            const preciseModels = await this._fetchPreciseModels()
            await this._processBlocks(filtered, preciseModels)
            return
        } catch {
            console.warn('ToyCarLoader: fallback local falló, creando premios por defecto')
        }

        // Si todo falla, crear algunos premios por defecto para que el juego sea jugable
        this._createDefaultPrizes()
    }

    async _fetchPreciseModels() {
        try {
            const url = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/config/precisePhysicsModels.json'
            const res = await fetch(url)
            if (!res.ok) return []
            const ct = res.headers.get('content-type') || ''
            if (!ct.includes('application/json')) return []
            const parsed = await res.json()
            return Array.isArray(parsed) ? parsed : []
        } catch {
            return []
        }
    }

    clearPrizes() {
        if (!this.prizes || !Array.isArray(this.prizes)) this.prizes = []
        this.prizes.forEach(p => {
            try {
                if (p.pivot) this.scene.remove(p.pivot)
                if (p.model) {
                    if (p.model.geometry) p.model.geometry.dispose()
                    if (p.model.material) {
                        if (Array.isArray(p.model.material)) p.model.material.forEach(m => m.dispose())
                        else p.model.material.dispose()
                    }
                }
            } catch {
                // ignore
            }
        })
        this.prizes = []
    }

    async _processBlocks(blocks = [], preciseModels = null) {
        this.clearPrizes()

        if (!Array.isArray(blocks) || blocks.length === 0) return

        // Obtener un modelo base desde resources si está disponible
        let baseModel = null
        try {
            const resKey = this.modelKey
            const item = this.resources?.items?.[resKey]
            baseModel = item?.scene || item || null
        } catch {
            baseModel = null
        }

        // Si no se pasaron preciseModels, intentar obtenerlos internamente
        if (!preciseModels) {
            try {
                preciseModels = await this._fetchPreciseModels()
            } catch {
                preciseModels = []
            }
        }

        // Si no hay modelo, crear uno básico
        const makeModel = () => {
            if (baseModel) return baseModel
            const geom = new THREE.SphereGeometry(0.5, 12, 12)
            const mat = new THREE.MeshStandardMaterial({ color: 0xffcc00 })
            return new THREE.Mesh(geom, mat)
        }

        // Convertir bloques a premios. Si no hay role, el último será el finalPrize
        const total = blocks.length
        blocks.forEach((b, idx) => {
            const pos = new THREE.Vector3((b.x ?? b.X ?? 0), (b.y ?? b.Y ?? 1.5), (b.z ?? b.Z ?? 0))
            const role = (b.role) ? b.role : ((idx === total - 1) ? 'finalPrize' : 'default')

            // Intentar elegir un modelo específico basado en el nombre del bloque o en preciseModels
            let chosenModel = null
            const possibleNames = [b.name, b.model, b.type].filter(Boolean)
            for (const n of possibleNames) {
                if (n && this.resources?.items?.[n]) {
                    const it = this.resources.items[n]
                    chosenModel = it.scene || it || null
                    break
                }
            }

            // Si aún no hay modelo, intentar con los preciseModels list
            if (!chosenModel && Array.isArray(preciseModels) && preciseModels.length) {
                for (const pm of preciseModels) {
                    if (this.resources?.items?.[pm]) {
                        const it = this.resources.items[pm]
                        chosenModel = it.scene || it || null
                        break
                    }
                }
            }

            const model = chosenModel || makeModel()

            const prize = new Prize({ model, position: pos, scene: this.scene, role, sound: this.world?.coinSound || null })
            // Asegurar visibilidad acorde al role
            if (prize.model) prize.model.visible = (role !== 'finalPrize')
            prize.collected = false
            this.prizes.push(prize)
        })
    }

    _createDefaultPrizes() {
        this.clearPrizes()
        const positions = [
            new THREE.Vector3(-10, 1.5, -10),
            new THREE.Vector3(-8, 1.5, -12),
            new THREE.Vector3(-12, 1.5, -14)
        ]
        positions.forEach((p, i) => {
            const model = (() => {
                const geom = new THREE.SphereGeometry(0.5, 12, 12)
                const mat = new THREE.MeshStandardMaterial({ color: 0xffcc00 })
                return new THREE.Mesh(geom, mat)
            })()
            const role = (i === positions.length - 1) ? 'finalPrize' : 'default'
            const prize = new Prize({ model, position: p, scene: this.scene, role, sound: this.world?.coinSound || null })
            this.prizes.push(prize)
        })
    }
}
