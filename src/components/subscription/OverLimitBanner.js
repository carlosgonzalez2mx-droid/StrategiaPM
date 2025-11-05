// src/components/subscription/OverLimitBanner.js
import React, { useState, useEffect } from 'react';
import { XCircle, AlertTriangle } from 'lucide-react';
import subscriptionService from '../../services/SubscriptionService';

/**
 * Banner crítico que se muestra cuando la organización ha excedido los límites de su plan
 * Este banner NO se puede cerrar y bloquea operaciones hasta que se resuelva
 */
const OverLimitBanner = ({ organizationId, onUpgradeClick }) => {
  const [limitInfo, setLimitInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationId) {
      checkLimits();
    }
  }, [organizationId]);

  const checkLimits = async () => {
    try {
      setLoading(true);
      console.log('[OverLimitBanner] Verificando límites para org:', organizationId);
      const result = await subscriptionService.isOverLimit(organizationId);
      console.log('[OverLimitBanner] Resultado:', result);

      if (result.isOverLimit) {
        console.log('[OverLimitBanner] ⚠️ LÍMITES EXCEDIDOS - Mostrando banner');
        setLimitInfo(result);
      } else {
        console.log('[OverLimitBanner] ✅ Dentro de límites - No mostrar banner');
        setLimitInfo(null);
      }
    } catch (error) {
      console.error('[OverLimitBanner] Error verificando límites:', error);
      setLimitInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    }
  };

  // No mostrar si está cargando o no hay límites excedidos
  if (loading || !limitInfo || !limitInfo.isOverLimit) {
    return null;
  }

  return (
    <div className="bg-red-50 border-l-4 border-red-500 px-6 py-4 mb-6 rounded-r-lg shadow-lg">
      <div className="flex items-start space-x-3">
        {/* Icono de error */}
        <XCircle className="text-red-600 w-7 h-7 mt-0.5 flex-shrink-0 animate-pulse" />

        {/* Contenido */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-red-900 font-bold text-lg">
              ⚠️ Límites del plan excedidos
            </h3>
            <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded-full text-xs font-semibold">
              MODO SOLO LECTURA
            </span>
          </div>

          <p className="text-red-800 text-sm mb-3 font-medium">
            Tu cuenta está en <strong>modo de solo lectura</strong>. No puedes crear ni editar recursos hasta que resuelvas lo siguiente:
          </p>

          {/* Lista de límites excedidos */}
          <div className="bg-white border border-red-200 rounded-lg p-4 mb-4">
            <ul className="space-y-2">
              {limitInfo.details.map((detail, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <AlertTriangle className="text-red-500 w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-red-900 text-sm font-semibold">
                      {detail.message}
                    </p>
                    <p className="text-red-700 text-xs mt-1">
                      Debes eliminar <strong>{detail.exceeded}</strong> {detail.resource === 'projects' ? 'proyecto(s)' : 'usuario(s)'}
                      {' '}o actualizar tu plan.
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Opciones de resolución */}
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
            <p className="text-red-900 font-semibold text-sm mb-2">¿Cómo resolver esto?</p>
            <ol className="list-decimal list-inside space-y-1 text-red-800 text-sm">
              <li>
                <strong>Opción 1:</strong> Elimina proyectos o usuarios para volver dentro de los límites del plan {limitInfo.subscription.toUpperCase()}
              </li>
              <li>
                <strong>Opción 2:</strong> Actualiza a un plan superior con límites más altos o ilimitados
              </li>
            </ol>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleUpgrade}
              className="
                bg-red-600 hover:bg-red-700 text-white
                px-5 py-2.5 rounded-lg font-semibold text-sm
                transition-all duration-200 shadow-md
                hover:shadow-lg active:scale-95
                flex items-center gap-2
              "
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Actualizar Plan Ahora
            </button>

            <button
              onClick={() => window.location.reload()}
              className="
                bg-gray-200 hover:bg-gray-300 text-gray-800
                px-4 py-2.5 rounded-lg font-medium text-sm
                transition-all duration-200
              "
            >
              Recargar para verificar
            </button>
          </div>

          {/* Nota importante */}
          <p className="text-red-700 text-xs mt-3 italic">
            * Puedes ver y eliminar tus recursos existentes, pero no puedes crear ni editar hasta resolver los límites.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OverLimitBanner;
