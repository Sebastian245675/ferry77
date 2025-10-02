import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Settings, FileImage, MessageSquare, FileSpreadsheet } from "lucide-react";

interface QuoteTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectQuickQuote: () => void;
  onSelectManualQuote: () => void;
  requestTitle?: string;
}

const QuoteTypeSelector: React.FC<QuoteTypeSelectorProps> = ({
  open,
  onOpenChange,
  onSelectQuickQuote,
  onSelectManualQuote,
  requestTitle
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            ¿Cómo deseas cotizar esta solicitud?
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {requestTitle && <span className="font-medium">"{requestTitle}"</span>}
            <br />
            Elige el tipo de cotización que mejor se adapte a tus necesidades.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Cotización Rápida */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-blue-500"
            onClick={onSelectQuickQuote}
          >
            <CardHeader className="text-center pb-3">
              <div className="w-16 h-16 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-lg text-blue-700">
                Cotización Rápida
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm text-gray-600 mb-4">
                Responde de forma ágil con una respuesta directa y sencilla.
              </CardDescription>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-700">
                  <FileImage className="w-4 h-4 mr-2 text-gray-500" />
                  <span>Adjuntar imagen</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <MessageSquare className="w-4 h-4 mr-2 text-gray-500" />
                  <span>Mensaje de texto</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-gray-500" />
                  <span>Archivo Excel</span>
                </div>
              </div>

              <div className="mt-4 text-xs text-green-600 bg-green-50 p-2 rounded">
                ⚡ Respuesta en segundos
              </div>
            </CardContent>
          </Card>

          {/* Cotización Manual */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-green-500"
            onClick={onSelectManualQuote}
          >
            <CardHeader className="text-center pb-3">
              <div className="w-16 h-16 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                <Settings className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-lg text-green-700">
                Cotización Manual
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm text-gray-600 mb-4">
                Crea una cotización completa y detallada con todos los elementos.
              </CardDescription>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-700">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                  <span>Detalles por artículo</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                  <span>Precios y cantidades</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                  <span>Opciones de pago</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                  <span>Tiempos de entrega</span>
                </div>
              </div>

              <div className="mt-4 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                🎯 Cotización profesional detallada
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="justify-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteTypeSelector;