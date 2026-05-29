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
  mejoras: {
    velocidad: 1,         
    danioBolon: 1         
  },
  skinsDesbloqueadas: ['skin_base'], 
  accesorioEquipado: 'skin_base'      
};

// =====================================================================================
// FUNCIONES EXPORTADAS
// =====================================================================================

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
    console.error("Error al iniciar sesión:", error);
    throw error;
  }
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
    paseXP: increment(xpGanada)
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
  if (!user) return;

  const jugadorDocRef = doc(db, "jugadores", user.uid);
  await updateDoc(jugadorDocRef, {
    pasePremium: true
  });
};