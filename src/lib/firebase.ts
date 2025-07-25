import { initializeApp } from "firebase/app";

import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBKj78IBmypAj8F3OkGiLB9Tdhpp_OOrFk",
  authDomain: "ferry-67757.firebaseapp.com",
  projectId: "ferry-67757",
  storageBucket: "ferry-67757.appspot.com",
  messagingSenderId: "583953685438",
  appId: "1:583953685438:web:6d8a4d39d9cd40ff8537ef",
  measurementId: "G-TGN3ZNSB59",
  databaseURL: "https://ferry-67757-default-rtdb.firebaseio.com" // URL de Realtime Database
};

console.log("[FIREBASE] Inicializando Firebase con configuración:", {
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket
});

const app = initializeApp(firebaseConfig);
console.log("[FIREBASE] Firebase inicializado correctamente");


const auth = getAuth(app);
// Mantener la sesión siempre abierta hasta que el usuario cierre sesión manualmente
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error configurando persistencia de sesión:", error);
});
export { auth };

console.log("[FIREBASE] Inicializando Firestore...");
export const db = getFirestore(app);
console.log("[FIREBASE] Firestore inicializado");

console.log("[FIREBASE] Inicializando Realtime Database...");
export const rtdb = getDatabase(app); // Realtime Database
console.log("[FIREBASE] Realtime Database inicializada");

console.log("[FIREBASE] Inicializando Storage...");
export const storage = getStorage(app); // Firebase Storage
console.log("[FIREBASE] Storage inicializado con bucket:", storage.app.options.storageBucket);