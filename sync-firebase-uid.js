// Script para sincronizar Firebase UID con la base de datos
// Ejecutar esto en la consola del navegador cuando estés autenticado

import { auth } from './src/lib/firebase';

async function syncFirebaseUid() {
  const user = auth.currentUser;
  
  if (!user) {
    console.error('❌ No hay usuario autenticado');
    return;
  }
  
  console.log('👤 Usuario actual:', {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName
  });
  
  // Actualizar el Firebase UID en el backend
  const response = await fetch('http://localhost:8090/api/usuarios/update-firebase-uid', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: user.email,
      firebaseUid: user.uid
    })
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log('✅ Firebase UID sincronizado correctamente:', data);
  } else {
    const error = await response.json();
    console.error('❌ Error sincronizando UID:', error);
  }
}

// Ejecutar
syncFirebaseUid();
