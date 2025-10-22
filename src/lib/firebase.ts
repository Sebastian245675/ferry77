import { initializeApp } from "firebase/app";

import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBJ9qMYR-_OtaZLJymskE5PV9NJjahDXEI",
  authDomain: "ferry-67757.firebaseapp.com", 
  projectId: "ferry-67757",
  storageBucket: "ferry-67757.firebasestorage.app",
  messagingSenderId: "583953685438",
  appId: "1:583953685438:web:6d8a4d39d9cd40ff8537ef",
  measurementId: "G-TGN3ZNSB59",
  databaseURL: "https://ferry-67757-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
// Mantener la sesión siempre abierta hasta que el usuario cierre sesión manualmente
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error configurando persistencia de sesión:", error);
});
export { auth };

export const db = getFirestore(app);

export const rtdb = getDatabase(app); // Realtime Database

export const storage = getStorage(app); // Firebase Storage