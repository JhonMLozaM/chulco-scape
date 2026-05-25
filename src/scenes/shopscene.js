import Phaser from 'phaser';
import { comprarMejoraEnTienda, adquirirAccesorioEstetico } from '../services/firebase.js';

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene');
  }

  create() {
    // 1. CARGAR DATOS ACTUALES DEL JUGADOR
    this.playerData = this.registry.get('playerData');

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Fondo gris oscuro texturizado para dar ambiente de oficina/tienda de empeño
    this.cameras.main.setBackgroundColor('#252525');

    // Título Superior
    this.add.text(width / 2, 100, '🏪 TIENDA Y NEGOCIACIÓN', {
      font: 'bold 60px Arial',
      fill: '#ffffff'
    }).setOrigin(0.5);

    // 2. MOSTRAR BILLETERA Y DEUDA EN TIEMPO REAL
    this.textoMonedas = this.add.text(width / 2, 190, `Billetera: $${this.playerData.monedas}`, {
      font: 'bold 44px Arial',
      fill: '#ffcc00'
    }).setOrigin(0.5);

    this.textoDeuda = this.add.text(width / 2, 250, `Deuda con el Chulco: $${this.playerData.deudaActual}`, {
      font: 'bold 44px Arial',
      fill: '#ff3333'
    }).setOrigin(0.5);

    // --- 3. SECCIÓN DE COMPRAS E INTERFAZ MULTITOUCH ---

    // ITEM 1: Abono a la Deuda
    this.diseñarFilaTienda(height * 0.25, '💸 Abonar a la Deuda', 'Reduce -$100 de tu deuda', 150, () => {
      this.procesarTransaccion('deuda', 150);
    });

    // ITEM 2: Mejora de Velocidad
    const nivelVel = this.playerData.mejoras?.velocidad || 1;
    const costoVel = nivelVel * 200;
    this.diseñarFilaTienda(height * 0.40, `🏃 Mejorar Velocidad (Nivel ${nivelVel})`, 'Camina más rápido en la Bahía', costoVel, () => {
      this.procesarTransaccion('velocidad', costoVel);
    });

    // ITEM 3: Mejora de Daño del Bolón
    const nivelDmg = this.playerData.mejoras?.danioBolon || 1;
    const costoDmg = nivelDmg * 250;
    this.diseñarFilaTienda(height * 0.55, `🔥 Fuerza de Bolón (Nivel ${nivelDmg})`, 'Derriba motos con menos golpes', costoDmg, () => {
      this.procesarTransaccion('danioBolon', costoDmg);
    });

    // ITEM 4: Skin Cosmética - Diablo Huma
    const tieneDiablo = this.playerData.accesoriosComprados.includes('skin_diablo_huma');
    const textoSkin = tieneDiablo ? '🎭 Equipar Diablo Huma' : '🎭 Skin: Diablo Huma';
    const costoSkin = tieneDiablo ? 0 : 500;
    this.diseñarFilaTienda(height * 0.70, textoSkin, tieneDiablo ? 'Ya adquirido' : 'Apariencia premium folclórica', costoSkin, () => {
      if (tieneDiablo) {
        this.equiparSkinLocal('skin_diablo_huma');
      } else {
        this.procesarSkin('skin_diablo_huma', 500);
      }
    });

    // --- 4. BOTÓN DE SALIDA Y REGRESO AL MENÚ ---
    const btnVolver = this.add.text(width / 2, height * 0.88, '↩️ VOLVER AL MENÚ', {
      font: 'bold 46px Arial',
      fill: '#ffffff',
      backgroundColor: '#0095ff',
      padding: { x: 60, y: 25 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

    btnVolver.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    this.cameras.main.fadeIn(300);
  }

  /**
   * Helper modular para renderizar de manera limpia cada fila de producto en pantallas móviles.
   */
  diseñarFilaTienda(y, titulo, desc, costo, callbackCompra) {
    const width = this.cameras.main.width;

    // Caja de fondo para separar los productos
    this.add.rectangle(width / 2, y + 20, width - 100, 150, 0x333333).setOrigin(0.5);

    // Título y descripción del producto
    this.add.text(80, y - 20, titulo, { font: 'bold 36px Arial', fill: '#ffffff' });
    this.add.text(80, y + 25, desc, { font: '30px Arial', fill: '#aaaaaa' });

    // Botón dinámico de precio o acción
    const textoBoton = costo === 0 ? 'EQUIPAR' : `$${costo}`;
    const btnComprar = this.add.text(width - 240, y + 20, textoBoton, {
      font: 'bold 36px Arial',
      fill: '#ffffff',
      backgroundColor: costo === 0 ? '#00ff66' : '#ff9900',
      padding: { x: 30, y: 15 },
      align: 'center'
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

    btnComprar.on('pointerdown', callbackCompra);
  }

  /**
   * Ejecuta la lógica asíncrona de compra de estadísticas y abonos comunicándose con Firebase.
   */
  async procesarTransaccion(tipo, costo) {
    if (this.playerData.monedas < costo) {
      this.mostrarNotificacion('¡No tienes suficiente dinero, chiro!');
      return;
    }

    try {
      const exito = await comprarMejoraEnTienda(tipo, costo);
      
      if (exito) {
        // Actualizar estados locales reflejados de inmediato en el registro de Phaser
        this.playerData.monedas -= costo;
        if (tipo === 'deuda') {
          this.playerData.deudaActual = Math.max(0, this.playerData.deudaActual - 100);
          
          // Verificación de fin del juego (Campaña completada)
          if (this.playerData.deudaActual <= 0) {
            this.mostrarNotificacion('¡Felicidades! Pagaste toda tu deuda.');
          }
        } else {
          if (!this.playerData.mejoras) this.playerData.mejoras = {};
          this.playerData.mejoras[tipo] = (this.playerData.mejoras[tipo] || 1) + 1;
        }

        this.registry.set('playerData', this.playerData);
        this.sound.play('sonido_venta', { volume: 0.5 });
        
        // Reiniciamos la escena para recalcular los nuevos costos y textos de nivel
        this.scene.restart();
      }
    } catch (error) {
      console.error("Error al procesar la compra en Firestore:", error);
    }
  }

  /**
   * Lógica asíncrona para comprar una Skin Cosmética nueva
   */
  async procesarSkin(idSkin, costo) {
    if (this.playerData.monedas < costo) {
      this.mostrarNotificacion('Monedas insuficientes para este accesorio.');
      return;
    }

    try {
      const exito = await adquirirAccesorioEstetico(idSkin, costo);
      if (exito) {
        this.playerData.monedas -= costo;
        this.playerData.accesoriosComprados.push(idSkin);
        this.playerData.accesorioEquipado = idSkin;
        
        this.registry.set('playerData', this.playerData);
        this.scene.restart();
      }
    } catch (error) {
      console.error("Error al comprar accesorio:", error);
    }
  }

  /**
   * Cambia el accesorio visual activo si la Skin ya fue comprada anteriormente
   */
  equiparSkinLocal(idSkin) {
    this.playerData.accesorioEquipado = idSkin;
    this.registry.set('playerData', this.playerData);
    this.mostrarNotificacion('¡Accesorio equipado con éxito!');
    this.scene.restart();
  }

  /**
   * Genera un banner temporal estético flotante para dar feedback al usuario móvil
   */
  mostrarNotificacion(mensaje) {
    const width = this.cameras.main.width;
    const txtNotif = this.add.text(width / 2, 330, mensaje, {
      font: 'bold 32px Arial',
      fill: '#ffffff',
      backgroundColor: '#cc0000',
      padding: { x: 30, y: 10 }
    }).setOrigin(0.5);

    // Desaparece automáticamente después de 2 segundos mediante un timer de Phaser
    this.time.addEvent({
      delay: 2000,
      callback: () => { txtNotif.destroy(); }
    });
  }
}