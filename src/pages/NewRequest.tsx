import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X, MapPin, Clock, DollarSign, Hammer, HardHat, Zap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { getAuth } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

const NewRequest = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    profession: 'carpintería',
    location: '',
    urgency: 'media',
    budget: '',
    items: []
  });

  const [currentItem, setCurrentItem] = useState({
    name: '',
    quantity: 1,
    specifications: ''
  });

  const [showItemForm, setShowItemForm] = useState(false);

  const professions = [
    { id: 'carpintería', name: 'Carpintería', icon: Hammer, color: 'text-amber-600' },
    { id: 'construcción', name: 'Construcción', icon: HardHat, color: 'text-gray-600' },
    { id: 'eléctrico', name: 'Eléctrico', icon: Zap, color: 'text-blue-600' }
  ];

  const urgencyLevels = [
    { id: 'baja', name: 'Baja', description: 'No hay prisa (2-3 días)', color: 'bg-green-100 text-green-800' },
    { id: 'media', name: 'Media', description: 'Moderada (1-2 días)', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'alta', name: 'Alta', description: 'Urgente (mismo día)', color: 'bg-red-100 text-red-800' }
  ];

  const addItem = () => {
    if (currentItem.name.trim()) {
      setFormData({
        ...formData,
        items: [...formData.items, { ...currentItem, id: Date.now() }]
      });
      setCurrentItem({ name: '', quantity: 1, specifications: '' });
      setShowItemForm(false);
    }
  };

  const removeItem = (itemId) => {
    setFormData({
      ...formData,
      items: formData.items.filter(item => item.id !== itemId)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      alert("Debes iniciar sesión para enviar una solicitud.");
      return;
    }
    const newRequest = {
      ...formData,
      userId: user.uid,
      status: 'pendiente',
      estado: 'activo', // <-- Campo nuevo por defecto
      createdAt: new Date().toISOString(),
      quotesCount: 0
    };
    await addDoc(collection(db, "solicitud"), newRequest);
    window.location.href = '/requests';
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
                <Label htmlFor="description">Descripción del Proyecto</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Describe tu proyecto en detalle..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
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
                    <Input
                      id="itemName"
                      placeholder="Ej: Sierra Circular"
                      value={currentItem.name}
                      onChange={(e) => setCurrentItem({...currentItem, name: e.target.value})}
                    />
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
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">
                      Cantidad: {item.quantity}
                      {item.specifications && ` • ${item.specifications}`}
                    </p>
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
                <Input
                  id="location"
                  required
                  placeholder="Ciudad, Provincia"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
              </div>

              <div>
                <Label>
                  <Clock size={16} className="inline mr-1" />
                  Urgencia
                </Label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {urgencyLevels.map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setFormData({...formData, urgency: level.id})}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        formData.urgency === level.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{level.name}</p>
                          <p className="text-sm text-gray-600">{level.description}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${level.color}`}>
                          {level.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
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
