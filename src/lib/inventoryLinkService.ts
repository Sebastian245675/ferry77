import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

// Using a hardcoded key for development
const SECRET_KEY = 'secure-inventory-management-key';

/**
 * Generates a secure token for external inventory management
 * 
 * @param companyId The ID of the company
 * @param expireTimeInHours How long the link should be valid (default 48 hours)
 * @returns Secure token for URL
 */
export async function generateInventoryManagementToken(companyId: string, expireTimeInHours = 48): Promise<string> {
  try {
    // Check if company inventory exists
    const productsDoc = doc(db, "listados", companyId);
    const docSnapshot = await getDoc(productsDoc);
    
    // If not found in listados collection, try looking in users collection as fallback
    if (!docSnapshot.exists()) {
      const userDoc = doc(db, "users", companyId);
      const userSnapshot = await getDoc(userDoc);
      
      if (!userSnapshot.exists()) {
        throw new Error("Empresa no encontrada");
      }
    }
    
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + expireTimeInHours);
    
    const payload = {
      companyId,
      exp: expirationTime.getTime(),
      iat: Date.now()
    };
    
    // Create a simple token using base64 encoding
    // In production, you should use a proper JWT library
    const token = btoa(JSON.stringify(payload));
    
    // Make it URL-safe
    return encodeURIComponent(token);
  } catch (error) {
    console.error("Error generando token de inventario:", error);
    throw error;
  }
}

/**
 * Validates and decodes an inventory management token
 * 
 * @param token The encrypted token from URL
 * @returns The decoded payload if valid, null if invalid
 */
export function validateInventoryToken(token: string): { companyId: string, exp: number } | null {
  try {
    const decodedToken = decodeURIComponent(token);
    
    // Decode base64 token and parse JSON
    const decodedData = JSON.parse(atob(decodedToken));
    
    // Check expiration
    if (decodedData.exp < Date.now()) {
      console.log("Token expirado");
      return null;
    }
    
    return {
      companyId: decodedData.companyId,
      exp: decodedData.exp
    };
  } catch (error) {
    console.error("Error validando token:", error);
    return null;
  }
}

/**
 * Gets the full URL for inventory management
 * 
 * @param token The generated secure token
 * @returns Complete URL for inventory management
 */
export function getInventoryManagementUrl(token: string): string {
  // Determine if we're in development by checking the URL
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
  
  if (isDevelopment) {
    const port = window.location.port || '5173'; // Default Vite port
    return `http://${window.location.hostname}:${port}/inventory-manager/${token}`;
  }
  
  // In production - adjust this to your domain
  return `${window.location.origin}/inventory-manager/${token}`;
}
