import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export const testFirebaseConnection = async () => {
  console.log('🔍 Verificando conexión con Firebase...');
  console.log('📧 Auth instance:', auth);
  console.log('🌐 Auth config:', {
    apiKey: auth.app.options.apiKey?.substring(0, 10) + '...',
    authDomain: auth.app.options.authDomain,
    projectId: auth.app.options.projectId
  });
  
  // Verificar si hay usuario actual
  if (auth.currentUser) {
    console.log('✅ Usuario ya autenticado:', {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      emailVerified: auth.currentUser.emailVerified
    });
  } else {
    console.log('ℹ️ No hay usuario autenticado actualmente');
  }
};

export const debugLogin = async (email: string, password: string) => {
  console.group('🔐 Debug Login');
  console.log('📧 Email:', email);
  console.log('🔑 Password length:', password.length);
  console.log('📝 Email trimmed:', email.trim() === email);
  console.log('📝 Password has spaces:', password.includes(' '));
  
  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    console.log('✅ Login exitoso!', {
      uid: result.user.uid,
      email: result.user.email,
      emailVerified: result.user.emailVerified
    });
    return { success: true, user: result.user };
  } catch (error: any) {
    console.error('❌ Error en login:', {
      code: error.code,
      message: error.message,
      fullError: error
    });
    return { success: false, error };
  } finally {
    console.groupEnd();
  }
};
