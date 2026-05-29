import Phaser from 'phaser';
import { comprarRecompensaPase, desbloquearPasePremium, obtenerDatosJugador, obtenerNumeroSemana } from '../services/firebase.js';

export default class SeasonPassScene extends Phaser.Scene {
    constructor() {
        super('SeasonPassScene');
    }

    async create() {
        this.cameras.main.setBackgroundColor('#0d1b2a');
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const loadingText = this.add.text(width / 2, height / 2, "Cargando Pase...", { font: 'bold 24px Arial', fill: '#ffffff' }).setOrigin(0.5);

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

        loadingText.destroy();

        // Asegurar estructura
        if (!this.playerData.recompensasPase) this.playerData.recompensasPase = [];
        if (!this.playerData.dinero) this.playerData.dinero = 0;
        if (!this.playerData.moneda) this.playerData.moneda = 0;

        // UI Superior Estática (barra compacta de 120px)
        const barHeight = 120;
        const uiLayer = this.add.container(0, 0).setScrollFactor(0).setDepth(10);
        uiLayer.add(this.add.rectangle(width / 2, barHeight / 2, width, barHeight, 0x1c2541));
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
        this.crearBannerPremium();

        // Grilla de Semanas
        this.renderizarSemanas();

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

    crearBannerPremium() {
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
            const txtTitulo = this.add.text(contX, contY - 26, '¡Pase Premium!', {
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

            btnCompra.on('pointerdown', async () => {
                if (this.playerData.moneda < 1000) {
                    this.mostrarNotificacion('¡No tienes suficientes encebollados!', '#f00');
                    return;
                }
                const exito = await desbloquearPasePremium();
                if (exito) {
                    if (this.sound.get('sonido_venta')) this.sound.play('sonido_venta', { volume: 0.8 });
                    this.scene.restart();
                }
            });
        } else {
            // Pase activo — texto centrado en el contenedor
            uiBanner.add(this.add.text(contX, contY, '⭐ Pase Premium Activo ⭐', {
                font: 'bold 18px Arial', fill: '#00ff66'
            }).setOrigin(0.5));
        }
    }

    renderizarSemanas() {
        const width = this.cameras.main.width;
        let startY = 280; // comienza justo debajo de la barra fija (120px) con margen

        const recompensas = this.generarDatosRecompensas();
        const semanaCalendario = obtenerNumeroSemana();
        const semanaTemporada = (semanaCalendario % 5) === 0 ? 5 : (semanaCalendario % 5);

        for (let w = 1; w <= 5; w++) {
            const items = recompensas[w - 1];
            const esSemanaActiva = w <= semanaTemporada;

            // Título de la semana — elevado 20px extra para no quedar tapado por los contenedores
            this.scrollContenedor.add(
                this.add.text(width / 2, startY - 120, `SEMANA ${w}${!esSemanaActiva ? ' 🔒 (Próximamente)' : ''}`, {
                    font: 'bold 34px Arial', fill: esSemanaActiva ? '#ffffff' : '#666666',
                    stroke: '#000000', strokeThickness: 4
                }).setOrigin(0.5)
            );

            startY += 50; // espacio compacto hasta la primera fila

            // Dibujar Fila 1 (4 items)
            this.dibujarFilaRecompensas(items.slice(0, 4), startY, width, esSemanaActiva);
            startY += 270; // altura de caja + margen

            // Dibujar Fila 2 (3 items)
            this.dibujarFilaRecompensas(items.slice(4, 7), startY, width, esSemanaActiva);
            startY += 300; // espacio extra entre semanas
        }
    }

    dibujarFilaRecompensas(items, yPos, screenWidth, esSemanaActiva) {
        const numItems = items.length;
        const boxW = 200;   // ancho de la caja
        const boxH = 240;   // alto de la caja (más cuadrado)
        const spacing = 30;
        const totalWidth = (numItems * boxW) + ((numItems - 1) * spacing);
        let currentX = (screenWidth - totalWidth) / 2 + (boxW / 2);

        items.forEach(item => {
            const group = this.add.container(currentX, yPos);

            const esPremiumItem = item.tipo === 'premium';
            const estaComprado = (this.playerData.recompensasPase || []).includes(item.id);
            const esBloqueadoPremium = esPremiumItem && !this.playerData.pasePremium;
            const esBloqueadoSemana = !esSemanaActiva;

            let boxColor = 0xffffff;
            if (estaComprado) boxColor = 0x88ff88;
            else if (esBloqueadoSemana || esBloqueadoPremium) boxColor = 0x888888;
            else if (esPremiumItem) boxColor = 0xffdd88;

            // Caja con imagen contenedor_skin más cuadrada
            const caja = this.add.image(0, -10, 'contenedor_skin').setDisplaySize(boxW, boxH).setTint(boxColor);
            group.add(caja);

            // Etiqueta GRATIS / PREM en la parte superior de la caja
            group.add(this.add.text(0, -boxH / 2 + 32, esPremiumItem ? '⭐ PREMIUM' : 'GRATIS', {
                font: 'bold 18px Arial', fill: esPremiumItem ? '#ffcc00' : '#ffffff'
            }).setOrigin(0.5));

            // Nombre de la recompensa en el centro
            group.add(this.add.text(0, -20, item.nombre, {
                font: '20px Arial', fill: '#ffffff', align: 'center', wordWrap: { width: boxW - 20 }
            }).setOrigin(0.5));

            // Estado / Botón en la parte inferior
            const btnY = boxH / 2 - 60; // justo dentro del borde inferior de la caja
            if (estaComprado) {
                group.add(this.add.text(0, btnY, 'ADQUIRIDO', { font: 'bold 18px Arial', fill: '#00aa00' }).setOrigin(0.5));
            } else if (esBloqueadoSemana) {
                group.add(this.add.text(0, btnY, '🔒', { font: 'bold 34px Arial', fill: '#666666' }).setOrigin(0.5));
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
                        this.mostrarNotificacion("¡No tienes suficiente dinero!", "#f00");
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
            items.push({ id: `W${w}_I4`, tipo: 'premium', costo: 500 * w, nombre: `Zapatos Dorados` });

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
}