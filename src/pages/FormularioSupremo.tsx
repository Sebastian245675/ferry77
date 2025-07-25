import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Upload, X, CheckCircle, Image as ImageIcon, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { collection, writeBatch, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getAuth } from 'firebase/auth';

const FormularioSupremo = () => {
  const [items, setItems] = useState([]);
  // Cargar artículos existentes al montar el componente
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const listadoSupremoRef = collection(db, "listado_supremo");
        const snapshot = await getDocs(listadoSupremoRef);
        const loadedItems = snapshot.docs.map(docSnap => ({
          ...docSnap.data(),
          id: docSnap.id
        }));
        setItems(loadedItems);
      } catch (err) {
        setError('Error al cargar los artículos guardados');
      }
    };
    fetchItems();
  }, []);
  const [currentItem, setCurrentItem] = useState({
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

  const handleItemChange = (e) => {
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
        setItems(prev => prev.map(item => item.id === currentItem.id ? { ...currentItem } : item));
        setEditMode(false);
      } catch (err) {
        setError('Error al actualizar el artículo');
        return;
      }
    } else {
      // Nuevo item local (aún no en Firestore)
      setItems(prev => [...prev, { ...currentItem, id: Date.now().toString() }]);
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
  const batchUpdateItem = async (itemRef, item) => {
    // Solo actualiza los campos editables, no createdAt
    await itemRef.update({
      name: item.name,
      specifications: item.specifications,
      imageUrl: item.imageUrl,
      price: item.price,
      quantity: item.quantity,
      category: item.category,
      brand: item.brand
    });
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Cargar item en formulario para editar
  const handleEditItem = (item) => {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link to="/" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft size={20} className="text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Formulario Supremo</h1>
                <p className="text-sm text-gray-600">Catálogo completo de artículos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Mensaje de éxito */}
        {submitSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-lg flex items-center space-x-2">
            <CheckCircle className="text-green-500" size={20} />
            <p className="text-green-700">¡Artículos guardados con éxito!</p>
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center space-x-2">
            <X className="text-red-500" size={20} />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Botón para agregar nuevo ítem */}
        <div className="mb-8">
          <Button 
            onClick={() => setIsItemFormOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus size={16} className="mr-2" />
            Agregar Nuevo Artículo
          </Button>
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
          <h2 className="text-xl font-semibold mb-4">Artículos Agregados ({items.length})</h2>

          {items.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <ImageIcon size={48} className="text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-700">No hay artículos agregados</h3>
              <p className="text-gray-500 mt-1">Haz clic en "Agregar Nuevo Artículo" para comenzar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id} className="p-4 border border-gray-200">
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
                            target.src = "https://via.placeholder.com/150?text=Error+de+imagen";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                        <ImageIcon size={32} className="text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h3 className="font-medium text-lg">{item.name}</h3>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-blue-500 hover:bg-blue-50"
                            onClick={() => handleEditItem(item)}
                          >
                            <Pencil size={18} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 mt-2 gap-y-2 gap-x-4">
                        {item.brand && (
                          <div>
                            <span className="text-sm text-gray-500">Marca:</span>
                            <span className="ml-1 text-sm">{item.brand}</span>
                          </div>
                        )}
                        {item.category && (
                          <div>
                            <span className="text-sm text-gray-500">Categoría:</span>
                            <span className="ml-1 text-sm">{item.category}</span>
                          </div>
                        )}
                        {item.price && (
                          <div>
                            <span className="text-sm text-gray-500">Precio:</span>
                            <span className="ml-1 text-sm font-medium">${parseFloat(item.price).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      {item.specifications && (
                        <div className="mt-2">
                          <span className="text-sm text-gray-500">Especificaciones:</span>
                          <p className="text-sm mt-1">{item.specifications}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-8 flex justify-end">
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Todos los Artículos'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormularioSupremo;
