import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { user, getUserRoleInfo } = useAuth();
  
  const roleInfo = getUserRoleInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 p-8 text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-3xl font-bold text-white mb-2">Acceso Denegado</h1>
          <p className="text-red-100 text-sm">
            No tienes permisos para acceder a esta sección
          </p>
        </div>

        {/* Contenido */}
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="text-8xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Permisos Insuficientes
            </h2>
            <p className="text-gray-600 mb-6">
              Tu rol actual no te permite acceder a esta funcionalidad del sistema.
            </p>
          </div>

          {/* Información del Usuario */}
          {user && roleInfo && (
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                📋 Información de tu Cuenta
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Usuario</div>
                  <div className="font-medium text-gray-800">
                    {user.firstName} {user.lastName}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Email</div>
                  <div className="font-medium text-gray-800">{user.email}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Rol Actual</div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${roleInfo.color}`}></div>
                    <span className="font-medium text-gray-800">{roleInfo.name}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Descripción</div>
                  <div className="text-sm text-gray-600">{roleInfo.description}</div>
                </div>
              </div>
            </div>
          )}

          {/* Explicación de Permisos */}
          <div className="bg-blue-50 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">
              💡 ¿Por qué no puedo acceder?
            </h3>
            <div className="space-y-3 text-sm text-blue-700">
              <p>
                • <strong>Seguridad del Sistema:</strong> Cada rol tiene permisos específicos para proteger la información
              </p>
              <p>
                • <strong>Separación de Responsabilidades:</strong> Los permisos están diseñados según las funciones de cada rol
              </p>
              <p>
                • <strong>Acceso Controlado:</strong> Solo los usuarios con los permisos adecuados pueden acceder a ciertas funcionalidades
              </p>
            </div>
          </div>

          {/* Soluciones */}
          <div className="bg-green-50 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-green-800 mb-4">
              🚀 ¿Qué puedo hacer?
            </h3>
            <div className="space-y-3 text-sm text-green-700">
              <p>
                • <strong>Contactar al Administrador:</strong> Solicita acceso a esta funcionalidad si es necesario para tu trabajo
              </p>
              <p>
                • <strong>Usar Funcionalidades Disponibles:</strong> Explora las secciones a las que sí tienes acceso
              </p>
              <p>
                • <strong>Actualización de Rol:</strong> Tu rol puede ser actualizado si se requiere acceso adicional
              </p>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              🏠 Ir al Inicio
            </button>
            <button
              onClick={() => navigate(-1)}
              className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              ↩️ Volver Atrás
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              Si crees que esto es un error, contacta al administrador del sistema
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
