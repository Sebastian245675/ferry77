
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, User, Settings, HelpCircle } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <nav className="bg-white shadow-lg border-b-2 border-primary-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">F</span>
              </div>
              <span className="text-2xl font-bold text-blue-700">Ferry</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Inicio
              </Link>
              <Link to="/requests" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Mis Solicitudes
              </Link>
              <Link to="/companies" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Empresas
              </Link>
              <Link to="/tracking" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Rastrear
              </Link>
            </div>

            {/* User Actions */}
            <div className="hidden md:flex items-center space-x-4">
              <NotificationCenter />
              
              <Link to="/help" className="p-2 text-gray-600 hover:text-blue-600 transition-colors">
                <HelpCircle size={20} />
              </Link>
              
              <Link to="/profile" className="p-2 text-gray-600 hover:text-blue-600 transition-colors">
                <User size={20} />
              </Link>
              
              <Link to="/settings" className="p-2 text-gray-600 hover:text-blue-600 transition-colors">
                <Settings size={20} />
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-blue-600"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/dashboard"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Inicio
              </Link>
              <Link
                to="/requests"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Mis Solicitudes
              </Link>
              <Link
                to="/companies"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Empresas
              </Link>
              <Link
                to="/tracking"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Rastrear Pedidos
              </Link>
              <Link
                to="/help"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Ayuda
              </Link>
              <Link
                to="/profile"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Perfil
              </Link>
              <Link
                to="/settings"
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Configuración
              </Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;
