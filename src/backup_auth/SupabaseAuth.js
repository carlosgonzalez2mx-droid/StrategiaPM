import React, { useState, useEffect } from 'react';
import supabaseService from '../services/SupabaseService';

const SupabaseAuth = ({ onAuthSuccess, onAuthCancel }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Limpiar mensajes al cambiar entre login/registro
  useEffect(() => {
    setError('');
    setSuccess('');
  }, [isLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let result;
      
      if (isLogin) {
        // Iniciar sesión
        result = await supabaseService.signIn(email, password);
        if (result.success) {
          // Verificar si se activaron invitaciones durante el login
          const activationResult = result.invitationActivation;
          
          if (activationResult && activationResult.activated > 0) {
            const orgNames = activationResult.organizations.map(org => org.name).join(', ');
            setSuccess(`¡Sesión iniciada exitosamente! 🎉

¡Nuevas invitaciones activadas!
Ahora tienes acceso a: ${orgNames}`);
            setTimeout(() => {
              onAuthSuccess && onAuthSuccess(result.user);
            }, 3000);
          } else {
            setSuccess('¡Sesión iniciada exitosamente!');
            setTimeout(() => {
              onAuthSuccess && onAuthSuccess(result.user);
            }, 1000);
          }
        } else {
          setError(result.error || 'Error al iniciar sesión');
        }
      } else {
        // Registrarse
        if (!name.trim()) {
          setError('El nombre es requerido');
          setLoading(false);
          return;
        }
        
        result = await supabaseService.signUp(email, password, name);
        if (result.success) {
          // Verificar si se activaron invitaciones
          const activationResult = result.invitationActivation;
          
          if (activationResult && activationResult.activated > 0) {
            const orgNames = activationResult.organizations.map(org => org.name).join(', ');
            setSuccess(`¡Cuenta creada exitosamente! 🎉
            
Has sido agregado automáticamente a: ${orgNames}
            
Ya puedes acceder a los proyectos de tu organización.`);
          } else {
            setSuccess('¡Cuenta creada exitosamente! Revisa tu correo para confirmar.');
          }
          
          setTimeout(() => {
            onAuthSuccess && onAuthSuccess(result.user);
          }, 3000);
        } else {
          setError(result.error || 'Error al crear la cuenta');
        }
      }
    } catch (error) {
      setError('Error inesperado: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onAuthCancel && onAuthCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h2>
          <p className="text-gray-600">
            {isLogin 
              ? 'Accede a tu cuenta de StrategiaPM' 
              : 'Crea tu cuenta para sincronizar en la nube'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tu nombre completo"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              {success}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  {isLogin ? 'Iniciando...' : 'Creando...'}
                </div>
              ) : (
                isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'
              )}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 focus:outline-none"
            >
              Cancelar
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {isLogin 
              ? '¿No tienes cuenta? Crear una' 
              : '¿Ya tienes cuenta? Iniciar sesión'
            }
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Continuar sin cuenta (modo local)
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupabaseAuth;
