import Phaser from 'phaser';
import { CONFIG_NIVELES } from '../data/configniveles.js';
import { getT } from '../i18n.js';

export default class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelectScene');
  }

  create() {
    const vistaAncho = this.cameras.main.width;
    const vistaAlto = this.cameras.main.height;

    const lang = this.registry.get('language') || 'es';
    const T = getT(lang);

    // Fondo del menú del selector (Gris oscuro elegante a juego con el boot)
    this.add.rectangle(0, 0, vistaAncho, vistaAlto, 0x1a1a1a).setOrigin(0, 0);

    // Título de la escena en grande (Traducible)
    this.add.text(vistaAncho / 2, 70, T.selDestino.toUpperCase(), {
      fontFamily: 'Arial',
      fontSize: '48px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(2);

    // --- CONTENEDOR UI (Fondo del espacio para los niveles, +10% ancho, +70% alto) ---
    const panelX = vistaAncho / 2;
    const panelY = vistaAlto / 2;
    const panelW = Math.min(vistaAncho - 4, 1160 * 1.10); // 1276 px (10% más ancho)
    const panelH = Math.min(vistaAlto - 4, 430 * 1.70);  // 731 px -> Clampeado al alto máximo para mantenerse elegante

    const panelBg = this.add.image(panelX, panelY, 'contenedor_objetos');
    panelBg.setDisplaySize(panelW * 0.95, panelH);
    panelBg.setDepth(1);

    // --- CONTENEDOR SCROLLABLE ---
    this.nivelesContenedor = this.add.container(0, 0);
    this.nivelesContenedor.setDepth(2);

    // Máscara de recorte geométrica vertical (recorta entre el título y el botón de volver)
    const maskShape = this.add.graphics();
    maskShape.fillRect(panelX - panelW / 2 + 10, 115, panelW - 20, 460);
    const mask = maskShape.createGeometryMask();
    this.nivelesContenedor.setMask(mask);

    // Renderizado dinámico en formato Grid
    const nivelesArray = Object.values(CONFIG_NIVELES);
    const totalNiveles = nivelesArray.length;

    // Tarjetas 20% más pequeñas para ingresar exactamente 3 por fila
    const cardW = 240; // 300 * 0.8
    const cardH = 272; // 340 * 0.8
    const cols = 3;
    const gapX = 80;
    const gapY = 40;
    const startY = 240; // Y de la primera fila

    const gridW = (cols - 1) * (cardW + gapX); // Ancho total de las columnas del grid

    nivelesArray.forEach((nivel, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const posX = panelX - gridW / 2 + col * (cardW + gapX);
      const posY = startY + row * (cardH + gapY);

      // Grupo del nivel individual
      const group = this.add.container(posX, posY);

      // Tarjeta base (contenedor_skin, 20% más pequeña)
      const cardBg = this.add.image(0, 0, 'contenedor_skin')
        .setDisplaySize(cardW, cardH)
        .setInteractive({ useHandCursor: true });
      group.add(cardBg);

      // Vista previa visual del mapa (proporcionalmente más pequeña)
      const previewImg = this.add.image(0, -36, nivel.fondoKey)
        .setDisplaySize(cardW - 35, 120);
      group.add(previewImg);

      // Nombre del nivel (sin traducir, respetando la cultura del Ecuador, proporciones reducidas)
      const textoNivel = this.add.text(0, 44, nivel.nombre.toUpperCase(), {
        fontFamily: 'Arial',
        fontSize: '19px',
        fontStyle: 'bold',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 5,
        align: 'center'
      }).setOrigin(0.5);
      group.add(textoNivel);

      // Botón "Empezar" (boton_precio con tintado tricolor amarillo, proporciones reducidas)
      const btnY = 92;
      const btnImg = this.add.image(0, btnY, 'boton_precio')
        .setDisplaySize(cardW - 80, 40)
        .setTint(0xffcc00)
        .setInteractive({ useHandCursor: true });
      group.add(btnImg);

      const textoEmpezar = this.add.text(0, btnY, T.selEmpezar, {
        fontFamily: 'Arial',
        fontSize: '16px',
        fontStyle: 'bold',
        fill: '#111111'
      }).setOrigin(0.5);
      group.add(textoEmpezar);

      // Animación e interacción de Hover (Escalado suave del grupo de tarjeta)
      const applyHover = () => {
        this.tweens.add({
          targets: group,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 100
        });
        btnImg.setTint(0xffe680); // Brillo más claro al hover
      };

      const removeHover = () => {
        this.tweens.add({
          targets: group,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 100
        });
        btnImg.setTint(0xffcc00); // Restablecer amarillo original
      };

      cardBg.on('pointerover', applyHover);
      cardBg.on('pointerout', removeHover);
      btnImg.on('pointerover', applyHover);
      btnImg.on('pointerout', removeHover);

      // Acción al dar click (Empezar nivel respetando datos pasados)
      const iniciarNivel = () => {
        this.tweens.add({
          targets: group,
          scaleX: 0.95,
          scaleY: 0.95,
          duration: 60,
          yoyo: true,
          onComplete: () => {
            this.scene.start('GameScene', { 
              levelKey: nivel.clave,
              mapaElegido: nivel.fondoKey
            });
          }
        });
      };

      cardBg.on('pointerdown', iniciarNivel);
      btnImg.on('pointerdown', iniciarNivel);

      // Añadir la tarjeta al contenedor scrollable
      this.nivelesContenedor.add(group);
    });

    // --- CONTROL DE SCROLL VERTICAL ---
    // Cálculo del límite de scroll dinámico según la cantidad de filas en el grid
    const totalRows = Math.ceil(totalNiveles / cols);
    const gridBottom = startY + (totalRows - 1) * (cardH + gapY) + cardH / 2;
    const visibleBottom = 575;
    this.scrollLimit = Math.min(0, -(gridBottom - visibleBottom + 40));

    // Scroll vertical con la rueda del mouse (deltaY)
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      this.nivelesContenedor.y = Phaser.Math.Clamp(
        this.nivelesContenedor.y - deltaY * 0.5,
        this.scrollLimit,
        0
      );
    });

    // Scroll vertical táctil mediante arrastre (pointer drag)
    let dragStartY = 0;
    let containerStartY = 0;
    
    this.input.on('pointerdown', (pointer) => {
      if (pointer.x > panelX - panelW / 2 && pointer.x < panelX + panelW / 2) {
        dragStartY = pointer.y;
        containerStartY = this.nivelesContenedor.y;
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (!pointer.isDown) return;
      if (pointer.x > panelX - panelW / 2 && pointer.x < panelX + panelW / 2) {
        const dy = pointer.y - dragStartY;
        this.nivelesContenedor.y = Phaser.Math.Clamp(
          containerStartY + dy,
          this.scrollLimit,
          0
        );
      }
    });

    // --- BOTÓN DE VOLVER (Estandarizado en posición y tamaño idéntico a ConfigScene y ShopScene) ---
    this.add.image(vistaAncho / 15, vistaAlto - 80, 'boton_volver')
      .setDisplaySize(125, 125)
      .setScrollFactor(0)
      .setDepth(11)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.start('MenuScene');
      });

    // Entrada fluida
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }
}