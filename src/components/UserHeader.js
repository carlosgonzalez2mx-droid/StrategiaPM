import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_PERMISSIONS } from '../contexts/AuthContext';

const UserHeader = () => {
  const { user, logout, clearAuthState, getUserRoleInfo } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const roleInfo = getUserRoleInfo();

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
  };

  if (!user) return null;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo y Título */}
        <div className="flex items-center space-x-4">
          <div className="text-3xl">🚀</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">StrategiaPM</h1>
            <p className="text-sm text-gray-500">Sistema de Gestión PMO</p>
          </div>
        </div>

        {/* Información del Usuario */}
        <div className="flex items-center space-x-4">
          {/* Notificaciones */}
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <div className="relative">
              <span className="text-xl">🔔</span>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                3
              </span>
            </div>
          </button>

          {/* Perfil del Usuario */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="text-2xl">{user.avatar}</div>
              <div className="text-left">
                <div className="font-medium text-gray-800">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-sm text-gray-500">
                  {roleInfo?.name}
                </div>
              </div>
              <div className="text-gray-400">
                {showUserMenu ? '▲' : '▼'}
              </div>
            </button>

            {/* Menú Desplegable */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                {/* Información del Rol */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${roleInfo?.color}`}></div>
                    <div>
                      <div className="font-medium text-gray-800">{roleInfo?.name}</div>
                      <div className="text-sm text-gray-500">{roleInfo?.description}</div>
                    </div>
                  </div>
                </div>

                {/* Opciones del Menú */}
                <div className="py-2">
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    👤 Mi Perfil
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    ⚙️ Configuración
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    📚 Ayuda
                  </button>
                </div>

                {/* Separador */}
                <div className="border-t border-gray-100 my-2"></div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  🚪 Cerrar Sesión
                </button>
                
                {/* Botón de Debug - Limpiar Estado */}
                <button
                  onClick={() => {
                    clearAuthState();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 transition-colors"
                >
                  🔧 Limpiar Estado (Debug)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barra de Estado del Rol */}
      <div className="mt-3">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${roleInfo?.color} text-white`}>
          <span className="mr-2">👑</span>
          {roleInfo?.name} - {roleInfo?.description}
        </div>
      </div>
    </div>
  );
};

export default UserHeader;
