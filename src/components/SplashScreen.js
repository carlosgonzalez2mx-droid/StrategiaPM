import React, { useState, useEffect } from 'react';

const SplashScreen = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Mostrar splash screen por 6 segundos (2 segundos más como solicitado)
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Llamar callback después de la animación de salida
      setTimeout(() => {
        onComplete();
      }, 500);
    }, 6000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden">
      {/* Glow effect */}
      <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-radial-gradient from-indigo-400/10 to-transparent animate-pulse"></div>
      
      {/* Geometric background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[10%] left-[10%] w-15 h-15 bg-blue-500 rotate-45 opacity-10 animate-float"></div>
        <div className="absolute top-[20%] right-[15%] w-10 h-10 bg-red-500 rounded-full opacity-10 animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-[20%] left-[20%] w-0 h-0 border-l-[30px] border-r-[30px] border-b-[50px] border-l-transparent border-r-transparent border-b-orange-500 opacity-10 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-[15%] right-[10%] w-12 h-8 bg-purple-500 rounded-full opacity-10 animate-float" style={{ animationDelay: '3s' }}></div>
      </div>

      {/* Main content - Compacto como Excel/Office */}
      <div className="relative z-10 w-full max-w-md h-[400px] bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl flex flex-col items-center justify-center text-center p-8">
        {/* PMBOK Badge */}
        <div className="absolute top-5 right-5 bg-slate-800 text-white px-4 py-2 rounded-full text-sm font-bold tracking-wider">
          PMBOK BASED
        </div>

        {/* Logo */}
        <div className="text-4xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent mb-2 tracking-tight">
          StrategiaPM
        </div>
        
        {/* Tagline */}
        <div className="text-lg text-gray-600 mb-6 font-light">
          Donde la estrategia se convierte en resultados
        </div>
        
        {/* Features - Versión compacta */}
        <div className="flex justify-around w-full mt-6">
          <div className="flex flex-col items-center opacity-80">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-lg mb-1 shadow-md shadow-indigo-500/30">
              📊
            </div>
            <div className="text-xs text-gray-600 font-medium text-center">
              Planificación<br />Estratégica
            </div>
          </div>
          <div className="flex flex-col items-center opacity-80">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-lg mb-1 shadow-md shadow-indigo-500/30">
              ⚡
            </div>
            <div className="text-xs text-gray-600 font-medium text-center">
              Ejecución<br />Eficiente
            </div>
          </div>
          <div className="flex flex-col items-center opacity-80">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-lg mb-1 shadow-md shadow-indigo-500/30">
              🎯
            </div>
            <div className="text-xs text-gray-600 font-medium text-center">
              Resultados<br />Medibles
            </div>
          </div>
          <div className="flex flex-col items-center opacity-80">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-lg mb-1 shadow-md shadow-indigo-500/30">
              👥
            </div>
            <div className="text-xs text-gray-600 font-medium text-center">
              Colaboración<br />en Equipo
            </div>
          </div>
        </div>

        {/* Version */}
        <div className="absolute bottom-5 right-5 text-gray-400 text-sm">
          v1.0
        </div>
      </div>

      {/* Custom styles for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .bg-radial-gradient {
          background: radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%);
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
