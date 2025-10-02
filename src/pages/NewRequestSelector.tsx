import React, { useState } from 'react';
import { Upload, Edit3, Zap, FileText, Image, MessageSquare } from 'lucide-react';
import NewRequestRapido from './NewRequestRapido';
import NewRequest from './NewRequest';
import '../styles/quick-request.css';

interface NewRequestSelectorProps {
  // Props si son necesarias
}

const NewRequestSelector: React.FC<NewRequestSelectorProps> = () => {
  const [selectedMode, setSelectedMode] = useState<'selector' | 'rapido' | 'manual'>('selector');

  if (selectedMode === 'rapido') {
    return <NewRequestRapido onBack={() => setSelectedMode('selector')} />;
  }

  if (selectedMode === 'manual') {
    return <NewRequest onBack={() => setSelectedMode('selector')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            ¿Cómo prefieres crear tu solicitud?
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Elige el método que mejor se adapte a ti. Puedes cambiar de modo en cualquier momento.
          </p>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* Modo Rápido */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 hover:shadow-2xl transition-all duration-300 group cursor-pointer"
               onClick={() => setSelectedMode('rapido')}>
            <div className="text-center">
              {/* Icon */}
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-10 h-10 text-white" />
              </div>
              
              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Modo Rápido
              </h2>
              
              {/* Description */}
              <p className="text-gray-600 mb-6 leading-relaxed">
                Crea tu solicitud de manera instantánea subiendo archivos, fotos o describiendo lo que necesitas en lenguaje natural.
              </p>
              
              {/* Features */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center justify-center space-x-3 text-sm text-gray-700">
                  <Upload className="w-4 h-4 text-green-500" />
                  <span>Sube PDF, Excel o fotos</span>
                </div>
                <div className="flex items-center justify-center space-x-3 text-sm text-gray-700">
                  <MessageSquare className="w-4 h-4 text-green-500" />
                  <span>Describe como en un chat</span>
                </div>
                <div className="flex items-center justify-center space-x-3 text-sm text-gray-700">
                  <FileText className="w-4 h-4 text-green-500" />
                  <span>Se genera automáticamente</span>
                </div>
              </div>
              
              {/* CTA Button */}
              <button className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                Crear Rápido
              </button>
              
              {/* Time indicator */}
              <div className="mt-4 text-xs text-green-600 font-medium">
                ⚡ Tiempo estimado: 2-3 minutos
              </div>
            </div>
          </div>

          {/* Modo Manual */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 hover:shadow-2xl transition-all duration-300 group cursor-pointer"
               onClick={() => setSelectedMode('manual')}>
            <div className="text-center">
              {/* Icon */}
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Edit3 className="w-10 h-10 text-white" />
              </div>
              
              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Modo Manual
              </h2>
              
              {/* Description */}
              <p className="text-gray-600 mb-6 leading-relaxed">
                Control total sobre tu solicitud. Completa cada detalle específico de tus productos y requisitos paso a paso.
              </p>
              
              {/* Features */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center justify-center space-x-3 text-sm text-gray-700">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>Formulario detallado</span>
                </div>
                <div className="flex items-center justify-center space-x-3 text-sm text-gray-700">
                  <Image className="w-4 h-4 text-blue-500" />
                  <span>Especificaciones precisas</span>
                </div>
                <div className="flex items-center justify-center space-x-3 text-sm text-gray-700">
                  <Edit3 className="w-4 h-4 text-blue-500" />
                  <span>Control granular</span>
                </div>
              </div>
              
              {/* CTA Button */}
              <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                Crear Manual
              </button>
              
              {/* Time indicator */}
              <div className="mt-4 text-xs text-blue-600 font-medium">
                🎯 Tiempo estimado: 8-10 minutos
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              ¿No estás seguro cuál elegir?
            </h3>
            <p className="text-gray-600 mb-4">
              Si tienes documentos o fotos de lo que necesitas, usa el <strong>Modo Rápido</strong>. 
              Si necesitas especificar detalles muy precisos, usa el <strong>Modo Manual</strong>.
            </p>
            <div className="text-sm text-gray-500">
              💡 Tip: Puedes cambiar de modo en cualquier momento durante el proceso
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewRequestSelector;