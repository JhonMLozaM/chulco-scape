import Phaser from 'phaser';
import { iniciarSesionJugador, obtenerCatalogoSkins } from '../services/firebase.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  init() {
    this.datosJugador = null;
  }

  preload() {
    // --- 1. CREACIÓN DE LA INTERFAZ VISUAL DE CARGA ---
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.cameras.main.setBackgroundColor('#1a1a1a');

    // Cargar pantalla_carga primero para mostrarla lo antes posible
    this.load.image('pantalla_carga', 'assets/ui/juguito_mora.png');

    this.load.once('filecomplete-image-pantalla_carga', (key, type, texture) => {
      const bg = this.add.image(width / 2, height / 2, 'pantalla_carga');
      bg.setDisplaySize(width, height);
      bg.setDepth(-1); // Ubicar detrás de la barra de carga
    });

    const progressBarContainer = this.add.graphics();
    progressBarContainer.lineStyle(6, 0xffffff, 0.2);
    progressBarContainer.strokeRect(width / 2 - 320, height / 2 - 25, 640, 50);

    const progressBar = this.add.graphics();

    // --- 2. EVENTOS DE SEGUIMIENTO DE LA CARGA ---
    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x0095ff, 1);
      progressBar.fillRect(width / 2 - 310, height / 2 - 15, 620 * value, 30);
    });

    // --- 3. CARGA DE RECURSOS MULTIMEDIA (ASSETS) ---
    
    // UI y Fondos de Menú
    this.load.image('fondo_menu', 'assets/ui/fondo_menu.png');
    this.load.image('boton_jugar', 'assets/ui/btn_jugar.png');
    this.load.image('boton_pasebatalla', 'assets/ui/btn_pasebatalla.png');
    this.load.image('boton_mejoras', 'assets/ui/btn_mejoras.png');
    this.load.image('boton_config', 'assets/ui/btn_config.png');
    this.load.image('boton_sonido', 'assets/ui/btn_sonido.png');
    this.load.image('boton_nosonido', 'assets/ui/btn_nosonido.png');
    this.load.image('boton_skin', 'assets/ui/btn_skins.png');
    this.load.image('boton_ranked', 'assets/ui/btn_ranked.png');
    this.load.image('boton_precio', 'assets/ui/btn_precio.png');
    this.load.image('contenedor_ui', 'assets/ui/contenedor_ui.png');
    this.load.image('contenedor_skin', 'assets/ui/contenedor_skin.png');
    this.load.image('contenedor_objetos', 'assets/ui/contenedor_objetos.png');
    this.load.image('boton_volver', 'assets/ui/btn_volver.png');
    this.load.image('boton_pause', 'assets/ui/pause.png');
    this.load.image('encebollado', 'assets/ui/encebollado.png');
    this.load.image('deuda', 'assets/ui/deuda.png');
    this.load.image('dinero', 'assets/ui/dinero.png');
    this.load.image('boton_signout', 'assets/ui/signout.png');
    this.load.image('boton_pause', 'assets/ui/pause.png');

    this.load.image('interfaz_pase', 'assets/ui/interfaz_pase.png');
    this.load.image('juguito_mora', 'assets/ui/juguito_mora.png');
    // Mapas / Niveles
    this.load.image('fondo_nivel1', 'assets/ui/fondo_bahia.png');
    this.load.image('fondo_nivel2', 'assets/ui/fondo_centro.png');

    // Sprites de personajes y proyectiles
    this.load.image('vendedor', 'assets/sprites/comerciante.png');
    this.load.image('chulquero_moto', 'assets/sprites/cobrador_moto.png');
    this.load.image('cliente_hambriento', 'assets/sprites/cliente.png');
    this.load.image('proyectil_bolon', 'assets/sprites/bolon_verde.png');
    this.load.image('proyectil_humita', 'assets/sprites/humita.png');

    // Accesorios Estéticos
    this.load.image('skin_cucurucho', 'assets/sprites/skin_cucurucho.png');
    this.load.image('skin_diablo_huma', 'assets/sprites/skin_diablo_huma.png');
    this.load.image('skin_default', 'assets/sprites/sombrero.png');

    // Audio
    this.load.audio('musica_ambiente', 'assets/audio/tecno_sanjuanito_8bit.mp3');
    this.load.audio('musica_salsa', 'assets/audio/tecno_sanjuanito_8bit.mp3');
    this.load.audio('musica_cumbia', 'assets/audio/tecno_sanjuanito_8bit.mp3');
    this.load.audio('sonido_venta', 'assets/audio/caja_registradora.mp3');
    this.load.audio('sonido_moto', 'assets/audio/moto_acelerando.mp3');

    //  CARGA DE SPRITESHEETS SKIN BASE
    this.load.atlas('vagabundo', 'assets/sprites/vagabundo.png', 'assets/spritesheets/vagabundo.json');

  }

  // --- 4. CARGA ASÍNCRONA DE DATOS (FIREBASE) ---
  async create() {
    try {
      console.log("Conectando con Firebase...");

      // Cargar catálogo de skins primero
      const catalogo = await obtenerCatalogoSkins();

      // Guardamos la información en el registro global de Phaser
      this.registry.set('catalogoSkins', catalogo || []);
      
      // Inicializar idioma si no está establecido aún
      if (!this.registry.get('language')) {
        this.registry.set('language', 'es');
      }

      console.log("Catálogo cargado. Iniciando HomeScene...");
      this.scene.start('HomeScene');

    } catch (error) {
      console.error("Error crítico de red al conectar con Firebase:", error);
      // Opcional: Mostrar un texto de error en pantalla
      this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 + 100, 
        'Error de conexión. Revisa tu internet.', 
        { fill: '#ff0000', font: '24px Arial' }
      ).setOrigin(0.5);
    }
  }
}