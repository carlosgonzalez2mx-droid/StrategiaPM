import React, { useState, useEffect } from 'react';

const SplashScreen = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Mostrar splash screen por 4 segundos
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Llamar callback después de la animación de salida
      setTimeout(() => {
        onComplete();
      }, 500);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50">
      {/* Rectángulo centrado - mitad de la pantalla */}
      <div className="w-full max-w-2xl mx-auto px-8">
        <div className="bg-white rounded-3xl shadow-2xl p-16 flex flex-col items-center justify-center space-y-8 border border-gray-100">
          {/* Logo */}
          <div className="animate-fade-in">
            <img
              src="/logo_strategiapm.svg"
              alt="StrategiaPM"
              className="h-24 w-auto"
            />
          </div>

          {/* Frase */}
          <div className="text-xl text-gray-600 font-light text-center animate-fade-in-delay">
            Donde la estrategia se convierte en resultados
          </div>
        </div>
      </div>

      {/* Animaciones */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.8s ease-out forwards;
        }
        .animate-fade-in-delay {
          animation: fadeIn 0.8s ease-out 0.3s forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
