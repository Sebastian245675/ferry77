import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, MessageSquare, User, DollarSign, Star, ShieldCheck } from 'lucide-react';
import { CompanyMessageService } from '../lib/companyMessageService';
import { getAuth } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

const BottomNavigationEmpresa = () => {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Escuchar cambios en mensajes no leídos para empresas
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) return () => {};
    
    try {
      // Como CompanyMessageService no tiene un método de escucha implementado,
      // implementamos una solución alternativa usando Firestore directamente
      const conversationsRef = collection(db, "conversations");
      const q = query(
        conversationsRef,
        where("participants", "array-contains", user.uid)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        let count = 0;
        snapshot.docs.forEach(doc => {
          const conv = doc.data();
          count += (conv.unreadCount?.[user.uid] || 0);
        });
        
        setUnreadCount(count);
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error("Error al escuchar conversaciones:", error);
      return () => {};
    }
  }, []);

  const navItems = [
    { path: '/backoffice', label: 'Inicio', icon: Home },
    { path: '/backoffice/messages', label: 'Mensajes', icon: MessageSquare },
    { path: '/backoffice/profile', label: 'Perfil', icon: User },
    { path: '/backoffice/reviews', label: 'Reseñas', icon: Star },
    { path: '/backoffice/pagos', label: 'Pagos', icon: DollarSign },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
                          (item.path === '/backoffice' && location.pathname === '/backoffice/');
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                isActive 
                  ? 'text-primary-600 bg-blue-50' 
                  : 'text-gray-500 hover:text-primary-600'
              } transition-colors`}
            >
              <div className="relative">
                <Icon size={20} />
                {item.icon === MessageSquare && unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigationEmpresa;
