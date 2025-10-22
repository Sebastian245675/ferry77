import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Upload, X, CheckCircle, Image as ImageIcon, Pencil, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { collection, writeBatch, doc, serverTimestamp, getDocs, DocumentReference, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getAuth } from 'firebase/auth';
import * as XLSX from 'xlsx';

// Definir interfaces para mejor tipado
interface Product {
  id?: string;
  name: string;
  specifications: string;
  imageUrl: string;
  price: string;
  quantity: number;
  category: string;
  brand: string;
  createdAt?: any;
}

interface ImportPreview {
  totalItems: number;
  items: Product[];
  allItems: Product[];
}

const FormularioSupremo = () => {
  const [items, setItems] = useState<Product[]>([]);
  const [filteredItems, setFilteredItems] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  
  // Cargar artículos existentes al montar el componente
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const listadoSupremoRef = collection(db, "listado_supremo");
        const snapshot = await getDocs(listadoSupremoRef);
        const loadedItems = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || '',
            specifications: data.specifications || '',
            imageUrl: data.imageUrl || '',
            price: data.price || '',
            quantity: data.quantity || 0,
            category: data.category || '',
            brand: data.brand || '',
            createdAt: data.createdAt
          } as Product;
        });
        setItems(loadedItems);
        setFilteredItems(loadedItems);
      } catch (err) {
        setError('Error al cargar los artículos guardados');
      }
    };
    fetchItems();
  }, []);

  // Efecto para filtrar elementos cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredItems(items);
      return;
    }
    
    const searchTermLower = searchTerm.toLowerCase();
    const filtered = items.filter(item => 
      item.name.toLowerCase().includes(searchTermLower) || 
      item.brand?.toLowerCase().includes(searchTermLower) || 
      item.category?.toLowerCase().includes(searchTermLower) ||
      item.specifications?.toLowerCase().includes(searchTermLower)
    );
    
    setFilteredItems(filtered);
  }, [searchTerm, items]);
  const [currentItem, setCurrentItem] = useState<Product>({
    name: '',
    specifications: '',
    imageUrl: '',
    price: '',
    quantity: 1,
    category: '',
    brand: '',
    id: undefined // para saber si es edición
  });
  const [editMode, setEditMode] = useState(false); // true si se está editando
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);

  const handleItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addOrEditItem = async () => {
    // Validaciones básicas
    if (!currentItem.name.trim()) {
      setError('El nombre del artículo es obligatorio');
      return;
    }
    setError('');
    if (editMode && currentItem.id) {
      // Actualizar en Firestore y en la lista local
      try {
        const itemRef = doc(collection(db, "listado_supremo"), currentItem.id);
        await batchUpdateItem(itemRef, currentItem);
        const updatedItems = items.map(item => item.id === currentItem.id ? { ...currentItem } : item);
        setItems(updatedItems);
        // No es necesario actualizar filteredItems aquí porque el efecto lo hará
        setEditMode(false);
      } catch (err) {
        setError('Error al actualizar el artículo');
        return;
      }
    } else {
      // Nuevo item local (aún no en Firestore)
      const newItem = { ...currentItem, id: Date.now().toString() };
      setItems(prev => [...prev, newItem]);
      // No es necesario actualizar filteredItems aquí porque el efecto lo hará
    }
    setCurrentItem({
      name: '',
      specifications: '',
      imageUrl: '',
      price: '',
      quantity: 1,
      category: '',
      brand: '',
      id: undefined
    });
    setIsItemFormOpen(false);
  };

  // Actualizar un documento en Firestore
  const batchUpdateItem = async (itemRef: DocumentReference, item: Product) => {
    // Solo actualiza los campos editables, no createdAt
    await updateDoc(itemRef, {
      name: item.name,
      specifications: item.specifications,
      imageUrl: item.imageUrl,
      price: item.price,
      quantity: item.quantity,
      category: item.category,
      brand: item.brand
    });
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    // No es necesario actualizar filteredItems aquí porque el efecto lo hará
  };

  // Cargar item en formulario para editar
  const handleEditItem = (item: Product) => {
    setCurrentItem({ ...item });
    setIsItemFormOpen(true);
    setEditMode(true);
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      setError('Debes agregar al menos un artículo');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Usar batch para eficiencia y atomicidad
      const batch = writeBatch(db);
      const listadoSupremoRef = collection(db, "listado_supremo");

      items.forEach((item) => {
        // Generar un doc único por cada artículo
        const itemRef = doc(listadoSupremoRef);
        batch.set(itemRef, {
          ...item,
          createdAt: serverTimestamp(),
        });
      });

      await batch.commit();

      setSubmitSuccess(true);
      // No limpiar los items, así el usuario puede seguir editando o agregando
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Error al guardar los artículos:", error);
      setError('Ha ocurrido un error al guardar los artículos. Por favor intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Función para manejar la importación de Excel
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    setImportPreview(null);
    const file = e.target.files?.[0];
    
    if (!file) return;
    
    // Verificar si es un archivo Excel
    const allowedTypes = [
      'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setImportError('El archivo debe ser un Excel (.xls, .xlsx) o CSV');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setIsImporting(true);
        // Corregir el tipo de resultado para asegurar que es ArrayBuffer
        const result = e.target?.result as ArrayBuffer;
        const data = new Uint8Array(result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Tomar la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Identificar las columnas (encabezados)
        if (jsonData.length < 2) {
          setImportError('El archivo está vacío o no tiene datos suficientes');
          setIsImporting(false);
          return;
        }
        
        const headers = jsonData[0];
        
        // Mapear columnas a nuestros campos
        const columnMapping = identifyColumns(headers);
        
        if (!columnMapping.name) {
          setImportError('No se pudo identificar la columna de nombre/producto');
          setIsImporting(false);
          return;
        }
        
        // Procesar datos
        const newItems = [];
        const totalRows = jsonData.length - 1;
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0 || !row[columnMapping.name]) continue; // Ignorar filas vacías
          
          // Crear un nuevo item con valores predeterminados
          const newItem = {
            id: Date.now().toString() + '-' + i,
            name: row[columnMapping.name] || '',
            specifications: columnMapping.specifications !== null ? row[columnMapping.specifications] || '' : '',
            imageUrl: columnMapping.imageUrl !== null ? row[columnMapping.imageUrl] || '' : '',
            price: columnMapping.price !== null ? String(row[columnMapping.price] || '') : '',
            quantity: columnMapping.quantity !== null ? Number(row[columnMapping.quantity] || 1) : 1,
            category: columnMapping.category !== null ? row[columnMapping.category] || '' : '',
            brand: columnMapping.brand !== null ? row[columnMapping.brand] || '' : '',
          };
          
          newItems.push(newItem);
          
          // Actualizar progreso
          setImportProgress(Math.round(((i) / totalRows) * 100));
        }
        
        // Mostrar vista previa
        setImportPreview({
          totalItems: newItems.length,
          items: newItems.slice(0, 5), // Mostrar solo los primeros 5 para vista previa
          allItems: newItems
        });
        
        setImportSuccess(true);
        setTimeout(() => setImportSuccess(false), 3000);
      } catch (error) {
        console.error("Error al procesar el Excel:", error);
        setImportError('Error al procesar el archivo. Verifica el formato.');
      } finally {
        setIsImporting(false);
        setImportProgress(0);
      }
    };
    
    reader.readAsArrayBuffer(file);
    setShowImportModal(true);
  };
  
  // Identifica las columnas basándose en los encabezados
  const identifyColumns = (headers: any) => {
    // Asegurarse de que headers sea un array
    const headersArray = Array.isArray(headers) ? headers : [];
    
    const mapping: {
      name: number | null,
      specifications: number | null,
      imageUrl: number | null,
      price: number | null, 
      quantity: number | null,
      category: number | null,
      brand: number | null
    } = {
      name: null,
      specifications: null,
      imageUrl: null,
      price: null, 
      quantity: null,
      category: null,
      brand: null
    };
    
    // Nombres posibles para cada campo (para ser flexible con los encabezados)
    const fieldPatterns = {
      name: /nombre|producto|artículo|articulo|item|descripción|description|producto/i,
      specifications: /espec|caract|detalle|descripción completa|descripcion completa|details|features/i,
      imageUrl: /imagen|image|url|foto|picture|imágen/i,
      price: /precio|costo|value|valor|price|tarifa|cost/i,
      quantity: /cantidad|stock|inventory|inventario|qty|quantity|disponible|disponibilidad/i,
      category: /categoría|categoria|category|tipo|type|group|grupo|clase|class/i,
      brand: /marca|brand|fabricante|manufacturer|maker|proveedor|vendor/i
    };
    
    // Intentar mapear cada columna
    headersArray.forEach((header, index) => {
      if (!header) return; // Ignorar columnas sin encabezado
      
      const headerStr = String(header).trim().toLowerCase();
      
      Object.keys(fieldPatterns).forEach(field => {
        if (fieldPatterns[field].test(headerStr)) {
          mapping[field] = index;
        }
      });
    });
    
    return mapping;
  };
  
  // Función para confirmar importación
  const confirmImport = () => {
    if (!importPreview || !importPreview.allItems.length) return;
    
    // Agregar todos los items importados a la lista actual
    setItems(prevItems => [...prevItems, ...importPreview.allItems]);
    // No es necesario actualizar filteredItems aquí porque el efecto lo hará
    setShowImportModal(false);
    setImportPreview(null);
  };
  
  // Función para manejar la búsqueda
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Función para mostrar el modal de confirmación de borrado
  const handleClearAll = () => {
    setShowDeleteConfirmModal(true);
  };
  
  // Función para confirmar el borrado de todos los artículos
  const confirmClearAll = () => {
    setItems([]);
    setFilteredItems([]);
    setSearchTerm('');
    setSubmitSuccess(false);
    setError('');
    setShowDeleteConfirmModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-b from-white to-gray-50 border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <Link 
                  to="/" 
                  className="p-2.5 bg-white shadow-sm hover:shadow-md rounded-xl transition-all duration-200 text-blue-600 border border-gray-100"
                >
                  <ArrowLeft size={22} />
                </Link>
                <div>
                  <div className="flex items-center">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Formulario Supremo
                    </h1>
                    <div className="ml-3 px-3 py-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-bold rounded-full shadow-md">
                      PRO
                    </div>
                  </div>
                  <p className="text-base text-gray-600 mt-1">Sistema avanzado de gestión de inventario</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center space-x-3">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 text-blue-800 py-2 px-4 rounded-xl text-sm font-medium flex items-center border border-blue-100 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Gestión Avanzada
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Mensajes de estado */}
        {submitSuccess && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-xl flex items-center space-x-3 shadow-sm">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="font-medium text-green-900">¡Éxito!</p>
              <p className="text-sm text-green-700">Los artículos se han guardado correctamente</p>
            </div>
          </div>
        )}

        {/* Mensaje de éxito de importación */}
        {importSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-lg flex items-center space-x-2">
            <CheckCircle className="text-green-500" size={20} />
            <p className="text-green-700">¡Datos de Excel procesados correctamente!</p>
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center space-x-2">
            <X className="text-red-500" size={20} />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Mensaje de error de importación */}
        {importError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center space-x-2">
            <AlertTriangle className="text-red-500" size={20} />
            <p className="text-red-700">{importError}</p>
          </div>
        )}

        {/* Panel de estadísticas */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-blue-50 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900">Total Artículos</h3>
                </div>
                <span className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-full">
                  Activos
                </span>
              </div>
              <div className="flex items-baseline space-x-3">
                <h2 className="text-3xl font-bold text-gray-900">
                  {items.length}
                </h2>
                <span className="text-sm text-gray-500">
                  {searchTerm ? `${filteredItems.length} mostrados` : 'productos'}
                </span>
              </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
          </div>

          <div className="bg-white rounded-xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-amber-50 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900">Categorías</h3>
                </div>
                <span className="px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-600 rounded-full">
                  Clasificación
                </span>
              </div>
              <div className="flex items-baseline space-x-3">
                <h2 className="text-3xl font-bold text-gray-900">
                  {Array.from(new Set(items.map(item => item.category))).filter(Boolean).length}
                </h2>
                <span className="text-sm text-gray-500">tipos de productos</span>
              </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-amber-600"></div>
          </div>

          <div className="bg-white rounded-xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-emerald-50 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900">Marcas</h3>
                </div>
                <span className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-600 rounded-full">
                  Fabricantes
                </span>
              </div>
              <div className="flex items-baseline space-x-3">
                <h2 className="text-3xl font-bold text-gray-900">
                  {Array.from(new Set(items.map(item => item.brand))).filter(Boolean).length}
                </h2>
                <span className="text-sm text-gray-500">fabricantes registrados</span>
              </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
          </div>
        </div>

        {/* Botones de acción y buscador */}
        <div className="mb-8 p-5 bg-white rounded-xl shadow-md border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => setIsItemFormOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100 rounded-lg text-base font-medium py-5 px-4"
              >
                <Plus size={18} className="mr-2" />
                Agregar Nuevo Artículo
              </Button>
              
              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleExcelImport}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  id="excel-file-input"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 shadow-sm rounded-lg text-base font-medium py-5 px-4"
                >
                  <FileSpreadsheet size={18} className="mr-2" />
                  Importar desde Excel
                </Button>
              </div>
              
              {items.length > 0 && (
                <Button 
                  onClick={handleClearAll}
                  variant="outline"
                  className="border-2 border-red-500 text-red-600 hover:bg-red-50 shadow-sm rounded-lg text-base font-medium py-5 px-4"
                >
                  <Trash2 size={18} className="mr-2" />
                  Borrar Todo
                </Button>
              )}
            </div>
          
            {/* Buscador */}
            <div className="relative w-full sm:w-auto sm:min-w-[300px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <Input
                type="text"
                placeholder="Buscar artículos..."
                className="pl-10"
                value={searchTerm}
                onChange={handleSearch}
                ref={searchInputRef}
              />
              {searchTerm && (
                <button 
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  onClick={() => setSearchTerm('')}
                  aria-label="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Formulario para agregar item */}
        {isItemFormOpen && (
          <Card className="p-6 mb-8 border border-blue-100 shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{editMode ? 'Editar Artículo' : 'Nuevo Artículo'}</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { setIsItemFormOpen(false); setEditMode(false); }}
              >
                <X size={18} />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre del Artículo *</Label>
                  <Input 
                    id="name"
                    name="name"
                    value={currentItem.name}
                    onChange={handleItemChange}
                    placeholder="Ej: Sierra Circular DeWalt"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <Input 
                    id="category"
                    name="category"
                    value={currentItem.category}
                    onChange={handleItemChange}
                    placeholder="Ej: Herramientas eléctricas"
                  />
                </div>
                <div>
                  <Label htmlFor="brand">Marca</Label>
                  <Input 
                    id="brand"
                    name="brand"
                    value={currentItem.brand}
                    onChange={handleItemChange}
                    placeholder="Ej: DeWalt"
                  />
                </div>
                <div>
                  <Label htmlFor="price">Precio Unitario</Label>
                  <Input 
                    id="price"
                    name="price"
                    type="number"
                    value={currentItem.price}
                    onChange={handleItemChange}
                    placeholder="Ej: 149.99"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="specifications">Especificaciones</Label>
                  <Textarea 
                    id="specifications"
                    name="specifications"
                    value={currentItem.specifications}
                    onChange={handleItemChange}
                    placeholder="Descripción detallada, medidas, potencia, etc."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="imageUrl">URL de la Imagen</Label>
                  <div className="flex space-x-2">
                    <Input 
                      id="imageUrl"
                      name="imageUrl"
                      value={currentItem.imageUrl}
                      onChange={handleItemChange}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Introduce la URL de una imagen de Google o cualquier otra fuente</p>
                </div>
                {currentItem.imageUrl && (
                  <div className="mt-2 relative w-40 h-40 bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={currentItem.imageUrl} 
                      alt="Vista previa" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = "https://via.placeholder.com/150?text=Error+de+imagen";
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => { setIsItemFormOpen(false); setEditMode(false); }}
                className="mr-2"
              >
                Cancelar
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={addOrEditItem}
              >
                {editMode ? 'Guardar Cambios' : 'Agregar Artículo'}
              </Button>
            </div>
          </Card>
        )}

          {/* Lista de items */}
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <h2 className="text-xl font-semibold">
                Artículos{searchTerm ? ' Encontrados' : ' Agregados'} ({filteredItems.length}
                {searchTerm && items.length !== filteredItems.length ? ` de ${items.length}` : ''})
              </h2>
              <div className="flex items-center bg-gray-100 rounded-lg p-1 shadow-sm">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-2 px-3 py-2 ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className="text-sm font-medium">Cuadrícula</span>
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-3 py-2 ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="text-sm font-medium">Lista</span>
                </Button>
              </div>
            </div>            {searchTerm && (
              <p className="text-sm text-gray-500">
                Mostrando resultados para: <span className="font-medium">{searchTerm}</span>
              </p>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <ImageIcon size={48} className="text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-700">No hay artículos agregados</h3>
              <p className="text-gray-500 mt-1">Haz clic en "Agregar Nuevo Artículo" para comenzar</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-700">No se encontraron resultados</h3>
              <p className="mt-1 text-gray-500">No hay artículos que coincidan con tu búsqueda</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
                  <div className="relative">
                    {item.imageUrl ? (
                      <div className="w-full h-48 bg-gray-100 overflow-hidden">
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = "https://via.placeholder.com/400x300?text=Producto";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-gray-50 flex items-center justify-center">
                        <ImageIcon size={48} className="text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="flex gap-2 bg-white rounded-lg shadow-lg p-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleEditItem(item)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">{item.name}</h3>
                      {item.category && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {item.category}
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {item.brand && (
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-500 w-24">Marca</span>
                          <span className="text-sm text-gray-900">{item.brand}</span>
                        </div>
                      )}
                      
                      {item.price && (
                        <div className="flex items-center justify-between py-2 border-t border-gray-100">
                          <span className="text-sm font-medium text-gray-500">Precio</span>
                          <span className="text-lg font-bold text-gray-900">
                            ${parseFloat(item.price).toLocaleString('es-CO')}
                          </span>
                        </div>
                      )}
                      
                      {item.specifications && (
                        <div className="pt-3 border-t border-gray-100">
                          <p className="text-sm text-gray-600 line-clamp-2" title={item.specifications}>
                            {item.specifications}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <Card key={item.id} className="p-4 border border-gray-200 hover:shadow-md transition-shadow duration-300">
                  <div className="flex flex-col md:flex-row gap-4">
                    {item.imageUrl ? (
                      <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = "https://via.placeholder.com/150?text=Producto";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 bg-gray-50 rounded-lg flex items-center justify-center">
                        <ImageIcon size={32} className="text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900">{item.name}</h3>
                          {item.category && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 mt-1">
                              {item.category}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleEditItem(item)}
                          >
                            <Pencil size={18} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mt-2">
                        {item.brand && (
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-500 w-24">Marca:</span>
                            <span className="text-sm text-gray-900">{item.brand}</span>
                          </div>
                        )}
                        {item.price && (
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-500 w-24">Precio:</span>
                            <span className="text-sm font-bold text-gray-900">
                              ${parseFloat(item.price).toLocaleString('es-CO')}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {item.specifications && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600 line-clamp-2" title={item.specifications}>
                            {item.specifications}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-8 flex flex-col sm:flex-row justify-between items-center">
              {searchTerm && filteredItems.length < items.length && (
                <p className="text-sm text-gray-500 mb-4 sm:mb-0">
                  {items.length - filteredItems.length} artículo(s) no mostrado(s) debido a los filtros de búsqueda
                </p>
              )}
              <Button 
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Todos los Artículos'}
              </Button>
            </div>
          )}
        </div>

        {/* Modal de vista previa de importación */}
        {showImportModal && importPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Vista previa de importación</h2>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowImportModal(false)}
                  >
                    <X size={18} />
                  </Button>
                </div>

                <div className="mb-4">
                  <p className="text-green-700 font-medium">
                    Se encontraron {importPreview.totalItems} artículos en el archivo Excel
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    A continuación se muestra una vista previa de los primeros artículos importados.
                  </p>
                </div>

                {/* Vista previa de los primeros 5 elementos */}
                <div className="border rounded-lg overflow-hidden mb-6">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Marca
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Categoría
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Precio
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {importPreview.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {item.brand || <span className="text-gray-400 italic">N/A</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {item.category || <span className="text-gray-400 italic">N/A</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {item.price ? `$${item.price}` : <span className="text-gray-400 italic">N/A</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    {importPreview.totalItems > 5 ? `Mostrando 5 de ${importPreview.totalItems} artículos` : ''}
                  </p>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline"
                      onClick={() => setShowImportModal(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={confirmImport}
                    >
                      Importar {importPreview.totalItems} artículos
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Indicador de carga para importación */}
        {isImporting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col items-center justify-center">
            <div className="bg-white p-6 rounded-lg w-80 text-center">
              <div className="mb-4">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Procesando archivo Excel</h3>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${importProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Analizando datos, por favor espere...
              </p>
            </div>
          </div>
        )}

        {/* Modal de confirmación para borrar todo */}
        {showDeleteConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="p-6">
                <div className="mb-4 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <Trash2 className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">¿Eliminar todos los artículos?</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    Esta acción eliminará todos los artículos de la lista. Esta acción no se puede deshacer.
                  </p>
                </div>
                <div className="mt-6 flex justify-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirmModal(false)}
                    className="w-full"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={confirmClearAll}
                    className="bg-red-600 hover:bg-red-700 w-full"
                  >
                    Eliminar Todo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormularioSupremo;
