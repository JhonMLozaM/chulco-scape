import Phaser from 'phaser';
import { comprarRecompensaPase, desbloquearPasePremium, obtenerDatosJugador, obtenerNumeroSemana, reiniciarPaseEnFirebase } from '../services/firebase.js';
import { getT } from '../i18n.js';

export default class SeasonPassScene extends Phaser.Scene {
    constructor() {
        super('SeasonPassScene');
    }

    async create() {
        this.cameras.main.setBackgroundColor('#0d1b2a');
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Fondo contenedor de objetos (-5% de ancho y de alto)
        const passBg = this.add.image(width / 2, height / 2 + 50, 'contenedor_objetos');
        passBg.setDisplaySize(width * 0.95, height + 100);
        passBg.setDepth(0);

        this.lang = this.registry.get('language') || 'es';
        const T = getT(this.lang);

        const cachedPlayer = this.registry.get('playerData');
        const equippedPantalla = cachedPlayer?.pantallaCargaEquipada || 'pantalla_default';
        const catalogoSkins = this.registry.get('catalogoSkins') || [];
        const itemPantalla = catalogoSkins.find(item => item.id === equippedPantalla);
        const textureKey = itemPantalla ? (itemPantalla.imagen || itemPantalla.id) : 'fondo_nivel1';

        const loadingBg = this.add.image(width / 2, height / 2, textureKey)
            .setDisplaySize(width, height)
            .setDepth(999);
        const loadingOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4)
            .setDepth(999);
        const loadingText = this.add.text(width / 2, height / 2, T.paseCargando, { 
            font: 'bold 44px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(1000);

        try {
            const datosNube = await obtenerDatosJugador();
            if (datosNube) {
                this.playerData = datosNube;
                this.registry.set('playerData', this.playerData);
            } else {
                this.playerData = this.registry.get('playerData') || {};
            }
        } catch (error) {
            console.error("Error al obtener datos:", error);
            this.playerData = this.registry.get('playerData') || {};
        }

        loadingBg.destroy();
        loadingOverlay.destroy();
        loadingText.destroy();

        // Asegurar estructura
        if (!this.playerData.recompensasPase) this.playerData.recompensasPase = [];
        if (!this.playerData.dinero) this.playerData.dinero = 0;
        if (!this.playerData.moneda) this.playerData.moneda = 0;

        // UI Superior Estática (barra compacta de 120px)
        const barHeight = 120;
        const uiLayer = this.add.container(0, 0).setScrollFactor(0).setDepth(10);
        uiLayer.add(this.add.rectangle(width / 2, barHeight / 2, width, barHeight, 0x1c2541));

        // EXCEPCIÓN: Los títulos del pase de batalla NO se traducen
        uiLayer.add(this.add.text(width / 2, 28, 'PASE DEL CHULLA', { font: 'bold 40px Arial', fill: '#ffffff' }).setOrigin(0.5));
        uiLayer.add(this.add.text(width / 2, 74, 'Temporada 1: El Escape de la Bahía', { font: '22px Arial', fill: '#0095ff' }).setOrigin(0.5));

        // Dinero (izquierda arriba) — texto + ícono alineados desde leftX
        const leftX = 30;
        const txtDinero = this.add.text(leftX, barHeight / 2 - 18, `${this.playerData.dinero}`, { font: 'bold 26px Arial', fill: '#00ff66' }).setOrigin(0, 0.5);
        uiLayer.add(txtDinero);
        const iconDinero = this.add.image(leftX + txtDinero.width + 8, barHeight / 2 - 18, 'dinero').setDisplaySize(28, 28).setOrigin(0, 0.5);
        uiLayer.add(iconDinero);

        // Encebollados (izquierda, debajo del dinero) — alineados en el mismo leftX
        const txtEnce = this.add.text(leftX, barHeight / 2 + 20, `${this.playerData.moneda}`, { font: 'bold 26px Arial', fill: '#ffcc00' }).setOrigin(0, 0.5);
        uiLayer.add(txtEnce);
        const iconEnce = this.add.image(leftX + txtEnce.width + 8, barHeight / 2 + 20, 'encebollado').setDisplaySize(28, 28).setOrigin(0, 0.5);
        uiLayer.add(iconEnce);

        // Scroll container
        this.scrollContenedor = this.add.container(0, this.registry.get('paseScrollPos') || 0).setDepth(5);

        // Banner Premium
        this.crearBannerPremium(T);

        // Grilla de Semanas
        this.renderizarSemanas(T);

        // Scroll logic
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            // Ajuste de límite de scroll para las 5 semanas (-2500 aprox)
            this.scrollContenedor.y = Phaser.Math.Clamp(this.scrollContenedor.y - deltaY * 0.8, -2500, 0);
            this.registry.set('paseScrollPos', this.scrollContenedor.y);
        });

        // Botón Volver
        this.add.image(width / 15, height - 80, 'boton_volver')
            .setDisplaySize(125, 125)
            .setScrollFactor(0)
            .setDepth(11)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.registry.set('paseScrollPos', 0);
                this.scene.start('MenuScene');
            });
    }

    crearBannerPremium(T) {
        const width = this.cameras.main.width;
        const esPremium = this.playerData.pasePremium;
        const barHeight = 120;

        // Contenedor fijo en esquina superior derecha (dentro de la barra superior)
        const uiBanner = this.add.container(0, 0).setScrollFactor(0).setDepth(10);

        // Dimensiones y posición del contenedor UI
        const contW = 280;
        const contH = barHeight - 10; // casi toda la altura de la barra
        const contX = width - contW / 2 - 12;
        const contY = barHeight / 2; // centrado en la barra

        const fondoContenedor = this.add.image(contX, contY, 'contenedor_ui').setDisplaySize(contW, contH);
        uiBanner.add(fondoContenedor);

        if (!esPremium) {
            // Título "¡Pase Premium!"
            const txtTitulo = this.add.text(contX, contY - 26, T.paseComprarPremium, {
                font: 'bold 20px Arial', fill: '#ffcc00'
            }).setOrigin(0.5);
            uiBanner.add(txtTitulo);

            // Botón boton_precio centrado en la mitad inferior del contenedor
            const btnY = contY + 12;
            const btnCompra = this.add.image(contX, btnY, 'boton_precio')
                .setDisplaySize(120, 44)
                .setInteractive({ useHandCursor: true });
            uiBanner.add(btnCompra);

            // "1000" + ícono encebollado centrados en el botón
            const gap = 6;
            const iconSize = 24;
            const txtPrecio = this.add.text(contX - gap / 2, btnY, '1000', {
                font: 'bold 20px Arial', fill: '#111111'
            }).setOrigin(1, 0.5);
            const iconEnceBtn = this.add.image(contX + gap / 2, btnY, 'encebollado')
                .setDisplaySize(iconSize, iconSize).setOrigin(0, 0.5);
            uiBanner.add([txtPrecio, iconEnceBtn]);

            btnCompra.on('pointerdown', () => {
                if (this.playerData.moneda < 1000) {
                    this.mostrarNotificacion(T.paseNoEncebollados, '#f00');
                    return;
                }
                this.mostrarConfirmacionPremium(T);
            });
        } else {
            // Pase activo — texto centrado en el contenedor
            uiBanner.add(this.add.text(contX, contY, T.pasePremiumActivo, {
                font: 'bold 18px Arial', fill: '#00ff66'
            }).setOrigin(0.5));
        }
    }

    renderizarSemanas(T) {
        const width = this.cameras.main.width;
        let startY = 280; // comienza justo debajo de la barra fija (120px) con margen

        const recompensas = this.generarDatosRecompensas();
        const semanaCalendario = obtenerNumeroSemana();
        const semanaTemporada = (semanaCalendario % 5) === 0 ? 5 : (semanaCalendario % 5);

        for (let w = 1; w <= 5; w++) {
            const items = recompensas[w - 1];
            const esSemanaActiva = w <= semanaTemporada;

            // Título de la semana
            this.scrollContenedor.add(
                this.add.text(width / 2, startY - 120, `${T.paseSemana} ${w}${!esSemanaActiva ? ` ${T.paseSemanaLock}` : ''}`, {
                    font: 'bold 34px Arial', fill: esSemanaActiva ? '#ffffff' : '#666666',
                    stroke: '#000000', strokeThickness: 4
                }).setOrigin(0.5)
            );

            startY += 50; // espacio compacto hasta la primera fila

            // Dibujar Fila 1 (4 items)
            this.dibujarFilaRecompensas(items.slice(0, 4), startY, width, esSemanaActiva, w, 0, T);
            startY += 270; // altura de caja + margen

            // Dibujar Fila 2 (3 items)
            this.dibujarFilaRecompensas(items.slice(4, 7), startY, width, esSemanaActiva, w, 4, T);
            startY += 300; // espacio extra entre semanas
        }
    }

    dibujarFilaRecompensas(items, yPos, screenWidth, esSemanaActiva, weekNum, startIdx, T) {
        const numItems = items.length;
        const boxW = 200;   // ancho de la caja
        const boxH = 240;   // alto de la caja (más cuadrado)
        const spacing = 30;
        const totalWidth = (numItems * boxW) + ((numItems - 1) * spacing);
        let currentX = (screenWidth - totalWidth) / 2 + (boxW / 2);

        items.forEach((item, i) => {
            const group = this.add.container(currentX, yPos);

            const globalIndex = (weekNum - 1) * 7 + (startIdx + i);
            const lvlReq = (globalIndex + 1) * 2;
            const nivelJugador = this.playerData.paseNivel || 1;

            const esPremiumItem = item.tipo === 'premium';
            const estaComprado = (this.playerData.recompensasPase || []).includes(item.id);
            const esBloqueadoPremium = esPremiumItem && !this.playerData.pasePremium;
            const esBloqueadoSemana = !esSemanaActiva;
            const esBloqueadoNivel = nivelJugador < lvlReq;

            let boxColor = 0xffffff;
            if (estaComprado) boxColor = 0x88ff88;
            else if (esBloqueadoSemana || esBloqueadoNivel || esBloqueadoPremium) boxColor = 0x888888;
            else if (esPremiumItem) boxColor = 0xffdd88;

            // Caja con imagen contenedor_skin más cuadrada
            const caja = this.add.image(0, -10, 'contenedor_skin').setDisplaySize(boxW, boxH).setTint(boxColor);
            group.add(caja);

            // Etiqueta GRATIS / PREM en la parte superior de la caja
            group.add(this.add.text(0, -boxH / 2 + 32, esPremiumItem ? T.pasePremium : T.paseGratis, {
                font: 'bold 18px Arial', fill: esPremiumItem ? '#ffcc00' : '#ffffff'
            }).setOrigin(0.5));

            // Nombre de la recompensa en el centro
            group.add(this.add.text(0, -20, item.nombre, {
                font: '20px Arial', fill: '#ffffff', align: 'center', wordWrap: { width: boxW - 20 }
            }).setOrigin(0.5));

            // Estado / Botón en la parte inferior
            const btnY = boxH / 2 - 60; // justo dentro del borde inferior de la caja
            if (estaComprado) {
                group.add(this.add.text(0, btnY, T.paseAdquirido, { font: 'bold 18px Arial', fill: '#00aa00' }).setOrigin(0.5));
            } else if (esBloqueadoSemana) {
                group.add(this.add.text(0, btnY, '🔒', { font: 'bold 34px Arial', fill: '#666666' }).setOrigin(0.5));
            } else if (esBloqueadoNivel) {
                group.add(this.add.text(0, btnY, `🔒 NVL ${lvlReq}`, { font: 'bold 20px Arial', fill: '#ff4444' }).setOrigin(0.5));
            } else if (esBloqueadoPremium) {
                group.add(this.add.text(0, btnY, '🔒 PASE', { font: 'bold 20px Arial', fill: '#ff3333' }).setOrigin(0.5));
            } else {
                const btnCompra = this.add.image(0, btnY, 'boton_precio').setDisplaySize(boxW - 80, 44).setInteractive({ useHandCursor: true });
                if (esPremiumItem) btnCompra.setTint(0xffcc00);

                // Centrar texto + icono dinero en el botón
                const txtCosto = this.add.text(4, btnY, `${item.costo}`, { font: 'bold 20px Arial', fill: '#111111' }).setOrigin(1, 0.5);
                const iconDineroBtn = this.add.image(10, btnY, 'dinero').setDisplaySize(22, 22).setOrigin(0, 0.5);

                btnCompra.on('pointerdown', async () => {
                    if (this.playerData.dinero < item.costo) {
                        this.mostrarNotificacion(T.paseNoDinero, "#f00");
                        return;
                    }
                    const exito = await comprarRecompensaPase(item.id, item.costo, esPremiumItem);
                    if (exito) {
                        this.playerData.dinero -= item.costo;
                        if (!this.playerData.recompensasPase) this.playerData.recompensasPase = [];
                        this.playerData.recompensasPase.push(item.id);
                        this.registry.set('playerData', this.playerData);
                        if (this.sound.get('sonido_venta')) this.sound.play('sonido_venta', { volume: 0.8 });
                        this.scene.restart();
                    }
                });

                group.add([btnCompra, txtCosto, iconDineroBtn]);
            }

            this.scrollContenedor.add(group);
            currentX += boxW + spacing;
        });
    }

    generarDatosRecompensas() {
        const semanas = [];
        for (let w = 1; w <= 5; w++) {
            const items = [];
            // Fila de 4
            items.push({ id: `W${w}_I1`, tipo: 'free', costo: 200 * w, nombre: `Skin Base` });
            items.push({ id: `W${w}_I2`, tipo: 'premium', costo: 300 * w, nombre: `Sombrero Exclusivo` });
            items.push({ id: `W${w}_I3`, tipo: 'free', costo: 400 * w, nombre: `Lentes Oscuros` });
            
            if (w === 1) {
                items.push({ id: `W${w}_I4`, tipo: 'premium', costo: 500, nombre: `Pantalla de Carga` });
            } else {
                items.push({ id: `W${w}_I4`, tipo: 'premium', costo: 500 * w, nombre: `Zapatos Dorados` });
            }

            // Fila de 3
            items.push({ id: `W${w}_I5`, tipo: 'free', costo: 600 * w, nombre: `Reloj Básico` });
            items.push({ id: `W${w}_I6`, tipo: 'premium', costo: 800 * w, nombre: `Collar Diamante` });
            items.push({ id: `W${w}_I7`, tipo: 'premium', costo: 1000 * w, nombre: `Skin Épica` });
            semanas.push(items);
        }
        return semanas;
    }

    mostrarNotificacion(mensaje, colorFondo) {
        const txt = this.add.text(this.cameras.main.width / 2, 200, mensaje, { font: 'bold 30px Arial', fill: '#fff', backgroundColor: colorFondo, padding: { x: 20, y: 10 }, align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
        this.time.delayedCall(2000, () => txt.destroy());
    }

    mostrarConfirmacionPremium(T) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const modalBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
            .setScrollFactor(0).setDepth(100).setInteractive();

        const panelW = 480;
        const panelH = 260;

        const panel = this.add.container(width / 2, height / 2).setDepth(101).setScrollFactor(0);
        
        // Usar la imagen de contenedor_skin como fondo del modal
        const panelBgImg = this.add.image(0, 0, 'contenedor_skin').setDisplaySize(panelW, panelH);
        panel.add(panelBgImg);

        // Texto de confirmación
        const txtTitulo = this.add.text(0, -50, T.paseConfirmarTitulo, {
            fontFamily: 'Arial', fontSize: '24px', fontStyle: 'bold', fill: '#ffffff',
            align: 'center', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);
        panel.add(txtTitulo);

        // Subtítulo con costo
        const txtCosto = this.add.text(0, 5, T.paseConfirmarCosto, {
            fontFamily: 'Arial', fontSize: '18px', fill: '#ffcc00', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);
        panel.add(txtCosto);

        // Botón Cancelar
        const btnCancel = this.add.image(-110, 70, 'boton_precio')
            .setDisplaySize(160, 44)
            .setInteractive({ useHandCursor: true });
        const txtCancel = this.add.text(-110, 70, T.paseCancelar, {
            fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', fill: '#111111'
        }).setOrigin(0.5);
        panel.add([btnCancel, txtCancel]);

        // Botón Aceptar
        const btnAccept = this.add.image(110, 70, 'boton_precio')
            .setDisplaySize(160, 44)
            .setInteractive({ useHandCursor: true });
        btnAccept.setTint(0x88ff88);
        const txtAccept = this.add.text(110, 70, T.paseAceptar, {
            fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', fill: '#111111'
        }).setOrigin(0.5);
        panel.add([btnAccept, txtAccept]);

        btnCancel.on('pointerover', () => btnCancel.setAlpha(0.8));
        btnCancel.on('pointerout', () => btnCancel.setAlpha(1));
        btnCancel.on('pointerdown', () => {
            modalBg.destroy();
            panel.destroy();
        });

        btnAccept.on('pointerover', () => btnAccept.setAlpha(0.8));
        btnAccept.on('pointerout', () => btnAccept.setAlpha(1));
        btnAccept.on('pointerdown', async () => {
            modalBg.destroy();
            panel.destroy();
            
            const exito = await desbloquearPasePremium();
            if (exito) {
                if (this.sound.get('sonido_venta')) this.sound.play('sonido_venta', { volume: 0.8 });
                this.scene.restart();
            }
        });
    }
}