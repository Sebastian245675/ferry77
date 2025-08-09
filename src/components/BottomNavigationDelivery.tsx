import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Truck, Package, Clock, User, LogOut } from 'lucide-react';
import { auth } from '@/lib/firebase';

const BottomNavigationDelivery = () => {
  const location = useLocation();
  
  const handleLogout = async () => {
    try {
      await auth.signOut();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 z-10">
      <div className="container mx-auto">
        <div className="flex justify-between items-center">
          <Link 
            to="/delivery-dashboard" 
            className={`flex flex-col items-center ${
              location.pathname === '/delivery-dashboard' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <Package size={24} />
            <span className="text-xs mt-1">Pedidos</span>
          </Link>
          
          <Link 
            to="/delivery-active" 
            className={`flex flex-col items-center ${
              location.pathname === '/delivery-active' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <Truck size={24} />
            <span className="text-xs mt-1">Mis Entregas</span>
          </Link>
          
          <Link 
            to="/delivery-history" 
            className={`flex flex-col items-center ${
              location.pathname === '/delivery-history' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <Clock size={24} />
            <span className="text-xs mt-1">Historial</span>
          </Link>
          
          <Link 
            to="/delivery-profile" 
            className={`flex flex-col items-center ${
              location.pathname === '/delivery-profile' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <User size={24} />
            <span className="text-xs mt-1">Perfil</span>
          </Link>
          
          <button
            onClick={handleLogout}
            className="flex flex-col items-center text-gray-500"
          >
            <LogOut size={24} />
            <span className="text-xs mt-1">Salir</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BottomNavigationDelivery;
