import React, { useState, useEffect } from 'react';
import { Hammer, HardHat, Zap, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase"; // Asegúrate que db es tu instancia de Firestore

const ProfessionSelect = () => {
  const [selectedProfession, setSelectedProfession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const professions = [
    {
      id: 'carpintería',
      name: 'Carpintería',
      description: 'Herramientas para trabajos en madera, muebles y construcción',
      icon: Hammer,
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700'
    },
    {
      id: 'construcción',
      name: 'Construcción',
      description: 'Equipos para obras, albañilería y construcción general',
      icon: HardHat,
      color: 'from-gray-500 to-gray-600',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700'
    },
    {
      id: 'eléctrico',
      name: 'Eléctrico',
      description: 'Herramientas especializadas para instalaciones eléctricas',
      icon: Zap,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    }
  ];

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().rol) {
          window.location.replace("/dashboard");
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleContinue = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user && selectedProfession) {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { rol: selectedProfession }, { merge: true });
      window.location.replace("/dashboard"); // Ajusta la ruta según tu app
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">F</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Bienvenido a Ferry!</h1>
          <p className="text-gray-600 text-lg">Selecciona tu profesión para personalizar tu experiencia</p>
        </div>

        {/* Profession Cards */}
        <div className="space-y-4 mb-8">
          {professions.map((profession) => {
            const Icon = profession.icon;
            const isSelected = selectedProfession === profession.id;
            
            return (
              <div
                key={profession.id}
                onClick={() => setSelectedProfession(profession.id)}
                className={`relative bg-white rounded-xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isSelected 
                    ? 'ring-2 ring-blue-500 shadow-lg transform scale-[1.02]' 
                    : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-16 h-16 bg-gradient-to-r ${profession.color} rounded-full flex items-center justify-center shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{profession.name}</h3>
                    <p className="text-gray-600">{profession.description}</p>
                  </div>
                  
                  {isSelected && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute inset-0 bg-blue-50/50 rounded-xl pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>

        {/* Continue Button */}
        <Button 
          onClick={handleContinue}
          disabled={!selectedProfession}
          className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continuar
        </Button>

        {/* Skip for now */}
        <div className="text-center mt-4">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Saltar por ahora
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfessionSelect;
