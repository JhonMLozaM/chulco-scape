import Phaser from 'phaser';
import { iniciarSesionJugador } from '../services/firebase.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    // Registramos el nombre único de la escena en el motor de Phaser
    super('BootScene');
  }

  init() {
    // Almacenaremos los datos del jugador de Firebase a nivel global en el registro de Phaser
    this.datosJugador = null;
  }

  preload() {
    // --- 1. CREACIÓN DE LA INTERFAZ VISUAL DE CARGA ---
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Fondo gris oscuro elegante para la pantalla de carga
    this.cameras.main.setBackgroundColor('#1a1a1a');

    // Texto de "Cargando..." con tipografía adaptable
    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 100,
      text: 'Cargando el Ecuador...',
      style: {
        font: '48px sans-serif',
        fill: '#ffffff'
      }
    }).setOrigin(0, 5);

    // Texto de porcentaje (0%)
    const percentText = this.make.text({
      x: width / 2,
      y: height / 2 + 50,
      text: '0%',
      style: {
        font: '36px sans-serif',
        fill: '#ffcc00' // Color amarillo tricolor
      }
    }).setOrigin(0.5, 0.5);

    // Contenedor externo de la barra de carga (Borde)
    const progressBarContainer = this.add.graphics();
    progressBarContainer.lineStyle(6, 0xffffff, 0.2);
    progressBarContainer.strokeRect(width / 2 - 320, height / 2 - 25, 640, 50);

    // Barra de progreso interna dinámica (Se irá llenando)
    const progressBar = this.add.graphics();

    // --- 2. EVENTOS DE SEGUIMIENTO DE LA CARGA ---
    // Este evento se dispara automáticamente en cada fotograma mientras bajan los archivos
    this.load.on('progress', (value) => {
      percentText.setText(parseInt(value * 100) + '%');
      progressBar.clear();
      progressBar.fillStyle(0x0095ff, 1); // Azul tricolor ecuatoriano
      // Dibuja el rectángulo interno proporcionalmente al progreso (0 a 1)
      progressBar.fillRect(width / 2 - 310, height / 2 - 15, 620 * value, 30);
    });

    // Evento opcional para debug: Muestra en consola qué archivo específico se está cargando
    this.load.on('fileprogress', (file) => {
      loadingText.setText('Trayendo: ' + file.key);
    });

    // --- 3. CARGA DE RECURSOS MULTIMEDIA (ASSETS) ---
    // Ubicados en la carpeta /public/assets/ del proyecto
    
    // UI y Fondos
    this.load.image('fondo_menu', 'assets/ui/fondo_menu.png');
    this.load.image('fondo_bahia', 'assets/ui/fondo_bahia.png'); // Mapa Fase 1
    this.load.image('boton_jugar', 'assets/ui/boton_jugar.png');
    this.load.image('interfaz_pase', 'assets/ui/interfaz_pase.png');

    // Sprites de personajes y proyectiles
    this.load.image('vendedor', 'assets/sprites/comerciante.png');
    this.load.image('chulquero_moto', 'assets/sprites/cobrador_moto.png');
    this.load.image('cliente_hambriento', 'assets/sprites/cliente.png');
    this.load.image('proyectil_bolon', 'assets/sprites/bolon_verde.png');
    this.load.image('proyectil_humita', 'assets/sprites/humita.png');

    // Accesorios Estéticos (Skins del Pase/Tienda)
    this.load.image('skin_cucurucho', 'assets/sprites/skin_cucurucho.png');
    this.load.image('skin_diablo_huma', 'assets/sprites/skin_diablo_huma.png');
    this.load.image('sombrero_paja_toquilla_base', 'assets/sprites/sombrero.png');

    // Audio y Efectos de Sonido
    this.load.audio('musica_ambiente', 'assets/audio/tecno_sanjuanito_8bit.mp3');
    this.load.audio('sonido_venta', 'assets/audio/caja_registradora.mp3');
    this.load.audio('sonido_moto', 'assets/audio/moto_acelerando.mp3');

    // --- 4. ASINCRONÍA CON FIREBASE ---
    // Iniciamos la conexión con la base de datos en paralelo a la descarga visual de assets
    this.conectarFirebase();
  }

  async conectarFirebase() {
    try {
      // Llamamos al servicio anónimo de Firebase
      const datos = await iniciarSesionJugador();
      this.datosJugador = datos;
    } catch (error) {
      console.error("Fallo crítico de red al conectar con chulco-scape-game:", error);
    }
  }

  create() {
    // Al finalizar la carga física de recursos, verificamos si Firebase terminó su trabajo
    if (this.datosJugador) {
      this.pasarAlMenu();
    } else {
      // Si la conexión de red es un poco lenta, creamos un bucle de espera corto
      this.time.addEvent({
        delay: 500,
        callback: () => {
          if (this.datosJugador) this.pasarAlMenu();
        },
        loop: true
      });
    }
  }

  pasarAlMenu() {
    // Almacenamos los datos iniciales recuperados en la memoria global de Phaser
    // Esto permitirá que 'MenuScene' o 'ShopScene' los lean sin volver a consultar internet
    this.registry.set('playerData', this.datosJugador);

    // Detenemos esta escena y arrancamos el menú principal
    this.scene.start('MenuScene');
  }
}