import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { proposeDeliveryFee } from '@/lib/deliveryService';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const DeliveryPriceProposal = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [delivery, setDelivery] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [proposedFee, setProposedFee] = useState<number>(0);
  const [baseProposedFee, setBaseProposedFee] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recommendedRange, setRecommendedRange] = useState<{min: number, max: number}>({min: 0, max: 0});
  
  useEffect(() => {
    const checkAuth = async () => {
      if (!auth.currentUser) {
        navigate('/auth');
        return;
      }
      
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists() || (userSnap.data().rol !== 'repartidor' && userSnap.data().type !== 'deliveryDriver')) {
          navigate('/delivery-dashboard');
          return;
        }
        
        setUserData(userSnap.data());
        await loadDeliveryData();
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate, id]);
  
  const loadDeliveryData = async () => {
    if (!id) return;
    
    try {
      const deliveryRef = doc(db, 'deliveries', id);
      const deliverySnap = await getDoc(deliveryRef);
      
      if (!deliverySnap.exists()) {
        // Intentar en la colección de órdenes si no se encuentra
        const orderRef = doc(db, 'orders', id);
        const orderSnap = await getDoc(orderRef);
        
        if (orderSnap.exists()) {
          const orderData = { id: orderSnap.id, ...orderSnap.data() } as any;
          setDelivery(orderData);
          
          // Calcular tarifas recomendadas
          calculateRecommendedFees(orderData);
        } else {
          toast({
            title: "Error",
            description: "No se encontró la entrega solicitada",
            variant: "destructive",
          });
          navigate('/delivery-dashboard');
          return;
        }
      } else {
        const deliveryData = { id: deliverySnap.id, ...deliverySnap.data() } as any;
        setDelivery(deliveryData);
        
        // Calcular tarifas recomendadas
        calculateRecommendedFees(deliveryData);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error al cargar la entrega:', error);
      setIsLoading(false);
    }
  };
  
  const calculateRecommendedFees = (deliveryData: any) => {
    // Obtener la tarifa base (si existe)
    const baseFee = deliveryData.deliveryFee || 5;
    
    // Calcular una tarifa mínima y máxima recomendadas
    const minFee = Math.max(3, baseFee * 0.8); // 80% de la tarifa base, mínimo $3
    const maxFee = baseFee * 1.5; // 150% de la tarifa base
    
    setBaseProposedFee(baseFee);
    setProposedFee(baseFee);
    setRecommendedRange({ min: minFee, max: maxFee });
  };
  
  const handleSubmitProposal = async () => {
    if (!id || !auth.currentUser || !userData || proposedFee <= 0) {
      toast({
        title: "Error",
        description: "Debes proponer un precio válido",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await proposeDeliveryFee(
        id,
        auth.currentUser.uid,
        userData.name || 'Repartidor',
        proposedFee
      );
      
      if (result.success) {
        toast({
          title: "Propuesta enviada",
          description: "Tu propuesta de precio ha sido enviada correctamente",
        });
        
        navigate('/delivery-dashboard');
      } else {
        toast({
          title: "Error",
          description: "No se pudo enviar tu propuesta. Intenta de nuevo más tarde.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error al proponer tarifa:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error al enviar la propuesta. Intenta de nuevo más tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información de la entrega...</p>
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mx-auto mb-4">⚠️</div>
          <p className="text-gray-800 text-lg font-medium">No se pudo cargar la información de la entrega</p>
          <Button onClick={() => navigate('/delivery-dashboard')} className="mt-4">
            Volver al panel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="container mx-auto">
          <div className="flex items-center">
            <button onClick={() => navigate('/delivery-dashboard')} className="mr-2">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold">Proponer Precio</h1>
              <p className="text-sm text-blue-100">Pedido #{id?.substring(0, 6)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Card className="mb-6 p-5 border-0 shadow-md">
          <h2 className="text-lg font-bold mb-4">Información de la Entrega</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Cliente:</span>
              <span className="font-medium">{delivery.customerName}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-500">Dirección:</span>
              <span className="font-medium text-right">{delivery.deliveryAddress}</span>
            </div>
            
            {delivery.distance && (
              <div className="flex justify-between">
                <span className="text-gray-500">Distancia:</span>
                <span className="font-medium">{delivery.distance} km</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-gray-500">Tarifa base:</span>
              <span className="font-medium">${baseProposedFee.toFixed(2)}</span>
            </div>
            
            {delivery.items && delivery.items.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Productos:</span>
                <span className="font-medium">{delivery.items.length}</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="mb-6 p-5 border-0 shadow-md">
          <h2 className="text-lg font-bold mb-4">Proponer Precio Personalizado</h2>
          
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Tarifa propuesta
              </label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={proposedFee}
                  onChange={(e) => setProposedFee(parseFloat(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="font-medium text-gray-500">Ajuste de Tarifa</span>
                <span className="font-medium text-gray-700">
                  Sugerido: ${recommendedRange.min.toFixed(2)} - ${recommendedRange.max.toFixed(2)}
                </span>
              </div>
              
              <Slider 
                value={[proposedFee]} 
                min={Math.max(1, recommendedRange.min * 0.5)} // Nunca menor a $1
                max={recommendedRange.max * 2}
                step={0.25}
                onValueChange={(value) => setProposedFee(value[0])}
                className="my-6"
              />
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>Min: ${Math.max(1, recommendedRange.min * 0.5).toFixed(2)}</span>
                <span>Base: ${baseProposedFee.toFixed(2)}</span>
                <span>Max: ${(recommendedRange.max * 2).toFixed(2)}</span>
              </div>
            </div>
            
            <div className="pt-3 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-4">
                Propón un precio personalizado para esta entrega. Ten en cuenta la distancia, 
                el número de productos y la complejidad de la entrega.
              </p>
              
              <Button 
                onClick={handleSubmitProposal} 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting || proposedFee <= 0}
              >
                {isSubmitting ? 'Enviando propuesta...' : 'Enviar Propuesta'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DeliveryPriceProposal;
