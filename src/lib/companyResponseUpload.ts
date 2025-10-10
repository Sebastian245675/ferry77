import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";
import { getAuth } from "firebase/auth";

/**
 * Upload an image file to Firebase Storage for company quick responses
 */
export const uploadCompanyResponseImage = async (
  file: File,
  solicitudId: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; path: string }> => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error("Usuario no autenticado");
    }

    // Create unique filename with timestamp, user ID and solicitud ID
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `response_${user.uid}_${solicitudId}_${Date.now()}.${fileExt}`;
    const storagePath = `company_responses/${user.uid}/${solicitudId}/${fileName}`;
    
    console.log(`[Company Response] Subiendo imagen a: ${storagePath}`);
    
    // Create storage reference
    const storageRef = ref(storage, storagePath);
    
    // Start upload
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    // Return a promise that resolves when upload is complete
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Calculate and report progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(progress);
          }
          console.log(`[Company Response] Upload progress: ${progress.toFixed(2)}%`);
        },
        (error) => {
          console.error('[Company Response] Error uploading image:', error);
          reject(error);
        },
        async () => {
          try {
            // Upload completed successfully, get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('[Company Response] Image uploaded successfully:', downloadURL);
            
            resolve({
              url: downloadURL,
              path: storagePath
            });
          } catch (error) {
            console.error('[Company Response] Error getting download URL:', error);
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('[Company Response] Error in uploadCompanyResponseImage:', error);
    throw error;
  }
};

/**
 * Upload Excel file to Firebase Storage for company quick responses
 */
export const uploadCompanyResponseExcel = async (
  file: File,
  solicitudId: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; path: string }> => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error("Usuario no autenticado");
    }

    // Create unique filename with timestamp, user ID and solicitud ID
    const fileExt = file.name.split('.').pop() || 'xlsx';
    const fileName = `excel_response_${user.uid}_${solicitudId}_${Date.now()}.${fileExt}`;
    const storagePath = `company_responses/${user.uid}/${solicitudId}/excel/${fileName}`;
    
    console.log(`[Company Response Excel] Subiendo archivo a: ${storagePath}`);
    
    // Create storage reference
    const storageRef = ref(storage, storagePath);
    
    // Start upload
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    // Return a promise that resolves when upload is complete
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Calculate and report progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(progress);
          }
          console.log(`[Company Response Excel] Upload progress: ${progress.toFixed(2)}%`);
        },
        (error) => {
          console.error('[Company Response Excel] Error uploading file:', error);
          reject(error);
        },
        async () => {
          try {
            // Upload completed successfully, get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('[Company Response Excel] File uploaded successfully:', downloadURL);
            
            resolve({
              url: downloadURL,
              path: storagePath
            });
          } catch (error) {
            console.error('[Company Response Excel] Error getting download URL:', error);
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('[Company Response Excel] Error in uploadCompanyResponseExcel:', error);
    throw error;
  }
};