import { db } from './firebase';
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';

/**
 * Función para migrar documentos de verificación existentes desde la colección
 * "verificaciones" a la colección "users" como un subcampo
 */
export const migrateVerificationData = async (userId: string): Promise<boolean> => {
  try {
    // 1. Verificar si existe un documento de verificación para este usuario
    const verificationRef = doc(db, 'verificaciones', userId);
    const verificationDoc = await getDoc(verificationRef);
    
    if (!verificationDoc.exists()) {
      console.log(`No hay datos de verificación para migrar para el usuario ${userId}`);
      return false;
    }
    
    // 2. Obtener los datos de verificación
    const verificationData = verificationDoc.data();
    
    // 3. Verificar si el usuario existe
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error(`El usuario ${userId} no existe en la colección de usuarios`);
      return false;
    }
    
    // 4. Actualizar el documento del usuario con los datos de verificación
    await updateDoc(userRef, {
      verification: verificationData,
      verificationStatus: verificationData.isVerified ? 'verificado' : 'pendiente',
      verificationLastUpdated: new Date().toISOString(),
      // Si tiene fecha de envío, actualizamos también el campo de solicitud
      verificationRequested: !!verificationData.submissionDate,
      verificationRequestDate: verificationData.submissionDate 
        ? new Date(verificationData.submissionDate).toISOString() 
        : null,
      // Si tiene fecha de revisión, actualizamos también el campo de aprobación
      verificationApproved: !!verificationData.isVerified,
      verificationApprovalDate: verificationData.reviewDate 
        ? new Date(verificationData.reviewDate).toISOString() 
        : null
    });
    
    console.log(`Datos de verificación migrados correctamente para el usuario ${userId}`);
    return true;
  } catch (error) {
    console.error('Error migrando datos de verificación:', error);
    return false;
  }
};

/**
 * Función para migrar todos los documentos de verificación existentes
 */
export const migrateAllVerificationData = async (): Promise<{success: number, failed: number}> => {
  const result = {
    success: 0,
    failed: 0
  };
  
  try {
    // 1. Obtener todos los documentos de verificación
    const verificationsSnapshot = await getDocs(collection(db, 'verificaciones'));
    
    // 2. Para cada documento, intentar migrarlo
    for (const doc of verificationsSnapshot.docs) {
      const userId = doc.id;
      const success = await migrateVerificationData(userId);
      
      if (success) {
        result.success++;
      } else {
        result.failed++;
      }
    }
    
    console.log(`Migración completada. Éxitos: ${result.success}, Fallos: ${result.failed}`);
    return result;
  } catch (error) {
    console.error('Error en la migración masiva:', error);
    return result;
  }
};
