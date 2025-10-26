import React, { useState, useEffect } from 'react';
import useAuditLog from '../hooks/useAuditLog';

const SubscriptionManager = ({ 
  currentProject, 
  useSupabase = false,
  onPlanChanged 
}) => {
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [usage, setUsage] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Hook de auditoría
  const { addAuditEvent } = useAuditLog(currentProject?.id, useSupabase);

  // Cargar planes disponibles
  const loadPlans = async () => {
    if (!useSupabase) return;

    try {
      setIsLoading(true);
      const { default: supabaseService } = await import('../services/SupabaseService');
      
      if (supabaseService.isAuthenticated()) {
        const { data: plansData, error: plansError } = await supabaseService.supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('monthly_price', { ascending: true });

        if (plansError) {
          console.error('Error cargando planes:', plansError);
          setError('Error cargando planes de suscripción');
        } else {
          setPlans(plansData || []);
        }
      }
    } catch (error) {
      console.error('Error cargando planes:', error);
      setError('Error cargando planes de suscripción');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar información de la organización actual
  const loadOrganizationInfo = async () => {
    if (!useSupabase || !currentProject?.organization_id) return;

    try {
      setIsLoading(true);
      const { default: supabaseService } = await import('../services/SupabaseService');
      
      if (supabaseService.isAuthenticated()) {
        const { data: orgData, error: orgError } = await supabaseService.supabase
          .from('organizations')
          .select('*')
          .eq('id', currentProject.organization_id)
          .single();

        if (orgError) {
          console.error('Error cargando organización:', orgError);
          setError('Error cargando información de la organización');
        } else {
          setCurrentPlan(orgData);
        }
      }
    } catch (error) {
      console.error('Error cargando organización:', error);
      setError('Error cargando información de la organización');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar uso actual
  const loadUsage = async () => {
    if (!useSupabase || !currentProject?.organization_id) return;

    try {
      const { default: supabaseService } = await import('../services/SupabaseService');
      
      if (supabaseService.isAuthenticated()) {
        const { data: usageData, error: usageError } = await supabaseService.supabase
          .from('usage_tracking')
          .select('*')
          .eq('organization_id', currentProject.organization_id)
          .order('recorded_at', { ascending: false })
          .limit(3);

        if (usageError) {
          console.error('Error cargando uso:', usageError);
        } else {
          // Organizar datos de uso
          const usageMap = {};
          usageData?.forEach(item => {
            usageMap[item.metric_name] = item.metric_value;
          });
          setUsage(usageMap);
        }
      }
    } catch (error) {
      console.error('Error cargando uso:', error);
    }
  };

  // Cambiar plan de suscripción
  const changePlan = async (newPlan) => {
    if (!useSupabase || !currentProject?.organization_id) return;

    try {
      setIsLoading(true);
      setError(null);

      const { default: supabaseService } = await import('../services/SupabaseService');
      
      if (supabaseService.isAuthenticated()) {
        const { error } = await supabaseService.supabase.rpc('change_subscription_plan', {
          org_id: currentProject.organization_id,
          new_plan: newPlan
        });

        if (error) {
          throw error;
        }

        // Registrar evento de auditoría
        if (addAuditEvent) {
          addAuditEvent({
            category: 'subscription',
            action: 'plan-changed',
            description: `Plan de suscripción cambiado a "${newPlan}"`,
            details: {
              oldPlan: currentPlan?.subscription_plan,
              newPlan: newPlan,
              organizationId: currentProject.organization_id
            },
            severity: 'high',
            user: supabaseService.getCurrentUser()?.email || 'Sistema'
          });
        }

        alert(`✅ Plan cambiado exitosamente a ${newPlan}`);
        
        // Recargar información
        await loadOrganizationInfo();
        await loadUsage();
        
        // Notificar al componente padre
        if (onPlanChanged) {
          onPlanChanged(newPlan);
        }
      }
    } catch (error) {
      console.error('Error cambiando plan:', error);
      setError(`Error cambiando plan: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadPlans();
    loadOrganizationInfo();
    loadUsage();
  }, [currentProject?.organization_id, useSupabase]);

  if (!useSupabase) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-yellow-600 text-xl mr-3">⚠️</span>
          <div>
            <h3 className="text-yellow-800 font-medium">Supabase no habilitado</h3>
            <p className="text-yellow-700 text-sm">Para gestionar suscripciones, necesitas habilitar Supabase en la configuración.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentProject?.organization_id) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-red-600 text-xl mr-3">❌</span>
          <div>
            <h3 className="text-red-800 font-medium">Proyecto sin organización</h3>
            <p className="text-red-700 text-sm">Este proyecto no está asociado a una organización. No se puede gestionar suscripciones.</p>
          </div>
        </div>
      </div>
    );
  }

  const getPlanColor = (planName) => {
    switch (planName) {
      case 'free': return 'bg-gray-100 text-gray-800';
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'professional': return 'bg-green-100 text-green-800';
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanLabel = (planName) => {
    switch (planName) {
      case 'free': return 'Gratuito';
      case 'basic': return 'Básico';
      case 'professional': return 'Profesional';
      case 'enterprise': return 'Empresarial';
      default: return planName;
    }
  };

  const formatLimit = (limit) => {
    if (limit === -1) return 'Ilimitado';
    return limit.toString();
  };

  const getUsagePercentage = (current, limit) => {
    if (limit === -1) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestión de Suscripción</h2>
          <p className="text-gray-600">Administra tu plan de suscripción y límites de uso</p>
        </div>
        <button
          onClick={() => setShowUpgradeModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <span>⬆️</span>
          <span>Cambiar Plan</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-600 text-xl mr-3">❌</span>
            <div>
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Plan Actual */}
      {currentPlan && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Plan Actual</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPlanColor(currentPlan.subscription_plan)}`}>
                {getPlanLabel(currentPlan.subscription_plan)}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">${currentPlan.monthly_price}</div>
                <div className="text-sm text-gray-600">por mes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{formatLimit(currentPlan.max_users)}</div>
                <div className="text-sm text-gray-600">usuarios</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{formatLimit(currentPlan.max_projects)}</div>
                <div className="text-sm text-gray-600">proyectos</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Uso Actual */}
      {currentPlan && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Uso Actual</h3>
            
            <div className="space-y-4">
              {/* Usuarios */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Usuarios</span>
                  <span className="text-sm text-gray-600">
                    {usage.users || 0} / {formatLimit(currentPlan.max_users)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(usage.users || 0, currentPlan.max_users))}`}
                    style={{ width: `${getUsagePercentage(usage.users || 0, currentPlan.max_users)}%` }}
                  ></div>
                </div>
              </div>

              {/* Proyectos */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Proyectos</span>
                  <span className="text-sm text-gray-600">
                    {usage.projects || 0} / {formatLimit(currentPlan.max_projects)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(usage.projects || 0, currentPlan.max_projects))}`}
                    style={{ width: `${getUsagePercentage(usage.projects || 0, currentPlan.max_projects)}%` }}
                  ></div>
                </div>
              </div>

              {/* Almacenamiento */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Almacenamiento</span>
                  <span className="text-sm text-gray-600">
                    {usage.storage_gb || 0} GB / {formatLimit(currentPlan.storage_limit_gb)} GB
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getUsageColor(getUsagePercentage(usage.storage_gb || 0, currentPlan.storage_limit_gb))}`}
                    style={{ width: `${getUsagePercentage(usage.storage_gb || 0, currentPlan.storage_limit_gb)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cambio de Plan */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Cambiar Plan de Suscripción</h2>
                <button 
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans.map((plan) => (
                  <div 
                    key={plan.id} 
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedPlan?.id === plan.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <div className="text-center">
                      <h3 className="font-semibold text-lg mb-2">{getPlanLabel(plan.name)}</h3>
                      <div className="text-3xl font-bold text-blue-600 mb-2">${plan.monthly_price}</div>
                      <div className="text-sm text-gray-600 mb-4">por mes</div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Usuarios:</span>
                          <span className="font-medium">{formatLimit(plan.max_users)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Proyectos:</span>
                          <span className="font-medium">{formatLimit(plan.max_projects)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Almacenamiento:</span>
                          <span className="font-medium">{formatLimit(plan.storage_limit_gb)} GB</span>
                        </div>
                      </div>
                      
                      {plan.features && (
                        <div className="mt-4 text-xs text-gray-600">
                          <div className="font-medium mb-1">Características:</div>
                          <div>Soporte: {plan.features.support}</div>
                          {plan.features.api_access && <div>API Access</div>}
                          {plan.features.custom_branding && <div>Branding Personalizado</div>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => selectedPlan && changePlan(selectedPlan.name)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={isLoading || !selectedPlan}
                >
                  {isLoading ? 'Cambiando...' : 'Cambiar Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManager;
