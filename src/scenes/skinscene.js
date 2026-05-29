import Phaser from 'phaser';
import { 
  obtenerCatalogoSkins, 
  equiparSkinEnFirebase, 
  adquirirAccesorioEstetico, 
  obtenerDatosJugador 
} from '../services/firebase.js';

const TEXTOS = {
  es: {
    titulo: '¡DISFRACES!',
    infoPago: 'Puedes elegir el disfraz de tu personaje.',
    btnEquipar: 'EQUIPAR',
    btnEquipado: 'EQUIPADO',
    btnComprar: 'COMPRAR ',
    procesando: '💳 Conectando con la tienda...',
    pagoExitoso: '🎉 ¡Compra exitosa!',
    pagoCancelado: '❌ Operación cancelada.',
    error: '❌ Error al procesar.',
    confirmar: '¿Comprar por ',
    si: 'SÍ',
    no: 'NO',
    fondosInsuficientes: '❌ Fondos insuficientes'
  }
};

export default class SkinScene extends Phaser.Scene {
  constructor() {
    super('SkinScene');
    this.lang = 'es';
    // Estructura inicial normalizada
    this.playerData = { 
        skinsDesbloqueadas: [], 
        accesorioEquipado: null, 
        moneda: 0, // Encebollados
        dinero: 0  // Dinero interno
    };
  }

  // Método auxiliar para obtener el saldo de Encebollados (moneda)
  obtenerSaldo() {
    return this.playerData.moneda ?? 0;
  }

  async create() {
    const T = TEXTOS[this.lang];
    
    const loadingText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, "Cargando tienda...", { fill: '#fff' }).setOrigin(0.5);

    try {
      const [catalogo, player] = await Promise.all([
        obtenerCatalogoSkins(),
        obtenerDatosJugador()
      ]);

      this.catalogoSkins = catalogo;
      
      // Normalización de datos al recibir de Firebase
      this.playerData = player || { 
        skinsDesbloqueadas: [], 
        accesorioEquipado: null, 
        moneda: 0, 
        dinero: 0 
      };
      
      loadingText.destroy();
    } catch (e) {
      console.error("Error al cargar datos:", e);
      loadingText.setText("Error al cargar la tienda. Intenta de nuevo.");
      return;
    }

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.cameras.main.setBackgroundColor('#1c1a22');

    const uiLayer = this.add.container(0, 0).setScrollFactor(0).setDepth(10);
    uiLayer.add(this.add.rectangle(width / 2, 40, width, 120, 0x1c1a22));
    uiLayer.add(this.add.text(width / 2, 30, T.titulo, { font: 'bold 44px Arial', fill: '#e0b3ff' }).setOrigin(0.5));
    uiLayer.add(this.add.text(width / 2, 75, `${T.infoPago} | Encebollados: ${this.obtenerSaldo()}`, { font: '20px Arial', fill: '#aaa', fontStyle: 'italic' }).setOrigin(0.5));

    this.container = this.add.container(0, this.registry.get('scrollPosSkins') || 0).setDepth(5);
    
    const boxWidth = 300;
    const boxHeight = 340;
    const gapX = 50;
    const gapY = 50;
    const startY = 280;
    const cols = Math.max(1, Math.floor((width - gapX) / (boxWidth + gapX)));
    const totalAnchoGrid = (cols * boxWidth) + ((cols - 1) * gapX);
    const startX = (width - totalAnchoGrid) / 2 + (boxWidth / 2);

    this.catalogoSkins.forEach((skin, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + (col * (boxWidth + gapX));
      const y = startY + (row * (boxHeight + gapY));
      this.crearTarjetaSkin(x, y, skin, boxWidth, boxHeight);
    });

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      this.container.y = Phaser.Math.Clamp(this.container.y - deltaY * 0.5, -600, 0);
      this.registry.set('scrollPosSkins', this.container.y);
    });

    this.add.image(width / 15, height - 80, 'boton_volver')
      .setDisplaySize(125, 125)
      .setScrollFactor(0)
      .setDepth(11)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
          this.registry.set('scrollPosSkins', 0);
          this.scene.start('MenuScene'); 
      });
  }

  crearTarjetaSkin(x, y, skinData, w, h) {
    const T = TEXTOS[this.lang];
    const listaDesbloqueadas = this.playerData?.skinsDesbloqueadas || [];
    const estaDesbloqueada = listaDesbloqueadas.includes(skinData.id);
    const esEquipada = this.playerData?.accesorioEquipado === skinData.id;
    const precio = skinData.precioReal || 0;
    
    const group = this.add.container(x, y);
    const fondoImg = this.add.image(0, 0, 'contenedor_skin');
    fondoImg.setDisplaySize(w, h);
    group.add(fondoImg);

    const skinIcon = this.add.image(0, -40, skinData.imagen || skinData.id);
    skinIcon.setDisplaySize(140, 140);
    group.add(skinIcon);

    const txtNombre = this.add.text(0, 50, skinData.nombre, { 
        font: 'bold 24px Arial', fill: '#ffffff', align: 'center', wordWrap: { width: w - 20 }
    }).setOrigin(0.5);
    group.add(txtNombre);

    const btnY = 120;
    const tinteColor = estaDesbloqueada ? (esEquipada ? 0x88ff88 : 0xff6666) : 0xe0b3ff;
    const btnImg = this.add.image(0, btnY, 'boton_precio').setDisplaySize(w - 150, 50).setTint(tinteColor).setInteractive({ useHandCursor: true });
    group.add(btnImg);

    if (estaDesbloqueada) {
        let textoBtn = esEquipada ? T.btnEquipado : T.btnEquipar;
        const txtBtn = this.add.text(0, btnY, textoBtn, { font: 'bold 20px Arial', fill: '#111111' }).setOrigin(0.5);
        group.add(txtBtn);
    } else {
        const txtBtn = this.add.text(0, btnY, `${precio}`, { font: 'bold 20px Arial', fill: '#111111' }).setOrigin(0, 0.5);
        const iconSize = 25;
        const spacing = 8;
        const totalWidth = txtBtn.width + spacing + iconSize;
        txtBtn.x = -(totalWidth / 2);
        group.add(txtBtn);
        
        // Mantenemos la imagen 'encebollado' visualmente
        const iconMoneda = this.add.image(-(totalWidth / 2) + txtBtn.width + spacing + (iconSize / 2), btnY, 'encebollado').setDisplaySize(iconSize, iconSize);
        group.add(iconMoneda);
    }

    btnImg.on('pointerdown', async () => {
        if (estaDesbloqueada) {
            await equiparSkinEnFirebase(skinData.id);
            this.scene.restart();
        } else {
            // Refrescamos datos antes de comprar para asegurar saldo actual
            const playerActualizado = await obtenerDatosJugador();
            if(playerActualizado) this.playerData = playerActualizado;
            
            // Validamos contra 'moneda' (Encebollados)
            if (this.obtenerSaldo() >= precio) {
                this.mostrarConfirmacion(skinData, precio);
            } else {
                this.mostrarNotificacion(T.fondosInsuficientes, '#ff0000');
            }
        }
    });

    this.container.add(group);
  }

  mostrarConfirmacion(skinData, precio) {
    const T = TEXTOS[this.lang];
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const modalBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8).setScrollFactor(0).setDepth(100);
    const panel = this.add.container(width / 2, height / 2).setDepth(101).setScrollFactor(0);
    panel.add(this.add.rectangle(0, 0, 400, 250, 0x2c2c2c).setStrokeStyle(4, 0xe0b3ff));
    panel.add(this.add.text(0, -60, `${T.confirmar}${precio}?`, { font: '24px Arial', fill: '#ffffff' }).setOrigin(0.5));

    const btnSi = this.add.rectangle(-80, 50, 120, 50, 0x88ff88).setInteractive({ useHandCursor: true });
    btnSi.on('pointerdown', async () => {
        modalBg.destroy();
        panel.destroy();
        this.mostrarNotificacion(T.procesando, '#333333');
        
        const exito = await adquirirAccesorioEstetico(skinData.id, precio);
        if (exito) {
            this.mostrarNotificacion(T.pagoExitoso, '#00ff00');
            this.time.delayedCall(1000, () => this.scene.restart());
        } else {
            this.mostrarNotificacion(T.error, '#ff0000');
        }
    });
    panel.add(btnSi);
    panel.add(this.add.text(-80, 50, T.si, { font: 'bold 20px Arial', fill: '#000' }).setOrigin(0.5));

    const btnNo = this.add.rectangle(80, 50, 120, 50, 0xff6666).setInteractive({ useHandCursor: true });
    btnNo.on('pointerdown', () => {
        modalBg.destroy();
        panel.destroy();
        this.mostrarNotificacion(T.pagoCancelado, '#ff6666');
    });
    panel.add(btnNo);
    panel.add(this.add.text(80, 50, T.no, { font: 'bold 20px Arial', fill: '#fff' }).setOrigin(0.5));
  }

  mostrarNotificacion(mensaje, colorFondo) {
    const txt = this.add.text(this.cameras.main.width / 2, 200, mensaje, { 
      font: 'bold 28px Arial', fill: '#fff', backgroundColor: colorFondo, padding: {x:20, y:10}, align: 'center' 
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    this.time.delayedCall(2500, () => txt.destroy());
  }
}