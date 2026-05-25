import Phaser from 'phaser';
import { guardarResultadoRonda } from '../services/firebase.js';
import Jugador from '../components/jugador.js';
import Chulquero from '../components/chulquero.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init() {
    // Recuperamos las mejoras del jugador guardadas en la memoria global por Firebase
    const playerData = this.registry.get('playerData');
    this.nivelVelocidad = playerData.mejoras?.velocidad || 1;
    this.nivelDanio = playerData.mejoras?.danioBolon || 1;
    this.skinEquipada = playerData.accesorioEquipado || 'sombrero_paja_toquilla_base';

    // Variables de control de la partida actual
    this.tiempoRestante = 180; // 3 minutos en segundos (180s)
    this.monedasGanadasRonda = 0;
    this.xpGanadaRonda = 0;
    this.juegoTerminado = false;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 1. FONDO DEL MAPA (LA BAHÍA)
    this.add.image(width / 2, height / 2, 'fondo_bahia').setDisplaySize(width, height);

    // 2. CREACIÓN DEL JUGADOR (COMERCIANTE)
    // Aplicamos la velocidad escalada según sus mejoras de la tienda
    this.velocidadJugador = 300 + (this.nivelVelocidad * 30);
    const playerData = this.registry.get('playerData');
    this.jugador = new Jugador(this, width / 2, height * 0.7, playerData);
    this.jugador.setCollideWorldBounds(true); // El comerciante no se sale de la pantalla del celular

    // Añadir visualmente el sombrero/skin equipado encima del jugador
    this.skinVisual = this.add.image(this.jugador.x, this.jugador.y - 40, this.skinEquipada);

    // 3. GRUPOS FÍSICOS OPTIMIZADOS (Pool de Objetos)
    this.chulqueros = this.physics.add.group();
    this.clientes = this.physics.add.group();
    this.proyectiles = this.physics.add.group();

    // 4. INTERFAZ EN PANTALLA (HUD)
    this.textoTiempo = this.add.text(50, 50, '⏱️ Tiempo: 03:00', { font: 'bold 40px Arial', fill: '#ffffff' });
    this.textoGanancia = this.add.text(50, 110, '💰 Ventas: $0', { font: 'bold 40px Arial', fill: '#ffcc00' });

    // 5. TEMPORIZADORES Y BUCLES AUTOMÁTICOS (Timers)
    // Contador regresivo de cada segundo
    this.timerReloj = this.time.addEvent({
      delay: 1000,
      callback: this.actualizarReloj,
      callbackScope: this,
      loop: true
    });

    // Spawn automático de cobradores en moto (Chulqueros) cada 4 segundos
    this.timerChulqueros = this.time.addEvent({
      delay: 4000,
      callback: this.spawnChulquero,
      callbackScope: this,
      loop: true
    });

    // Spawn automático de clientes que quieren comprar cada 5 segundos
    this.timerClientes = this.time.addEvent({
      delay: 5000,
      callback: this.spawnCliente,
      callbackScope: this,
      loop: true
    });

    // Ataque/Disparo automático de comida cada 1.5 segundos
    this.timerDisparo = this.time.addEvent({
      delay: 1500,
      callback: this.dispararComidaAutomatica,
      callbackScope: this,
      loop: true
    });

    // 6. CONTROLES TÁCTILES MÓVILES (Pointer)
    // Al arrastrar o tocar cualquier punto de la pantalla, el jugador se mueve hacia allá
    this.input.on('pointermove', (pointer) => {
      if (this.juegoTerminado) return;
      this.jugador.moverHaciaPuntero(pointer);
    });

    this.input.on('pointerup', () => {
      this.jugador.frenar();
    });

    // 7. CONFIGURACIÓN DE COLISIONES Y ARCADES
    // Si un Chulquero atrapa al Jugador (Fin de la partida)
    this.physics.add.overlap(this.jugador, this.chulqueros, this.colisionJugadorChulquero, null, this);
    
    // Si la comida arrojada impacta a un Chulquero (Lo ahuyenta o frena)
    this.physics.add.overlap(this.proyectiles, this.chulqueros, this.colisionComidaChulquero, null, this);

    // Si el jugador choca con un cliente (Le vende y gana dinero)
    this.physics.add.overlap(this.jugador, this.clientes, this.colisionJugadorCliente, null, this);

    // Efecto de entrada visual
    this.cameras.main.fadeIn(400);
  }

  update() {
    // 1. CONTROL DE ESTADO: Si la ronda terminó (Game Over o Tiempo Agotado), congelamos el bucle por completo.
    if (this.juegoTerminado) return;

    // 2. ACTUALIZACIÓN DEL JUGADOR: 
    // Invoca internamente la sincronización de coordenadas del comerciante y posiciona 
    // automáticamente su accesorio estético (sombrero/máscara), además de aplicar el efecto espejo (FlipX).
    this.jugador.update();

    // 3. INTELIGENCIA ARTIFICIAL EN GRUPO (Motos de Cobradores):
    // Recorremos de manera masiva cada instancia activa dentro de nuestro grupo físico de enemigos.
    this.chulqueros.getChildren().forEach((chulquero) => {
      
      // Cada objeto ejecuta internamente su propio método de Inteligencia Artificial:
      // - Calcula vectorialmente el ángulo exacto para perseguir al jugador con 'moveToObject'.
      // - Evalúa su propia velocidad física en X para voltear su sprite (FlipX) a la izquierda o derecha.
      chulquero.perseguirJugador(this.jugador);
      
    });
  }

  actualizarReloj() {
    if (this.juegoTerminado) return;

    this.tiempoRestante--;
    
    // Formatear segundos matemáticos a formato legible MM:SS
    const minutos = Math.floor(this.tiempoRestante / 60).toString().padStart(2, '0');
    const segundos = (this.tiempoRestante % 60).toString().padStart(2, '0');
    this.textoTiempo.setText(`⏱️ Tiempo: ${minutos}:${segundos}`);

    // DIFICULTAD ESCALABLE: Cada 30 segundos, los chulqueros aceleran de ritmo
    if (this.tiempoRestante % 30 === 0) {
      this.timerChulqueros.delay = Math.max(1500, this.timerChulqueros.delay - 500);
    }

    // CONDICIÓN DE VICTORIA: Sobrevivió los 3 minutos
    if (this.tiempoRestante <= 0) {
      this.finalizarPartida(true, '¡LOGRASTE ESCAPAR!');
    }
  }

  spawnChulquero() {
  if (this.juegoTerminado) return;

  // Aparecen aleatoriamente en los bordes superiores o laterales fuera de la vista directa inmediata
  const x = Phaser.Math.Between(0, 1) === 0 ? 0 : this.cameras.main.width;
  const y = Phaser.Math.Between(150, this.cameras.main.height - 150);

  // 1. MODIFICACIÓN: Instanciamos nuestra clase personalizada pasándole el tiempo restante.
  // Toda la dificultad incremental de velocidad y vida ya se calcula automáticamente en su constructor.
  const chulquero = new Chulquero(this, x, y, this.tiempoRestante);
  
  // 2. MODIFICACIÓN: Añadimos la instancia inteligente al grupo físico de la escena.
  // Esto permite que el motor de Phaser siga gestionando las colisiones grupales de forma eficiente.
  this.chulqueros.add(chulquero);

  // Mantenemos tu feedback de audio original bajando ligeramente el volumen para no saturar al acumularse motos
  this.sound.play('sonido_moto', { volume: 0.15 });
}

  spawnCliente() {
    if (this.juegoTerminado) return;

    // Los clientes aparecen en zonas comerciales fijas del mapa de forma estática
    const x = Phaser.Math.Between(150, this.cameras.main.width - 150);
    const y = Phaser.Math.Between(this.cameras.main.height * 0.4, this.cameras.main.height * 0.8);

    const cliente = this.clientes.create(x, y, 'cliente_hambriento');
    cliente.setImmovable(true);
  }

  dispararComidaAutomatica() {
    if (this.juegoTerminado || this.chulqueros.getLength() === 0) return;

    // Mecánica Auto-shooter: Busca automáticamente al chulquero más cercano
    const masCercano = this.physics.closest(this.jugador, this.chulqueros.getChildren());
    
    if (masCercano) {
      // El tipo de proyectil (bolón o humita) alterna visualmente de forma aleatoria
      const tipoProyectil = Phaser.Math.Between(0, 1) === 0 ? 'proyectil_bolon' : 'proyectil_humita';
      const proyectil = this.proyectiles.create(this.jugador.x, this.jugador.y, tipoProyectil);
      
      // Dispara el bolón directo a la velocidad del chulquero detectado
      this.physics.moveToObject(proyectil, masCercano, 650);
    }
  }

  /**
   * MANEJO DE COLISIÓN: Se ejecuta cuando un proyectil (bolón/humita) impacta a una moto.
   * @param {Phaser.GameObjects.Sprite} proyectil - El objeto volador arrojado
   * @param {Chulquero} chulquero - Instancia del enemigo impactado
   */
  colisionComidaChulquero(proyectil, chulquero) {
    // 1. Destruimos el bolón de inmediato tras el impacto para que no siga de largo traspasando enemigos
    proyectil.destroy(); 

    // 2. MODIFICACIÓN: Delegamos el procesamiento del golpe al propio Chulquero.
    // Le pasamos el nivel de daño actual del jugador comprado en la tienda.
    // 'recibirDanio' internamente resta la vida, genera el flash rojo y aplica el knockback.
    // Además, nos devuelve 'true' si el chulquero murió o 'false' si sobrevivió.
    const enemigoMuerto = chulquero.recibirDanio(this.nivelDanio);

    // 3. Si el enemigo se quedó sin puntos de vida debido al impacto:
    if (enemigoMuerto) {
      // Cada cobrador tumbado le otorga de inmediato 25 puntos de XP para el Pase del Chulla
      this.xpGanadaRonda += 25; 
      
      // (Opcional) Puedes añadir aquí un sonido de explosión o caída si lo deseas:
      // this.sound.play('sonido_caida', { volume: 0.3 });
    }
  }

  colisionJugadorCliente(jugador, cliente) {
    cliente.destroy(); // El cliente ya compró y se retira feliz
    
    // Incremento financiero inmediato de la ronda
    this.monedasGanadasRonda += 50;
    this.xpGanadaRonda += 10;
    this.textoGanancia.setText(`Ventas: $${this.monedasGanadasRonda}`);

    this.sound.play('sonido_venta', { volume: 0.6 });
  }

  colisionJugadorChulquero(jugador, chulquero) {
    // CONDICIÓN DE DERROTA: El cobrador te alcanzó en la moto
    this.finalizarPartida(false, '¡EL CHULQUERO TE ATRAPÓ!');
  }

  async finalizarPartida(victoria, mensaje) {
    if (this.juegoTerminado) return;
    this.juegoTerminado = true;

    // Frenar todas las físicas del juego de inmediato
    this.physics.pause();

    // Detener relojes y spawner
    this.timerReloj.destroy();
    this.timerChulqueros.destroy();
    this.timerClientes.destroy();
    this.timerDisparo.destroy();

    // Cartel visual de Fin de Partida
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

    this.add.text(width / 2, height * 0.4, mensaje, {
      font: 'bold 64px Arial',
      fill: victoria ? '#00ff66' : '#ff3333'
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.5, `Recaudado: +$${this.monedasGanadasRonda}\nXP Ganada: +${this.xpGanadaRonda}`, {
      font: '40px Arial',
      fill: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    // GUARDAR EN FIREBASE: Registramos las ganancias de manera persistente en la nube de Google
    try {
      await guardarResultadoRonda(this.monedasGanadasRonda, this.xpGanadaRonda);
      
      // Actualizamos también los datos locales en el registro de Phaser para las siguientes escenas
      const datosLocales = this.registry.get('playerData');
      datosLocales.monedas += this.monedasGanadasRonda;
      datosLocales.paseXP += this.xpGanadaRonda;
      this.registry.set('playerData', datosLocales);
    } catch (error) {
      console.error("No se pudo sincronizar la ronda en chulco-scape-game:", error);
    }

    // Botón para salir y volver a negociar o cobrar recompensas
    const btnSalir = this.add.text(width / 2, height * 0.65, 'CONTINUAR', {
      font: 'bold 46px Arial',
      fill: '#ffffff',
      backgroundColor: '#0095ff',
      padding: { x: 50, y: 20 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

    btnSalir.on('pointerdown', () => {
      // Nos vamos directo a la ShopScene (Fase 2: La Negociación)
      this.scene.start('ShopScene');
    });
  }
}