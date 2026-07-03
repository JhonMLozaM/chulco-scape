import Phaser from 'phaser';
import { Keyboard } from '@capacitor/keyboard';
import { 
  iniciarSesionConCorreo, 
  registrarConCorreo, 
  iniciarSesionGoogle, 
  iniciarSesionJugador,
  comprobarYCrearUsuario,
  esNicknameUnico,
  guardarNicknameDeUsuario,
  auth
} from '../services/firebase.js';
import { getT } from '../i18n.js';

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super('HomeScene');
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.lang = this.registry.get('language') || 'es';
    const T = getT(this.lang);
    Keyboard.setResizeMode({ mode: 'none' });
    // 1. Fondo de pantalla
    this.add.image(width / 2, height / 2, 'fondo_menu').setDisplaySize(width, height);

    // 2. Título de bienvenida animado
    const titulo = this.add.text(width / 2, height * 0.25, T.menuTitulo || '¡CHULKO-SKAPE!', {
      fontFamily: 'Arial',
      fontSize: '72px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
      align: 'center'
    }).setOrigin(0.5);

    // Animación de pulso del título
    this.tweens.add({
      targets: titulo,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1000,
      yoyo: true,
      loop: -1,
      ease: 'Sine.easeInOut'
    });

    // 3. Botón de Iniciar sesión grandioso
    const btnW = 320;
    const btnH = 80;
    const btnX = width / 2;
    const btnY = height * 0.6;

    const btnBg = this.add.image(btnX, btnY, 'boton_precio')
      .setDisplaySize(btnW, btnH)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add.text(btnX, btnY, this.lang === 'es' ? 'INICIAR SESIÓN' : 'SIGN IN', {
      fontFamily: 'Arial',
      fontSize: '28px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5);

    // Animaciones hover para el botón principal
    btnBg.on('pointerover', () => {
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 1.05, scaleY: 1.05, duration: 100 });
      btnBg.setTint(0xdddddd);
    });

    btnBg.on('pointerout', () => {
      this.tweens.add({ targets: btnBg, scaleX: 1, scaleY: 1, duration: 100 });
      this.tweens.add({ targets: btnText, scaleX: 1, scaleY: 1, duration: 100 });
      btnBg.clearTint();
    });

    btnBg.on('pointerdown', () => {
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 0.95, scaleY: 0.95, duration: 50, yoyo: true });
      this.time.delayedCall(100, () => this.abrirModalLogin());
    });

    // Check if user is already logged in
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const res = await comprobarYCrearUsuario(user);
          this.registry.set('playerData', res.playerData);
          this.scene.start('MenuScene');
        } catch (e) {
          console.error("Autologin fallido:", e);
        }
      }
    });
  }

  abrirModalLogin() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 🛡️ CONTROL DE TECLADO NATIVO
    let isKeyboardOpen = false;
    let showListener = null;
    let hideListener = null;

    try {
      Keyboard.addListener('keyboardWillShow', () => { isKeyboardOpen = true; }).then(r => showListener = r);
      Keyboard.addListener('keyboardWillHide', () => { isKeyboardOpen = false; }).then(r => hideListener = r);
    } catch (e) {
      console.warn("Listeners de teclado no disponibles en entorno Web/No-nativo.");
    }

    // 1. Overlay oscuro
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
      .setDepth(200)
      .setInteractive();

    const px = width / 2;
    const py = height / 2;
    const modalW = 600;
    const modalH = 540;

    // 2. Fondo del panel usando el contenedor_objetos
    const panelBg = this.add.image(px, py, 'contenedor_objetos')
      .setDisplaySize(modalW, modalH)
      .setDepth(201);

    const titleText = this.add.text(px, py - modalH / 2 + 45, this.lang === 'es' ? 'CONECTAR PERFIL' : 'CONNECT PROFILE', {
      fontFamily: 'Arial',
      fontSize: '32px',
      fontStyle: 'bold',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(202);

    // 3. Botón de Cerrar modal
    const closeBtn = this.add.text(px + modalW / 2 - 40, py - modalH / 2 + 40, '❌', {
      fontSize: '28px'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(202);

    closeBtn.on('pointerdown', () => {
      limpiarModal();
    });

    // 4. Botón de Google (al inicio)
    const btnGoogleY = py - 95;
    const btnGoogle = this.add.image(px, btnGoogleY, 'boton_precio')
      .setDisplaySize(280, 48)
      .setInteractive({ useHandCursor: true })
      .setDepth(202);
    btnGoogle.setTint(0xdd4b39);

    const btnGoogleTxt = this.add.text(px, btnGoogleY, 'GOOGLE', {
      fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(202);

    // 5. Línea separadora
    const txtSep = this.add.text(px, py - 35, this.lang === 'es' ? '— o usa tu correo —' : '— or use your email —', {
      fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', fill: '#d5c23b', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(202);

    // 6. Crear elementos DOM para los inputs de email/contraseña
    const domContainer = document.createElement('div');
    domContainer.id = 'login-dom-container';
    document.body.appendChild(domContainer);

    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.placeholder = this.lang === 'es' ? 'Correo electrónico' : 'Email address';
    
    const passInput = document.createElement('input');
    passInput.type = 'password';
    passInput.placeholder = this.lang === 'es' ? 'Contraseña' : 'Password';

    const applyBaseInputStyle = (el) => {
      el.style.backgroundColor = '#1c1a22';
      el.style.border = '2px solid #d5c23b';
      el.style.color = '#ffffff';
      el.style.fontFamily = 'Arial, sans-serif';
      el.style.outline = 'none';
      el.style.boxSizing = 'border-box';
      el.style.width = '100%';
    };

    applyBaseInputStyle(emailInput);
    applyBaseInputStyle(passInput);

    const updateDOMPosition = () => {
      // 🛡️ Ignoramos el evento resize provocado por la emergencia del teclado nativo
      if (isKeyboardOpen) return;

      const rect = this.game.canvas.getBoundingClientRect();
      const scaleX = rect.width / 1280;
      const scaleY = rect.height / 720;
      const scaleMin = Math.min(scaleX, scaleY);

      domContainer.style.position = 'fixed';
      domContainer.style.left = `${rect.left + (px - 220) * scaleX}px`;
      domContainer.style.top = `${rect.top + (py + 10) * scaleY}px`;
      domContainer.style.width = `${440 * scaleX}px`;
      domContainer.style.height = `${115 * scaleY}px`;
      domContainer.style.zIndex = '1000';
      domContainer.style.display = 'flex';
      domContainer.style.flexDirection = 'column';
      domContainer.style.gap = `${12 * scaleY}px`;

      const fontSize = Math.max(10, Math.floor(16 * scaleMin));
      const padding = Math.max(3, Math.floor(10 * scaleMin));
      const borderRadius = Math.max(3, Math.floor(6 * scaleMin));
      const borderSize = Math.max(1, Math.floor(2 * scaleMin));

      [emailInput, passInput].forEach(el => {
        el.style.fontSize = `${fontSize}px`;
        el.style.padding = `${padding}px`;
        el.style.borderRadius = `${borderRadius}px`;
        el.style.borderWidth = `${borderSize}px`;
        el.style.height = `${(44 * scaleY)}px`;
      });
    };
    updateDOMPosition();
    window.addEventListener('resize', updateDOMPosition);

    domContainer.appendChild(emailInput);
    domContainer.appendChild(passInput);

    // Botones de acción del formulario de correo
    const btnAccionY = py + 145;
    const btnSubmit = this.add.image(px - 110, btnAccionY, 'boton_precio')
      .setDisplaySize(180, 50)
      .setInteractive({ useHandCursor: true })
      .setDepth(202);
    
    const btnSubmitTxt = this.add.text(px - 110, btnAccionY, this.lang === 'es' ? 'INGRESAR' : 'LOGIN', {
      fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(202);

    const btnReg = this.add.image(px + 110, btnAccionY, 'boton_precio')
      .setDisplaySize(180, 50)
      .setInteractive({ useHandCursor: true })
      .setDepth(202);
    btnReg.setTint(0x33cc66);

    const btnRegTxt = this.add.text(px + 110, btnAccionY, this.lang === 'es' ? 'REGISTRARSE' : 'SIGN UP', {
      fontFamily: 'Arial', fontSize: '16px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(202);

    // Botón Invitado
    const btnInvitadoY = py + 210;
    const btnInvitado = this.add.image(px, btnInvitadoY, 'boton_precio')
      .setDisplaySize(280, 44)
      .setInteractive({ useHandCursor: true })
      .setDepth(202);
    btnInvitado.setTint(0xffaa00);

    const btnInvitadoTxt = this.add.text(px, btnInvitadoY, this.lang === 'es' ? 'JUGAR COMO INVITADO' : 'PLAY AS GUEST', {
      fontFamily: 'Arial', fontSize: '15px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(202);

    // Acciones de botones
    btnSubmit.on('pointerdown', async () => {
      const email = emailInput.value.trim();
      const pass = passInput.value;
      if (!email || !pass) {
        this.mostrarAlerta(this.lang === 'es' ? 'Complete todos los campos' : 'Fill all fields', '#ff0000');
        return;
      }
      try {
        this.mostrarAlerta(this.lang === 'es' ? 'Conectando...' : 'Connecting...', '#d5c23b');
        const res = await iniciarSesionConCorreo(email, pass);
        manejarRespuestaAuth(res);
      } catch (err) {
        console.error(err);
        if (err.code === 'auth/operation-not-allowed') {
          this.mostrarAlerta(this.lang === 'es' ? 'Activa Correo/Contraseña en Firebase Console' : 'Enable Email auth in Firebase Console', '#ff5500', 5000);
        } else {
          this.mostrarAlerta(this.lang === 'es' ? 'Correo o contraseña incorrectos' : 'Invalid email or password', '#ff0000');
        }
      }
    });

    btnReg.on('pointerdown', async () => {
      const email = emailInput.value.trim();
      const pass = passInput.value;
      if (!email || !pass) {
        this.mostrarAlerta(this.lang === 'es' ? 'Complete todos los campos' : 'Fill all fields', '#ff0000');
        return;
      }
      try {
        this.mostrarAlerta(this.lang === 'es' ? 'Registrando...' : 'Registering...', '#d5c23b');
        const res = await registrarConCorreo(email, pass);
        manejarRespuestaAuth(res);
      } catch (err) {
        console.error(err);
        if (err.code === 'auth/operation-not-allowed') {
          this.mostrarAlerta(this.lang === 'es' ? 'Activa Correo/Contraseña en Firebase Console' : 'Enable Email auth in Firebase Console', '#ff5500', 5000);
        } else {
          this.mostrarAlerta(this.lang === 'es' ? 'Error al registrar usuario' : 'Registration failed', '#ff0000');
        }
      }
    });

    btnGoogle.on('pointerdown', async () => {
      try {
        this.mostrarAlerta(this.lang === 'es' ? 'Abriendo Google...' : 'Opening Google...', '#d5c23b');
        const res = await iniciarSesionGoogle();
        manejarRespuestaAuth(res);
      } catch (err) {
        console.error(err);
        if (err.code === 'auth/operation-not-allowed') {
          this.mostrarAlerta(this.lang === 'es' ? 'Activa Google en Firebase > Authentication' : 'Enable Google in Firebase > Auth', '#ff5500', 5000);
        } else {
          this.mostrarAlerta(this.lang === 'es' ? 'Error de conexión Google' : 'Google login error', '#ff0000');
        }
      }
    });

    btnInvitado.on('pointerdown', async () => {
      try {
        this.mostrarAlerta(this.lang === 'es' ? 'Ingresando como invitado...' : 'Signing in as guest...', '#d5c23b');
        const playerData = await iniciarSesionJugador();
        this.registry.set('playerData', playerData);
        limpiarModal();
        this.scene.start('MenuScene');
      } catch (err) {
        console.error(err);
        if (err.code === 'auth/operation-not-allowed') {
          this.mostrarAlerta(this.lang === 'es' ? 'Activa Anónimo en Firebase Console' : 'Enable Anonymous in Firebase Console', '#ff5500', 5000);
        } else {
          this.mostrarAlerta(this.lang === 'es' ? 'Error al ingresar como invitado' : 'Guest login error', '#ff0000');
        }
      }
    });

    const manejarRespuestaAuth = (res) => {
      limpiarModal();
      
      if (res.esNuevo) {
        // Enviar a la pantalla para solicitar Nickname único
        this.mostrarPasoNickname(res.playerData, () => {
          this.scene.start('MenuScene');
        });
      } else {
        this.registry.set('playerData', res.playerData);
        this.scene.start('MenuScene');
      }
    };

    const limpiarModal = () => {
      window.removeEventListener('resize', updateDOMPosition);
      
      // 🧼 Eliminar de memoria los listeners de teclado nativo
      if (showListener) showListener.remove();
      if (hideListener) hideListener.remove();

      if (domContainer && domContainer.parentNode) {
        domContainer.parentNode.removeChild(domContainer);
      }
      overlay.destroy();
      panelBg.destroy();
      titleText.destroy();
      closeBtn.destroy();
      btnSubmit.destroy();
      btnSubmitTxt.destroy();
      btnReg.destroy();
      btnRegTxt.destroy();
      btnGoogle.destroy();
      btnGoogleTxt.destroy();
      btnInvitado.destroy();
      btnInvitadoTxt.destroy();
      txtSep.destroy();
    };
  }

  // Paso para registrar Nickname único
  mostrarPasoNickname(playerData, callback) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 🛡️ CONTROL DE TECLADO NATIVO PARA NICKNAME
    let isKeyboardOpen = false;
    let showListener = null;
    let hideListener = null;

    try {
      Keyboard.addListener('keyboardWillShow', () => { isKeyboardOpen = true; }).then(r => showListener = r);
      Keyboard.addListener('keyboardWillHide', () => { isKeyboardOpen = false; }).then(r => hideListener = r);
    } catch (e) {
      console.warn("Listeners de teclado no disponibles en entorno Web/No-nativo.");
    }

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
      .setDepth(300)
      .setInteractive();

    const px = width / 2;
    const py = height / 2;
    const modalW = 520;
    const modalH = 340;

    const panelBg = this.add.image(px, py, 'contenedor_objetos')
      .setDisplaySize(modalW, modalH)
      .setDepth(301);

    const titleText = this.add.text(px, py - modalH / 2 + 50, this.lang === 'es' ? 'ESCRIBE TU APODO' : 'CHOOSE NICKNAME', {
      fontFamily: 'Arial', fontSize: '26px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(302);

    const descText = this.add.text(px, py - 40, this.lang === 'es' ? 'Tu nickname debe ser único y original.' : 'Your nickname must be unique.', {
      fontFamily: 'Arial', fontSize: '16px', fill: '#aaaaaa', stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(302);

    // Input DOM de Nickname
    const domContainer = document.createElement('div');
    domContainer.id = 'nickname-dom-container';
    document.body.appendChild(domContainer);

    const nickInput = document.createElement('input');
    nickInput.type = 'text';
    nickInput.maxLength = 15;
    nickInput.placeholder = this.lang === 'es' ? 'Ej. ElChulla10' : 'Nickname';

    nickInput.style.backgroundColor = '#1c1a22';
    nickInput.style.border = '2px solid #d5c23b';
    nickInput.style.color = '#ffffff';
    nickInput.style.fontFamily = 'Arial, sans-serif';
    nickInput.style.outline = 'none';
    nickInput.style.boxSizing = 'border-box';
    nickInput.style.width = '100%';
    nickInput.style.textAlign = 'center';

    domContainer.appendChild(nickInput);

    const updateDOMPosition = () => {
      // 🛡️ Ignoramos el evento resize provocado por la emergencia del teclado nativo
      if (isKeyboardOpen) return;

      const rect = this.game.canvas.getBoundingClientRect();
      const scaleX = rect.width / 1280;
      const scaleY = rect.height / 720;
      const scaleMin = Math.min(scaleX, scaleY);

      domContainer.style.position = 'fixed';
      domContainer.style.left = `${rect.left + (px - 180) * scaleX}px`;
      domContainer.style.top = `${rect.top + (py + 5) * scaleY}px`;
      domContainer.style.width = `${360 * scaleX}px`;
      domContainer.style.height = `${44 * scaleY}px`;
      domContainer.style.zIndex = '1000';

      const fontSize = Math.max(12, Math.floor(18 * scaleMin));
      const padding = Math.max(4, Math.floor(10 * scaleMin));
      const borderRadius = Math.max(3, Math.floor(6 * scaleMin));
      const borderSize = Math.max(1, Math.floor(2 * scaleMin));

      nickInput.style.fontSize = `${fontSize}px`;
      nickInput.style.padding = `${padding}px`;
      nickInput.style.borderRadius = `${borderRadius}px`;
      nickInput.style.borderWidth = `${borderSize}px`;
      nickInput.style.height = `${(44 * scaleY)}px`;
    };
    updateDOMPosition();
    window.addEventListener('resize', updateDOMPosition);

    // Botón Aceptar
    const btnAceptarY = py + 85;
    const btnAceptar = this.add.image(px, btnAceptarY, 'boton_precio')
      .setDisplaySize(200, 50)
      .setInteractive({ useHandCursor: true })
      .setDepth(302);

    const btnAceptarTxt = this.add.text(px, btnAceptarY, this.lang === 'es' ? 'ACEPTAR' : 'ACCEPT', {
      fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(302);

    btnAceptar.on('pointerdown', async () => {
      const nick = nickInput.value.trim();
      if (nick.length < 3) {
        this.mostrarAlerta(this.lang === 'es' ? 'Mínimo 3 caracteres' : 'Min 3 characters', '#ff0000');
        return;
      }

      this.mostrarAlerta(this.lang === 'es' ? 'Comprobando...' : 'Checking...', '#d5c23b');

      try {
        const esUnico = await esNicknameUnico(nick);
        if (!esUnico) {
          this.mostrarAlerta(this.lang === 'es' ? 'El nickname ya existe, escoge otro' : 'Nickname already taken', '#ff0000');
          return;
        }

        // Registrar nickname único
        const updatedData = await guardarNicknameDeUsuario(playerData.uid, nick);
        this.registry.set('playerData', updatedData);

        limpiarNickModal();

        // Notificación premium avisando de actualizar perfil
        this.mostrarModalAnimadoConfig(() => {
          if (callback) callback();
        });

      } catch (err) {
        console.error(err);
        this.mostrarAlerta(this.lang === 'es' ? 'Error al guardar apodo' : 'Error saving nickname', '#ff0000');
      }
    });

    const limpiarNickModal = () => {
      window.removeEventListener('resize', updateDOMPosition);
      
      // 🧼 Eliminar de memoria los listeners de teclado nativo
      if (showListener) showListener.remove();
      if (hideListener) hideListener.remove();

      if (domContainer && domContainer.parentNode) {
        domContainer.parentNode.removeChild(domContainer);
      }
      overlay.destroy();
      panelBg.destroy();
      titleText.destroy();
      descText.destroy();
      btnAceptar.destroy();
      btnAceptarTxt.destroy();
    };
  }

  // Notificación estilo alerta básica
  mostrarAlerta(msg, color) {
    const alertTxt = this.add.text(this.cameras.main.width / 2, 130, msg, {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      fill: '#ffffff',
      backgroundColor: color,
      padding: { x: 15, y: 8 }
    }).setOrigin(0.5).setDepth(300);

    this.time.delayedCall(2000, () => alertTxt.destroy());
  }

  // Notificación estilo modal animado premium con "configure su perfil en 'config'"
  mostrarModalAnimadoConfig(callback) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
      .setDepth(400)
      .setInteractive();

    const container = this.add.container(width / 2, height / 2).setDepth(401);
    
    // Imagen del panel
    const panel = this.add.image(0, 0, 'contenedor_objetos').setDisplaySize(500, 300);
    container.add(panel);

    const txtMsg = this.add.text(0, -30, this.lang === 'es' ? '¡BIENVENIDO!\nConfigure su perfil en "Config"' : 'WELCOME!\nConfigure your profile in "Config"', {
      fontFamily: 'Arial',
      fontSize: '26px',
      fontStyle: 'bold',
      fill: '#ffffff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5);
    container.add(txtMsg);

    // Botón Aceptar
    const btn = this.add.image(0, 70, 'boton_precio').setDisplaySize(180, 50).setInteractive({ useHandCursor: true });
    const btnTxt = this.add.text(0, 70, this.lang === 'es' ? 'ACEPTAR' : 'ACCEPT', {
      fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5);
    container.add([btn, btnTxt]);

    // Animación de entrada
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });

    btn.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0,
        scaleY: 0,
        duration: 200,
        ease: 'Back.easeIn',
        onComplete: () => {
          overlay.destroy();
          container.destroy();
          if (callback) callback();
        }
      });
    });
  }
}