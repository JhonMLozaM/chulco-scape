import Phaser from 'phaser';
import { guardarResultadoRonda, actualizarDeuda, obtenerCatalogoSkins, obtenerDatosJugador } from '../services/firebase.js'; // Asegúrate de exportar obtenerDatosJugador
import { CONFIG_NIVELES } from '../data/configniveles.js'; 
import Jugador from '../components/jugador.js';
import Chulquero from '../components/chulquero.js';
import ControlesMobile from '../components/controlesmobile.js';
import { getT } from '../i18n.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    const levelKey = data.levelKey || 'bahia';
    this.datosNivelActual = CONFIG_NIVELES[levelKey];

    if (!this.datosNivelActual) {
      this.datosNivelActual = CONFIG_NIVELES['bahia'];
    }
    this.juegoCargado = false;
    // Inicializamos con lo que haya en el registro (placeholder)
    this.playerData = this.registry.get('playerData');
    this.catalogoSkins = this.registry.get('catalogoSkins') || [];
    
    this.tiempoRestante = 180;
    this.oleadaActual = 1;
    this.cantidadSpawn = 1;
    this.delayBaseChulqueros = 3500; 

    this.monedasGanadasRonda = 0;
    this.xpGanadaRonda = 0;
    this.juegoTerminado = false;
    this.enPeriodoTradeo = false;

    this.ultimoDisparo = 0;
    this.cooldownDisparo = 250; 
  }

  async create() {
    // 1. Mostrar pantalla de carga
    const vistaAncho = this.cameras.main.width;
    const vistaAlto = this.cameras.main.height;

    const cachedPlayer = this.registry.get('playerData');
    const equippedPantalla = cachedPlayer?.pantallaCargaEquipada || 'pantalla_default';
    const catalogo = this.registry.get('catalogoSkins') || [];
    const itemPantalla = catalogo.find(item => item.id === equippedPantalla);
    const loadingTextureKey = itemPantalla ? (itemPantalla.imagen || itemPantalla.id) : 'fondo_nivel1';

    const loadingBg = this.add.image(vistaAncho / 2, vistaAlto / 2, loadingTextureKey)
        .setDisplaySize(vistaAncho, vistaAlto)
        .setDepth(999)
        .setScrollFactor(0); // Añadido ScrollFactor 0

    const loadingOverlay = this.add.rectangle(vistaAncho / 2, vistaAlto / 2, vistaAncho, vistaAlto, 0x000000, 0.4)
        .setDepth(999)
        .setScrollFactor(0); // Añadido ScrollFactor 0
        
    const lang = this.registry.get('language') || 'es';
    this._T = getT(lang);
    const T = this._T;

    const loadingText = this.add.text(vistaAncho / 2, vistaAlto / 2, T.gameCargando, { 
        font: 'bold 44px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5).setDepth(1000).setScrollFactor(0); // Añadido ScrollFactor 0

    try {
        // 2. Fetch de datos en tiempo real
        this.playerData = await obtenerDatosJugador();
        this.catalogoSkins = await obtenerCatalogoSkins();
        
        // Actualizamos el registro con los nuevos datos
        this.registry.set('playerData', this.playerData);
        this.registry.set('catalogoSkins', this.catalogoSkins);
        
        console.log("Datos actualizados de Firebase:", this.playerData);
    } catch (error) {
        console.error("Error al cargar datos:", error);
    } finally {
        loadingBg.destroy();
        loadingOverlay.destroy();
        loadingText.destroy();
    }

    // Asegurarse de reproducir la música equipada
    const keyMusica = this.playerData?.musicaEquipada || 'musica_ambiente';
    this.sound.getAll().forEach(snd => {
      if (snd.key && snd.key.startsWith('musica_') && snd.key !== keyMusica) {
        snd.stop();
      }
    });
    let musica = this.sound.get(keyMusica);
    if (!musica) {
      musica = this.sound.add(keyMusica, { loop: true, volume: 0.5 });
      musica.play();
    } else if (!musica.isPlaying) {
      musica.play();
    }

    // --- CONTINUACIÓN NORMAL DEL JUEGO CON DATOS YA CARGADOS ---
    this.nivelVelocidad = this.playerData?.mejoras?.velocidad || 1;
    this.nivelDanio = this.playerData?.mejoras?.danioBolon || 1;
    this.idSkinEquipada = this.playerData?.accesorioEquipado || 'skin_default';

    this.mapaAncho = vistaAncho * this.datosNivelActual.mapaAnchoFactor;
    this.mapaAlto = vistaAlto * this.datosNivelActual.mapaAltoFactor;

    this.physics.world.setBounds(0, 0, this.mapaAncho, this.mapaAlto);

    let fondo = this.add.image(0, 0, this.datosNivelActual.fondoKey).setOrigin(0, 0);
    fondo.setDisplaySize(this.mapaAncho, this.mapaAlto);

    this.edificios = this.physics.add.staticGroup();
    if (this.datosNivelActual.edificios && Array.isArray(this.datosNivelActual.edificios)) {
      this.datosNivelActual.edificios.forEach((conf) => {
        let edificio = this.add.rectangle(conf.x, conf.y, conf.w, conf.h, 0xff0000, 0.6).setOrigin(0, 0);
        this.physics.add.existing(edificio, true);
        this.edificios.add(edificio);
      });
    }

    this.velocidadJugador = 300 + (this.nivelVelocidad * 30);
    
    // --- CREACIÓN DEL JUGADOR ---
    this.jugador = new Jugador(this, this.mapaAncho / 2, this.mapaAlto / 2, this.playerData);

    this.cameras.main.setBounds(0, 0, this.mapaAncho, this.mapaAlto);
    this.cameras.main.startFollow(this.jugador, true, 0.1, 0.1);

    this.chulqueros = this.physics.add.group();
    this.clientes = this.physics.add.group();
    this.proyectiles = this.physics.add.group();

    this.textoTiempo = this.add.text(30, 30, `⏱️ ${T.gameOleada} 1 - 03:00`, { font: 'bold 36px Arial', fill: '#ffffff' }).setScrollFactor(0).setDepth(100);
    this.textoGanancia = this.add.text(30, 85, `${T.gameVentas}0`, { font: 'bold 36px Arial', fill: '#ffcc00' }).setScrollFactor(0).setDepth(100);

    // Botón de Pausa y registro de tecla ESC
    this.lang = lang;
    this.juegoPausado = false;
    this.btnPausa = this.add.image(vistaAncho - 60, 60, 'boton_pause')
      .setDisplaySize(80, 80)
      .setScrollFactor(0)
      .setDepth(101)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.alternarPausa());

    this.teclaEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.timerReloj = this.time.addEvent({ delay: 1000, callback: this.actualizarReloj, callbackScope: this, loop: true });
    this.timerChulqueros = this.time.addEvent({ delay: this.delayBaseChulqueros, callback: this.spawnChulquero, callbackScope: this, loop: true });
    this.timerClientes = this.time.addEvent({ delay: 4500, callback: this.spawnCliente, callbackScope: this, loop: true });

    this.esMovil = !this.sys.game.device.os.desktop;

    this.teclasWASD = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W, left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S, right: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.teclasFlechas = this.input.keyboard.createCursorKeys();

    if (this.esMovil) {
      this.controlesMobileComp = new ControlesMobile(this);
    }

    this.physics.add.overlap(this.jugador, this.chulqueros, this.colisionJugadorChulquero, null, this);
    this.physics.add.overlap(this.proyectiles, this.chulqueros, this.colisionComidaChulquero, null, this);
    this.physics.add.overlap(this.jugador, this.clientes, this.colisionJugadorCliente, null, this);
    this.physics.add.overlap(this.proyectiles, this.clientes, this.colisionProyectilCliente, null, this);

    this.physics.add.collider(this.jugador, this.edificios);
    this.physics.add.collider(this.chulqueros, this.edificios);
    this.physics.add.collider(this.proyectiles, this.edificios, this.colisionProyectilEdificio, null, this);

    this.cameras.main.fadeIn(400);

    this.juegoCargado = true;
  }

  dispararHacia(objetivoX, objetivoY) {
    if (this.juegoTerminado || this.enPeriodoTradeo || this.juegoPausado) return;
    
    let tipoProyectil = 'proyectil_bolon';
    const equippedDisparo = this.playerData?.disparoEquipado;
    if (equippedDisparo === 'disparo_humita') {
      tipoProyectil = 'proyectil_humita';
    } else if (equippedDisparo === 'disparo_empanada') {
      tipoProyectil = 'proyectil_bolon'; 
    } else {
      tipoProyectil = Phaser.Math.Between(0, 1) === 0 ? 'proyectil_bolon' : 'proyectil_humita';
    }

    const proyectil = this.proyectiles.create(this.jugador.x, this.jugador.y, tipoProyectil).setDisplaySize(40, 40);
    this.physics.moveTo(proyectil, objetivoX, objetivoY, 700);
  }

  dispararEnMovil() {
    if (this.juegoPausado) return;
    if (this.controlesMobileComp && this.controlesMobileComp.joystickActivo) {
      const comp = this.controlesMobileComp;
      const angulo = Phaser.Math.Angle.Between(comp.joystickX, comp.joystickY, comp.joystickPalanca.x, comp.joystickPalanca.y);
      this.dispararHacia(this.jugador.x + Math.cos(angulo) * 300, this.jugador.y + Math.sin(angulo) * 300);
    } else {
      const masCercano = this.chulqueros.getLength() > 0 ? this.physics.closest(this.jugador, this.chulqueros.getChildren()) : null;
      masCercano ? this.dispararHacia(masCercano.x, masCercano.y) : this.dispararHacia(this.jugador.x + 300, this.jugador.y);
    }
  }

  update(time, delta) {
    if (!this.juegoCargado || this.juegoTerminado || this.enPeriodoTradeo) return;

    if (Phaser.Input.Keyboard.JustDown(this.teclaEsc)) {
      this.alternarPausa();
    }

    if (this.juegoPausado) return;

    this.jugador.update();

    if (!this.esMovil && this.input.activePointer.isDown && time > this.ultimoDisparo) {
      this.dispararHacia(this.input.activePointer.worldX, this.input.activePointer.worldY);
      this.ultimoDisparo = time + this.cooldownDisparo;
    }

    if (!this.esMovil || (this.controlesMobileComp && !this.controlesMobileComp.joystickActivo)) {
      let vX = 0, vY = 0;
      if (this.teclasWASD.left.isDown || this.teclasFlechas.left.isDown) vX = -1;
      else if (this.teclasWASD.right.isDown || this.teclasFlechas.right.isDown) vX = 1;

      if (this.teclasWASD.up.isDown || this.teclasFlechas.up.isDown) vY = -1;
      else if (this.teclasWASD.down.isDown || this.teclasFlechas.down.isDown) vY = 1;

      if (vX !== 0 || vY !== 0) {
        this.jugador.moverHaciaPuntero({ x: this.jugador.x + vX * 100, y: this.jugador.y + vY * 100, isDown: true });
      } else {
        this.jugador.frenar();
      }
    }

    if (this.chulqueros) {
        this.chulqueros.getChildren().forEach(chulquero => chulquero.perseguirJugador(this.jugador));
    }  
  }

  actualizarReloj() {
    if (this.juegoTerminado || this.enPeriodoTradeo || this.juegoPausado) return;
    this.tiempoRestante--;
    
    const minutos = Math.floor(this.tiempoRestante / 60).toString().padStart(2, '0');
    const segundos = (this.tiempoRestante % 60).toString().padStart(2, '0');
    this.textoTiempo.setText(`⏱️ ${this._T.gameOleada} ${this.oleadaActual} - ${minutos}:${segundos}`);

    if (this.tiempoRestante % 30 === 0 && this.tiempoRestante > 0) {
      this.timerChulqueros.delay = Math.max(1000, this.timerChulqueros.delay - 300);
    }
    if (this.tiempoRestante <= 0) this.abrirEstadoDescanso();
  }

  abrirEstadoDescanso() {
    this.enPeriodoTradeo = true;
    this.physics.world.pause(); 
    if (this.timerReloj) this.timerReloj.paused = true;
    if (this.timerChulqueros) this.timerChulqueros.paused = true;
    if (this.timerClientes) this.timerClientes.paused = true;

    this.jugador.frenar();
    this.chulqueros.clear(true, true);
    this.clientes.clear(true, true);

    const vistaAncho = this.cameras.main.width;
    const vistaAlto = this.cameras.main.height;

    // Calcular el centro exacto de la cámara actual
    const centroX = this.cameras.main.scrollX + (vistaAncho / 2);
    const centroY = this.cameras.main.scrollY + (vistaAlto / 2);

    this.contenedorDescanso = this.add.container(0, 0).setDepth(300); // Quitamos ScrollFactor 0 para el contenedor base
    
    let fondoNegro = this.add.rectangle(centroX, centroY, vistaAncho, vistaAlto, 0x000000, 0.75)
        .setScrollFactor(0); // Mantenemos ScrollFactor 0 aquí
        
    this.contenedorDescanso.add(fondoNegro);

    this.imagenDescanso = this.add.image(centroX, centroY, 'juguito_mora')
        .setOrigin(0.5).setScale(0.8).setScrollFactor(0);
        
    this.contenedorDescanso.add(this.imagenDescanso);

    this.tiempoDescansoRestante = 30;
    
    this.textoContadorDescanso = this.add.text(centroX, centroY, this.tiempoDescansoRestante.toString(), {
      font: 'bold 120px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 8
    }).setOrigin(0.5).setScrollFactor(0);
    
    this.contenedorDescanso.add(this.textoContadorDescanso);

    this.timerVisualDescanso = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.tiempoDescansoRestante--;
        if (this.textoContadorDescanso && this.textoContadorDescanso.active) {
          this.textoContadorDescanso.setText(this.tiempoDescansoRestante);
          if (this.tiempoDescansoRestante <= 5) this.textoContadorDescanso.setFill('#ff3333');
        }
        if (this.tiempoDescansoRestante <= 0) {
          this.timerVisualDescanso.destroy();
          this.cerrarEstadoDescansoYContinuar();
        }
      },
      callbackScope: this,
      loop: true
    });
  }

  cerrarEstadoDescansoYContinuar() {
    if (this.contenedorDescanso) this.contenedorDescanso.destroy();
    this.enPeriodoTradeo = false;
    
    this.physics.world.resume();
    if (this.timerReloj) this.timerReloj.paused = false;
    if (this.timerChulqueros) this.timerChulqueros.paused = false;
    if (this.timerClientes) this.timerClientes.paused = false;
    
    this.textoGanancia.setText(`${this._T.gameVentas}${this.monedasGanadasRonda}`);
    this.activarSiguienteOleada();
  }

  activarSiguienteOleada() {
    this.oleadaActual++;
    this.cantidadSpawn += 2;
    this.tiempoRestante = 180;
    this.delayBaseChulqueros = Math.max(800, this.delayBaseChulqueros - 500);
    this.timerChulqueros.delay = this.delayBaseChulqueros;

    const vistaAncho = this.cameras.main.width;
    const vistaAlto = this.cameras.main.height;
    
    const centroX = this.cameras.main.scrollX + (vistaAncho / 2);
    const centroY = this.cameras.main.scrollY + (vistaAlto / 3);

    let avisoOleada = this.add.text(centroX, centroY, `⚠️ ${this._T.gameOleada.toUpperCase()} ${this.oleadaActual} ⚠️\n¡Cuidado!`, {
      font: 'bold 44px Arial', fill: '#ff3333', align: 'center', stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    this.tweens.add({
      targets: avisoOleada, alpha: 0, duration: 500, yoyo: true, repeat: 3,
      onComplete: () => avisoOleada.destroy()
    });
  }

  spawnChulquero() {
    if (this.juegoTerminado || this.enPeriodoTradeo || this.juegoPausado) return;
    for (let i = 0; i < this.cantidadSpawn; i++) {
      let x = Phaser.Math.Between(0, 1) === 0 ? 0 : this.mapaAncho;
      let y = Phaser.Math.Between(100, this.mapaAlto - 100);
      const chulquero = new Chulquero(this, x, y, 180).setDisplaySize(95, 95);
      this.chulqueros.add(chulquero);
    }
    this.sound.play('sonido_moto', { volume: 0.12 });
  }

  spawnCliente() {
    if (this.juegoTerminado || this.enPeriodoTradeo || this.juegoPausado) return;
    let posX = Phaser.Math.Between(100, this.mapaAncho - 100);
    let posY = Phaser.Math.Between(100, this.mapaAlto - 100);
    this.clientes.create(posX, posY, 'cliente_hambriento').setImmovable(true).setDisplaySize(85, 85);
  }

  colisionComidaChulquero(proyectil, chulquero) {
    proyectil.destroy(); 
    if (chulquero.recibirDanio(this.nivelDanio)) this.xpGanadaRonda += 25; 
  }

  colisionProyectilEdificio(proyectil, edificio) { proyectil.destroy(); }

  colisionProyectilCliente(proyectil, cliente) {
    proyectil.destroy();
    cliente.destroy();
    this.monedasGanadasRonda -= 10;
    
    if (this.playerData) {
      this.playerData.monedas -= 10;
      this.registry.set('playerData', this.playerData);
    }
    this.textoGanancia.setText(`${this._T.gameVentas}${this.monedasGanadasRonda}`);
    this.sound.play('sonido_venta', { volume: 0.6 });
  }

  colisionJugadorCliente(jugador, cliente) {
    cliente.destroy(); 
    this.monedasGanadasRonda += 50;
    this.xpGanadaRonda += 10;
    
    if (this.playerData) {
      this.playerData.monedas += 50; 
      this.registry.set('playerData', this.playerData);
    }
    
    this.textoGanancia.setText(`${this._T.gameVentas}${this.monedasGanadasRonda}`);
    this.sound.play('sonido_venta', { volume: 0.6 });
  }

  colisionJugadorChulquero(jugador, chulquero) {
    if (!this.enPeriodoTradeo && !this.juegoPausado) this.finalizarPartida(false, this._T.gameChulqueroAtrapo);
  }

  async finalizarPartida(victoria, mensaje) {
    if (this.juegoTerminado) return;
    this.juegoTerminado = true;

    this.physics.pause();
    this.timerReloj.destroy();
    this.timerChulqueros.destroy();
    this.timerClientes.destroy();
    if (this.controlesMobileComp) this.controlesMobileComp.destroy(); 

    if (this.jugador && !victoria && this.jugador.isBase) {
      this.jugador.frenar();
      this.jugador.isDying = true;
      this.jugador.setFlipX(false);
      this.jugador.play('vagabundo_morir');
      // Esperar 3 segundos (3000 ms) antes de proceder con el resto de la UI
      await new Promise(resolve => this.time.delayedCall(3000, resolve));
    }

    if (!victoria) {
        const penalizacion = 250; 
        await actualizarDeuda(penalizacion);
        if (this.playerData) {
            this.playerData.deudaActual = (this.playerData.deudaActual || 0) + penalizacion;
            this.registry.set('playerData', this.playerData);
        }
    }

    const vistaAncho = this.cameras.main.width;
    const vistaAlto = this.cameras.main.height;
    
    // Obtener la posición central de la cámara para que siempre se vea en pantalla
    const px = this.cameras.main.scrollX + (vistaAncho / 2);
    const py = this.cameras.main.scrollY + (vistaAlto / 2);

    this.add.rectangle(px, py, vistaAncho, vistaAlto, 0x000000, 0.75).setDepth(200);
    this.add.text(px, py - 100, mensaje, { font: 'bold 60px Arial', fill: victoria ? '#00ff66' : '#ff3333' }).setOrigin(0.5).setDepth(201);

    try {
      await guardarResultadoRonda(this.monedasGanadasRonda, this.xpGanadaRonda);
      
      if (this.playerData) {
        this.playerData.paseXP = (this.playerData.paseXP || 0) + this.xpGanadaRonda;
        this.registry.set('playerData', this.playerData);
      }
    } catch (e) { 
      console.error("Error guardando datos en Firebase: ", e); 
    }

    const btnSalir = this.add.text(px, py + 100, this._T.gameContinuar, {
      font: 'bold 44px Arial', fill: '#ffffff', backgroundColor: '#0095ff', padding: { x: 45, y: 18 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(201);

    btnSalir.on('pointerdown', () => this.scene.start('ShopScene'));
  }

  alternarPausa() {
    console.log("Juego en pausa");
    if (this.juegoTerminado || this.enPeriodoTradeo) return;
    
    if (this.juegoPausado) {
      this.reanudarJuego();
    } else {
      this.pausarJuego();
    }
  }

  pausarJuego() {
    this.juegoPausado = true;
    this.physics.world.pause();

    // Pausar todos los timers
    if (this.timerReloj) this.timerReloj.paused = true;
    if (this.timerChulqueros) this.timerChulqueros.paused = true;
    if (this.timerClientes) this.timerClientes.paused = true;

    // Detener movimiento del jugador
    if (this.jugador) this.jugador.frenar();

    const vistaAncho = this.cameras.main.width;
    const vistaAlto = this.cameras.main.height;
    
    // Obtener la posición del centro de la cámara
    const px = this.cameras.main.scrollX + (vistaAncho / 2);
    const py = this.cameras.main.scrollY + (vistaAlto / 2);

    // 1. Overlay oscuro (bloqueador interactivo) en las coordenadas del centro de la cámara
    this.overlayPausa = this.add.rectangle(px, py, vistaAncho, vistaAlto, 0x000000, 0.7)
      .setDepth(400)
      .setInteractive({ useHandCursor: false }) 
      .on('pointerdown', (pointer, localX, localY, event) => { 
           // Bloquea interacción de fondo
      });

    // 2. Contenedor de la interfaz, posicionado en la coordenada del centro de la cámara
    this.contenedorPausa = this.add.container(px, py).setDepth(401);

    // Panel
    const panel = this.add.image(0, 0, 'contenedor_objetos')
        .setDisplaySize(480, 420);
    this.contenedorPausa.add(panel);

    // Título
    const txtTitulo = this.add.text(0, -125, this._T.gamePausado || 'JUEGO PAUSADO', {
      fontFamily: 'Arial', fontSize: '36px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 5
    }).setOrigin(0.5);
    this.contenedorPausa.add(txtTitulo);

    // Botón Continuar
    const btnContinuar = this.add.image(0, -30, 'boton_precio')
      .setDisplaySize(240, 56)
      .setInteractive({ useHandCursor: true });
    btnContinuar.setTint(0x88ff88);
    
    btnContinuar.on('pointerdown', () => {
        this.reanudarJuego();
    });

    const txtContinuar = this.add.text(0, -30, this._T.gameContinuar || 'CONTINUAR', {
      fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold', fill: '#000000'
    }).setOrigin(0.5);
    this.contenedorPausa.add([btnContinuar, txtContinuar]);

    // Botón Salir al Menú
    const btnSalir = this.add.image(0, 50, 'boton_precio')
      .setDisplaySize(240, 56)
      .setInteractive({ useHandCursor: true });
    btnSalir.setTint(0xff6666);
    
    btnSalir.on('pointerdown', () => {
      this.reanudarJuego(); 
      this.sound.getAll().forEach(s => s.stop()); 
      this.scene.start('MenuScene');
    });

    const txtSalir = this.add.text(0, 50, this._T.gameSalirMenu || 'SALIR AL MENÚ', {
      fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5);
    this.contenedorPausa.add([btnSalir, txtSalir]);

    // Botón de sonido
    const texturaMute = this.sound.mute ? 'boton_nosonido' : 'boton_sonido';
    const btnMute = this.add.image(0, 135, texturaMute)
      .setDisplaySize(60, 60)
      .setInteractive({ useHandCursor: true });
      
    btnMute.on('pointerdown', () => {
      this.sound.mute = !this.sound.mute;
      const nuevaTextura = this.sound.mute ? 'boton_nosonido' : 'boton_sonido';
      btnMute.setTexture(nuevaTextura);
      btnMute.setDisplaySize(60, 60);
    });
    this.contenedorPausa.add(btnMute);

    // Animación de entrada
    this.contenedorPausa.setScale(0);
    this.tweens.add({
      targets: this.contenedorPausa,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });
  }

  reanudarJuego() {
    this.juegoPausado = false;
    this.physics.world.resume();

    // Reanudar timers
    if (this.timerReloj) this.timerReloj.paused = false;
    if (this.timerChulqueros) this.timerChulqueros.paused = false;
    if (this.timerClientes) this.timerClientes.paused = false;

    // Destruir contenedor y overlay
    if (this.contenedorPausa) {
      this.contenedorPausa.destroy();
      this.contenedorPausa = null;
    }
    if (this.overlayPausa) {
      this.overlayPausa.destroy();
      this.overlayPausa = null;
    }
  }
}