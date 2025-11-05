// src/components/subscription/SubscriptionDebugPanel.js
import React, { useState, useEffect } from 'react';
import supabaseService from '../../services/SupabaseService';

/**
 * Panel de diagnóstico para verificar datos de suscripción
 * TEMPORAL - Solo para debugging
 */
const SubscriptionDebugPanel = () => {
  const [orgData, setOrgData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOrgData();
  }, []);

  const loadOrgData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Obtener email del usuario actual
      const { data: { user } } = await supabaseService.supabase.auth.getUser();

      if (!user) {
        setError('No hay usuario autenticado');
        setLoading(false);
        return;
      }

      console.log('👤 Usuario:', user.email);

      // Obtener organización directamente desde Supabase
      const org = await supabaseService.detectUserOrganization(user.email);

      console.log('🏢 Organización detectada:', org);

      setOrgData(org);
      setLoading(false);

    } catch (err) {
      console.error('❌ Error cargando datos:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 border-2 border-blue-500 max-w-md">
        <h3 className="font-bold text-blue-600 mb-2">🔍 Diagnóstico de Suscripción</h3>
        <p className="text-gray-600">Cargando datos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 border-2 border-red-500 max-w-md">
        <h3 className="font-bold text-red-600 mb-2">❌ Error</h3>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={loadOrgData}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!orgData) {
    return (
      <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 border-2 border-yellow-500 max-w-md">
        <h3 className="font-bold text-yellow-600 mb-2">⚠️ Sin Datos</h3>
        <p className="text-gray-600">No se pudo cargar la organización</p>
        <button
          onClick={loadOrgData}
          className="mt-2 px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Determinar si tiene los campos de suscripción
  const hasSubscriptionFields =
    orgData.subscriptionPlan !== undefined ||
    orgData.subscription_plan !== undefined;

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 border-2 border-green-500 max-w-md z-50">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-green-600">✅ Diagnóstico de Suscripción</h3>
        <button
          onClick={loadOrgData}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          🔄 Recargar
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="bg-gray-50 p-2 rounded">
          <span className="font-semibold">🏢 Organización:</span>
          <p className="text-gray-700">{orgData.name}</p>
        </div>

        <div className="bg-gray-50 p-2 rounded">
          <span className="font-semibold">🆔 ID:</span>
          <p className="text-gray-700 font-mono text-xs">{orgData.id}</p>
        </div>

        {hasSubscriptionFields ? (
          <>
            <div className="bg-green-50 p-2 rounded border border-green-200">
              <span className="font-semibold text-green-700">✅ Campos de Suscripción:</span>
              <div className="mt-1 space-y-1">
                <p className="text-gray-700">
                  <span className="font-medium">Plan:</span> {orgData.subscriptionPlan || orgData.subscription_plan || 'N/A'}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Status:</span> {orgData.subscriptionStatus || orgData.subscription_status || 'N/A'}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Max Proyectos:</span> {
                    (orgData.maxProjects || orgData.max_projects) === null ?
                    '∞ Ilimitado' :
                    (orgData.maxProjects || orgData.max_projects)
                  }
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Max Usuarios:</span> {
                    (orgData.maxUsers || orgData.max_users) === null ?
                    '∞ Ilimitado' :
                    (orgData.maxUsers || orgData.max_users)
                  }
                </p>
              </div>
            </div>

            {(orgData.subscriptionPlan === 'legacy' || orgData.subscription_plan === 'legacy') && (
              <div className="bg-purple-50 p-2 rounded border border-purple-200">
                <p className="text-purple-700 text-xs font-medium">
                  🎯 Plan LEGACY: Sin límites, sin expiración
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-red-50 p-2 rounded border border-red-200">
            <p className="text-red-700 font-semibold">❌ Sin campos de suscripción</p>
            <p className="text-red-600 text-xs mt-1">
              Los campos no se cargaron desde Supabase. Posibles causas:
            </p>
            <ul className="text-red-600 text-xs mt-1 ml-4 list-disc">
              <li>El script SQL no se ejecutó</li>
              <li>La query no incluye los campos</li>
              <li>Error en el mapeo de datos</li>
            </ul>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-200">
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
              📋 Ver objeto completo
            </summary>
            <pre className="mt-2 bg-gray-100 p-2 rounded overflow-auto max-h-40 text-xs">
              {JSON.stringify(orgData, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDebugPanel;
