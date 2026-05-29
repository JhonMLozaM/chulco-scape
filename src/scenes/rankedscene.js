import Phaser from 'phaser';
import { db, auth, obtenerDatosJugador, apagarAlertaReinicio } from '../services/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

export default class RankedScene extends Phaser.Scene {
    constructor() {
        super('RankedScene');
    }

    async create() {
        const { width, height } = this.scale;

        // 1. Fondo de la escena
        this.add.image(width / 2, height / 2, 'fondo_bahia').setAlpha(0.4);

        // Fetch user data early
        const userData = await obtenerDatosJugador();
        const ligaActual = userData ? (userData.ligaActual || 1) : 1;
        const grupoLiga = userData ? (userData.grupoLiga || "L1_G1") : "L1_G1";

        const nombresLigas = {
            1: "El Vendedor Chiro",
            2: "Casero de la Bahía",
            3: "El Escapista de la Marín",
            4: "El Emprendedor astuto",
            5: "El Chulla Emprendedor"
        };
        const nombreLiga = nombresLigas[ligaActual] || nombresLigas[1];

        if (userData && userData.alertaReinicio) {
            const modalContenedor = this.add.container(width / 2, height / 2).setScrollFactor(0).setDepth(100);

            const fondoOscuro = this.add.rectangle(0, 0, width, height, 0x000000, 0.6)
                .setInteractive(); // Bloquea clicks

            const cajaModal = this.add.rectangle(0, 0, 450, 220, 0x008800)
                .setStrokeStyle(4, 0xffffff);

            const txtAlerta = this.add.text(0, -40, "🍲 ¡Liga finalizada,\nencebollados servidos! 🍲", { 
                fontFamily: 'Arial', 
                fontSize: '28px', 
                fontStyle: 'bold',
                fill: '#ffffff', 
                align: 'center' 
            }).setOrigin(0.5);

            const btnAceptar = this.add.rectangle(0, 60, 160, 50, 0xffcc00).setInteractive({ useHandCursor: true });
            const txtBtn = this.add.text(0, 60, "ACEPTAR", {
                fontFamily: 'Arial', 
                fontSize: '24px', 
                fontStyle: 'bold',
                fill: '#000000'
            }).setOrigin(0.5);

            btnAceptar.on('pointerdown', () => {
                modalContenedor.destroy();
            });

            modalContenedor.add([fondoOscuro, cajaModal, txtAlerta, btnAceptar, txtBtn]);
            
            apagarAlertaReinicio();
        }

        // 2. Título de la tabla de posiciones
        this.add.text(width / 2, 60, `🏆 LIGA: ${nombreLiga.toUpperCase()} 🏆`, {
            fontFamily: 'Arial',
            fontSize: '36px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Calculate days to next Monday
        const d = new Date();
        const daysToMonday = (8 - d.getDay()) % 7 || 7;

        this.add.text(width / 2, 110, `Vecindario: ${grupoLiga} (Se reinicia en ${daysToMonday} días)`, {
            fontFamily: 'Arial',
            fontSize: '20px',
            fill: '#ffcc00'
        }).setOrigin(0.5);
        
        this.add.text(width / 2, 140, '🌟 ¡No te preocupes! El lunes TODOS reciben monedas de premio 🌟', {
            fontFamily: 'Arial',
            fontSize: '16px',
            fill: '#00ffcc'
        }).setOrigin(0.5);

        // 3. Contenedor para el listado de posiciones
        this.add.text(width / 2, 200, 'Cargando rivales del vecindario...', { 
            id: 'loading-text', 
            fontSize: '24px', 
            fill: '#ffffff' 
        }).setOrigin(0.5);

        // Invocar la carga de datos desde Firestore
        this.cargarTablaPosiciones(grupoLiga);

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

    async cargarTablaPosiciones(grupoLiga) {
        try {
            // Buscamos los jugadores del mismo grupo, ordenados por puntos de liga
            const jugadoresRef = collection(db, "jugadores");
            const q = query(
                jugadoresRef, 
                where("grupoLiga", "==", grupoLiga), 
                orderBy("puntosLigaSemanales", "desc"), 
                limit(30)
            );
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

                this.add.text(this.scale.width * 0.75, yOffset, `${datos.puntosLigaSemanales || 0} pts`, {
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