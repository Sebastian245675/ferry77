/**
 * Helper function to get the correct image URL for display
 * Handles both Firebase Storage URLs (full URLs) and local storage URLs (relative paths)
 */
export const getImageUrl = (imagenUrl: string | null | undefined): string | null => {
  if (!imagenUrl) {
    return null;
  }

  // If it's already a full URL (Firebase Storage), return as is
  if (imagenUrl.startsWith('http://') || imagenUrl.startsWith('https://')) {
    return imagenUrl;
  }

  // If it's a relative path (local storage), prepend the backend URL
  return `http://localhost:8090/api/images/${imagenUrl}`;
};

/**
 * Check if an image URL is valid and accessible
 */
export const isValidImageUrl = (url: string | null): boolean => {
  return url !== null && url.trim().length > 0;
};