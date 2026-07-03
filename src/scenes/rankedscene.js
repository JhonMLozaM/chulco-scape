import Phaser from 'phaser';
import { db, auth, obtenerDatosJugador, apagarAlertaReinicio } from '../services/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getT } from '../i18n.js';

export default class RankedScene extends Phaser.Scene {
    constructor() {
        super('RankedScene');
    }

    async create() {
        const { width, height } = this.scale;

        const lang = this.registry.get('language') || 'es';
        const T = getT(lang);

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

        // Modal de alerta de reinicio
        if (userData && userData.alertaReinicio) {
            const modalContenedor = this.add.container(width / 2, height / 2).setScrollFactor(0).setDepth(100);

            const fondoOscuro = this.add.rectangle(0, 0, width, height, 0x000000, 0.6)
                .setInteractive();

            const cajaModal = this.add.image(0, 0, 'contenedor_skin')
                .setDisplaySize(450, 220);

            const txtAlerta = this.add.text(0, -40, T.rankedAlerta, {
                fontFamily: 'Arial',
                fontSize: '28px',
                fontStyle: 'bold',
                fill: '#ffffff',
                align: 'center'
            }).setOrigin(0.5);

            const btnAceptar = this.add.rectangle(0, 60, 160, 50, 0xffcc00).setInteractive({ useHandCursor: true });
            const txtBtn = this.add.text(0, 60, T.rankedAceptar, {
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

        // ── 2. CABECERA con contenedor_ui ─────────────────────────────────
        const headerH = 150;
        const headerY = headerH / 2 + 10;
        const headerPad = 30;

        this.add.image(width / 2, headerY, 'contenedor_ui')
            .setDisplaySize(width - headerPad * 2, headerH);

        // EXCEPCIÓN: El título de la liga NO se traduce (nombre propio del juego)
        this.add.text(width / 2, headerY - 35, `🏆 LIGA: ${nombreLiga.toUpperCase()} 🏆`, {
            fontFamily: 'Arial',
            fontSize: '28px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);

        // Calculate days to next Monday
        const d = new Date();
        const daysToMonday = (8 - d.getDay()) % 7 || 7;

        // Vecindario
        this.add.text(width / 2, headerY - 5, `${T.rankedVecindario} ${grupoLiga}  ·  ${T.rankedReinicia} ${daysToMonday} ${T.rankedDias}`, {
            fontFamily: 'Arial',
            fontSize: '17px',
            fill: '#ffcc00'
        }).setOrigin(0.5);

        // Mensaje premios
        this.add.text(width / 2, headerY + 25, T.rankedPremios, {
            fontFamily: 'Arial',
            fontSize: '14px',
            fill: '#00ffcc'
        }).setOrigin(0.5);

        // ── 3. CONTENEDOR GRANDE para la lista de jugadores ───────────────
        const listTop = headerY + headerH / 2 + 15;
        const btnVolverH = 125;
        const listBot = height - btnVolverH / 2 - 20;
        const listH = listBot - listTop;
        const listCenterY = listTop + listH / 2;

        // Fondo contenedor_ui para la lista (cubre todo el espacio disponible)
        this.add.image(width / 2, listCenterY + 30, 'contenedor_objetos')
            .setDisplaySize(width - headerPad * 2, listH + 60);

        // Texto de carga inicial
        this.loadingText = this.add.text(width / 2, listCenterY, T.rankedCargando, {
            fontSize: '22px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Máscara de recorte para el scroll (dentro del contenedor)
        const maskShape = this.add.graphics();
        maskShape.fillRect(headerPad, listTop + 8, width - headerPad * 2, listH - 16);
        const mask = maskShape.createGeometryMask();

        // Contenedor scrollable con la máscara
        this.listaContenedor = this.add.container(0, 0);
        this.listaContenedor.setMask(mask);

        // Parámetros de scroll
        this._listTop = listTop + 8;
        this._listBot = listBot - 8;
        this._rowH = 50;
        this._scrollMin = 0;
        this._scrollMax = 0;

        // Scroll con rueda del ratón
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            this.listaContenedor.y = Phaser.Math.Clamp(
                this.listaContenedor.y - deltaY * 0.5,
                this._scrollMax,
                0
            );
        });

        // Scroll táctil con arrastre
        let dragStartY = 0;
        let containerStartY = 0;
        this.input.on('pointerdown', (pointer) => {
            if (pointer.y > listTop && pointer.y < listBot) {
                dragStartY = pointer.y;
                containerStartY = this.listaContenedor.y;
            }
        });
        this.input.on('pointermove', (pointer) => {
            if (!pointer.isDown) return;
            if (pointer.y > listTop && pointer.y < listBot) {
                const dy = pointer.y - dragStartY;
                this.listaContenedor.y = Phaser.Math.Clamp(
                    containerStartY + dy,
                    this._scrollMax,
                    0
                );
            }
        });

        // Cargar datos, pasando T para los textos de la tabla
        this.cargarTablaPosiciones(grupoLiga, listTop, width, T);

        // ── 4. BOTÓN VOLVER ────────────────────────────────────────────────
        this.add.image(width / 15, height - 80, 'boton_volver')
            .setDisplaySize(125, 125)
            .setScrollFactor(0)
            .setDepth(11)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.scene.start('MenuScene');
            });
    }

    async cargarTablaPosiciones(grupoLiga, listTop, width, T) {
        try {
            const jugadoresRef = collection(db, "jugadores");
            const q = query(
                jugadoresRef,
                where("grupoLiga", "==", grupoLiga),
                orderBy("puntosLigaSemanales", "desc"),
                limit(30)
            );
            const querySnapshot = await getDocs(q);

            // Eliminar texto de carga
            if (this.loadingText) {
                this.loadingText.destroy();
                this.loadingText = null;
            }

            const rowH = this._rowH;
            const startY = listTop + 60 + rowH / 2;
            let posicion = 1;

            querySnapshot.forEach((docSnap) => {
                const datos = docSnap.data();
                const esUsuarioActual = (auth.currentUser && auth.currentUser.uid === docSnap.id);

                const nombreJugador = esUsuarioActual
                    ? T.rankedTu
                    : `${T.rankedComerciantePre}${docSnap.id.substring(0, 5)}`;
                const colorTexto = '#ffffff';

                const yRow = startY + (posicion - 1) * rowH;

                // Fondo dorado de la fila con esquinas redondeadas
                const rowBgW = width - 250;
                const rowBgH = rowH - 6;
                const rowBg = this.add.graphics();
                rowBg.fillStyle(0xd5c23b, 0.92);
                rowBg.fillRoundedRect(width / 2 - rowBgW / 2, yRow - rowBgH / 2, rowBgW, rowBgH, 12);

                // Estilo compartido inspirado en la cabecera
                const estiloFila = {
                    fontFamily: 'Arial',
                    fontSize: '20px',
                    fill: colorTexto,
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 4
                };

                // Número de posición
                const txtPos = this.add.text(200, yRow, `${posicion}.`, estiloFila).setOrigin(0.5);

                // Nombre
                const txtNombre = this.add.text(width * 0.25, yRow, nombreJugador, estiloFila).setOrigin(0, 0.5);

                // Puntos
                const txtPts = this.add.text(width - 200, yRow, `${datos.puntosLigaSemanales || 0} pts`, estiloFila).setOrigin(1, 0.5);

                this.listaContenedor.add([rowBg, txtPos, txtNombre, txtPts]);
                posicion++;
            });

            // Calcular límite de scroll según cuántas filas hay
            const totalH = (posicion - 1) * rowH;
            const visibleH = this._listBot - this._listTop;
            this._scrollMax = Math.min(0, -(totalH - visibleH + 20));

        } catch (error) {
            console.error("Error al traer la tabla de posiciones:", error);
        }
    }
}