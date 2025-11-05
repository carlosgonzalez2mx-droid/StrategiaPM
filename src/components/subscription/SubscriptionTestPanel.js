import React, { useState, useEffect } from 'react';
import subscriptionService from '../../services/SubscriptionService';
import supabaseService from '../../services/SupabaseService';

/**
 * Panel de prueba para el sistema de suscripciones
 * Solo visible en desarrollo para probar límites
 */
const SubscriptionTestPanel = () => {
  const [organizationId, setOrganizationId] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Obtener organizationId desde SupabaseService con polling
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20; // 20 intentos = 10 segundos máximo
    let pollingInterval;

    const fetchOrganizationId = () => {
      attempts++;
      console.log(`🔄 Intento ${attempts}/${maxAttempts} - Buscando organization ID...`);

      try {
        // Método 1: Obtener directamente desde SupabaseService
        let orgId = supabaseService.getCurrentOrganization();

        if (orgId) {
          setOrganizationId(orgId);
          console.log('✅ Organization ID obtenido desde SupabaseService:', orgId);
          setInitialLoading(false);
          if (pollingInterval) clearInterval(pollingInterval);
          return true;
        }

        // Método 2: Intentar obtener del localStorage (fallback)
        const portfolioData = localStorage.getItem('strategiapm_portfolio_data');
        if (portfolioData) {
          const portfolio = JSON.parse(portfolioData);
          orgId = portfolio?.organization?.id;

          if (orgId) {
            setOrganizationId(orgId);
            console.log('✅ Organization ID encontrado en portfolio localStorage:', orgId);
            setInitialLoading(false);
            if (pollingInterval) clearInterval(pollingInterval);
            return true;
          }
        }

        // Método 3: Buscar en proyectos
        const projectsData = localStorage.getItem('strategiapm_projects');
        if (projectsData) {
          const projects = JSON.parse(projectsData);
          if (projects && projects.length > 0 && projects[0].organization_id) {
            setOrganizationId(projects[0].organization_id);
            console.log('✅ Organization ID encontrado en proyectos:', projects[0].organization_id);
            setInitialLoading(false);
            if (pollingInterval) clearInterval(pollingInterval);
            return true;
          }
        }

        // Si alcanzamos el máximo de intentos, dejar de buscar
        if (attempts >= maxAttempts) {
          console.warn('⚠️ No se encontró organization ID después de todos los intentos');
          setInitialLoading(false);
          if (pollingInterval) clearInterval(pollingInterval);
          return true;
        }

        return false;
      } catch (error) {
        console.error('Error obteniendo organizationId:', error);
        if (attempts >= maxAttempts) {
          setInitialLoading(false);
          if (pollingInterval) clearInterval(pollingInterval);
        }
        return false;
      }
    };

    // Primer intento inmediato
    const found = fetchOrganizationId();

    // Si no se encuentra, iniciar polling cada 500ms
    if (!found) {
      pollingInterval = setInterval(() => {
        fetchOrganizationId();
      }, 500);
    }

    // Cleanup
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, []);

  // Cargar datos de suscripción
  useEffect(() => {
    if (organizationId) {
      loadSubscriptionData();
    }
  }, [organizationId]);

  const loadSubscriptionData = async () => {
    if (!organizationId) return;

    setLoading(true);
    try {
      const [subscription, stats] = await Promise.all([
        subscriptionService.getOrganizationSubscription(organizationId),
        subscriptionService.getUsageStats(organizationId)
      ]);

      setCurrentSubscription(subscription);
      setUsageStats(stats);
    } catch (error) {
      console.error('Error cargando datos de suscripción:', error);
      setMessage('Error cargando datos de suscripción');
    } finally {
      setLoading(false);
    }
  };

  const changePlan = async (newPlan) => {
    if (!organizationId) {
      setMessage('❌ No se encontró organization ID');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await subscriptionService.changePlan(organizationId, newPlan);

      if (result.success) {
        setMessage(`✅ Plan cambiado exitosamente a "${subscriptionService.PLANS[newPlan].name}"`);
        await loadSubscriptionData();

        // Recargar la página después de 2 segundos para reflejar cambios
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage(`❌ Error cambiando plan: ${result.error?.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error cambiando plan:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Debug: Log del estado actual
  console.log('🔍 SubscriptionTestPanel render:', {
    initialLoading,
    organizationId,
    hasOrgId: !!organizationId
  });

  // Mostrar loading inicial mientras se busca organization ID
  if (initialLoading) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900 mb-3"></div>
            <p className="text-sm text-purple-700">Cargando panel de pruebas...</p>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar error solo después de que la carga inicial haya terminado
  if (!organizationId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Panel de Prueba no Disponible</h4>
        <p className="text-yellow-800 text-sm mb-2">
          No se encontró organization ID. Para usar este panel necesitas:
        </p>
        <ol className="text-yellow-800 text-sm list-decimal list-inside space-y-1">
          <li>Tener tu proyecto conectado a Supabase</li>
          <li>Haber creado una organización en Supabase</li>
          <li>Tener al menos un proyecto asociado a una organización</li>
        </ol>
        <p className="text-yellow-700 text-xs mt-3">
          💡 Puedes probar el sistema manualmente: configura tu organization en Supabase con plan "free" y límite max_projects = 1
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-purple-900 flex items-center">
          <span className="text-2xl mr-2">🧪</span>
          Panel de Prueba de Suscripciones
        </h3>
        <button
          onClick={loadSubscriptionData}
          disabled={loading}
          className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:bg-gray-400"
        >
          🔄 Recargar
        </button>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-900"></div>
          <p className="text-sm text-purple-700 mt-2">Cargando...</p>
        </div>
      )}

      {!loading && currentSubscription && (
        <>
          {/* Estado Actual */}
          <div className="bg-white rounded-lg p-4 mb-4 shadow">
            <h4 className="font-semibold text-gray-800 mb-3">📊 Estado Actual</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Plan:</span>
                <p className="font-bold text-purple-600">
                  {currentSubscription.planConfig?.name || 'No definido'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Estado:</span>
                <p className="font-bold text-green-600">
                  {currentSubscription.subscription_status || 'active'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Proyectos:</span>
                <p className="font-bold text-blue-600">
                  {usageStats?.projects.current || 0} / {usageStats?.projects.max || '∞'}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Usuarios:</span>
                <p className="font-bold text-blue-600">
                  {usageStats?.users.current || 0} / {usageStats?.users.max || '∞'}
                </p>
              </div>
            </div>
          </div>

          {/* Cambiar Plan */}
          <div className="bg-white rounded-lg p-4 shadow">
            <h4 className="font-semibold text-gray-800 mb-3">🔄 Cambiar Plan para Probar</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => changePlan('free')}
                disabled={loading || currentSubscription.subscription_plan === 'free'}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  currentSubscription.subscription_plan === 'free'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="font-bold text-sm">Free</div>
                <div className="text-xs text-gray-600">1 proyecto, 3 usuarios</div>
                {currentSubscription.subscription_plan === 'free' && (
                  <div className="text-xs text-green-600 font-semibold mt-1">✓ Activo</div>
                )}
              </button>

              <button
                onClick={() => changePlan('professional')}
                disabled={loading || currentSubscription.subscription_plan === 'professional'}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  currentSubscription.subscription_plan === 'professional'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="font-bold text-sm">Professional</div>
                <div className="text-xs text-gray-600">Ilimitado</div>
                {currentSubscription.subscription_plan === 'professional' && (
                  <div className="text-xs text-green-600 font-semibold mt-1">✓ Activo</div>
                )}
              </button>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Cómo Probar</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Cambia el plan a "Free" (límite de 1 proyecto)</li>
              <li>Asegúrate de tener 1 proyecto ya creado</li>
              <li>Intenta crear un segundo proyecto</li>
              <li>Deberías ver el modal de upgrade ⚠️</li>
              <li>Cambia de vuelta a "Professional" para continuar normalmente</li>
            </ol>
          </div>

          {/* Mensaje de estado */}
          {message && (
            <div className={`mt-4 p-3 rounded-lg ${
              message.startsWith('✅')
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SubscriptionTestPanel;
