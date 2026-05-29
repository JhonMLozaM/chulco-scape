import Phaser from 'phaser';
import { comprarMejoraEnTienda, obtenerDatosJugador } from '../services/firebase.js';

const TEXTOS = {
  es: {
    tienda: '🏪 TIENDA MEJORAS',
    dinero: 'Dinero: $',
    abonarDeuda: '💸 Abonar Deuda',
    deudaActual: 'Deuda actual: $',
    velocidad: '🏃 Velocidad (Nvl ',
    descVelocidad: 'Camina más rápido',
    danio: '🔥 Daño Bolón (Nvl ',
    descDanio: 'Derriba motos',
    irSkins: '🎭 TIENDA SKINS (PREMIUM)',
    errorDinero: '¡No tienes dinero suficiente\nGil y Chiro!',
    exitoMejora: '✅ Mejora adquirida',
    exitoDeuda: '📉 Deuda reducida'
  }
};

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene');
    this.lang = 'es';
  }

  // Convertimos a asíncrono para poder pedir datos a Firebase
  async create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.cameras.main.setBackgroundColor('#252525');

    // Mostramos un texto temporal de carga mientras llega la información
    const loadingText = this.add.text(width / 2, height / 2, "Cargando billetera...", { font: 'bold 24px Arial', fill: '#ffffff' }).setOrigin(0.5);

    try {
        // LECTURA EN TIEMPO REAL: Traemos los datos frescos de la base de datos
        const datosNube = await obtenerDatosJugador();
        if (datosNube) {
            this.playerData = datosNube;
            // Actualizamos la memoria global de Phaser con la data correcta
            this.registry.set('playerData', this.playerData);
        } else {
            this.playerData = this.registry.get('playerData') || {};
        }
    } catch (error) {
        console.error("Error al obtener dinero de Firebase:", error);
        this.playerData = this.registry.get('playerData') || {};
    }

    // Destruimos el texto de carga para mostrar la tienda
    loadingText.destroy();

    const T = TEXTOS[this.lang];
    
    // CORRECCIÓN: Usar 'dinero' en lugar de 'monedas'
    if (this.playerData.dinero === undefined || this.playerData.dinero === null) this.playerData.dinero = 0;
    
    if (!this.playerData.mejoras) this.playerData.mejoras = {};
    if (this.playerData.mejoras.velocidad === undefined) this.playerData.mejoras.velocidad = 1;
    if (this.playerData.mejoras.danioBolon === undefined) this.playerData.mejoras.danioBolon = 1;
    if (this.playerData.deudaActual === undefined) this.playerData.deudaActual = 400; 

    // UI Superior Estática
    const uiLayer = this.add.container(0, 0).setScrollFactor(0).setDepth(10);
    uiLayer.add(this.add.rectangle(width / 2, 80, width, 160, 0x252525));
    uiLayer.add(this.add.text(width / 2, 60, T.tienda, { font: 'bold 50px Arial', fill: '#ffffff' }).setOrigin(0.5));
    
    // CORRECCIÓN: Mostrar 'dinero' con el dato recién traído
    uiLayer.add(this.add.text(50, 100, `${T.dinero}${this.playerData.dinero}`, { font: 'bold 36px Arial', fill: '#ffcc00' }));

    // Contenedor con Scroll para las Mejoras
    this.container = this.add.container(0, this.registry.get('scrollPos') || 0).setDepth(5);
    let yPos = 250;

    // Fila: Abonar Deuda
    this.crearFila(yPos, T.abonarDeuda, `${T.deudaActual}${Math.max(0, this.playerData.deudaActual)}`, this.playerData.deudaActual > 0 ? 100 : 0, () => {
      if (this.playerData.deudaActual <= 0) return;
      this.procesarTransaccion('deuda', 100);
    });
    yPos += 180;

    // Fila: Velocidad
    const nvVel = this.playerData.mejoras.velocidad;
    this.crearFila(yPos, `${T.velocidad}${nvVel})`, T.descVelocidad, nvVel * 200, () => this.procesarTransaccion('velocidad', nvVel * 200));
    yPos += 180;

    // Fila: Daño Bolón
    const nvDmg = this.playerData.mejoras.danioBolon;
    this.crearFila(yPos, `${T.danio}${nvDmg})`, T.descDanio, nvDmg * 250, () => this.procesarTransaccion('danioBolon', nvDmg * 250));
    yPos += 180;


    // Sistema de Scroll mediante rueda del mouse
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      this.container.y = Phaser.Math.Clamp(this.container.y - deltaY * 0.5, -400, 0);
      this.registry.set('scrollPos', this.container.y);
    });

    // Botón Inferior para Volver al Menú Principal
    this.add.image(width / 15, height - 80, 'boton_volver')
      .setDisplaySize(125, 125)
      .setScrollFactor(0)
      .setDepth(11)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
          this.registry.set('scrollPos', 0);
          this.scene.start('MenuScene');
      });
  }

  crearFila(y, titulo, desc, costo, callback) {
    const group = this.add.container(0, 0);
    const anchoDeseado = this.cameras.main.width - 100;
    const altoDeseado = 150;

    const fondoImg = this.add.image(this.cameras.main.width / 2, y, 'contenedor_ui');
    fondoImg.setDisplaySize(anchoDeseado, altoDeseado);
    group.add(fondoImg);

    group.add(this.add.text(100, y - 40, titulo, { font: 'bold 32px Arial', fill: '#ffffff' }));
    group.add(this.add.text(100, y + 10, desc, { font: '24px Arial', fill: '#aaa' }));

    const btnImg = this.add.image(this.cameras.main.width - 200, y, 'boton_precio');
    btnImg.setDisplaySize(220, 75);
    btnImg.setTint(costo > 0 ? 0xffcc00 : 0x88ff88); 
    btnImg.setInteractive({ useHandCursor: true });

    const txtCosto = this.add.text(this.cameras.main.width - 200, y, costo > 0 ? `$${costo}` : 'MAX', { font: 'bold 26px Arial', fill: '#ffffff' }).setOrigin(0.5);

    const btnBaseScaleX = btnImg.scaleX;
    const btnBaseScaleY = btnImg.scaleY;

    btnImg.on('pointerover', () => {
        this.tweens.add({ targets: btnImg, scaleX: btnBaseScaleX * 1.05, scaleY: btnBaseScaleY * 1.05, duration: 100 });
        this.tweens.add({ targets: txtCosto, scaleX: 1.05, scaleY: 1.05, duration: 100 });
    });

    btnImg.on('pointerout', () => {
        this.tweens.add({ targets: btnImg, scaleX: btnBaseScaleX, scaleY: btnBaseScaleY, duration: 100 });
        this.tweens.add({ targets: txtCosto, scaleX: 1, scaleY: 1, duration: 100 });
    });

    btnImg.on('pointerdown', () => {
        if (costo === 0) return;
        this.tweens.add({ targets: btnImg, scaleX: btnBaseScaleX * 0.9, scaleY: btnBaseScaleY * 0.9, duration: 60, yoyo: true });
        this.tweens.add({ 
            targets: txtCosto, 
            scaleX: 0.9, 
            scaleY: 0.9, 
            duration: 60, 
            yoyo: true, 
            onComplete: callback 
        });
    });

    group.add(btnImg);
    group.add(txtCosto);
    this.container.add(group);
  }

  async procesarTransaccion(tipo, costo) {
    const T = TEXTOS[this.lang];
    // CORRECCIÓN: Validar contra 'dinero'
    if (this.playerData.dinero < costo) { this.mostrarNotificacion(T.errorDinero, '#f00'); return; }
    
    try {
        const exito = await comprarMejoraEnTienda(tipo, costo);
        if (exito) {
            // CORRECCIÓN: Restar de 'dinero'
            this.playerData.dinero -= costo;
            
            if (tipo === 'deuda') this.playerData.deudaActual = Math.max(0, (this.playerData.deudaActual || 0) - 100);
            else this.playerData.mejoras[tipo] = (this.playerData.mejoras[tipo] || 1) + 1;
            
            this.registry.set('playerData', this.playerData);
            this.mostrarNotificacion(tipo === 'deuda' ? T.exitoDeuda : T.exitoMejora, '#0f0');
            this.time.delayedCall(1000, () => this.scene.restart());
        }
    } catch (e) { console.error(e); }
  }

  mostrarNotificacion(mensaje, colorFondo) {
    const txt = this.add.text(this.cameras.main.width / 2, 200, mensaje, { font: 'bold 30px Arial', fill: '#fff', backgroundColor: colorFondo, padding: {x:20, y:10}, align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
    this.time.delayedCall(2000, () => txt.destroy());
  }
}