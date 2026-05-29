import Phaser from 'phaser';
import { db, auth } from '../services/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export default class RankedScene extends Phaser.Scene {
    constructor() {
        super('RankedScene');
    }

    create() {
        const { width, height } = this.scale;

        // 1. Fondo de la escena
        this.add.image(width / 2, height / 2, 'fondo_bahia').setAlpha(0.4);

        // 2. Título de la tabla de posiciones
        this.add.text(width / 2, 80, '🏆 LOS REYES DE LA BAHÍA 🏆', {
            fontFamily: 'Arial',
            fontSize: '42px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(width / 2, 130, 'Liga Actual: Caseros Casuales (Se reinicia en 3 días)', {
            fontFamily: 'Arial',
            fontSize: '20px',
            fill: '#ffcc00'
        }).setOrigin(0.5);

        // 3. Contenedor para el listado de posiciones
        this.add.text(width / 2, 200, 'Cargando rivales del vecindario...', { 
            id: 'loading-text', 
            fontSize: '24px', 
            fill: '#ffffff' 
        }).setOrigin(0.5);

        // Invocar la carga de datos desde Firestore
        this.cargarTablaPosiciones();

        // 4. Botón Volver al Menú
        const btnVolver = this.add.text(width / 2, height - 80, '⬅️ VOLVER AL MERCADO', {
            fontFamily: 'Arial',
            fontSize: '28px',
            fill: '#00ffcc',
            backgroundColor: '#111111',
            padding: { x: 20, y: 10 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        btnVolver.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });
        
        btnVolver.on('pointerover', () => btnVolver.setStyle({ fill: '#ffffff' }));
        btnVolver.on('pointerout', () => btnVolver.setStyle({ fill: '#00ffcc' }));
    }

    async cargarTablaPosiciones() {
        try {
            // Buscamos los 10 jugadores con más monedas guardadas (puedes cambiarlo por mayor deuda pagada)
            const jugadoresRef = collection(db, "jugadores");
            const q = query(jugadoresRef, orderBy("monedas", "desc"), limit(10));
            const querySnapshot = await getDocs(q);

            // Limpiar texto de carga si la escena sigue activa
            const loadingText = this.children.list.find(child => child.text && child.text.includes('Cargando'));
            if (loadingText) loadingText.destroy();

            let yOffset = 220;
            let posicion = 1;

            querySnapshot.forEach((docSnap) => {
                const datos = docSnap.data();
                const esUsuarioActual = (auth.currentUser && auth.currentUser.uid === docSnap.id);
                
                // Formatear el nombre (usamos iniciales o un ID anónimo recortado)
                const nombreJugador = esUsuarioActual ? "¡TÚ! (Vendedor Estrella)" : `Comerciante #${docSnap.id.substring(0, 5)}`;
                const colorTexto = esUsuarioActual ? '#00ff00' : '#ffffff'; // Destacar al jugador en verde
                const estiloTexto = esUsuarioActual ? 'bold' : 'normal';

                // Renderizar la fila de la tabla en Phaser
                this.add.text(this.scale.width * 0.25, yOffset, `${posicion}. ${nombreJugador}`, {
                    fontFamily: 'Arial',
                    fontSize: '24px',
                    fill: colorTexto,
                    fontStyle: estiloTexto
                });

                this.add.text(this.scale.width * 0.75, yOffset, `$${datos.monedas || 0}`, {
                    fontFamily: 'Arial',
                    fontSize: '24px',
                    fill: colorTexto,
                    fontStyle: estiloTexto
                }).setOrigin(1, 0);

                yOffset += 45;
                posicion++;
            });

        } catch (error) {
            console.error("Error al traer la tabla de posiciones:", error);
        }
    }
}