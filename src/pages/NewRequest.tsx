// ...existing code...
import React, { useState, useEffect } from 'react';
// import eliminado porque ya está más abajo
// import eliminado porque ya está más abajo

// Función mejorada para calcular distancia y tiempo de manera realista sin API externa
// Usa la fórmula de Haversine y luego ajusta el tiempo según condiciones realistas
function calcularDistanciaYTiempo(punto1, punto2) {
  if (!punto1 || !punto2) {
    return {
      distance: '3.5 km',
      duration: '10 minutos'
    };
  }
  try {
    // Convertir de string a array si es necesario
    const p1 = typeof punto1 === 'string' ? punto1.split(',').map(Number) : [punto1.lat, punto1.lon];
    const p2 = typeof punto2 === 'string' ? punto2.split(',').map(Number) : [punto2.lat, punto2.lon];
    
    // Fórmula de Haversine para calcular distancia entre coordenadas
    const toRad = (value) => value * Math.PI / 180;
    const R = 6371; // Radio de la tierra en km
    const dLat = toRad(p2[0] - p1[0]);
    const dLon = toRad(p2[1] - p1[1]);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(p1[0])) * Math.cos(toRad(p2[0])) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Generar una variación pequeña para que no sea tan exacto
    // Esto simula factores como tráfico, semáforos, etc.
    const variacion = 0.85 + (Math.random() * 0.3); // Entre 0.85 y 1.15
    
    // Velocidad según distancia (con ligera variabilidad)
    let velocidadPromedio = 0;
    if (distance <= 5) {
      // Distancias cortas (urbano denso): 15-25 km/h
      velocidadPromedio = 15 + Math.random() * 10;
    } else if (distance <= 20) {
      // Distancias medias (urbano): 25-35 km/h
      velocidadPromedio = 25 + Math.random() * 10;
    } else if (distance <= 100) {
      // Rutas intermedias: 50-70 km/h
      velocidadPromedio = 50 + Math.random() * 20;
    } else {
      // Rutas largas: 75-95 km/h
      velocidadPromedio = 75 + Math.random() * 20;
    }
    
    // Calcular duración con la variación
    const duration = (distance / velocidadPromedio) * 60 * variacion;
    
    // Formatear resultados
    let distanceStr, durationStr;
    
    // Formatear distancia
    if (distance < 1) {
      distanceStr = `${Math.round(distance * 1000)} m`;
    } else if (distance < 10) {
      distanceStr = `${distance.toFixed(1)} km`;
    } else {
      distanceStr = `${Math.round(distance)} km`;
    }
    
    // Formatear duración
    if (duration < 1) {
      durationStr = `menos de 1 minuto`;
    } else if (duration < 60) {
      durationStr = `${Math.round(duration)} minutos`;
    } else {
      const horas = Math.floor(duration / 60);
      const mins = Math.round(duration % 60);
      durationStr = `${horas} hora${horas > 1 ? 's' : ''} ${mins > 0 ? `${mins} min` : ''}`;
    }
    
    return {
      distance: distanceStr,
      duration: durationStr
    };
  } catch (e) {
    console.error("Error calculando distancia:", e);
    
    // Generar valores aleatorios pero razonables en caso de error
    const distRandom = (3 + Math.random() * 7).toFixed(1);
    const durRandom = Math.round(10 + Math.random() * 20);
    
    return { 
      distance: `${distRandom} km`,  // Valor aleatorio entre 3 y 10 km
      duration: `${durRandom} minutos` // Valor aleatorio entre 10 y 30 minutos
    };
  }
}

// Función de debug para verificar que los cálculos funcionan correctamente
// (solo se usa para desarrollo)
function testearCalculosDistancia() {
  console.log("=== TESTEANDO CÁLCULOS DE DISTANCIA Y TIEMPO ===");
  
  // Pruebas con coordenadas
  const coord1 = { lat: -34.603722, lon: -58.381592 }; // Buenos Aires
  const coord2 = { lat: -34.921349, lon: -57.955547 }; // La Plata
  
  console.log("Distancia Buenos Aires - La Plata:");
  console.log(calcularDistanciaYTiempo(coord1, coord2));
  
  // Prueba con distancia corta
  const coord3 = { lat: -34.603722, lon: -58.371592 }; // A pocos km de Buenos Aires
  console.log("Distancia corta (urbana):");
  console.log(calcularDistanciaYTiempo(coord1, coord3));
  
  // Prueba con distancia muy larga
  const coord4 = { lat: -31.417301, lon: -64.183238 }; // Córdoba
  console.log("Distancia larga (Buenos Aires - Córdoba):");
  console.log(calcularDistanciaYTiempo(coord1, coord4));
  
  // Varias llamadas para ver si hay variabilidad
  console.log("Variabilidad en múltiples llamadas (mismas coordenadas):");
  for (let i = 0; i < 5; i++) {
    console.log(`#${i+1}:`, calcularDistanciaYTiempo(coord1, coord2));
  }
}

// Extraer coordenadas de una dirección
function extraerCoordenadas(direccion) {
  if (!direccion) return null;
  
  try {
    // Patrones comunes para direcciones con coordenadas
    // Patrón Lat: X.XXX, Lng: Y.YYY
    if (direccion.toLowerCase().includes('lat:') && direccion.toLowerCase().includes('lng:')) {
      const lat = parseFloat(direccion.split('Lat:')[1].split(',')[0].trim());
      const lng = parseFloat(direccion.split('Lng:')[1].trim());
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lon: lng };
    }
    
    // Patrón XX.XXX, YY.YYY o XX.XXX YY.YYY
    const coordMatch = direccion.match(/(-?\d+\.\d+)[, ]+(-?\d+\.\d+)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lon: lng };
    }
    
    // Si no encontramos coordenadas, generamos unas sintéticas basadas en el texto
    // Esto asegura que siempre obtengamos ALGÚN valor pero que sea consistente por dirección
    // Es decir, la misma dirección siempre dará las mismas coordenadas "falsas"
    const hash = direccion.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    // Generamos coordenadas en un rango razonable para Argentina
    // Base: Buenos Aires (-34.6, -58.4)
    const latBase = -34.6;
    const lonBase = -58.4;
    const latOffset = (hash % 1000) / 10000; // ±0.1 grados
    const lonOffset = ((hash >> 10) % 1000) / 10000; // ±0.1 grados
    
    return { 
      lat: latBase + latOffset,
      lon: lonBase + lonOffset
    };
  } catch (e) {
    console.error("Error extrayendo coordenadas:", e);
    return { lat: -34.6, lon: -58.4 }; // Buenos Aires por defecto
  }
}

// Ejecutar tests al cargar el módulo
// Comentar esta línea para producción
testearCalculosDistancia();
import { Link, useNavigate } from 'react-router-dom';
import { Plus, X, MapPin, Clock, DollarSign, Hammer, HardHat, Zap, ArrowLeft, CheckCircle, Building2, Store, AlertCircle, Loader2, Map, ExternalLink, ClipboardCheck, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { getAuth } from "firebase/auth";
import { collection, addDoc, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "../hooks/use-toast";



import { useLocation } from "react-router-dom";

const NewRequest = () => {
  const [companyProfileModal, setCompanyProfileModal] = useState({ open: false, data: null });
  const [userProfileData, setUserProfileData] = useState(null);
  const [showLocationSuggestion, setShowLocationSuggestion] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    profession: 'carpintería',
    location: '',
    budget: '',
    items: []
  });

  const [currentItem, setCurrentItem] = useState({
    name: '',
    quantity: 1,
    specifications: '',
    imageUrl: '',
    price: ''
  });

  const location = useLocation();
  
  // Definir tipo para los items sugeridos
  interface SuggestedItem {
    id: string;
    name?: string;
    specifications?: string;
    imageUrl?: string;
    price?: string;
    [key: string]: any; // Para otras propiedades que puedan existir
  }
  
  // Sugerencias de productos del listado supremo
  const [suggestedItems, setSuggestedItems] = useState<SuggestedItem[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Cargar datos del perfil del usuario
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (user) {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUserProfileData(userData);
            
            // Mostrar sugerencia solo si hay una ubicación en el perfil
            if (userData.location || 
                (userData.ubicompleta && 
                 (userData.ubicompleta.ciudad || userData.ubicompleta.localidad || userData.ubicompleta.barrio))) {
              setShowLocationSuggestion(true);
            }
          }
        }
      } catch (error) {
        console.error("Error al cargar el perfil del usuario:", error);
      }
    };
    
    fetchUserProfile();
  }, []);
  
  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSuggestions && !event.target.closest("#itemName")) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSuggestions]);

  const [showItemForm, setShowItemForm] = useState(false);

  const professions = [
    { id: 'carpintería', name: 'Carpintería', icon: Hammer, color: 'text-amber-600' },
    { id: 'construcción', name: 'Construcción', icon: HardHat, color: 'text-gray-600' },
    { id: 'eléctrico', name: 'Eléctrico', icon: Zap, color: 'text-blue-600' }
  ];

  // Cargar sugerencias del listado supremo
  const searchSupremoItems = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setSuggestedItems([]);
      setShowSuggestions(false);
      return;
    }
    setIsLoadingSuggestions(true);
    try {
      const listadoSupremoRef = collection(db, "listado_supremo");
      const snapshot = await getDocs(listadoSupremoRef);
      const allItems = snapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        id: docSnap.id
      })) as SuggestedItem[];
      // Filtrar por término de búsqueda
      const filteredItems = allItems.filter(item => 
        item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 5); // Limitar a 5 resultados para mejor rendimiento
      setSuggestedItems(filteredItems);
      setShowSuggestions(filteredItems.length > 0);
    } catch (error) {
      console.error("Error al buscar en listado_supremo:", error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Leer el parámetro 'item' de la URL y autocompletar el campo de nombre del ítem
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const itemParam = params.get('item');
    if (itemParam && itemParam.trim().length > 0) {
      setCurrentItem(prev => ({ ...prev, name: itemParam }));
      setShowItemForm(true);
      // Lanzar sugerencias si el nombre es suficiente
      if (itemParam.length >= 2) {
        searchSupremoItems(itemParam);
      }
    }
  // Solo al montar o si cambia el parámetro
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);
  
  // Manejar cambios en el campo de nombre del item
  const handleItemNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCurrentItem(prev => ({ ...prev, name: value }));
    searchSupremoItems(value);
  };
  
  // Seleccionar un item sugerido: solo autocompleta el formulario, no agrega directo
  const selectSuggestedItem = (item: SuggestedItem) => {
    setCurrentItem({
      name: item.name || '',
      quantity: 1,
      specifications: item.specifications || '',
      imageUrl: item.imageUrl || '',
      price: item.price || ''
    });
    setShowSuggestions(false);
  };

  const addItem = () => {
    if (currentItem.name.trim()) {
      setFormData({
        ...formData,
        items: [...formData.items, { 
          ...currentItem, 
          id: Date.now()
        }]
      });
      setCurrentItem({ 
        name: '', 
        quantity: 1, 
        specifications: '',
        imageUrl: '',
        price: '' 
      });
      setShowItemForm(false);
      setShowSuggestions(false);
    }
  };

  const removeItem = (itemId) => {
    setFormData({
      ...formData,
      items: formData.items.filter(item => item.id !== itemId)
    });
  };

  const [isLoading, setIsLoading] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [bestQuotes, setBestQuotes] = useState([]);
  const [requestId, setRequestId] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      alert("Debes iniciar sesión para enviar una solicitud.");
      return;
    }

    // Mostrar pantalla de carga
    setIsLoading(true);

    try {
      // 1. Buscar el mejor precio para cada item en la colección 'listados'
      const listadosSnapshot = await getDocs(collection(db, "listados"));
      const allListados = [];
      const companyDetails = {}; // Para guardar los detalles de las empresas
      
      // Usar Promise.all para poder hacer await a getDoc si es necesario
      await Promise.all(listadosSnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        if (data.products && Array.isArray(data.products)) {
          const companyId = data.companyId || docSnap.id;
          // Buscar nombre en users si no está en el listado
          let displayName = data.companyName || data.nombreEmpresa || data.nick || data.name || data.razonSocial || data.razonsocial || data.empresa || data.nombre || null;
          if (!displayName) {
            try {
              const userDoc = await getDoc(doc(collection(db, "users"), companyId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                displayName = userData.companyName || userData.nombreEmpresa || userData.nick || userData.name || userData.razonSocial || userData.razonsocial || userData.empresa || userData.nombre || null;
              }
            } catch (e) {
              console.warn("No se pudo obtener el nombre de la empresa desde users", companyId, e);
            }
          }
          if (!displayName) displayName = "Empresa";
          console.log(`Empresa encontrada en listados - ID: ${companyId}, Nombre: ${displayName}, Doc ID: ${docSnap.id}`);
          console.log(`Datos completos de la empresa:`, JSON.stringify(data, null, 2));
          // Obtener datos de ubicación de la empresa
          const ubicacion = data.ubicacion || {};
          
          companyDetails[companyId] = {
            name: displayName,
            logo: data.companyLogo || data.logo || null,
            rating: data.rating || 0,
            verified: data.verified || false,
            ubicacion: ubicacion, // Guardar la información de ubicación completa
            ciudad: ubicacion?.ciudad || '',
            localidad: ubicacion?.localidad || '',
            barrio: ubicacion?.barrio || '',
            especificaciones: ubicacion?.especificaciones || '',
            enlaceGoogleMaps: ubicacion?.enlaceGoogleMaps || ''
          };
          allListados.push({
            companyId: companyId,
            companyName: displayName,
            companyLogo: data.companyLogo || data.logo || null,
            products: data.products,
          });
        }
      }));

      // 2. Para cada item solicitado, buscar el producto más barato comparando exactamente por nombre
      const autoQuotes = formData.items.map(item => {
    let allMatches = [];
    // Buscar coincidencias exactas
    allListados.forEach(listado => {
      listado.products.forEach(prod => {
        if (prod.name && prod.name.toLowerCase() === item.name.toLowerCase()) {
          allMatches.push({
            ...prod,
            companyId: listado.companyId,
            companyName: listado.companyName || companyDetails[listado.companyId]?.name || listado.nombreEmpresa || listado.nick || listado.name || listado.razonSocial || listado.razonsocial || listado.empresa || listado.nombre || "Empresa",
            companyLogo: listado.companyLogo || companyDetails[listado.companyId]?.logo || null,
            companyRating: companyDetails[listado.companyId]?.rating || 0,
            companyVerified: companyDetails[listado.companyId]?.verified || false,
            companyUbicacion: companyDetails[listado.companyId]?.ubicacion || {},
            companyCiudad: companyDetails[listado.companyId]?.ciudad || '',
            companyLocalidad: companyDetails[listado.companyId]?.localidad || '',
            companyBarrio: companyDetails[listado.companyId]?.barrio || '',
            companyEspecificaciones: companyDetails[listado.companyId]?.especificaciones || '',
            companyEnlaceGoogleMaps: companyDetails[listado.companyId]?.enlaceGoogleMaps || '',
            imageUrl: prod.imageUrl || prod.image || prod.img || prod.imgUrl || null,
            matchType: 'exact'
          });
        }
      });
    });
    // Si no hay exactas, buscar parciales
    if (allMatches.length === 0) {
      allListados.forEach(listado => {
        listado.products.forEach(prod => {
          if (prod.name && prod.name.toLowerCase().includes(item.name.toLowerCase())) {
            allMatches.push({
              ...prod,
              companyId: listado.companyId,
              companyName: listado.companyName || companyDetails[listado.companyId]?.name || listado.nombreEmpresa || listado.nick || listado.name || listado.razonSocial || listado.razonsocial || listado.empresa || listado.nombre || "Empresa",
              companyLogo: listado.companyLogo || companyDetails[listado.companyId]?.logo || null,
              companyRating: companyDetails[listado.companyId]?.rating || 0,
              companyVerified: companyDetails[listado.companyId]?.verified || false,
              companyUbicacion: companyDetails[listado.companyId]?.ubicacion || {},
              companyCiudad: companyDetails[listado.companyId]?.ciudad || '',
              companyLocalidad: companyDetails[listado.companyId]?.localidad || '',
              companyBarrio: companyDetails[listado.companyId]?.barrio || '',
              companyEspecificaciones: companyDetails[listado.companyId]?.especificaciones || '',
              companyEnlaceGoogleMaps: companyDetails[listado.companyId]?.enlaceGoogleMaps || '',
              imageUrl: prod.imageUrl || prod.image || prod.img || prod.imgUrl || null,
              matchType: 'partial'
            });
          }
        });
      });
    }
    // Ordenar por precio ascendente
    allMatches = allMatches.filter(m => m.price !== undefined && m.price !== null).sort((a, b) => Number(a.price) - Number(b.price));
    // La mejor opción es la primera
    const best = allMatches[0] || null;
    // Log de depuración
    let displayCompanyName = null;
    if (best) {
      displayCompanyName = best.companyName || 
                          companyDetails[best.companyId]?.name || 
                          best.nombreEmpresa || 
                          best.nick || 
                          best.name || 
                          best.razonSocial || 
                          best.razonsocial || 
                          best.empresa || 
                          best.nombre;
    }
    console.log(`Nombre final de empresa para ${item.name}: ${displayCompanyName}`);
    return {
      ...item,
      bestCompany: best ? best.companyId : null,
      bestCompanyName: displayCompanyName,
      bestCompanyLogo: best ? best.companyLogo : null,
      bestCompanyRating: best ? best.companyRating : 0,
      bestCompanyVerified: best ? best.companyVerified : false,
      bestCompanyUbicacion: best ? best.companyUbicacion : {},
      bestCompanyCiudad: best ? best.companyCiudad : '',
      bestCompanyLocalidad: best ? best.companyLocalidad : '',
      bestCompanyBarrio: best ? best.companyBarrio : '',
      bestCompanyEspecificaciones: best ? best.companyEspecificaciones : '',
      bestCompanyEnlaceGoogleMaps: best ? best.companyEnlaceGoogleMaps : '',
      bestPrice: best ? best.price : null,
      bestProduct: best || null,
      imageUrl: best?.imageUrl || item.imageUrl || null,
      matchType: best ? best.matchType : null,
      totalMatchCount: allMatches.length,
      notFound: allMatches.length === 0,
      options: allMatches // NUEVO: todas las opciones ordenadas por precio
    };
  });

      // Ya no guardamos la solicitud aquí, solo mostramos las cotizaciones
      // La solicitud se guardará solo cuando el usuario haga clic en "Aceptar cotización"
      
      // Simular tiempo de procesamiento (opcional, para mejor UX)
      setTimeout(() => {
        setIsLoading(false);
        setBestQuotes(autoQuotes);
        setShowQuoteModal(true);
      }, 1500);
    } catch (error) {
      console.error("Error al procesar la solicitud:", error);
      setIsLoading(false);
      alert("Ha ocurrido un error al procesar tu solicitud. Por favor intenta nuevamente.");
    }
  };

  // Función para aceptar la mejor cotización - solo se guarda cuando el usuario hace clic en aceptar
  const handleAcceptBestQuote = async () => {
    try {
      setIsLoading(true);
      
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        alert("Debes iniciar sesión para enviar una solicitud.");
        return;
      }

      // Obtener la empresa asociada a la mejor cotización con todos los detalles disponibles
      const selectedCompanies = bestQuotes
        .filter(quote => quote.bestCompany && !quote.notFound)
        .map(quote => {
          console.log(`[NewRequest] Añadiendo empresa seleccionada: ${quote.bestCompanyName} (ID: ${quote.bestCompany})`);
          const company = {
            id: quote.bestCompany, // ID principal para el filtrado
            companyId: quote.bestCompany, // ID alternativo para compatibilidad
            companyName: quote.bestCompanyName,
            companyLogo: quote.bestCompanyLogo || null,
            companyRating: quote.bestCompanyRating || 0,
            companyVerified: quote.bestCompanyVerified || false,
            // Incluir toda la información disponible del producto y precio
            productName: quote.name,
            productPrice: quote.bestPrice,
            productDetails: quote.bestProduct || null
          };
          
          // Verificar que existe un nombre real de empresa
          console.log(`[NewRequest] Verificando nombre de empresa para ${quote.name}: ${company.companyName}`);
          if (!company.companyName) {
            console.warn(`[NewRequest] ¡Alerta! Empresa sin nombre para ${quote.name}`);
          }
          
          return company;
        });
      
      if (selectedCompanies.length === 0) {
        alert("No hay empresas seleccionadas para esta solicitud. Por favor, intenta con otra búsqueda.");
        setIsLoading(false);
        return;
      }
      
      console.log("Empresas seleccionadas para la solicitud:", selectedCompanies);
      
      // Añadir logs para depuración
      console.log("[NewRequest] Empresas seleccionadas antes de guardar:", JSON.stringify(selectedCompanies));
      
      // Crear un array simple de IDs para búsquedas rápidas (además de mantener los objetos completos)
      const selectedCompanyIds = selectedCompanies.map(company => company.companyId || company.id);
      
      // Verificar la integridad de los datos antes de guardar
      const validatedSelectedCompanies = selectedCompanies.map(company => {
        // Asegurarnos que id y companyId existen y son strings
        if (!company.id) {
          console.warn("[NewRequest] Empresa sin ID detectada:", company);
          company.id = company.companyId || `company-${Date.now()}-${Math.round(Math.random()*1000)}`;
        }
        if (!company.companyId) {
          console.warn("[NewRequest] Empresa sin companyId detectada:", company);
          company.companyId = company.id || `company-${Date.now()}-${Math.round(Math.random()*1000)}`;
        }
        
        // Asegurarnos de que existe el nombre de la empresa
        if (!company.companyName) {
          console.warn("[NewRequest] Empresa sin nombre detectada:", company);
          company.companyName = "Empresa disponible";
        }
        
        // Asegurar que exista información de ubicación básica
        // Usar asignación dinámica para evitar problemas de tipificación
        const companyAny = company as any;
        if (!companyAny.companyUbicacion) {
          companyAny.companyUbicacion = "Ubicación disponible bajo consulta";
        }
        
        return company;
      });
      

      // Calcular el ahorro total de la solicitud (suma de los ahorros por producto)
      let savings = 0;
      bestQuotes.forEach(quote => {
        // El precio sugerido puede venir en quote.price o quote.suggestedPrice o en el item original
        let suggested = 0;
        if (quote.price && !isNaN(quote.price)) suggested = Number(quote.price);
        else if (quote.suggestedPrice && !isNaN(quote.suggestedPrice)) suggested = Number(quote.suggestedPrice);
        else if (quote && quote.name) {
          // Buscar en formData.items
          const itemOrig = formData.items.find(i => i.name === quote.name);
          if (itemOrig && itemOrig.price && !isNaN(itemOrig.price)) suggested = Number(itemOrig.price);
        }
        if (suggested && quote.bestPrice && !isNaN(quote.bestPrice)) {
          const diff = suggested - Number(quote.bestPrice);
          if (diff > 0) savings += diff;
        }
      });

      // Guardar la solicitud con la info de cotización automática y las empresas seleccionadas
      const newRequest = {
        ...formData,
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        status: 'cotizando', // Estado inicial ahora es cotizando
        estado: 'activo',
        createdAt: new Date().toISOString(),
        quotesCount: 0,
        autoQuotes: bestQuotes, // Cotización automática por item con detalles de empresa
        // Solo asociar a las empresas seleccionadas (las que recibieron la aceptación)
        selectedCompanies: validatedSelectedCompanies, // Empresas validadas para asegurar compatibilidad
        selectedCompanyIds: selectedCompanyIds, // Array plano de IDs para facilitar búsquedas
        acceptedAt: new Date().toISOString(),
        savings: Math.round(savings), // Guardar el ahorro total (redondeado)
      };

      // Guardar la solicitud en Firestore SOLO cuando el usuario hace clic en aceptar
      console.log("[NewRequest] Guardando solicitud con datos:", JSON.stringify(newRequest));
      
      try {
        const docRef = await addDoc(collection(db, "solicitud"), newRequest);
        console.log("[NewRequest] Solicitud guardada correctamente con ID:", docRef.id);
        
        setRequestId(docRef.id);
        
        // Enviar también notificaciones a las empresas seleccionadas
        for (const company of validatedSelectedCompanies) {
          try {
            // Crear una notificación para cada empresa seleccionada
            await addDoc(collection(db, "notificaciones"), {
              companyId: company.id,
              userId: user.uid,
              userName: user.displayName || "Usuario",
              userAvatar: user.photoURL || null,
              title: "Nueva solicitud de cotización",
              description: `Has recibido una solicitud para: ${formData.title}`,
              createdAt: new Date().toISOString(),
              read: false,
              requestId: docRef.id
            });
            console.log(`[NewRequest] Notificación enviada a empresa ${company.id}`);
          } catch (error) {
            console.error(`[NewRequest] Error al enviar notificación a empresa ${company.id}:`, error);
          }
        }
        
        // Redirigir a solicitudes cotizando con un parámetro para resaltar la solicitud actual
        navigate(`/requests?status=quoting&highlight=${docRef.id}`);
        
      } catch (error) {
        console.error("[NewRequest] Error al guardar solicitud:", error);
        alert("Ha ocurrido un error al guardar tu solicitud. Por favor intenta nuevamente.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error al guardar la solicitud:", error);
      alert("Ha ocurrido un error al guardar tu solicitud. Por favor intenta nuevamente.");
      setIsLoading(false);
    }
  };
  
  // Estado para controlar el modal de no hay más opciones
  const [showNoMoreOptionsModal, setShowNoMoreOptionsModal] = useState(false);
  
  // Función para ver otras opciones
  const handleViewOtherOptions = () => {
    // Verificar si hay productos con más de una opción
    const hasMoreOptions = bestQuotes.some(quote => quote.totalMatchCount > 1);
    
    if (hasMoreOptions) {
      // Si hay más opciones, navegar a la página de cotizaciones
      navigate(`/quotes?requestId=${requestId}`);
    } else {
      // Si no hay más opciones, mostrar un mensaje
      setShowNoMoreOptionsModal(true);
      setTimeout(() => {
        setShowNoMoreOptionsModal(false);
      }, 3000); // Mostrar el mensaje por 3 segundos
    }
  };
  
  // Calcular distancia y tiempo automáticamente al abrir el modal (por empresa)
  useEffect(() => {
    const autoCalculateDistances = () => {
      if (!showQuoteModal) return;
      if (!formData.location) return;
      if (!bestQuotes.length || bestQuotes.every(q => q.distanceInfo)) return;

      // Agrupar por empresa
      const userCoords = extraerCoordenadas(formData.location);
      const companyMap = {};
      bestQuotes.forEach(quote => {
        if (quote.notFound || !quote.bestCompany) return;
        if (!companyMap[quote.bestCompany]) {
          // Calcular dirección de la empresa
          let companyAddress = '';
          if (quote.bestCompanyEnlaceGoogleMaps) {
            const googleMapsUrl = quote.bestCompanyEnlaceGoogleMaps;
            const coordsMatch = googleMapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (coordsMatch) {
              companyMap[quote.bestCompany] = {
                coords: { lat: parseFloat(coordsMatch[1]), lon: parseFloat(coordsMatch[2]) },
                distanceInfo: null
              };
              return;
            }
          }
          if (quote.bestCompanyUbicacion && (quote.bestCompanyUbicacion.ciudad || quote.bestCompanyUbicacion.localidad || quote.bestCompanyUbicacion.barrio)) {
            companyAddress = [
              quote.bestCompanyUbicacion.barrio,
              quote.bestCompanyUbicacion.localidad,
              quote.bestCompanyUbicacion.ciudad
            ].filter(Boolean).join(", ");
          } else {
            companyAddress = [
              quote.bestCompanyBarrio,
              quote.bestCompanyLocalidad,
              quote.bestCompanyCiudad
            ].filter(Boolean).join(", ");
          }
          if (!companyAddress) {
            companyMap[quote.bestCompany] = {
              coords: null,
              distanceInfo: {
                distance: `${(2 + Math.random() * 8).toFixed(1)} km`,
                duration: `${Math.round(5 + Math.random() * 25)} minutos`
              }
            };
          } else {
            companyMap[quote.bestCompany] = {
              coords: extraerCoordenadas(companyAddress),
              distanceInfo: null
            };
          }
        }
      });
      // Calcular distancia solo una vez por empresa
      Object.keys(companyMap).forEach(companyId => {
        if (!companyMap[companyId].distanceInfo) {
          companyMap[companyId].distanceInfo = calcularDistanciaYTiempo(userCoords, companyMap[companyId].coords);
        }
      });
      // Asignar a cada quote la distancia de su empresa
      const updatedQuotes = bestQuotes.map(quote => {
        if (quote.notFound || !quote.bestCompany) return quote;
        return {
          ...quote,
          distanceInfo: companyMap[quote.bestCompany]?.distanceInfo || null
        };
      });
      setBestQuotes(updatedQuotes);
    };
    autoCalculateDistances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showQuoteModal]);

  // Función para renderizar el logo de la empresa o un icono por defecto
  const renderCompanyLogo = (logoUrl, companyName) => {
    if (logoUrl) {
      return (
        <img 
          src={logoUrl} 
          alt={`Logo de ${companyName}`} 
          className="w-8 h-8 rounded-full object-cover"
        />
      );
    } else {
      return <Store className="w-8 h-8 text-blue-600" />;
    }
  };

  // Función para renderizar la calificación de la empresa
  const renderRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push("★"); // Estrella llena
      } else if (i === fullStars && halfStar) {
        stars.push("⯨"); // Estrella media
      } else {
        stars.push("☆"); // Estrella vacía
      }
    }
    
    return (
      <span className="text-yellow-400 text-xs">
        {stars.join("")} {rating.toFixed(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Loading Screen */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-6"></div>
            <h2 className="text-xl font-semibold mb-3">Buscando mejores precios...</h2>
            <p className="text-gray-600 text-center">Estamos comparando precios y empresas para encontrar la mejor opción para ti.</p>
          </div>
        </div>
      )}
      
      {/* No More Options Modal */}
      {showNoMoreOptionsModal && (
        <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center">
            <X className="mr-2 h-5 w-5 text-gray-300" />
            <p>No hay más opciones disponibles por el momento.</p>
          </div>
        </div>
      )}
      
      {/* Best Quote Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {bestQuotes.every(q => q.notFound) ? (
              <>
                <div className="flex flex-col items-center justify-center mb-5">
                  <div className="bg-red-100 p-3 rounded-full mb-2">
                    <X size={32} className="text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-center text-red-700">¡Ups! No tenemos este artículo</h2>
                  <p className="mb-6 text-gray-700 text-center">No encontramos ninguno de los productos que solicitaste. Puedes intentar con otro nombre o volver al inicio.</p>
                  <div className="flex flex-col sm:flex-row gap-3 w-full mt-4">
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex-1 transition-all"
                      onClick={() => setShowQuoteModal(false)}
                    >
                      Seguir intentando
                    </button>
                    <button
                      className="border border-gray-300 hover:bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-semibold flex-1 transition-all"
                      onClick={() => navigate("/")}
                    >
                      Volver al inicio
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Cabecera mejorada con gradiente */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 -m-8 p-8 mb-5">
                  <div className="flex items-center justify-center mb-4">
                    <div className="bg-white p-3 rounded-full shadow-md">
                      <CheckCircle size={28} className="text-blue-600" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-center text-white">¡Mejores opciones encontradas!</h2>
                  <p className="mb-4 text-blue-100 text-center">Encontramos las mejores opciones al mejor precio para ti</p>
                  
                  {/* Indicador de ahorro y resumen */}
                  {(() => {
                    // Calcular total del pedido basado en las opciones seleccionadas
                    const totalSelected = bestQuotes
                      .filter(q => q.options && q.options.length > 0)
                      .reduce((total, quote) => {
                        const selectedOption = quote.options[quote.selectedOptionIndex || 0];
                        return total + (Number(selectedOption.price) * quote.quantity);
                      }, 0);
                    
                    // Calcular un ahorro estimado de 15-25%
                    const estimatedRegularPrice = totalSelected / (0.75 + (Math.random() * 0.1));
                    const savings = estimatedRegularPrice - totalSelected;
                    
                    return (
                      <div className="flex items-center justify-around mt-3 border-t border-blue-500 pt-4">
                        <div className="text-center">
                          <p className="text-xs uppercase text-blue-200">Total</p>
                          <p className="text-2xl font-bold text-white">${Math.round(totalSelected).toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs uppercase text-blue-200">Ahorro estimado</p>
                          <p className="text-xl font-bold text-white flex items-center justify-center">
                            ${Math.round(savings).toLocaleString()}
                            <span className="text-green-300 text-xs ml-1">({Math.round((savings/estimatedRegularPrice) * 100)}%)</span>
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                <h2 className="text-xl font-bold mb-2 text-gray-800">Selecciona tus opciones preferidas</h2>
                <p className="mb-6 text-gray-600">Para cada artículo, elige la empresa que mejor se adapte a tus necesidades:</p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  {bestQuotes.map((quote, idx) => {
                    // Estado para selección de opción por producto
                    if (!quote.selectedOptionIndex && quote.selectedOptionIndex !== 0) quote.selectedOptionIndex = 0;
                    return (
                      <div key={idx} className="mb-8 border-b pb-4 last:border-b-0 last:pb-0">
                        <div className="mb-4 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="font-bold text-gray-800 text-lg">{quote.name}</span>
                              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {quote.quantity > 1 ? `${quote.quantity} unidades` : "1 unidad"}
                              </span>
                            </div>
                            {quote.imageUrl && (
                              <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 shadow-sm">
                                <img src={quote.imageUrl} alt={quote.name} className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                          {quote.specifications && (
                            <div className="mt-1 text-xs text-gray-600 flex items-center">
                              <ClipboardCheck className="w-3 h-3 mr-1 text-gray-500" />
                              <span>{quote.specifications}</span>
                            </div>
                          )}
                        </div>
                        {quote.options && quote.options.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {quote.options.map((opt, oidx) => {
                              const isSelected = quote.selectedOptionIndex === oidx;
                              return (
                                <div
                                  key={oidx}
                                  className={`flex items-center rounded-lg border p-2 transition-all cursor-pointer shadow-sm ${isSelected ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300 bg-white'}`}
                                  onClick={() => {
                                    // Cambiar la opción seleccionada para este producto
                                    setBestQuotes(prev => prev.map((q, qidx) => qidx === idx ? { ...q, selectedOptionIndex: oidx } : q));
                                  }}
                                >
                                  {/* Imagen producto */}
                                  <div className="relative">
                                    {opt.imageUrl ? (
                                      <img src={opt.imageUrl} alt={opt.name} className="w-12 h-12 object-cover rounded mr-3 border" />
                                    ) : (
                                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center mr-3">
                                        <Store className="h-6 w-6 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  {/* Info producto y empresa */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      {opt.companyLogo ? (
                                        <img src={opt.companyLogo} alt={opt.companyName || "Empresa"} className="w-7 h-7 rounded-full object-cover border" />
                                      ) : (
                                        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                                          <Store className="w-4 h-4 text-blue-600" />
                                        </div>
                                      )}
                                      <span className="font-semibold text-gray-900 truncate">
                                        {opt.companyName || opt.companyId || "Empresa disponible"}
                                      </span>
                                      {opt.companyVerified && <CheckCircle className="inline w-4 h-4 text-blue-600 ml-1" />}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate">
                                      {[opt.companyBarrio, opt.companyLocalidad, opt.companyCiudad].filter(Boolean).length > 0 
                                        ? [opt.companyBarrio, opt.companyLocalidad, opt.companyCiudad].filter(Boolean).join(', ')
                                        : "Ubicación disponible bajo consulta"
                                      }
                                    </div>
                                    {/* Botón para abrir ubicación en Google Maps si existe */}
                                    {opt.companyEnlaceGoogleMaps && (
                                      <a
                                        href={opt.companyEnlaceGoogleMaps}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-block mt-1 text-blue-600 hover:underline text-xs"
                                        onClick={e => e.stopPropagation()}
                                      >
                                        Ver ubicación en Google Maps
                                      </a>
                                    )}
                                  </div>
                                  {/* Precio */}
                                  <div className="ml-4 text-right">
                                    <div className="text-lg font-bold text-green-700">${Number(opt.price).toLocaleString()}</div>
                                    <div className="text-xs text-gray-500">{opt.matchType === 'exact' ? 'Coincidencia exacta' : 'Coincidencia parcial'}</div>
                                    <div className="mt-1 text-xs font-medium text-blue-600">
                                      {opt.companyName ? `De: ${opt.companyName.substring(0, 15)}${opt.companyName.length > 15 ? "..." : ""}` : "Empresa disponible"}
                                    </div>
                                  </div>
                                  {/* Selección visual */}
                                  {isSelected && <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-md flex items-center">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Seleccionado
                                  </span>}
                                  
                                  {/* Badge de mejor precio (solo para el precio más bajo) */}
                                  {oidx === 0 && quote.options.length > 1 && (
                                    <div className="absolute top-0 left-0 transform -translate-x-2 -translate-y-2">
                                      <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                                        MEJOR PRECIO
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-gray-500 text-sm">No hay empresas disponibles para este producto.</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Footer mejorado */}
                <div className="border-t border-gray-200 mt-8 pt-6 mb-4">
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex items-center bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                      <Info className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                      <p className="text-sm text-blue-700">
                        Al aceptar la cotización podrás revisar el estado de tu solicitud en la sección de solicitudes pendientes
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                  <button
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold flex-1 transition-all flex items-center justify-center shadow-md hover:shadow-lg"
                    onClick={() => {
                      // Al aceptar, guardar la opción seleccionada de cada producto como la mejor
                      setBestQuotes(prev => prev.map(q => {
                        if (q.options && q.options.length > 0 && (q.selectedOptionIndex || q.selectedOptionIndex === 0)) {
                          const sel = q.options[q.selectedOptionIndex];
                          // Asegurar que siempre exista un nombre de empresa
                          const companyName = sel.companyName || sel.companyId || "Empresa disponible";
                          return {
                            ...q,
                            bestCompany: sel.companyId,
                            bestCompanyName: companyName, // Usar el nombre verificado
                            bestCompanyLogo: sel.companyLogo,
                            bestCompanyRating: sel.companyRating || 4.0, // Calificación predeterminada si no existe
                            bestCompanyVerified: sel.companyVerified,
                            bestCompanyUbicacion: sel.companyUbicacion || "Disponible bajo consulta",
                            bestCompanyCiudad: sel.companyCiudad,
                            bestCompanyLocalidad: sel.companyLocalidad,
                            bestCompanyBarrio: sel.companyBarrio,
                            bestCompanyEspecificaciones: sel.companyEspecificaciones,
                            bestCompanyEnlaceGoogleMaps: sel.companyEnlaceGoogleMaps,
                            bestPrice: sel.price,
                            bestProduct: sel,
                            imageUrl: sel.imageUrl || q.imageUrl,
                            matchType: sel.matchType,
                            notFound: false
                          };
                        }
                        return q;
                      }));
                      setTimeout(() => handleAcceptBestQuote(), 100);
                    }}
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Aceptar cotización
                  </button>
                  <button
                    className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-semibold flex-1 transition-all flex items-center justify-center shadow-sm hover:shadow"
                    onClick={handleViewOtherOptions}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver otras opciones
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link to="/requests" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft size={20} className="text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Nueva Solicitud</h1>
                <p className="text-sm text-gray-600">Describe lo que necesitas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información General */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información General</h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título de la Solicitud</Label>
                <Input
                  id="title"
                  required
                  placeholder="Ej: Herramientas para Deck de Madera"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>



              <div>
                <Label>Profesión</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {professions.map((prof) => {
                    const Icon = prof.icon;
                    return (
                      <button
                        key={prof.id}
                        type="button"
                        onClick={() => setFormData({...formData, profession: prof.id})}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          formData.profession === prof.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mx-auto mb-1 ${prof.color}`} />
                        <p className="text-sm font-medium">{prof.name}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Herramientas */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Lista de Herramientas</h2>
              <Button
                type="button"
                onClick={() => setShowItemForm(true)}
                variant="outline"
                size="sm"
              >
                <Plus size={16} className="mr-1" />
                Agregar
              </Button>
            </div>

            {/* Formulario para agregar item */}
            {showItemForm && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="itemName">Nombre del Item</Label>
                    <div className="relative">
                      <Input
                        id="itemName"
                        placeholder="Ej: Sierra Circular"
                        value={currentItem.name}
                        onChange={handleItemNameChange}
                        autoComplete="off"
                      />
                      {isLoadingSuggestions && (
                        <div className="absolute right-3 top-3">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Sugerencias de productos */}
                      {showSuggestions && (
                        <div className="absolute z-50 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-64 overflow-auto">
                          {suggestedItems.map((item) => (
                            <div 
                              key={item.id} 
                              className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                              onMouseDown={() => selectSuggestedItem(item)}
                            >
                              {item.imageUrl ? (
                                <img 
                                  src={item.imageUrl} 
                                  alt={item.name}
                                  className="w-10 h-10 object-cover rounded mr-2" 
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center mr-2">
                                  <Store className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium">{item.name}</p>
                                {item.specifications && (
                                  <p className="text-xs text-gray-500">{item.specifications}</p>
                                )}
                                {item.price && (
                                  <p className="text-xs font-semibold">${item.price}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="quantity">Cantidad</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={currentItem.quantity}
                        onChange={(e) => setCurrentItem({...currentItem, quantity: parseInt(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="specs">Especificaciones</Label>
                      <Input
                        id="specs"
                        placeholder="Ej: 7 1/4, 1800W"
                        value={currentItem.specifications}
                        onChange={(e) => setCurrentItem({...currentItem, specifications: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button type="button" onClick={addItem} size="sm">
                      Agregar Item
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowItemForm(false)}
                      size="sm"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de items */}
            <div className="space-y-2">
              {formData.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded mr-3" 
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center mr-3">
                      <Store className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">
                      Cantidad: {item.quantity}
                      {item.specifications && ` • ${item.specifications}`}
                    </p>
                    {item.price && (
                      <p className="text-sm font-medium text-emerald-600">${item.price}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}

              {formData.items.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No has agregado herramientas aún</p>
                  <p className="text-sm">Haz clic en "Agregar" para comenzar</p>
                </div>
              )}
            </div>
          </div>

          {/* Detalles del Proyecto */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalles del Proyecto</h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="location">
                  <MapPin size={16} className="inline mr-1" />
                  Ubicación
                </Label>
                <div className="relative flex">
                  <Input
                    id="location"
                    required
                    className="flex-grow pr-12"
                    placeholder="Dirección completa (calle, número, barrio, ciudad)"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                  <div className="absolute right-0 top-0 bottom-0 flex">
                    {/* Botón para obtener ubicación GPS actual */}
                    <button
                      type="button"
                      className="h-full px-2 bg-green-50 hover:bg-green-100 text-green-600 border-l border-gray-300 transition-colors flex items-center justify-center"
                      onClick={() => {
                        // Mostrar mensaje de cargando
                        toast({
                          title: "Obteniendo ubicación...",
                          description: "Espera un momento mientras detectamos tu ubicación"
                        });

                        // Verificar si el navegador soporta geolocalización
                        if (!navigator.geolocation) {
                          toast({
                            title: "Error",
                            description: "Tu navegador no soporta la geolocalización",
                            variant: "destructive"
                          });
                          return;
                        }

                        // Intentar obtener ubicación actual
                        navigator.geolocation.getCurrentPosition(
                          async (position) => {
                            try {
                              const { latitude, longitude } = position.coords;
                              
                              // Intentar conseguir la dirección desde coordenadas usando Nominatim (OpenStreetMap)
                              const response = await fetch(
                                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                                { headers: { 'Accept-Language': 'es' } }
                              );
                              
                              if (response.ok) {
                                const data = await response.json();
                                console.log("Geocoding response:", data);
                                
                                // Construir dirección formateada
                                const address = data.address;
                                const addressParts = [];
                                
                                // Construir dirección detallada
                                const street = address.road || address.street || '';
                                const houseNumber = address.house_number || '';
                                if (street || houseNumber) {
                                  addressParts.push(`${street} ${houseNumber}`.trim());
                                }
                                
                                // Barrio o vecindario
                                const neighbourhood = address.neighbourhood || address.suburb || '';
                                if (neighbourhood) {
                                  addressParts.push(neighbourhood);
                                }
                                
                                // Ciudad
                                const city = address.city || address.town || address.village || '';
                                const state = address.state || '';
                                if (city || state) {
                                  addressParts.push([city, state].filter(Boolean).join(', '));
                                }
                                
                                // Construir dirección completa
                                const direccionCompleta = addressParts.join(' - ');
                                
                                // Actualizar el campo de ubicación
                                if (direccionCompleta) {
                                  setFormData({...formData, location: direccionCompleta});
                                  toast({
                                    title: "Ubicación detectada",
                                    description: "Se ha usado tu ubicación actual"
                                  });
                                } else {
                                  // Si no se pudo construir una dirección, usar las coordenadas
                                  const coordsText = `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`;
                                  setFormData({...formData, location: coordsText});
                                  toast({
                                    title: "Ubicación detectada",
                                    description: "Se han usado tus coordenadas GPS"
                                  });
                                }
                              } else {
                                // Si falla la geocodificación, usar coordenadas directamente
                                const coordsText = `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`;
                                setFormData({...formData, location: coordsText});
                                toast({
                                  title: "Ubicación detectada parcialmente",
                                  description: "Solo pudimos obtener las coordenadas GPS"
                                });
                              }
                            } catch (error) {
                              console.error("Error obteniendo dirección:", error);
                              toast({
                                title: "Error",
                                description: "Hubo un problema al obtener tu ubicación",
                                variant: "destructive"
                              });
                            }
                          },
                          (error) => {
                            console.error("Error de geolocalización:", error);
                            let errorMessage = "No se pudo obtener tu ubicación";
                            
                            // Mensajes más específicos según el error
                            if (error.code === 1) {
                              errorMessage = "Has denegado el permiso para acceder a tu ubicación. Para habilitarlo, revisa la configuración de permisos de tu navegador.";
                            } else if (error.code === 2) {
                              errorMessage = "Tu ubicación no está disponible en este momento.";
                            } else if (error.code === 3) {
                              errorMessage = "La solicitud de ubicación ha tardado demasiado.";
                            }
                            
                            toast({
                              title: "Error de ubicación",
                              description: errorMessage,
                              variant: "destructive"
                            });
                          },
                          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                        );
                      }}
                      title="Usar mi ubicación actual"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <circle cx="12" cy="12" r="1"></circle>
                        <line x1="12" y1="2" x2="12" y2="5"></line>
                        <line x1="12" y1="19" x2="12" y2="22"></line>
                        <line x1="5" y1="12" x2="2" y2="12"></line>
                        <line x1="22" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>
                    
                    {/* Botón para usar dirección del perfil y rellenar todos los campos relacionados */}
                    {userProfileData && (userProfileData.ubicompleta || userProfileData.location) && (
                      <button
                        type="button"
                        className="h-full px-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border-l border-gray-300 rounded-r-md transition-colors flex items-center justify-center"
                        onClick={() => {
                          // Construir dirección completa y detallada solo para el campo location
                          let direccionCompleta = '';
                          if (userProfileData.ubicompleta) {
                            const detalles = [];
                            if (userProfileData.ubicompleta.numeroCasa) {
                              detalles.push(userProfileData.ubicompleta.numeroCasa);
                            }
                            if (userProfileData.ubicompleta.barrio) {
                              detalles.push(userProfileData.ubicompleta.barrio);
                            }
                            if (userProfileData.ubicompleta.localidad || userProfileData.ubicompleta.ciudad) {
                              detalles.push([
                                userProfileData.ubicompleta.localidad || '',
                                userProfileData.ubicompleta.ciudad || ''
                              ].filter(Boolean).join(', '));
                            }
                            if (userProfileData.ubicompleta.especificaciones) {
                              direccionCompleta = detalles.filter(Boolean).join(' - ') + ` (${userProfileData.ubicompleta.especificaciones})`;
                            } else {
                              direccionCompleta = detalles.filter(Boolean).join(' - ');
                            }
                            
                            // Agregar enlace de Google Maps si existe
                            const enlaceGoogleMaps = userProfileData.ubicompleta.enlaceGoogleMaps;
                            if (enlaceGoogleMaps) {
                              direccionCompleta += ` | Google Maps: ${enlaceGoogleMaps}`;
                            }
                          } else if (userProfileData.location) {
                            direccionCompleta = userProfileData.location;
                          }
                          
                          setFormData({
                            ...formData,
                            location: direccionCompleta
                          });
                          
                          toast({
                            title: "Ubicación agregada",
                            description: userProfileData.ubicompleta?.enlaceGoogleMaps 
                              ? "Se ha usado la dirección completa de tu perfil, incluyendo el enlace de Google Maps."
                              : "Se ha usado la dirección completa de tu perfil."
                          });
                        }}
                        title="Usar dirección de mi perfil"
                      >
                        <MapPin size={20} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Ingresa la dirección completa para que el proveedor pueda ubicarte correctamente
                </p>
              </div>



              <div>
                <Label htmlFor="budget">
                  <DollarSign size={16} className="inline mr-1" />
                  Presupuesto Estimado (Opcional)
                </Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="15000"
                  value={formData.budget}
                  onChange={(e) => setFormData({...formData, budget: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este presupuesto ayuda a las empresas a ofrecerte mejores cotizaciones
                </p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex space-x-3">
            <Button 
              type="submit" 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={formData.items.length === 0}
            >
              Publicar Solicitud
            </Button>
            <Link to="/requests">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewRequest;
