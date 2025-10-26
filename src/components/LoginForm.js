import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_PERMISSIONS } from '../contexts/AuthContext';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showDemoUsers, setShowDemoUsers] = useState(false);
  
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(email, password);
      // Redirigir después del login exitoso
      navigate('/');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    
    try {
      // Llamar directamente a la función de login
      await login(demoEmail, demoPassword);
      // Redirigir después del login exitoso
      navigate('/');
    } catch (error) {
      setError(error.message);
    }
  };

  const demoUsers = [
    {
      email: "pm@strategiapm.com",
      password: "pm123",
      role: "project_manager",
      name: "Project Manager",
      description: "Acceso completo al sistema"
    },
    {
      email: "ejecutivo@strategiapm.com",
      password: "ejec123",
      role: "executive_manager",
      name: "Gestor Ejecutivo",
      description: "Solo dashboards y reportes"
    },
    {
      email: "asistente@strategiapm.com",
      password: "asis123",
      role: "pmo_assistant",
      name: "Asistente de PMO",
      description: "Gestión de proyectos"
    },
    {
      email: "financiero@strategiapm.com",
      password: "fin123",
      role: "financial_analyst",
      name: "Analista Financiero",
      description: "Módulos financieros"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center">
          {/* Logo StrategiaPM */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              {/* Icono del logo */}
              <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-lg">
                <svg 
                  width="40" 
                  height="40" 
                  viewBox="0 0 40 40" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-blue-600"
                >
                  {/* Clipboard base */}
                  <rect 
                    x="6" 
                    y="4" 
                    width="28" 
                    height="32" 
                    rx="3" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    fill="none"
                  />
                  {/* Clipboard clip */}
                  <rect 
                    x="14" 
                    y="2" 
                    width="12" 
                    height="6" 
                    rx="2" 
                    fill="currentColor"
                  />
                  {/* Bar chart inside clipboard */}
                  <rect x="10" y="16" width="3" height="8" fill="currentColor" opacity="0.7"/>
                  <rect x="15" y="12" width="3" height="12" fill="currentColor" opacity="0.7"/>
                  <rect x="20" y="8" width="3" height="16" fill="currentColor" opacity="0.7"/>
                  {/* Line graph overlay */}
                  <path 
                    d="M10 24 L15 20 L20 16 L25 12 L30 8" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Arrow pointing up */}
                  <path 
                    d="M28 8 L30 6 L32 8" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              {/* Texto del logo */}
              <div className="text-left">
                <h1 className="text-3xl font-bold text-white leading-tight">
                  Strategia<span className="text-blue-200">PM</span>
                </h1>
                <p className="text-blue-100 text-sm">
                  Sistema de Gestión de Oficina de Proyectos
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Iniciar Sesión
          </h2>

          <form id="login-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📧 Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="usuario@empresa.com"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔒 Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl font-medium text-white transition-all duration-200 ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Iniciando sesión...
                </div>
              ) : (
                '🚀 Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Demo Users Section */}
          <div className="mt-8">
            <button
              onClick={() => setShowDemoUsers(!showDemoUsers)}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {showDemoUsers ? '👁️ Ocultar' : '👥 Ver'} Usuarios de Demo
            </button>
            
            {showDemoUsers && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-gray-500 text-center">
                  Usa estas credenciales para probar diferentes roles:
                </p>
                {demoUsers.map((demoUser) => (
                  <div
                    key={demoUser.role}
                    className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleDemoLogin(demoUser.email, demoUser.password)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-800 text-sm">
                          {demoUser.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {demoUser.description}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {demoUser.email}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              © 2025 StrategiaPM - Sistema PMO Profesional
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
