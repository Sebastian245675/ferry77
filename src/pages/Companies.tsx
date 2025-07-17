import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import BottomNavigation from '../components/BottomNavigation';
import CompanyCard from '../components/CompanyCard';
import { Search, Filter, MapPin, Star, Award, Clock } from 'lucide-react';
import { collection, addDoc, getDocs, query, where, orderBy, limit, startAfter, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getAuth } from 'firebase/auth';

const Companies = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [companies, setCompanies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([
    { id: 'all', name: 'Todas', count: 0 },
    { id: 'carpinteria', name: 'Carpintería', count: 0 },
    { id: 'construccion', name: 'Construcción', count: 0 },
    { id: 'electrico', name: 'Eléctrico', count: 0 },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userCity, setUserCity] = useState('Todos');
  
  // Placeholders para cuando no hay imagen o logo
  const defaultLogo = 'https://via.placeholder.com/100?text=Logo';
  const logoPlaceholders = [
    'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=100&h=100&fit=crop&crop=face'
  ];

  // Tipo para una empresa
  interface Company {
    id: string;
    name: string;
    logo: string;
    rating: number;
    reviewCount: number;
    location: string;
    responseTime: string;
    specialties: string[];
    verified: boolean;
    description?: string;
  }

  const handleCompanySelect = (company: Company) => {
    // Redirigir a la página de perfil de la empresa
    window.location.href = `/company-profile?id=${company.id}`;
  };

  // Detectar ciudad del usuario al montar
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          // Usar una API pública para obtener la ciudad
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state || 'Argentina';
          setUserCity(city);
        } catch {
          setUserCity('todos');
        }
      }, () => setUserCity('todos'));
    }
  }, []);

  // Filtrar empresas basado en la búsqueda y la ciudad del usuario
  const filteredCompanies = companies.filter(company => {
    // Si no hay término de búsqueda, mostrar todas
    if (!searchTerm && userCity === 'todos') return true;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    // Buscar en nombre, descripción y especialidades
    const matchesName = company.name.toLowerCase().includes(lowerSearchTerm);
    const matchesDescription = company.description?.toLowerCase().includes(lowerSearchTerm) || false;
    const matchesSpecialties = company.specialties.some(specialty => 
      specialty.toLowerCase().includes(lowerSearchTerm)
    );
    
    // Filtrar por ciudad
    const matchesCity = userCity === 'Argentina' || (company.location && company.location.toLowerCase().includes(userCity.toLowerCase()));
    
    return (matchesName || matchesDescription || matchesSpecialties) && matchesCity;
  });

  // Ya no necesitamos ordenar nuevamente ya que lo hacemos en la consulta a Firestore
  const sortedCompanies = filteredCompanies;

  // Inicializar datos de muestra y luego cargar empresas
  useEffect(() => {
    // Intentar inicializar datos de muestra si no existen
    initializeSampleCompanies();
  }, []);

  // Cargar empresas desde Firestore
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        
        // Obtenemos la colección de usuarios con rol "empresa"
        const usersRef = collection(db, "users");
        let companiesQuery = query(usersRef, where("rol", "==", "empresa"));
        
        // Si hay una categoría específica seleccionada
        if (selectedCategory !== 'all') {
          companiesQuery = query(usersRef, 
            where("rol", "==", "empresa"), 
            where("category", "==", selectedCategory === 'carpinteria' ? 'Carpintería' : 
                              selectedCategory === 'construccion' ? 'Construcción' : 
                              selectedCategory === 'electrico' ? 'Eléctrico' : selectedCategory)
          );
        }
        
        const querySnapshot = await getDocs(companiesQuery);
        const companiesData: any[] = [];
        
        // Procesamos los datos de las empresas
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const randomLogoIndex = Math.floor(Math.random() * logoPlaceholders.length);
          
          // Creamos un objeto con los datos de la empresa
          companiesData.push({
            id: doc.id,
            name: data.companyName || data.nick || 'Empresa Sin Nombre',
            logo: data.logo || logoPlaceholders[randomLogoIndex],
            rating: data.rating || (Math.random() * 2 + 3).toFixed(1), // Generar rating entre 3.0 y 5.0
            reviewCount: data.reviewCount || Math.floor(Math.random() * 200), // Generar número aleatorio de reseñas
            location: data.location || 'Argentina',
            responseTime: data.responseTime || '30 min',
            specialties: data.category ? [data.category] : ['General'],
            verified: data.verified || Math.random() > 0.3, // 70% de probabilidad de ser verificado
            description: data.description || 'Sin descripción disponible',
            email: data.email || '',
            phone: data.phone || '',
            createdAt: data.createdAt || ''
          });
        });
        
        // Ordenar las empresas según la preferencia seleccionada
        companiesData.sort((a, b) => {
          switch(sortBy) {
            case 'rating':
              return b.rating - a.rating;
            case 'reviews':
              return b.reviewCount - a.reviewCount;
            case 'responseTime':
              // Si no hay tiempo de respuesta específico, usamos un valor predeterminado
              const getMinutes = (time: string) => {
                if (!time) return 30;
                if (time.includes('hora')) return parseInt(time) * 60;
                return parseInt(time);
              };
              return getMinutes(a.responseTime) - getMinutes(b.responseTime);
            default:
              return b.rating - a.rating;
          }
        });
        
        setCompanies(companiesData);
        
        // También actualizamos los conteos para las categorías
        const specialtyCounts = {
          carpinteria: 0,
          construccion: 0,
          electrico: 0,
        };
        
        companiesData.forEach(company => {
          if (!company.specialties || !company.specialties.length) return;
          
          company.specialties.forEach((specialty: string) => {
            if (!specialty) return;
            const lowerSpecialty = specialty.toLowerCase();
            if (lowerSpecialty.includes('carpinter')) specialtyCounts.carpinteria++;
            if (lowerSpecialty.includes('construc')) specialtyCounts.construccion++;
            if (lowerSpecialty.includes('electric') || lowerSpecialty.includes('eléctric')) specialtyCounts.electrico++;
          });
        });
        
        // Actualizar los conteos de categorías
        setCategories([
          { id: 'all', name: 'Todas', count: companiesData.length },
          { id: 'carpinteria', name: 'Carpintería', count: specialtyCounts.carpinteria },
          { id: 'construccion', name: 'Construcción', count: specialtyCounts.construccion },
          { id: 'electrico', name: 'Eléctrico', count: specialtyCounts.electrico },
        ]);
        
      } catch (err) {
        console.error("Error al cargar empresas:", err);
        setError('Error al cargar las empresas. Intenta nuevamente más tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCompanies();
  }, [sortBy, selectedCategory]);

  // Función para inicializar datos de muestra si no hay empresas
  const initializeSampleCompanies = async () => {
    try {
      // Verificar si ya existen empresas en la base de datos
      const companiesRef = collection(db, "empresas");
      const snapshot = await getDocs(companiesRef);
      
      if (snapshot.empty) {
        console.log("No hay empresas en la base de datos. Creando datos de muestra...");
        
        // Datos de muestra para empresas
        const sampleCompanies = [
          {
            name: 'Herramientas García',
            logo: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=100&h=100&fit=crop&crop=face',
            rating: 4.9,
            reviewCount: 128,
            location: 'Zona Norte, Buenos Aires',
            responseTime: '15 min',
            responseTimeMinutes: 15,
            responseTimeFormatted: '15 min',
            specialties: ['Carpintería', 'Construcción', 'Herramientas Eléctricas', 'Tornillería'],
            specialtyTags: ['carpinteria', 'construccion'],
            verified: true,
            description: 'Empresa líder en venta de herramientas para profesionales y aficionados. Más de 20 años de experiencia en el mercado.',
            createdAt: new Date()
          },
          {
            name: 'Suministros Pro',
            logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop&crop=face',
            rating: 4.7,
            reviewCount: 89,
            location: 'Centro, Buenos Aires',
            responseTime: '30 min',
            responseTimeMinutes: 30,
            responseTimeFormatted: '30 min',
            specialties: ['Materiales', 'Herramientas', 'Tornillería'],
            specialtyTags: ['general', 'construccion'],
            verified: true,
            description: 'Suministros de calidad para todo tipo de proyectos de construcción y reforma.',
            createdAt: new Date()
          },
          {
            name: 'ElectroMax',
            logo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
            rating: 4.8,
            reviewCount: 156,
            location: 'Zona Oeste, Buenos Aires',
            responseTime: '20 min',
            responseTimeMinutes: 20,
            responseTimeFormatted: '20 min',
            specialties: ['Materiales Eléctricos', 'Iluminación', 'Cables', 'Automatización'],
            specialtyTags: ['electrico'],
            verified: true,
            description: 'Especialistas en todo tipo de material eléctrico, desde pequeñas instalaciones hasta proyectos industriales.',
            createdAt: new Date()
          },
          {
            name: 'Maderas del Sur',
            logo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
            rating: 4.6,
            reviewCount: 67,
            location: 'Zona Sur, Buenos Aires',
            responseTime: '45 min',
            responseTimeMinutes: 45,
            responseTimeFormatted: '45 min',
            specialties: ['Maderas', 'Carpintería', 'Barnices', 'Herrajes'],
            specialtyTags: ['carpinteria'],
            verified: false,
            description: 'Toda clase de maderas para proyectos de carpintería y construcción. Asesoramiento personalizado.',
            createdAt: new Date()
          },
          {
            name: 'Constructora Rápida',
            logo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=face',
            rating: 4.5,
            reviewCount: 94,
            location: 'CABA, Buenos Aires',
            responseTime: '25 min',
            responseTimeMinutes: 25,
            responseTimeFormatted: '25 min',
            specialties: ['Cemento', 'Ladrillos', 'Hierro', 'Pintura'],
            specialtyTags: ['construccion'],
            verified: true,
            description: 'Materiales para construcción con entrega inmediata. Servicio a domicilio en toda CABA.',
            createdAt: new Date()
          },
          {
            name: 'Ferretería Central',
            logo: 'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=100&h=100&fit=crop&crop=face',
            rating: 4.4,
            reviewCount: 203,
            location: 'La Plata, Buenos Aires',
            responseTime: '1 hora',
            responseTimeMinutes: 60,
            responseTimeFormatted: '1 hora',
            specialties: ['General', 'Plomería', 'Electricidad', 'Jardinería'],
            specialtyTags: ['general', 'electrico'],
            verified: false,
            description: 'Ferretería tradicional con más de 50 años en el mercado. Todo lo que necesitas para hogar y profesionales.',
            createdAt: new Date()
          },
        ];
        
        // Agregar las empresas a Firestore
        const companiesRef = collection(db, "empresas");
        for (const company of sampleCompanies) {
          try {
            await addDoc(companiesRef, company);
            console.log(`Empresa ${company.name} creada correctamente`);
          } catch (error) {
            console.error(`Error al crear empresa ${company.name}:`, error);
          }
        }
        
        console.log("Datos de muestra creados exitosamente");
      }
    } catch (err) {
      console.error("Error al inicializar datos de muestra:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pb-20 md:pb-8">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Empresas Proveedoras</h1>
                <p className="text-gray-600">Encuentra las mejores empresas para tus proyectos</p>
              </div>
              
              {/* Search */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar empresas o especialidades..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full sm:w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="rating">Mejor calificación</option>
                  <option value="reviews">Más reseñas</option>
                  <option value="responseTime">Respuesta más rápida</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <div className="lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  Filtros
                </h3>
                
                {/* Categories */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Especialidad</h4>
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <label key={category.id} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="category"
                          value={category.id}
                          checked={selectedCategory === category.id}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {category.name} ({category.count})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Quick Filters */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Características</h4>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <Award className="w-4 h-4 ml-2 mr-1 text-yellow-500" />
                      <span className="text-sm text-gray-700">Verificadas</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <Clock className="w-4 h-4 ml-2 mr-1 text-green-500" />
                      <span className="text-sm text-gray-700">Respuesta rápida</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <Star className="w-4 h-4 ml-2 mr-1 text-yellow-500" />
                      <span className="text-sm text-gray-700">Top rated</span>
                    </label>
                  </div>
                </div>

                {/* Location Filter */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Ubicación</h4>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm">
                    <option>Todas las zonas</option>
                    <option>CABA</option>
                    <option>Zona Norte</option>
                    <option>Zona Oeste</option>
                    <option>Zona Sur</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Companies Grid */}
            <div className="flex-1">
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-600">
                  {loading ? 'Cargando empresas...' : `Mostrando ${sortedCompanies.length} de ${companies.length} empresas`}
                </p>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" />
                  <span>{userCity}</span>
                </div>
              </div>
              
              {loading ? (
                // Estado de carga
                <div className="flex items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                  <p className="ml-3 text-gray-600">Cargando empresas...</p>
                </div>
              ) : error ? (
                // Mensaje de error
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-red-500 text-4xl">⚠️</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
                  <p className="text-gray-600">{error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              ) : (
                // Lista de empresas
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {sortedCompanies.map((company) => (
                    <CompanyCard
                      key={company.id}
                      company={company}
                      onSelect={handleCompanySelect}
                    />
                  ))}
                
                  {sortedCompanies.length === 0 && (
                    <div className="text-center py-12 col-span-2">
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-12 h-12 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron empresas</h3>
                      <p className="text-gray-600">Intenta ajustar tus filtros de búsqueda</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Companies;
