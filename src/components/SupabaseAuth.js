import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import supabaseService from '../services/SupabaseService';
import './InvitationBanner.css';

const SupabaseAuth = ({ onAuthSuccess, onAuthCancel }) => {
  const { login, register, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados para manejo de invitaciones
  const [isInvited, setIsInvited] = useState(false);
  const [invitationInfo, setInvitationInfo] = useState(null);

  // Limpiar mensajes al cambiar entre login/registro
  useEffect(() => {
    setError('');
    setSuccess('');
  }, [isLogin]);

  // Detectar invitaciones al cargar el componente
  useEffect(() => {
    const invitedEmail = searchParams.get('email');
    const invited = searchParams.get('invited') === 'true';
    const orgId = searchParams.get('org');
    
    if (invited && invitedEmail) {
      setIsInvited(true);
      setEmail(invitedEmail);
      setIsLogin(false); // Forzar modo registro si viene invitado
      
      // Cargar información de la invitación
      loadInvitationInfo(invitedEmail, orgId);
    }
  }, [searchParams]);

  const loadInvitationInfo = async (userEmail, orgId) => {
    try {
      const { data, error } = await supabaseService.supabase
        .from('organization_members')
        .select(`
          role,
          status,
          organizations (
            name
          )
        `)
        .eq('user_email', userEmail)
        .eq('status', 'pending')
        .maybeSingle();
      
      if (data) {
        setInvitationInfo(data);
      }
    } catch (err) {
      console.error('Error cargando invitación:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let result;
      
      if (isLogin) {
        // 🔐 INICIAR SESIÓN
        console.log('🔐 Iniciando sesión con AuthContext...');
        
        try {
          result = await login(email, password);
          
          if (result && result.success) {
            setSuccess('¡Sesión iniciada exitosamente! 🎉');
            
            // Esperar un momento para mostrar el mensaje
            setTimeout(() => {
              onAuthSuccess && onAuthSuccess(result.user);
            }, 1000);
          } else {
            setError('Error al iniciar sesión. Verifica tus credenciales.');
          }
        } catch (err) {
          console.error('❌ Error en login:', err);
          setError(err.message || 'Error al iniciar sesión');
        }
      } else {
        // 📝 REGISTRARSE
        console.log('📝 Registrando usuario con AuthContext...');
        
        if (!name.trim()) {
          setError('El nombre es requerido');
          setLoading(false);
          return;
        }
        
        try {
          result = await register(email, password, name);
          
          if (result && result.success) {
            // Verificar si se activaron invitaciones
            const activationResult = result.invitationActivation;
            
            if (activationResult && activationResult.activated > 0) {
              const orgNames = activationResult.organizations.map(org => org.name).join(', ');
              setSuccess(`¡Cuenta creada exitosamente! 🎉

Has sido agregado automáticamente a: ${orgNames}

Ya puedes acceder a los proyectos de tu organización.`);
            } else {
              setSuccess(`¡Cuenta creada exitosamente! 🎉

Tu cuenta ha sido configurada y está lista para usar.`);
            }
            
            // Esperar un poco más para que lean el mensaje
            setTimeout(() => {
              onAuthSuccess && onAuthSuccess(result.user);
            }, 2500);
          } else {
            setError('Error al crear la cuenta. Intenta nuevamente.');
          }
        } catch (err) {
          console.error('❌ Error en registro:', err);
          setError(err.message || 'Error al crear la cuenta');
        }
      }
    } catch (error) {
      console.error('❌ Error inesperado:', error);
      setError('Error inesperado: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    console.log('❌ Autenticación cancelada por usuario');
    onAuthCancel && onAuthCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <svg 
              className="w-8 h-8 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              {isLogin ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              )}
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isInvited ? 'Completa tu Registro' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
          </h2>
          <p className="text-gray-600">
            {isInvited 
              ? 'Has sido invitado a unirte a nuestra organización'
              : (isLogin 
                ? 'Accede a tu cuenta de StrategiaPM' 
                : 'Crea tu cuenta para sincronizar en la nube')
            }
          </p>
        </div>

        {/* Banner de invitación */}
        {isInvited && invitationInfo && (
          <div className="invitation-banner">
            <h3>🎉 ¡Has sido invitado!</h3>
            <p>
              Has sido invitado a unirte a{' '}
              <strong>{invitationInfo.organizations?.name}</strong>
            </p>
            <p className="invitation-note">
              Completa tu registro con el email <strong>{email}</strong> para obtener acceso automático.
            </p>
          </div>
        )}

        {/* Form */}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tu nombre completo"
                required={!isLogin}
                disabled={loading || authLoading}
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
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isInvited ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              placeholder="tu@email.com"
              required
              readOnly={isInvited}
              disabled={loading || authLoading}
            />
            {isInvited && (
              <p className="email-locked-note">
                ⚠️ Debes usar este email para activar tu invitación
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
              minLength={6}
              disabled={loading || authLoading}
            />
            {!isLogin && (
              <p className="mt-1 text-xs text-gray-500">
                Mínimo 6 caracteres
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm whitespace-pre-line">{success}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="submit"
              disabled={loading || authLoading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 px-4 rounded-md hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              {loading || authLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  {isLogin ? 'Iniciando...' : (isInvited ? 'Registrando...' : 'Creando...')}
                </div>
              ) : (
                <span>
                  {isLogin ? 'Iniciar Sesión' : (isInvited ? '✨ Registrarme y Unirme' : 'Crear Cuenta')}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={loading || authLoading}
              className="px-6 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-200"
            >
              Cancelar
            </button>
          </div>
        </form>

        {/* Toggle Login/Register */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            disabled={loading || authLoading}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline transition-colors duration-200 disabled:opacity-50"
          >
            {isLogin 
              ? '¿No tienes cuenta? Crear una' 
              : '¿Ya tienes cuenta? Iniciar sesión'
            }
          </button>
        </div>

        {/* Continue without account */}
        <div className="mt-4 text-center">
          <button
            onClick={handleCancel}
            disabled={loading || authLoading}
            className="text-gray-500 hover:text-gray-700 text-sm hover:underline transition-colors duration-200 disabled:opacity-50"
          >
            Continuar sin cuenta (modo local)
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500">
            Al crear una cuenta, aceptas sincronizar tus datos de forma segura con Supabase
          </p>
        </div>
      </div>
    </div>
  );
};

export default SupabaseAuth;
