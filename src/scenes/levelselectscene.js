import Phaser from 'phaser';
import { CONFIG_NIVELES } from '../data/configniveles.js';

export default class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelectScene');
  }

  create() {
    const vistaAncho = this.cameras.main.width;
    const vistaAlto = this.cameras.main.height;

    // Fondo del menú del selector (Gris oscuro elegante a juego con el boot)
    this.add.rectangle(0, 0, vistaAncho, vistaAlto, 0x1a1a1a).setOrigin(0, 0);

    // Título de la escena
    this.add.text(vistaAncho / 2, 80, 'SELECCIONA TU DESTINO', {
      font: 'bold 48px Arial',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    // Renderizado dinámico de tarjetas de nivel basadas en la Configuración
    const nivelesArray = Object.values(CONFIG_NIVELES);
    const totalNiveles = nivelesArray.length;

    nivelesArray.forEach((nivel, index) => {
      // Cálculo para centrar y espaciar horizontalmente de forma balanceada las tarjetas
      let espacioEntreTarjetas = 360;
      let inicioX = (vistaAncho / 2) - ((totalNiveles - 1) * espacioEntreTarjetas / 2);
      let posX = inicioX + (index * espacioEntreTarjetas);
      let posY = vistaAlto / 2;

      // Contenedor / Botón de la tarjeta del nivel
      let tarjetaBoton = this.add.rectangle(posX, posY, 320, 220, 0x16213e)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(4, 0x0095ff);

      let textoNivel = this.add.text(posX, posY - 30, nivel.nombre, {
        font: 'bold 32px Arial', 
        fill: '#ffffff',
        align: 'center'
      }).setOrigin(0.5);

      let textoClick = this.add.text(posX, posY + 40, '¡EMPEZAR!', {
        font: 'bold 24px Arial', 
        fill: '#ffcc00' // Color amarillo tricolor llamativo
      }).setOrigin(0.5);

      // Efecto Visual Hover (Pointer Over)
      tarjetaBoton.on('pointerover', () => {
        tarjetaBoton.setFillStyle(0x0f3460);
        tarjetaBoton.setScale(1.05);
        textoNivel.setScale(1.05);
        textoClick.setScale(1.05);
      });

      // Efecto Visual Regreso (Pointer Out)
      tarjetaBoton.on('pointerout', () => {
        tarjetaBoton.setFillStyle(0x16213e);
        tarjetaBoton.setScale(1.0);
        textoNivel.setScale(1.0);
        textoClick.setScale(1.0);
      });

      // === CORRECCIÓN AQUÍ ===
      // Enviamos las claves exactas que GameScene y la física necesitan procesar
      tarjetaBoton.on('pointerdown', () => {
        this.scene.start('GameScene', { 
          levelKey: nivel.clave,       // Pasará "nivel_1" o "nivel_2"
          mapaElegido: nivel.fondoKey  // Pasará "fondo_nivel1" o "fondo_nivel2" para pintar el sprite correcto
        });
      });
    });

    // Botón para volver atrás
    const btnVolver = this.add.text(vistaAncho / 2, vistaAlto - 80, '← VOLVER AL MENÚ', {
      font: 'bold 28px Arial', 
      fill: '#cccccc'
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
    
    btnVolver.on('pointerover', () => btnVolver.setStyle({ fill: '#ffffff' }));
    btnVolver.on('pointerout', () => btnVolver.setStyle({ fill: '#cccccc' }));
    
    btnVolver.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    // Entrada fluida
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }
}