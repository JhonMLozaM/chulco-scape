import Phaser from 'phaser';
import { comprarMejoraEnTienda, obtenerDatosJugador } from '../services/firebase.js';
import { getT } from '../i18n.js';

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene');
  }

  async create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.cameras.main.setBackgroundColor('#252525');

    const cachedPlayer = this.registry.get('playerData');
    const equippedPantalla = cachedPlayer?.pantallaCargaEquipada || 'pantalla_default';
    const catalogoSkins = this.registry.get('catalogoSkins') || [];
    const itemPantalla = catalogoSkins.find(item => item.id === equippedPantalla);
    const textureKey = itemPantalla ? (itemPantalla.imagen || itemPantalla.id) : 'fondo_nivel1';

    this.lang = this.registry.get('language') || 'es';
    const T = getT(this.lang);

    const loadingBg = this.add.image(width / 2, height / 2, textureKey)
        .setDisplaySize(width, height)
        .setDepth(999);
    const loadingOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4)
        .setDepth(999);
    const loadingText = this.add.text(width / 2, height / 2, T.shopCargando, { 
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
        console.error("Error al obtener dinero de Firebase:", error);
        this.playerData = this.registry.get('playerData') || {};
    }

    loadingBg.destroy();
    loadingOverlay.destroy();
    loadingText.destroy();

    if (this.playerData.dinero === undefined || this.playerData.dinero === null) this.playerData.dinero = 0;
    
    if (!this.playerData.mejoras) this.playerData.mejoras = {};
    if (this.playerData.mejoras.velocidad === undefined) this.playerData.mejoras.velocidad = 1;
    if (this.playerData.mejoras.danioBolon === undefined) this.playerData.mejoras.danioBolon = 1;
    if (this.playerData.deudaActual === undefined) this.playerData.deudaActual = 400; 

    // UI Superior Estática
    const uiLayer = this.add.container(0, 0).setScrollFactor(0).setDepth(10);
    uiLayer.add(this.add.rectangle(width / 2, 80, width, 160, 0x252525));
    
    // Título estilizado
    uiLayer.add(this.add.text(width / 2, 50, T.shopTitulo, { 
      fontFamily: 'Arial', fontSize: '44px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 5 
    }).setOrigin(0.5));
    
    // Icono de Dinero + Valor
    const iconDinero = this.add.image(70, 115, 'dinero').setDisplaySize(40, 40);
    const txtDinero = this.add.text(105, 95, `${this.playerData.dinero}`, {
      fontFamily: 'Arial', fontSize: '36px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 4
    });
    uiLayer.add([iconDinero, txtDinero]);

    // Contenedor con Scroll para las Mejoras
    this.container = this.add.container(0, this.registry.get('scrollPos') || 0).setDepth(5);
    let yPos = 250;

    // Fila: Abonar Deuda
    this.crearFila(yPos, T.shopAbonarDeuda, `${T.shopDeudaActual}${Math.max(0, this.playerData.deudaActual)}`, this.playerData.deudaActual > 0 ? 100 : 0, () => {
      if (this.playerData.deudaActual <= 0) return;
      this.procesarTransaccion('deuda', 100, T);
    });
    yPos += 180;

    // Fila: Velocidad
    const nvVel = this.playerData.mejoras.velocidad;
    this.crearFila(yPos, `${T.shopVelocidad}${nvVel})`, T.shopDescVelocidad, nvVel * 200, () => this.procesarTransaccion('velocidad', nvVel * 200, T));
    yPos += 180;

    // Fila: Daño Bolón
    const nvDmg = this.playerData.mejoras.danioBolon;
    this.crearFila(yPos, `${T.shopDanio}${nvDmg})`, T.shopDescDanio, nvDmg * 250, () => this.procesarTransaccion('danioBolon', nvDmg * 250, T));
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

    // Titulo estilizado con bordes
    const txtTitulo = this.add.text(200, y - 35, titulo, { 
      fontFamily: 'Arial', fontSize: '28px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 4 
    });
    group.add(txtTitulo);

    // Descripción estilizada con bordes
    const txtDesc = this.add.text(200, y + 15, desc, { 
      fontFamily: 'Arial', fontSize: '20px', fill: '#ffcc00', stroke: '#000000', strokeThickness: 3 
    });
    group.add(txtDesc);

    const btnImg = this.add.image(this.cameras.main.width - 250, y, 'boton_precio');
    btnImg.setDisplaySize(220, 75);
    btnImg.setTint(costo > 0 ? 0xffcc00 : 0x88ff88); 
    btnImg.setInteractive({ useHandCursor: true });

    // Texto de costo estilizado con color oscuro legible sobre botón
    const txtCosto = this.add.text(this.cameras.main.width - 250, y, costo > 0 ? `$${costo}` : 'MAX', { 
      fontFamily: 'Arial', fontSize: '24px', fontStyle: 'bold', fill: '#ffffff' 
    }).setOrigin(0.5);

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

  async procesarTransaccion(tipo, costo, T) {
    if (!T) T = getT(this.lang || 'es');
    if (this.playerData.dinero < costo) { this.mostrarNotificacion(T.shopErrorDinero, '#f00'); return; }
    
    try {
        const exito = await comprarMejoraEnTienda(tipo, costo);
        if (exito) {
            this.playerData.dinero -= costo;
            
            if (tipo === 'deuda') this.playerData.deudaActual = Math.max(0, (this.playerData.deudaActual || 0) - 100);
            else this.playerData.mejoras[tipo] = (this.playerData.mejoras[tipo] || 1) + 1;
            
            this.registry.set('playerData', this.playerData);
            this.mostrarNotificacion(tipo === 'deuda' ? T.shopExitoDeuda : T.shopExitoMejora, '#0f0');
            this.time.delayedCall(1000, () => this.scene.restart());
        }
    } catch (e) { console.error(e); }
  }

  mostrarNotificacion(mensaje, colorFondo) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const container = this.add.container(width / 2, height / 2).setScrollFactor(0).setDepth(100);

    // Modal background image
    const panel = this.add.image(0, 0, 'contenedor_objetos')
      .setDisplaySize(480, 240);
    container.add(panel);

    // Text with the form's font style
    const txt = this.add.text(0, 0, mensaje, { 
      fontFamily: 'Arial', 
      fontSize: '28px', 
      fontStyle: 'bold', 
      fill: '#ffffff', 
      align: 'center', 
      stroke: '#000000', 
      strokeThickness: 5,
      wordWrap: { width: 420 }
    }).setOrigin(0.5);
    container.add(txt);

    // Animation entry
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 250,
      ease: 'Back.easeOut'
    });

    // Automatically destroy after 2 seconds with exit animation
    this.time.delayedCall(2200, () => {
      if (this.sys.isActive()) {
        this.tweens.add({
          targets: container,
          scaleX: 0,
          scaleY: 0,
          duration: 200,
          ease: 'Back.easeIn',
          onComplete: () => container.destroy()
        });
      }
    });
  }
}