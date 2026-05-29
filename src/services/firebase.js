// =====================================================================================
// IMPORTACIONES OFICIALES DESDE CDN PARA NAVEGADORES WEB (Firebase v10)
// =====================================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInAnonymously 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment,
  arrayUnion,
  collection, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// =====================================================================================
// 1. CONFIGURACIÓN DE CREDENCIALES
// =====================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCqxVgpdEHElPtEQBnJluRpL9dZ_BTV4aU",
  authDomain: "chulco-scape.firebaseapp.com",
  projectId: "chulco-scape",
  storageBucket: "chulco-scape.firebasestorage.app",
  messagingSenderId: "342486836898",
  appId: "1:342486836898:web:fb4f478b9ca8910e13d9fb",
  measurementId: "G-3X26PTVCQL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Estructura base para nuevos jugadores
const INITIAL_PLAYER_DATA = {
  dinero: 0,              // Dinero ganado en el juego para mejoras (CORREGIDO)
  moneda: 0,              // Encebollados para skins (AÑADIDO PARA EVITAR ERRORES)
  deudaActual: 500,       
  paseNivel: 1,           
  paseXP: 0,              
  pasePremium: false,
  recompensasPase: [],     
  mejoras: {
    velocidad: 1,         
    danioBolon: 1         
  },
  skinsDesbloqueadas: ['skin_base'], 
  accesorioEquipado: 'skin_base',
  puntosLigaSemanales: 0,
  ligaActual: 1,
  grupoLiga: `L1_G${Math.floor(Math.random() * 10) + 1}`, // Grupo aleatorio
  semanaActual: 0
};

// =====================================================================================
// FUNCIONES EXPORTADAS
// =====================================================================================

// --- UTILIDADES ---
export const obtenerNumeroSemana = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

export const iniciarSesionJugador = async () => {
  try {
    const credencial = await signInAnonymously(auth);
    const user = credencial.user;
    
    const jugadorDocRef = doc(db, "jugadores", user.uid);
    const jugadorDoc = await getDoc(jugadorDocRef);

    if (!jugadorDoc.exists()) {
      const newData = { ...INITIAL_PLAYER_DATA, semanaActual: obtenerNumeroSemana() };
      await setDoc(jugadorDocRef, newData);
      return newData;
    }
    
    const datos = jugadorDoc.data();
    return await gestionarReinicioSemanal(user.uid, datos);
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    throw error;
  }
};

export const gestionarReinicioSemanal = async (uid, datosJugador) => {
  const semanaActual = obtenerNumeroSemana();
  if (datosJugador.semanaActual !== semanaActual) {
    let nuevaLiga = datosJugador.ligaActual || 1;
    const puntos = datosJugador.puntosLigaSemanales || 0;
    
    if (nuevaLiga === 1 && puntos >= 500) nuevaLiga = 2;
    else if (nuevaLiga === 2 && puntos >= 1500) nuevaLiga = 3;
    else if (nuevaLiga === 3 && puntos >= 3000) nuevaLiga = 4;
    else if (nuevaLiga === 4 && puntos >= 5000) nuevaLiga = 5;

    // Calcular el premio de acuerdo a la liga original
    const ligaParaPremio = datosJugador.ligaActual || 1;
    const premios = { 1: 50, 2: 100, 3: 200, 4: 350, 5: 700 };
    const premioConsolacion = premios[ligaParaPremio] || 50;

    const actualizaciones = {
      puntosLigaSemanales: 0,
      semanaActual: semanaActual,
      moneda: increment(premioConsolacion),
      ligaActual: nuevaLiga,
      grupoLiga: `L${nuevaLiga}_G${Math.floor(Math.random() * 10) + 1}`,
      alertaReinicio: true
    };

    const jugadorDocRef = doc(db, "jugadores", uid);
    await updateDoc(jugadorDocRef, actualizaciones);

    return { ...datosJugador, ...actualizaciones, moneda: (datosJugador.moneda || 0) + premioConsolacion };
  }
  return datosJugador;
};

export const apagarAlertaReinicio = async () => {
  const user = auth.currentUser;
  if (!user) return;
  const jugadorDocRef = doc(db, "jugadores", user.uid);
  await updateDoc(jugadorDocRef, { alertaReinicio: false });
};

export const obtenerDatosJugador = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  const jugadorDocRef = doc(db, "jugadores", user.uid);
  const jugadorDoc = await getDoc(jugadorDocRef);
  return jugadorDoc.exists() ? jugadorDoc.data() : null;
};

// --- CATÁLOGO DE SKINS ---
export const obtenerCatalogoSkins = async () => {
  try {
    const skinsRef = collection(db, "catalogo_skins");
    const snapshot = await getDocs(skinsRef);
    const catalogo = [];
    
    snapshot.forEach((documento) => {
      catalogo.push({ id: documento.id, ...documento.data() });
    });
    
    return catalogo;
  } catch (error) {
    console.error("Error al obtener el catálogo de skins:", error);
    return [];
  }
};

// --- GESTIÓN DE SKINS DEL JUGADOR ---
export const equiparSkinEnFirebase = async (skinId) => {
  const user = auth.currentUser;
  if (!user) return;
  const jugadorDocRef = doc(db, "jugadores", user.uid);
  await updateDoc(jugadorDocRef, { accesorioEquipado: skinId });
};

export const adquirirAccesorioEstetico = async (idAccesorio, costo) => {
  const user = auth.currentUser;
  if (!user) return false;

  const jugadorDocRef = doc(db, "jugadores", user.uid);
  const datos = await obtenerDatosJugador();
  const inventarioActual = datos?.skinsDesbloqueadas || ['skin_base'];

  // CORRECCIÓN: Usar 'moneda' (Encebollados) para la compra de skins
  if (!datos || datos.moneda < costo || inventarioActual.includes(idAccesorio)) {
    return false; 
  }

  await updateDoc(jugadorDocRef, {
    moneda: increment(-costo), // Resta los encebollados
    skinsDesbloqueadas: arrayUnion(idAccesorio),
    accesorioEquipado: idAccesorio 
  });
  return true;
};

// --- COMPRAS Y ECONOMÍA (Tienda de Mejoras) ---
export const comprarMejoraEnTienda = async (tipoCompra, costo) => {
  const user = auth.currentUser;
  if (!user) return false;

  const jugadorDocRef = doc(db, "jugadores", user.uid);
  const datos = await obtenerDatosJugador();

  // CORRECCIÓN: Validar contra 'dinero'
  if (!datos || datos.dinero < costo) return false; 

  // CORRECCIÓN: Restar del campo 'dinero'
  let actualizaciones = { dinero: increment(-costo) };

  if (tipoCompra === 'deuda') {
    if (datos.deudaActual <= 0) return false;
    actualizaciones.deudaActual = increment(-100); 
  } else {
    actualizaciones[`mejoras.${tipoCompra}`] = increment(1);
  }

  await updateDoc(jugadorDocRef, actualizaciones);
  return true;
};

// --- PROGRESO Y OTROS ---
export const guardarResultadoRonda = async (dineroGanado, xpGanada) => {
  const user = auth.currentUser;
  if (!user) return;

  const jugadorDocRef = doc(db, "jugadores", user.uid);
  
  // CORRECCIÓN: Guardar en el campo 'dinero' en lugar de 'monedas'
  await updateDoc(jugadorDocRef, {
    dinero: increment(dineroGanado),
    paseXP: increment(xpGanada),
    puntosLigaSemanales: increment(dineroGanado)
  });

  await verificarSubidaDeNivelPase();
};

const verificarSubidaDeNivelPase = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const datos = await obtenerDatosJugador();
  if (!datos) return;

  const XP_POR_NIVEL = 1000; 
  
  if (datos.paseXP >= XP_POR_NIVEL && datos.paseNivel < 50) {
    const jugadorDocRef = doc(db, "jugadores", user.uid);
    await updateDoc(jugadorDocRef, {
      paseNivel: increment(1),
      paseXP: increment(-XP_POR_NIVEL)
    });
  }
};

export const actualizarDeuda = async (cantidad) => {
  const user = auth.currentUser;
  if (!user) return;
  const jugadorDocRef = doc(db, "jugadores", user.uid);
  await updateDoc(jugadorDocRef, {
    deudaActual: increment(cantidad)
  });
};

export const desbloquearPasePremium = async () => {
  const user = auth.currentUser;
  if (!user) return false;

  const jugadorDocRef = doc(db, "jugadores", user.uid);
  const datos = await obtenerDatosJugador();
  
  const COSTO_PREMIUM = 1000;
  
  if (!datos || (datos.moneda || 0) < COSTO_PREMIUM || datos.pasePremium) {
    return false;
  }
  
  await updateDoc(jugadorDocRef, {
    pasePremium: true,
    moneda: increment(-COSTO_PREMIUM)
  });
  return true;
};

export const comprarRecompensaPase = async (idRecompensa, costo, esPremium) => {
  const user = auth.currentUser;
  if (!user) return false;

  const jugadorDocRef = doc(db, "jugadores", user.uid);
  const datos = await obtenerDatosJugador();

  if (!datos) return false;

  if (esPremium && !datos.pasePremium) return false;
  if ((datos.dinero || 0) < costo) return false;
  if ((datos.recompensasPase || []).includes(idRecompensa)) return false;

  await updateDoc(jugadorDocRef, {
    dinero: increment(-costo),
    recompensasPase: arrayUnion(idRecompensa)
  });
  return true;
};