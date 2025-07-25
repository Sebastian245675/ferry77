
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import BottomNavigation from '../components/BottomNavigation';
import { Gift, Trophy, Star, Zap, ShoppingBag, Percent, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '../lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy
} from 'firebase/firestore';

interface Reward {
  id: string;
  title: string;
  description: string;
  points: number;
  type: 'discount' | 'freeDelivery' | 'cashback' | 'gift';
  value: string;
  expiresAt: string;
  claimed: boolean;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any;
  progress: number;
  maxProgress: number;
  completed: boolean;
  points: number;
}

const Rewards = () => {
  const [promoCode, setPromoCode] = useState('');
  const [activeTab, setActiveTab] = useState<'rewards' | 'achievements' | 'codes'>('rewards');
  const [activeCodes, setActiveCodes] = useState<any[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const { toast } = useToast();


  const [ordersCount, setOrdersCount] = useState(0);
  const [userStats, setUserStats] = useState({
    totalPoints: 0,
    level: 'Plata',
    nextLevel: 'Oro',
    pointsToNextLevel: 0,
    ordersCount: 0,
    totalSpent: 0
  });

  // Cargar pedidos reales y puntos del usuario
  useEffect(() => {
    const fetchOrdersAndPoints = async () => {
      const user = auth.currentUser;
      if (!user) return;
      // Pedidos
      const solicitudRef = collection(db, "solicitud");
      const qSolicitudes = query(solicitudRef, where("userId", "==", user.uid));
      const solicitudesSnap = await getDocs(qSolicitudes);
      let pedidos = 0;
      let totalSpent = 0;
      solicitudesSnap.forEach(doc => {
        pedidos++;
        const data = doc.data();
        if (data.totalAmount) totalSpent += data.totalAmount;
      });
      // Puntos: 50 por cada pedido + puntos extra del usuario
      let puntosExtra = 0;
      let level = 'Plata';
      let nextLevel = 'Oro';
      let pointsToNextLevel = 0;
      const usersRef = collection(db, "users");
      const qUser = query(usersRef, where("uid", "==", user.uid));
      const userSnap = await getDocs(qUser);
      if (!userSnap.empty) {
        const userData = userSnap.docs[0].data();
        puntosExtra = userData.puntos || 0;
      }
      const puntos = pedidos * 50 + puntosExtra;
      // Lógica de niveles
      if (puntos >= 2000) {
        level = 'Oro';
        nextLevel = 'Platino';
        pointsToNextLevel = 5000 - puntos;
      } else if (puntos >= 1000) {
        level = 'Plata';
        nextLevel = 'Oro';
        pointsToNextLevel = 2000 - puntos;
      } else {
        level = 'Bronce';
        nextLevel = 'Plata';
        pointsToNextLevel = 1000 - puntos;
      }
      setUserStats({
        totalPoints: puntos,
        level,
        nextLevel,
        pointsToNextLevel: pointsToNextLevel > 0 ? pointsToNextLevel : 0,
        ordersCount: pedidos,
        totalSpent
      });
    };
    fetchOrdersAndPoints();
  }, []);

  const rewards: Reward[] = [
    {
      id: '1',
      title: '15% de Descuento',
      description: 'En cualquier pedido superior a $20.000',
      points: 500,
      type: 'discount',
      value: '15%',
      expiresAt: '2024-02-15',
      claimed: false
    },
    {
      id: '2',
      title: 'Envío Gratis',
      description: 'En tu próximo pedido sin mínimo',
      points: 300,
      type: 'freeDelivery',
      value: 'Gratis',
      expiresAt: '2024-02-10',
      claimed: false
    },
    {
      id: '3',
      title: 'Cashback $2000',
      description: 'Dinero de vuelta en tu cuenta',
      points: 800,
      type: 'cashback',
      value: '$2000',
      expiresAt: '2024-02-20',
      claimed: false
    },
    {
      id: '4',
      title: 'Kit de Herramientas',
      description: 'Set básico de destornilladores',
      points: 1200,
      type: 'gift',
      value: 'Gratis',
      expiresAt: '2024-03-01',
      claimed: true
    }
  ];

  const achievements: Achievement[] = [
    {
      id: '1',
      title: 'Primer Pedido',
      description: 'Completa tu primer pedido',
      icon: ShoppingBag,
      progress: 1,
      maxProgress: 1,
      completed: true,
      points: 100
    },
    {
      id: '2',
      title: 'Cliente Frecuente',
      description: 'Realiza 10 pedidos',
      icon: Trophy,
      progress: 8,
      maxProgress: 10,
      completed: false,
      points: 300
    },
    {
      id: '3',
      title: 'Gran Comprador',
      description: 'Gasta más de $100.000',
      icon: Star,
      progress: 85000,
      maxProgress: 100000,
      completed: false,
      points: 500
    },
    {
      id: '4',
      title: 'Madrugador',
      description: 'Haz un pedido antes de las 8 AM',
      icon: Clock,
      progress: 0,
      maxProgress: 1,
      completed: false,
      points: 150
    }
  ];

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'discount': return Percent;
      case 'freeDelivery': return Zap;
      case 'cashback': return Gift;
      case 'gift': return Trophy;
      default: return Gift;
    }
  };

  const claimReward = (rewardId: string) => {
    const reward = rewards.find(r => r.id === rewardId);
    if (reward && userStats.totalPoints >= reward.points) {
      toast({
        title: "¡Recompensa canjeada!",
        description: `Has canjeado ${reward.title} por ${reward.points} puntos`,
      });
    } else {
      toast({
        title: "Puntos insuficientes",
        description: "No tienes suficientes puntos para esta recompensa",
        variant: "destructive"
      });
    }
  };


  // Guardar y validar códigos promocionales en Firestore
  const redeemCode = async () => {
    if (!promoCode.trim()) return;
    const code = promoCode.trim().toUpperCase();
    setLoadingCodes(true);
    try {
      // Buscar el código en la colección 'promoCodes'
      const q = query(collection(db, 'promoCodes'), where('code', '==', code), where('active', '==', true));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        toast({
          title: 'Código inválido',
          description: 'El código ingresado no es válido o ha expirado',
          variant: 'destructive',
        });
        setLoadingCodes(false);
        return;
      }
      // Verificar si el usuario ya lo canjeó
      const user = auth.currentUser;
      if (!user) {
        toast({ title: 'No autenticado', description: 'Debes iniciar sesión para canjear códigos', variant: 'destructive' });
        setLoadingCodes(false);
        return;
      }
      const userCodesQ = query(
        collection(db, 'userPromoCodes'),
        where('userId', '==', user.uid),
        where('code', '==', code)
      );
      const userCodesSnap = await getDocs(userCodesQ);
      if (!userCodesSnap.empty) {
        toast({ title: 'Ya canjeado', description: 'Ya has canjeado este código', variant: 'destructive' });
        setLoadingCodes(false);
        return;
      }
      // Guardar el canje
      await addDoc(collection(db, 'userPromoCodes'), {
        userId: user.uid,
        code,
        redeemedAt: Timestamp.now(),
        active: true
      });
      toast({
        title: '¡Código canjeado!',
        description: `Has aplicado el código ${code} exitosamente`,
      });
      setPromoCode('');
      fetchActiveCodes();
    } catch (err) {
      toast({ title: 'Error', description: 'Ocurrió un error al canjear el código', variant: 'destructive' });
    }
    setLoadingCodes(false);
  };

  // Obtener los códigos activos del usuario
  const fetchActiveCodes = async () => {
    setLoadingCodes(true);
    try {
      const user = auth.currentUser;
      if (!user) return setActiveCodes([]);
      const q = query(
        collection(db, 'userPromoCodes'),
        where('userId', '==', user.uid),
        where('active', '==', true),
        orderBy('redeemedAt', 'desc')
      );
      const snap = await getDocs(q);
      const codes = [];
      for (const doc of snap.docs) {
        codes.push({ id: doc.id, ...doc.data() });
      }
      setActiveCodes(codes);
    } catch (e) {
      setActiveCodes([]);
    }
    setLoadingCodes(false);
  };

  useEffect(() => {
    if (activeTab === 'codes') fetchActiveCodes();
    // eslint-disable-next-line
  }, [activeTab]);

  const levelProgress = ((userStats.totalPoints % 1000) / 1000) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Recompensas</h1>
            <p className="text-gray-600">Canjea tus puntos por increíbles beneficios</p>
          </div>

          {/* Stats del usuario */}
          <Card className="mb-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start space-x-2 mb-2">
                    <Trophy className="w-6 h-6" />
                    <span className="text-xl font-bold">{userStats.totalPoints}</span>
                  </div>
                  <p className="text-blue-100">Puntos Totales</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Star className="w-6 h-6" />
                    <span className="text-xl font-bold">{userStats.level}</span>
                  </div>
                  <p className="text-blue-100">Nivel Actual</p>
                  <div className="mt-2">
                    <Progress value={levelProgress} className="h-2 bg-blue-400" />
                    <p className="text-xs text-blue-100 mt-1">
                      {userStats.pointsToNextLevel} puntos para {userStats.nextLevel}
                    </p>
                  </div>
                </div>
                
                <div className="text-center md:text-right">
                  <div className="flex items-center justify-center md:justify-end space-x-2 mb-2">
                    <ShoppingBag className="w-6 h-6" />
                    <span className="text-xl font-bold">{userStats.ordersCount}</span>
                  </div>
                  <p className="text-blue-100">Pedidos Realizados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navegación de tabs */}
          <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('rewards')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'rewards'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Recompensas
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'achievements'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Logros
            </button>
            <button
              onClick={() => setActiveTab('codes')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'codes'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Códigos
            </button>
          </div>

          {/* Contenido de Recompensas */}
          {activeTab === 'rewards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map((reward) => {
                const RewardIcon = getRewardIcon(reward.type);
                const canAfford = userStats.totalPoints >= reward.points;
                
                return (
                  <Card key={reward.id} className={`${reward.claimed ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <RewardIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{reward.title}</h3>
                            <p className="text-sm text-gray-600">{reward.description}</p>
                          </div>
                        </div>
                        {reward.claimed && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Canjeado
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold text-blue-600">{reward.points} pts</span>
                        <span className="text-sm text-gray-500">
                          Expira: {new Date(reward.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <Button 
                        onClick={() => claimReward(reward.id)}
                        disabled={!canAfford || reward.claimed}
                        className="w-full"
                        variant={canAfford && !reward.claimed ? "default" : "outline"}
                      >
                        {reward.claimed ? 'Canjeado' : canAfford ? 'Canjear' : 'Puntos Insuficientes'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Contenido de Logros */}
          {activeTab === 'achievements' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement) => {
                const AchievementIcon = achievement.icon;
                
                return (
                  <Card key={achievement.id} className={`${achievement.completed ? 'bg-green-50 border-green-200' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          achievement.completed 
                            ? 'bg-green-100' 
                            : 'bg-gray-100'
                        }`}>
                          <AchievementIcon className={`w-6 h-6 ${
                            achievement.completed 
                              ? 'text-green-600' 
                              : 'text-gray-400'
                          }`} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{achievement.title}</h3>
                            {achievement.completed && (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Completado
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{achievement.description}</p>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Progreso</span>
                              <span>{achievement.progress}/{achievement.maxProgress}</span>
                            </div>
                            <Progress 
                              value={(achievement.progress / achievement.maxProgress) * 100} 
                              className="h-2"
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">
                                Recompensa: {achievement.points} puntos
                              </span>
                              {achievement.completed && (
                                <span className="text-sm text-green-600 font-medium">
                                  +{achievement.points} pts
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Contenido de Códigos */}
          {activeTab === 'codes' && (
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Gift className="w-5 h-5" />
                    <span>Canjear Código Promocional</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Ingresa tu código promocional"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="flex-1"
                      disabled={loadingCodes}
                    />
                    <Button onClick={redeemCode} disabled={loadingCodes}>
                      {loadingCodes ? 'Cargando...' : 'Canjear'}
                    </Button>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Códigos de ejemplo:</h4>
                    <div className="space-y-1 text-sm text-blue-700">
                      <p>• FERRY10 - 10% de descuento</p>
                      <p>• WELCOME20 - $2000 de descuento en tu primer pedido</p>
                      <p>• SAVE15 - 15% en herramientas eléctricas</p>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Códigos Activos</h4>
                    <div className="space-y-2">
                      {loadingCodes && <div className="text-gray-500">Cargando...</div>}
                      {!loadingCodes && activeCodes.length === 0 && (
                        <div className="text-gray-500">No tienes códigos activos</div>
                      )}
                      {activeCodes.map((code) => (
                        <div key={code.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div>
                            <span className="font-medium text-green-800">{code.code}</span>
                            <p className="text-sm text-green-600">Canjeado el {code.redeemedAt?.toDate ? code.redeemedAt.toDate().toLocaleDateString() : ''}</p>
                          </div>
                          <Badge className="bg-green-100 text-green-800">Activo</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Rewards;
