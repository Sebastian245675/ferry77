import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, MessageSquare, Building2, User } from 'lucide-react';
import { messageService } from '../lib/messageService';
import { getAuth } from 'firebase/auth';

const BottomNavigation = () => {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Escuchar cambios en mensajes no leídos
  useEffect(() => {
    const unsubscribe = messageService.listenToConversations((conversations) => {
      // Filtrar solo las conversaciones de delivery y contar mensajes no leídos
      const deliveryUnreadCount = conversations
        .filter(conv => conv.type === 'delivery')
        .reduce((total, conv) => {
          const user = getAuth().currentUser;
          if (!user) return total;
          return total + (conv.unreadCount?.[user.uid] || 0);
        }, 0);
      setUnreadCount(deliveryUnreadCount);
    });
    
    return () => unsubscribe();
  }, []);

  const navItems = [
    { path: '/dashboard', label: 'Inicio', icon: Home },
    { path: '/requests', label: 'Solicitudes', icon: FileText },
    { path: '/messages', label: 'Mensajes', icon: MessageSquare },
    { path: '/companies', label: 'Empresas', icon: Building2 },
    { path: '/profile', label: 'Perfil', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-top border-gray-200 shadow-lg z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                isActive 
                  ? 'text-primary-600 bg-primary-50' 
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

export default BottomNavigation;
