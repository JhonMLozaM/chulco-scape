// =====================================================================================
// IMPORTACIONES OFICIALES DESDE CDN PARA NAVEGADORES WEB (Firebase v10)
// =====================================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// =====================================================================================
// 1. CONFIGURACIÓN DE CREDENCIALES (Asegúrate de colocar tu API KEY real aquí)
// =====================================================================================
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI", // <-- Reemplaza esto con tu API Key real de la consola de Firebase
  authDomain: "chulco-scape-game.firebaseapp.com",
  projectId: "chulco-scape-game",
  storageBucket: "chulco-scape-game.appspot.com",
  messagingSenderId: "TU_SENDER_ID", // <-- Reemplaza con tu Sender ID real
  appId: "TU_APP_ID"                  // <-- Reemplaza con tu App ID real
};

// =====================================================================================
// INICIALIZACIÓN INMEDIATA (Previene el error 'No Firebase App [DEFAULT] has been created')
// =====================================================================================
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Estructura base para nuevos jugadores
const INITIAL_PLAYER_DATA = {
  monedas: 0,             
  deudaActual: 500,       
  paseNivel: 1,           
  paseXP: 0,              
  pasePremium: false,     
  mejoras: {
    velocidad: 1,         
    danioBolon: 1         
  },
  accesoriosComprados: ['sombrero_paja_toquilla_base'], 
  accesorioEquipado: 'sombrero_paja_toquilla_base'      
};

// =====================================================================================
// FUNCIONES EXPORTADAS PARA TUS ESCENAS DE PHASER
// =====================================================================================

/**
 * Autentica al jugador de forma anónima de entrada.
 */
export const iniciarSesionJugador = async () => {
  try {
    const credencial = await signInAnonymously(auth);
    const user = credencial.user;
    
    const jugadorDocRef = doc(db, "jugadores", user.uid);
    const jugadorDoc = await getDoc(jugadorDocRef);

    if (!jugadorDoc.exists()) {
      await setDoc(jugadorDocRef, INITIAL_PLAYER_DATA);
      return INITIAL_PLAYER_DATA;
    }

    return jugadorDoc.data();
  } catch (error) {
    console.error("Error al iniciar sesión en el ecosistema Firebase:", error);
    throw error;
  }
};

/**
 * Obtiene los datos actuales del jugador en Firestore.
 */
export const obtenerDatosJugador = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  
  const jugadorDocRef = doc(db, "jugadores", user.uid);
  const jugadorDoc = await getDoc(jugadorDocRef);
  return jugadorDoc.exists() ? jugadorDoc.data() : null;
};

/**
 * Guarda el progreso financiero e incrementa la experiencia tras una partida.
 */
export const guardarResultadoRonda = async (monedasGanadas, xpGanada) => {
  const user = auth.currentUser;
  if (!user) return;

  const jugadorDocRef = doc(db, "jugadores", user.uid);
  
  // Guardamos e incrementamos los valores usando la función atómica de Firebase
  await updateDoc(jugadorDocRef, {
    monedas: increment(monedasGanadas),
    paseXP: increment(xpGanada)
  });

  // Forzamos la verificación del nivel inmediatamente después del update
  await verificarSubidaDeNivelPase();
};

/**
 * Comprueba de forma exacta si el usuario debe subir de nivel en el Pase del Chulla.
 */
const verificarSubidaDeNivelPase = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const datos = await obtenerDatosJugador();
  if (!datos) return;

  const XP_POR_NIVEL = 1000; 
  
  // Bucle por si el jugador ganó tanta XP en una ronda que sube más de 1 nivel de golpe
  if (datos.paseXP >= XP_POR_NIVEL && datos.paseNivel < 50) {
    const jugadorDocRef = doc(db, "jugadores", user.uid);
    await updateDoc(jugadorDocRef, {
      paseNivel: increment(1),
      paseXP: increment(-XP_POR_NIVEL) // Resta el exceso de forma segura
    });
  }
};

/**
 * Procesa compras de estadísticas o abonos a la deuda con el Chulquero.
 */
export const comprarMejoraEnTienda = async (tipoCompra, costo) => {
  const user = auth.currentUser;
  if (!user) return false;

  const jugadorDocRef = doc(db, "jugadores", user.uid);
  const datos = await obtenerDatosJugador();

  if (!datos || datos.monedas < costo) return false; 

  let actualizaciones = {
    monedas: increment(-costo)
  };

  if (tipoCompra === 'deuda') {
    // Si abona a la deuda, reduce el valor negativo (evitando deudas menores a cero)
    if (datos.deudaActual <= 0) return false;
    actualizaciones.deudaActual = increment(-100); 
  } else {
    // Incrementa dinámicamente el nodo interno dentro de la propiedad del objeto
    actualizaciones[`mejoras.${tipoCompra}`] = increment(1);
  }

  await updateDoc(jugadorDocRef, actualizaciones);
  return true;
};

/**
 * Activa los privilegios del Pase Premium tras un pago exitoso.
 */
export const desbloquearPasePremium = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const jugadorDocRef = doc(db, "jugadores", user.uid);
  await updateDoc(jugadorDocRef, {
    pasePremium: true
  });
};

/**
 * Compra y equipa skins estéticas de forma nativa en el inventario de Firestore.
 */
export const adquirirAccesorioEstetico = async (idAccesorio, costo) => {
  const user = auth.currentUser;
  if (!user) return false;

  const jugadorDocRef = doc(db, "jugadores", user.uid);
  const datos = await obtenerDatosJugador();

  if (!datos || datos.monedas < costo || datos.accesoriosComprados.includes(idAccesorio)) {
    return false; 
  }

  const nuevoInventario = [...datos.accesoriosComprados, idAccesorio];

  await updateDoc(jugadorDocRef, {
    monedas: increment(-costo),
    accesoriosComprados: nuevoInventario,
    accesorioEquipado: idAccesorio 
  });

  return true;
};