import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Building2, User } from 'lucide-react';

const BottomNavigation = () => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Inicio', icon: Home },
    { path: '/requests', label: 'Solicitudes', icon: FileText },
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
