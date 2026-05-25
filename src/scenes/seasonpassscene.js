import Phaser from 'phaser';
import { desbloquearPasePremium } from '../services/firebase.js';

export default class SeasonPassScene extends Phaser.Scene {
  constructor() {
    super('SeasonPassScene');
  }

  create() {
    // 1. CARGAR DATOS DE FIREBASE DESDE EL REGISTRO
    this.playerData = this.registry.get('playerData');
    
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Fondo azul noche elegante para el Pase de Temporada
    this.cameras.main.setBackgroundColor('#0d1b2a');

    // Título Principal
    this.add.text(width / 2, 90, '🎟️ PASE DEL CHULLA', {
      font: 'bold 64px Arial',
      fill: '#ffffff'
    }).setOrigin(0.5);

    // Subtítulo de Temporada
    this.add.text(width / 2, 160, 'Temporada 1: El Escape de la Bahía', {
      font: '32px Arial',
      fill: '#0095ff'
    }).setOrigin(0.5);

    // --- 2. INDICADORES DE PROGRESO DE NIVEL (XP) ---
    const nivelActual = this.playerData.paseNivel || 1;
    const xpActual = this.playerData.paseXP || 0;
    const XP_REQUERIDA = 1000; // Umbral para subir de nivel definido en firebase.js

    this.add.text(80, 240, `Tu Nivel Actual: ${nivelActual}`, {
      font: 'bold 42px Arial',
      fill: '#ffcc00'
    });

    this.add.text(width - 80, 240, `${xpActual} / ${XP_REQUERIDA} XP`, {
      font: '36px Arial',
      fill: '#aaaaaa'
    }).setOrigin(1, 0);

    // Barra de Progreso de Experiencia (Contenedor externo)
    const contBarra = this.add.graphics();
    contBarra.lineStyle(4, 0xffffff, 0.3);
    contBarra.strokeRect(80, 300, width - 160, 40);

    // Relleno dinámico proporcional a la XP actual del jugador
    const rellenoBarra = this.add.graphics();
    rellenoBarra.fillStyle(0x00ff66, 1);
    const porcentajeXP = Math.min(1, xpActual / XP_REQUERIDA);
    rellenoBarra.fillRect(84, 304, (width - 168) * porcentajeXP, 32);

    // --- 3. VERIFICACIÓN Y COMPRA DEL PASO PREMIUM (MONETIZACIÓN) ---
    const esPremium = this.playerData.pasePremium || false;

    if (!esPremium) {
      // Banner interactivo para comprar la versión de pago
      const fondoPremium = this.add.rectangle(width / 2, 450, width - 100, 160, 0xff9900).setOrigin(0.5);
      
      this.add.text(100, 410, '🚀 ¡Pásate a PREMIUM por $2.99!', {
        font: 'bold 36px Arial',
        fill: '#1a1a1a'
      });
      this.add.text(100, 460, 'Desbloquea la Skin exclusiva del Diablo Huma', {
        font: '28px Arial',
        fill: '#333333'
      });

      // Botón de Pago Táctil
      const btnComprarPase = this.add.text(width - 240, 450, 'COMPRAR', {
        font: 'bold 34px Arial',
        fill: '#ffffff',
        backgroundColor: '#1a1a1a',
        padding: { x: 30, y: 15 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

      btnComprarPase.on('pointerdown', () => {
        this.procesarPagoPasePremium();
      });
    } else {
      // Si ya es dueño del pase premium
      this.add.rectangle(width / 2, 450, width - 100, 120, 0x00ff66, 0.2).setOrigin(0.5);
      this.add.text(width / 2, 450, '⭐ ACTIVADO: Eres miembro del Pase Premium ⭐', {
        font: 'bold 36px Arial',
        fill: '#00ff66'
      }).setOrigin(0.5);
    }

    // --- 4. RECOMPENSAS SEGÚN EL NIVEL DEL JUGADOR ---
    this.add.text(80, 570, '📋 Recompensas de tus Niveles:', {
      font: 'bold 38px Arial',
      fill: '#ffffff'
    });

    // Renderizado de Niveles del pase (Ejemplo ilustrativo de los primeros niveles)
    this.diseñarFilaPremio(height * 0.35, 1, '📦 Bono: +100 Monedas Base', '👑 Sombrero de Paja Base', true);
    this.diseñarFilaPremio(height * 0.47, 2, '📦 Bono: +200 Monedas Extra', '👑 Skin: Diablo Huma (Premium)', esPremium);
    this.diseñarFilaPremio(height * 0.59, 3, '📦 Bono: +300 Monedas Extra', '👑 Título Comercial Raro', esPremium);

    // --- 5. BOTÓN REGRESAR ---
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
   * Helper gráfico para maquetar de forma ordenada los premios de cada hito
   */
  diseñarFilaPremio(y, nivelRequerido, premioGratis, premioPremium, premiumDesbloqueado) {
    const width = this.cameras.main.width;
    const nivelActual = this.playerData.paseNivel || 1;
    const nivelAlcanzado = nivelActual >= nivelRequerido;

    // Caja base del hito
    this.add.rectangle(width / 2, y + 30, width - 100, 170, 0x1c2541).setOrigin(0.5);

    // Número del nivel a la izquierda
    this.add.text(90, y + 10, `NV.\n${nivelRequerido}`, {
      font: 'bold 40px Arial',
      fill: nivelAlcanzado ? '#00ff66' : '#666666',
      align: 'center'
    }).setOrigin(0, 0.5);

    // Textos de los premios
    this.add.text(230, y - 10, `Gratis: ${premioGratis}`, {
      font: '30px Arial',
      fill: nivelAlcanzado ? '#ffffff' : '#777777'
    });

    const colorPremiumText = (nivelAlcanzado && premiumDesbloqueado) ? '#ff9900' : '#555555';
    this.add.text(230, y + 35, `Premium: ${premioPremium}`, {
      font: '30px Arial',
      fill: colorPremiumText
    });

    // Indicador visual de estado
    let sticker = '🔒';
    if (nivelAlcanzado) {
      sticker = premiumDesbloqueado ? '✅ Recogido' : '⚠️ Premium Bloqueado';
    }
    this.add.text(width - 80, y + 20, sticker, {
      font: 'bold 28px Arial',
      fill: nivelAlcanzado && premiumDesbloqueado ? '#00ff66' : '#ff3333'
    }).setOrigin(1, 0.5);
  }

  /**
   * Lógica asíncrona que simula la respuesta exitosa de la API de Stripe/PayPal 
   * o el plugin Native IAP de Capacitor, y guarda la activación en Firebase.
   */
  async procesarPagoPasePremium() {
    // Aquí es donde se conectará el plugin nativo del celular en producción.
    // Simulamos la pasarela bancaria exitosa de inmediato:
    try {
      await desbloquearPasePremium();
      
      // Sincronizar el estado local en la RAM de Phaser
      this.playerData.pasePremium = true;
      this.registry.set('playerData', this.playerData);

      this.sound.play('sonido_venta', { volume: 0.8 });

      // Reiniciamos la escena para actualizar el banner y pintar las cerraduras en verde
      this.scene.restart();
    } catch (error) {
      console.error("No se pudo procesar la compra del pase en chulco-scape-game:", error);
    }
  }
}