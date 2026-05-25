import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    // Nombre único para registrar la escena en el motor de Phaser
    super('MenuScene');
  }

  create() {
    // 1. OBTENER DATOS DEL JUGADOR DESDE EL REGISTRO GLOBAL
    // Leemos los datos que BootScene descargó de Firebase de forma segura
    const playerData = this.registry.get('playerData');

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 2. ELEMENTOS VISUALES DE FONDO Y MÚSICA
    // Colocamos el fondo centrado en la pantalla vertical
    this.add.image(width / 2, height / 2, 'fondo_menu').setDisplaySize(width, height);

    // Encendemos e inicializamos la música ambiente en bucle (tecno-sanjuanito)
    // Usamos un validador para que si la música ya está sonando no se duplique al volver al menú
    if (!this.sound.get('musica_ambiente')) {
      const musica = this.sound.add('musica_ambiente', { loop: true, volume: 0.5 });
      musica.play();
    }

    // 3. MOSTRAR ESTADÍSTICAS EN TIEMPO REAL TRICOLOR
    // Marcador de Monedas
    this.add.text(80, 80, `💰 Monedas: $${playerData.monedas}`, {
      font: 'bold 42px Arial',
      fill: '#ffcc00' // Amarillo
    });

    // Marcador de Deuda con el Chulquero
    this.add.text(80, 140, `🚨 Deuda: $${playerData.deudaActual}`, {
      font: 'bold 42px Arial',
      fill: '#ff3333' // Rojo de peligro
    });

    // Nivel del Pase de Temporada
    this.add.text(80, 200, `🎟️ Pase Nivel: ${playerData.paseNivel}`, {
      font: 'bold 36px Arial',
      fill: '#0095ff' // Azul
    });

    // Título Principal del Juego con sombra estética
    const titulo = this.add.text(width / 2, height * 0.25, '¡CUIDADO CON\nEL CHULCO!', {
      font: 'bold 84px Arial',
      fill: '#ffffff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 10
    }).setOrigin(0.5);

    // Subtítulo folclórico
    this.add.text(width / 2, height * 0.35, '- El Gran Escape de la Bahía -', {
      font: 'italic 38px Arial',
      fill: '#ffcc00'
    }).setOrigin(0.5);

    // 4. INTERFAZ DE BOTONES TÁCTILES (MÓVIL / WEB)
    
    // Botón: ¡A CORRER! (Iniciar partida)
    const btnJugar = this.crearBoton(width / 2, height * 0.55, '¡EMPEZAR HUIDA!', '#00ff66')
      .on('pointerdown', () => {
        this.scene.start('GameScene'); // Lanza la Fase 1 del gameplay
      });

    // Botón: EL PASE DEL CHULLA (Pase de Temporada Premium)
    const btnPase = this.crearBoton(width / 2, height * 0.67, 'PASE DEL CHULLA', '#0095ff')
      .on('pointerdown', () => {
        this.scene.start('SeasonPassScene'); // Abre la pantalla del pase de recompensas
      });

    // Botón: MEJORAS Y CHULQUERO (Tienda táctica)
    const btnTienda = this.crearBoton(width / 2, height * 0.79, 'NEGOCIAR / MEJORAS', '#ff9900')
      .on('pointerdown', () => {
        this.scene.start('ShopScene'); // Va al gestor de economía o abonos a la deuda
      });

    // 5. ANIMACIÓN SUTIL DE ENTRADA (Efecto "Fade In")
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  /**
   * Función helper reutilizable para maquetar botones estilizados de Phaser 
   * adaptados al tacto móvil y con feedbacks interactivos.
   */
  crearBoton(x, y, texto, colorHex) {
    const botonTexto = this.add.text(x, y, texto, {
      font: 'bold 46px Arial',
      fill: '#ffffff',
      backgroundColor: colorHex,
      padding: { x: 40, y: 25 },
      align: 'center'
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true }); // Habilita clics y toques táctiles

    // --- EFECTOS VISUALES AL TOCAR EL BOTÓN ---
    // Al pasar el dedo/mouse por encima (Feedback visual)
    botonTexto.on('pointerover', () => {
      botonTexto.setStyle({ fill: '#1a1a1a' });
      botonTexto.setScale(1.05); // Aumenta levemente el tamaño
    });

    // Al quitar el dedo/mouse
    botonTexto.on('pointerout', () => {
      botonTexto.setStyle({ fill: '#ffffff' });
      botonTexto.setScale(1.0); // Regresa a su tamaño original
    });

    return botonTexto;
  }
}