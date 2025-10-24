/**
 * @fileoverview Componente de loading para code splitting
 * @module components/LoadingFallback
 */

import React from 'react';

/**
 * Componente de fallback para mostrar mientras se cargan componentes lazy
 * @param {Object} props - Props del componente
 * @param {string} [props.message] - Mensaje personalizado a mostrar
 * @returns {JSX.Element} Componente de loading
 */
const LoadingFallback = ({ message = 'Cargando...' }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        {/* Spinner animado */}
        <div className="inline-block relative w-20 h-20 mb-4">
          <div className="absolute border-4 border-blue-200 border-t-blue-600 rounded-full w-20 h-20 animate-spin"></div>
        </div>

        {/* Mensaje */}
        <p className="text-lg font-medium text-gray-700 animate-pulse">
          {message}
        </p>

        {/* Puntos animados */}
        <div className="flex justify-center mt-2 space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingFallback;
