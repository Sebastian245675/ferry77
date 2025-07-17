import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
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

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app); // Realtime Database
export const storage = getStorage(app); // Firebase Storage