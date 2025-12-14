import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

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
      await login(demoEmail, demoPassword);
      navigate('/');
    } catch (error) {
      setError(error.message);
    }
  };

  const demoUsers = [
    { email: "pm@strategiapm.com", password: "pm123", role: "project_manager", name: "Project Manager", description: "Acceso completo" },
    { email: "ejecutivo@strategiapm.com", password: "ejec123", role: "executive_manager", name: "Gestor Ejecutivo", description: "Solo dashboards" },
    { email: "asistente@strategiapm.com", password: "asis123", role: "pmo_assistant", name: "Asistente de PMO", description: "Gestión básica" },
    { email: "financiero@strategiapm.com", password: "fin123", role: "financial_analyst", name: "Analista Financiero", description: "Finanzas" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Brand Header */}
      <div className="mb-8 text-center">
        <img src="/logo_strategiapm.svg" alt="StrategiaPM" className="h-16 w-auto mx-auto mb-4 drop-shadow-sm" />
        <h2 className="text-2xl font-semibold text-slate-900">Bienvenido de nuevo</h2>
        <p className="text-slate-500 text-sm mt-2">Sistema de Gestión de Oficina de Proyectos</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-soft-lg border border-slate-100 overflow-hidden">
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-sans"
                placeholder="nombre@empresa.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-sans"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 flex items-center">
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-md py-2.5 h-auto text-base"
              isLoading={loading}
            >
              Iniciar Sesión
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={() => setShowDemoUsers(!showDemoUsers)}
              className="w-full text-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              {showDemoUsers ? 'Ocultar' : 'Mostrar'} Usuarios Demo
            </button>

            {showDemoUsers && (
              <div className="mt-4 grid grid-cols-1 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                {demoUsers.map((u) => (
                  <button
                    key={u.role}
                    onClick={() => handleDemoLogin(u.email, u.password)}
                    className="flex items-center justify-between w-full p-3 text-left bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg transition-all group"
                  >
                    <div>
                      <div className="font-medium text-slate-900 text-sm group-hover:text-brand-700 transition-colors">{u.name}</div>
                      <div className="text-xs text-slate-500">{u.role === 'project_manager' ? 'Admin' : 'Usuario'}</div>
                    </div>
                    <div className="text-xs font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                      Demo
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-slate-400">
        &copy; 2025 StrategiaPM. Todos los derechos reservados.
      </div>
    </div>
  );
};

export default LoginForm;
