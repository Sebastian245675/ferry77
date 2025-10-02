import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";
import { getAuth } from "firebase/auth";

/**
 * Upload an image file to Firebase Storage for quick requests
 */
export const uploadQuickRequestImage = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ url: string; path: string }> => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error("Usuario no autenticado");
    }

    // Create unique filename with timestamp and user ID
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `quickrequest_${user.uid}_${Date.now()}.${fileExt}`;
    const storagePath = `quick_requests/${user.uid}/${fileName}`;
    
    console.log(`[Quick Request] Subiendo imagen a: ${storagePath}`);
    
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
          console.log(`[Quick Request] Upload progress: ${progress.toFixed(2)}%`);
        },
        (error) => {
          console.error('[Quick Request] Error uploading image:', error);
          reject(error);
        },
        async () => {
          try {
            // Upload completed successfully, get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('[Quick Request] Image uploaded successfully:', downloadURL);
            
            resolve({
              url: downloadURL,
              path: storagePath
            });
          } catch (error) {
            console.error('[Quick Request] Error getting download URL:', error);
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('[Quick Request] Error in uploadQuickRequestImage:', error);
    throw error;
  }
};

/**
 * Upload multiple images for quick requests
 */
export const uploadMultipleQuickRequestImages = async (
  files: File[],
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<Array<{ url: string; path: string; originalName: string }>> => {
  const results = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Only process image files
    if (!file.type.startsWith('image/')) {
      continue;
    }
    
    try {
      const result = await uploadQuickRequestImage(file, (progress) => {
        if (onProgress) {
          onProgress(i, progress);
        }
      });
      
      results.push({
        ...result,
        originalName: file.name
      });
    } catch (error) {
      console.error(`[Quick Request] Error uploading image ${file.name}:`, error);
      // Continue with other files even if one fails
    }
  }
  
  return results;
};