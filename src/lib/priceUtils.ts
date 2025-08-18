/**
 * Utilidades para manejo seguro de precios
 */

/**
 * Verifica si un valor es un número válido
 * @param val Valor a verificar
 * @returns Verdadero si es un número válido
 */
export function isValidNumber(val: any): boolean {
  return val !== null && val !== undefined && !isNaN(parseFloat(val)) && isFinite(val);
}

/**
 * Formatea un precio de manera segura
 * @param price Precio a formatear
 * @returns Precio formateado como string
 */
export function formatPrice(price: any): string {
  if (!isValidNumber(price)) return "0";
  return parseFloat(price).toLocaleString();
}

/**
 * Obtiene el precio de un producto individual de manera segura
 * @param product Producto del cual obtener el precio
 * @returns Precio formateado
 */
export function getProductPrice(product: any): string {
  if (!product) return "0";
  
  if (isValidNumber(product.price)) {
    return formatPrice(product.price);
  } else if (isValidNumber(product.precio)) {
    return formatPrice(product.precio);
  } else if (isValidNumber(product.unitPrice)) {
    return formatPrice(product.unitPrice);
  }
  return "0";
}

/**
 * Obtiene el precio total de una cotización de manera segura
 * @param quote Cotización de la cual obtener el precio
 * @returns Precio formateado o "Por determinar" si no hay precio
 */
export function getQuotePrice(quote: any): string {
  if (!quote) return "Por determinar";
  
  if (isValidNumber(quote.totalAmount)) {
    return formatPrice(quote.totalAmount);
  } else if (isValidNumber(quote.amount)) {
    return formatPrice(quote.amount);
  } else if (isValidNumber(quote.total)) {
    return formatPrice(quote.total);
  } else if (isValidNumber(quote.budget)) {
    return formatPrice(quote.budget);
  } else if (quote.products && quote.products.length > 0) {
    return formatPrice(calculateTotal(quote.products));
  } else if (quote.items && quote.items.length > 0) {
    return formatPrice(calculateTotal(quote.items));
  }
  return "Por determinar";
}

/**
 * Calcula el precio total de un conjunto de productos
 * @param items Lista de productos
 * @returns Total calculado
 */
export function calculateTotal(items: any[]): number {
  if (!items || !Array.isArray(items) || items.length === 0) return 0;
  
  let total = 0;
  for (const item of items) {
    if (!item) continue; // Saltamos items undefined o null
    
    let price = 0;
    // Intentamos extraer el precio de diversas formas
    if (typeof item.price === 'number' && !isNaN(item.price)) {
      price = item.price;
    } else if (typeof item.price === 'string') {
      const parsedPrice = parseFloat(item.price);
      price = !isNaN(parsedPrice) ? parsedPrice : 0;
    } else if (typeof item.precio === 'number' && !isNaN(item.precio)) {
      price = item.precio;
    } else if (typeof item.precio === 'string') {
      const parsedPrice = parseFloat(item.precio);
      price = !isNaN(parsedPrice) ? parsedPrice : 0;
    } else if (item.unitPrice) {
      if (typeof item.unitPrice === 'number' && !isNaN(item.unitPrice)) {
        price = item.unitPrice;
      } else if (typeof item.unitPrice === 'string') {
        const parsedPrice = parseFloat(item.unitPrice);
        price = !isNaN(parsedPrice) ? parsedPrice : 0;
      }
    }
    
    // Verificamos que el precio sea válido (doble verificación)
    if (isNaN(price)) price = 0;
    
    // Obtenemos la cantidad, asegurándonos que sea un número válido
    let quantity = 1;
    if (typeof item.quantity === 'number' && !isNaN(item.quantity)) {
      quantity = item.quantity;
    } else if (typeof item.quantity === 'string') {
      const parsedQty = parseFloat(item.quantity);
      quantity = !isNaN(parsedQty) ? parsedQty : 1;
    } else if (typeof item.cantidad === 'number' && !isNaN(item.cantidad)) {
      quantity = item.cantidad;
    } else if (typeof item.cantidad === 'string') {
      const parsedQty = parseFloat(item.cantidad);
      quantity = !isNaN(parsedQty) ? parsedQty : 1;
    }
    
    // Sumamos al total
    total += price * quantity;
  }
  
  // Verificación final para asegurarnos de que el total es un número válido
  return !isNaN(total) ? total : 0;
}
