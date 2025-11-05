// src/services/SubscriptionService.js
import supabaseService from './SupabaseService';

/**
 * Servicio para gestión de suscripciones y planes
 */
class SubscriptionService {

  // Definición de planes y límites
  static PLANS = {
    legacy: {
      name: 'Legacy',
      price: 0,
      maxProjects: null, // Ilimitado
      maxUsers: null,    // Ilimitado
      features: [
        'Proyectos ilimitados',
        'Usuarios ilimitados',
        'Todas las características',
        'Sin fecha de expiración',
        'Soporte prioritario'
      ],
      hidden: true // No se muestra en pricing
    },
    free: {
      name: 'Free',
      price: 0,
      maxProjects: 1,
      maxUsers: 3,
      trialDays: 14,
      features: [
        '1 proyecto',
        'Hasta 3 usuarios',
        'Gestión de cronogramas',
        'Gestión de riesgos básica',
        'Soporte por email'
      ]
    },
    professional: {
      name: 'Professional',
      price: 39, // USD/mes
      maxProjects: null, // Ilimitado
      maxUsers: null,    // Ilimitado
      trialDays: 14,
      features: [
        'Proyectos ilimitados',
        'Usuarios ilimitados',
        'Todas las características',
        'Gestión de valor de negocio (PMBOK 7)',
        'Análisis CPM y EVM',
        'Gestión financiera completa',
        'Soporte prioritario',
        'Actualizaciones tempranas'
      ],
      popular: true
    }
  };

  /**
   * Obtener información del plan de una organización
   */
  async getOrganizationSubscription(organizationId) {
    try {
      const { data, error } = await supabaseService.supabase
        .from('organizations')
        .select(`
          subscription_plan,
          subscription_status,
          subscription_start_date,
          subscription_end_date,
          trial_ends_at,
          max_projects,
          max_users,
          stripe_customer_id,
          stripe_subscription_id
        `)
        .eq('id', organizationId)
        .single();

      if (error) throw error;

      const plan = data.subscription_plan || 'free';
      const planConfig = SubscriptionService.PLANS[plan];

      return {
        ...data,
        planConfig,
        isActive: data.subscription_status === 'active' || data.subscription_status === 'trialing',
        isTrialing: data.subscription_status === 'trialing',
        isExpired: data.subscription_status === 'expired',
        daysUntilExpiration: this._calculateDaysUntilExpiration(data.subscription_end_date),
        daysUntilTrialEnd: this._calculateDaysUntilExpiration(data.trial_ends_at),
        trialExpiresAt: data.trial_ends_at
      };
    } catch (error) {
      console.error('Error obteniendo suscripción:', error);
      return null;
    }
  }

  /**
   * Verificar si una organización puede crear más proyectos
   * También verifica si la organización está sobre el límite (modo read-only)
   */
  async canCreateProject(organizationId) {
    try {
      // Primero verificar si ya están sobre el límite (modo read-only)
      const overLimitCheck = await this.isOverLimit(organizationId);
      if (overLimitCheck.isOverLimit) {
        const projectDetail = overLimitCheck.details.find(d => d.resource === 'projects');
        return {
          allowed: false,
          reason: 'over_limit',
          message: projectDetail
            ? projectDetail.message
            : 'Tu organización ha excedido los límites del plan actual.',
          suggestion: 'Elimina proyectos existentes o actualiza tu plan para continuar.',
          isReadOnlyMode: true
        };
      }

      const subscription = await this.getOrganizationSubscription(organizationId);

      // Plan legacy o sin límites
      if (!subscription || subscription.subscription_plan === 'legacy' || subscription.max_projects === null) {
        return { allowed: true };
      }

      // Contar proyectos actuales
      const { count, error } = await supabaseService.supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (error) throw error;

      const currentProjects = count || 0;
      const maxProjects = subscription.max_projects;

      if (currentProjects >= maxProjects) {
        return {
          allowed: false,
          reason: 'limit_reached',
          message: `Has alcanzado el límite de ${maxProjects} proyecto(s) de tu plan ${subscription.planConfig.name}.`,
          currentCount: currentProjects,
          maxCount: maxProjects,
          suggestion: 'Actualiza a un plan superior para crear más proyectos.'
        };
      }

      return {
        allowed: true,
        currentCount: currentProjects,
        maxCount: maxProjects,
        remaining: maxProjects - currentProjects
      };
    } catch (error) {
      console.error('Error verificando límite de proyectos:', error);
      return { allowed: true }; // En caso de error, permitir (fail-safe)
    }
  }

  /**
   * Verificar si una organización puede agregar más usuarios
   * También verifica si la organización está sobre el límite (modo read-only)
   */
  async canAddUser(organizationId) {
    try {
      // Primero verificar si ya están sobre el límite (modo read-only)
      const overLimitCheck = await this.isOverLimit(organizationId);
      if (overLimitCheck.isOverLimit) {
        const userDetail = overLimitCheck.details.find(d => d.resource === 'users');
        return {
          allowed: false,
          reason: 'over_limit',
          message: userDetail
            ? userDetail.message
            : 'Tu organización ha excedido los límites del plan actual.',
          suggestion: 'Elimina usuarios existentes o actualiza tu plan para continuar.',
          isReadOnlyMode: true
        };
      }

      const subscription = await this.getOrganizationSubscription(organizationId);

      // Plan legacy o sin límites
      if (!subscription || subscription.subscription_plan === 'legacy' || subscription.max_users === null) {
        return { allowed: true };
      }

      // Contar usuarios activos actuales
      const { count, error } = await supabaseService.supabase
        .from('organization_members')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (error) throw error;

      const currentUsers = count || 0;
      const maxUsers = subscription.max_users;

      if (currentUsers >= maxUsers) {
        return {
          allowed: false,
          reason: 'limit_reached',
          message: `Has alcanzado el límite de ${maxUsers} usuario(s) de tu plan ${subscription.planConfig.name}.`,
          currentCount: currentUsers,
          maxCount: maxUsers,
          suggestion: 'Actualiza a un plan superior para agregar más usuarios.'
        };
      }

      return {
        allowed: true,
        currentCount: currentUsers,
        maxCount: maxUsers,
        remaining: maxUsers - currentUsers
      };
    } catch (error) {
      console.error('Error verificando límite de usuarios:', error);
      return { allowed: true }; // En caso de error, permitir (fail-safe)
    }
  }

  /**
   * Iniciar periodo de prueba para una nueva organización
   */
  async startTrial(organizationId, plan = 'professional') {
    try {
      const planConfig = SubscriptionService.PLANS[plan];
      if (!planConfig || !planConfig.trialDays) {
        throw new Error('Plan no válido para periodo de prueba');
      }

      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + (planConfig.trialDays * 24 * 60 * 60 * 1000));

      const { data, error } = await supabaseService.supabase
        .from('organizations')
        .update({
          subscription_plan: plan,
          subscription_status: 'trialing',
          subscription_start_date: now.toISOString(),
          trial_ends_at: trialEndsAt.toISOString(),
          max_projects: planConfig.maxProjects,
          max_users: planConfig.maxUsers,
          updated_at: now.toISOString()
        })
        .eq('id', organizationId)
        .select()
        .single();

      if (error) throw error;

      // Registrar en historial
      await this._logSubscriptionChange(organizationId, 'trial_started', null, plan);

      return { success: true, data, trialEndsAt };
    } catch (error) {
      console.error('Error iniciando periodo de prueba:', error);
      return { success: false, error };
    }
  }

  /**
   * Cambiar plan de suscripción
   */
  async changePlan(organizationId, newPlan, userId) {
    try {
      const planConfig = SubscriptionService.PLANS[newPlan];
      if (!planConfig) {
        throw new Error('Plan no válido');
      }

      // Obtener plan actual
      const currentSubscription = await this.getOrganizationSubscription(organizationId);
      const oldPlan = currentSubscription?.subscription_plan;

      const now = new Date();
      const updates = {
        subscription_plan: newPlan,
        subscription_status: 'active',
        max_projects: planConfig.maxProjects,
        max_users: planConfig.maxUsers,
        updated_at: now.toISOString()
      };

      // Si es cambio a free, poner fecha de inicio pero no de fin
      if (newPlan === 'free') {
        updates.subscription_start_date = now.toISOString();
        updates.subscription_end_date = null;
      }

      const { data, error } = await supabaseService.supabase
        .from('organizations')
        .update(updates)
        .eq('id', organizationId)
        .select()
        .single();

      if (error) throw error;

      // Registrar en historial
      const eventType = this._getChangeEventType(oldPlan, newPlan);
      await this._logSubscriptionChange(organizationId, eventType, oldPlan, newPlan, userId);

      return { success: true, data };
    } catch (error) {
      console.error('Error cambiando plan:', error);
      return { success: false, error };
    }
  }

  /**
   * Obtener uso actual de recursos
   */
  async getUsageStats(organizationId) {
    try {
      const [subscription, projectsCount, usersCount] = await Promise.all([
        this.getOrganizationSubscription(organizationId),
        supabaseService.supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId),
        supabaseService.supabase
          .from('organization_members')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'active')
      ]);

      const currentProjects = projectsCount.count || 0;
      const currentUsers = usersCount.count || 0;
      const maxProjects = subscription?.max_projects;
      const maxUsers = subscription?.max_users;

      return {
        subscription,
        projects: {
          current: currentProjects,
          max: maxProjects,
          unlimited: maxProjects === null,
          percentage: maxProjects ? Math.round((currentProjects / maxProjects) * 100) : 0,
          remaining: maxProjects ? Math.max(0, maxProjects - currentProjects) : null
        },
        users: {
          current: currentUsers,
          max: maxUsers,
          unlimited: maxUsers === null,
          percentage: maxUsers ? Math.round((currentUsers / maxUsers) * 100) : 0,
          remaining: maxUsers ? Math.max(0, maxUsers - currentUsers) : null
        }
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de uso:', error);
      return null;
    }
  }

  /**
   * Verificar si la organización ha excedido los límites de su plan
   * Retorna información detallada sobre qué límites se han excedido
   */
  async isOverLimit(organizationId) {
    try {
      console.log('[isOverLimit] Verificando límites para org:', organizationId);
      const usage = await this.getUsageStats(organizationId);
      console.log('[isOverLimit] Usage stats:', usage);

      if (!usage || !usage.subscription) {
        console.log('[isOverLimit] No hay usage o subscription');
        return {
          isOverLimit: false,
          details: []
        };
      }

      const { subscription, projects, users } = usage;
      const details = [];
      let isOverLimit = false;

      console.log('[isOverLimit] Proyectos:', projects.current, '/', projects.max);
      console.log('[isOverLimit] Usuarios:', users.current, '/', users.max);

      // Verificar límite de proyectos
      if (projects.max !== null && projects.current > projects.max) {
        isOverLimit = true;
        console.log('[isOverLimit] ⚠️ LÍMITE DE PROYECTOS EXCEDIDO');
        details.push({
          resource: 'projects',
          current: projects.current,
          max: projects.max,
          exceeded: projects.current - projects.max,
          message: `Tienes ${projects.current} proyecto(s) pero tu plan ${subscription.planConfig.name} solo permite ${projects.max}.`
        });
      }

      // Verificar límite de usuarios
      if (users.max !== null && users.current > users.max) {
        isOverLimit = true;
        console.log('[isOverLimit] ⚠️ LÍMITE DE USUARIOS EXCEDIDO');
        details.push({
          resource: 'users',
          current: users.current,
          max: users.max,
          exceeded: users.current - users.max,
          message: `Tienes ${users.current} usuario(s) pero tu plan ${subscription.planConfig.name} solo permite ${users.max}.`
        });
      }

      console.log('[isOverLimit] Resultado final - isOverLimit:', isOverLimit, 'details:', details);

      return {
        isOverLimit,
        details,
        subscription: subscription.subscription_plan,
        usage
      };
    } catch (error) {
      console.error('[isOverLimit] Error verificando límites excedidos:', error);
      return { isOverLimit: false, details: [] };
    }
  }

  /**
   * Verificar si se pueden realizar operaciones de edición/creación
   * Retorna false si la organización está en modo read-only por exceder límites
   */
  async canEdit(organizationId) {
    try {
      const overLimitCheck = await this.isOverLimit(organizationId);

      if (overLimitCheck.isOverLimit) {
        return {
          allowed: false,
          reason: 'over_limit',
          message: 'Tu cuenta está en modo de solo lectura porque has excedido los límites de tu plan.',
          details: overLimitCheck.details,
          suggestion: 'Elimina recursos existentes o actualiza tu plan para continuar editando.',
          isReadOnlyMode: true
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error verificando permisos de edición:', error);
      return { allowed: true }; // En caso de error, permitir (fail-safe)
    }
  }

  // ===== Métodos privados =====

  _calculateDaysUntilExpiration(dateString) {
    if (!dateString) return null;

    const expirationDate = new Date(dateString);
    const now = new Date();
    const diffTime = expirationDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  }

  _getChangeEventType(oldPlan, newPlan) {
    const planOrder = ['free', 'professional'];
    const oldIndex = planOrder.indexOf(oldPlan);
    const newIndex = planOrder.indexOf(newPlan);

    if (newIndex > oldIndex) return 'upgraded';
    if (newIndex < oldIndex) return 'downgraded';
    return 'changed';
  }

  async _logSubscriptionChange(organizationId, eventType, fromPlan, toPlan, userId = null) {
    try {
      await supabaseService.supabase
        .from('subscription_history')
        .insert({
          organization_id: organizationId,
          event_type: eventType,
          from_plan: fromPlan,
          to_plan: toPlan,
          changed_by: userId,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error registrando cambio de suscripción:', error);
    }
  }

  /**
   * Verificar y expirar trials vencidos manualmente
   * (Normalmente se hace automáticamente en el backend)
   */
  async checkAndExpireTrials(organizationId) {
    try {
      const subscription = await this.getOrganizationSubscription(organizationId);

      if (!subscription || !subscription.isTrialing) {
        return { expired: false };
      }

      // Si el trial ya expiró
      if (subscription.daysUntilTrialEnd <= 0) {
        // Actualizar estado a expired
        const { error } = await supabaseService.supabase
          .from('organizations')
          .update({
            subscription_status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', organizationId);

        if (error) throw error;

        return { expired: true, daysOverdue: Math.abs(subscription.daysUntilTrialEnd) };
      }

      return { expired: false, daysRemaining: subscription.daysUntilTrialEnd };
    } catch (error) {
      console.error('Error verificando expiración de trial:', error);
      return { expired: false, error };
    }
  }
}

const subscriptionService = new SubscriptionService();

export default subscriptionService;
