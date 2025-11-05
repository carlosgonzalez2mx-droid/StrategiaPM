// src/components/subscription/TrialStatusBanner.js
import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, XCircle } from 'lucide-react';
import supabaseService from '../../services/SupabaseService';
import subscriptionService from '../../services/SubscriptionService';

/**
 * Banner que muestra el estado del trial y días restantes
 * Se muestra solo si la organización está en periodo de prueba
 */
const TrialStatusBanner = ({ organizationId, onUpgradeClick }) => {
  const [trialStatus, setTrialStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (organizationId) {
      loadTrialStatus();
    }
  }, [organizationId]);

  const loadTrialStatus = async () => {
    try {
      setLoading(true);

      // Obtener información de suscripción
      const subscription = await subscriptionService.getOrganizationSubscription(organizationId);

      // Mostrar banner solo si está en trial O si el trial expiró
      if (!subscription || (!subscription.isTrialing && !subscription.isExpired)) {
        setTrialStatus(null);
        setLoading(false);
        return;
      }

      // Preparar datos del trial
      const daysRemaining = subscription.daysUntilTrialEnd || 0;
      let status = 'active';

      // Si el subscription_status es 'expired', usar ese estado directamente
      if (subscription.subscription_status === 'expired' || subscription.isExpired) {
        status = 'expired';
      } else if (daysRemaining === 0) {
        status = 'expires_today';
      } else if (daysRemaining < 0) {
        status = 'expired';
      } else if (daysRemaining <= 3) {
        status = 'expiring_soon';
      }

      setTrialStatus({
        status,
        daysRemaining: Math.max(daysRemaining, 0),
        plan: subscription.subscription_plan,
        trialEndsAt: subscription.trial_ends_at
      });

    } catch (error) {
      console.error('Error cargando estado del trial:', error);
      setTrialStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Guardar en sessionStorage (se borra al cerrar el navegador)
    // NO usar localStorage para que reaparezca en cada sesión
    sessionStorage.setItem(`trial-banner-dismissed-${organizationId}`, 'true');
  };

  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    }
  };

  // No mostrar si está cargando, no hay trial, o fue dismissed
  if (loading || !trialStatus || dismissed) {
    return null;
  }

  // Verificar si fue dismissed en esta sesión (sessionStorage se borra al cerrar navegador)
  if (sessionStorage.getItem(`trial-banner-dismissed-${organizationId}`) === 'true') {
    return null;
  }

  // Configuración de estilos según el estado
  const statusConfig = {
    active: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-500',
      icon: Clock,
      message: (days) => `Tu periodo de prueba termina en ${days} ${days === 1 ? 'día' : 'días'}.`
    },
    expiring_soon: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-900',
      iconColor: 'text-yellow-600',
      icon: AlertCircle,
      message: (days) => days > 0
        ? `⚠️ Tu periodo de prueba termina en ${days} ${days === 1 ? 'día' : 'días'}!`
        : '⚠️ Tu periodo de prueba termina hoy!'
    },
    expires_today: {
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-900',
      iconColor: 'text-orange-600',
      icon: AlertCircle,
      message: () => '⏰ ¡Tu periodo de prueba termina HOY!'
    },
    expired: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-900',
      iconColor: 'text-red-600',
      icon: XCircle,
      message: () => '❌ Tu periodo de prueba ha expirado. Actualiza tu plan para continuar con acceso completo.'
    }
  };

  const config = statusConfig[trialStatus.status] || statusConfig.active;
  const Icon = config.icon;

  return (
    <div className={`
      ${config.bgColor} ${config.borderColor} ${config.textColor}
      border-l-4 px-6 py-4 mb-6 rounded-r-lg shadow-sm
      animate-fade-in
    `}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {/* Icono */}
          <Icon className={`${config.iconColor} w-6 h-6 mt-0.5 flex-shrink-0`} />

          {/* Contenido */}
          <div className="flex-1">
            <p className="font-semibold text-base mb-1">
              {config.message(trialStatus.daysRemaining)}
            </p>

            <p className="text-sm opacity-90 mb-3">
              {trialStatus.status === 'expired'
                ? 'Actualiza ahora para recuperar acceso a todas las funcionalidades.'
                : 'Actualiza ahora para continuar disfrutando de proyectos y usuarios ilimitados.'
              }
            </p>

            {/* Botones de acción */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleUpgrade}
                className={`
                  px-4 py-2 rounded-lg font-semibold text-sm
                  transition-all duration-200 shadow-sm
                  ${trialStatus.status === 'expired'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : trialStatus.status === 'expires_today' || trialStatus.status === 'expiring_soon'
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }
                  hover:shadow-md active:scale-95
                `}
              >
                {trialStatus.status === 'expired' ? 'Actualizar Ahora' : 'Ver Planes'}
              </button>

              {trialStatus.status !== 'expired' && (
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-sm font-medium opacity-75 hover:opacity-100 transition-opacity"
                >
                  Recordar más tarde
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Botón cerrar (solo si no ha expirado) */}
        {trialStatus.status !== 'expired' && (
          <button
            onClick={handleDismiss}
            className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Barra de progreso (solo para trials activos) */}
      {(trialStatus.status === 'active' || trialStatus.status === 'expiring_soon') && (
        <div className="mt-4">
          <div className="w-full bg-white/50 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                trialStatus.status === 'expiring_soon'
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}
              style={{
                width: `${Math.max(10, (trialStatus.daysRemaining / 14) * 100)}%`
              }}
            ></div>
          </div>
          <p className="text-xs mt-1 opacity-75">
            {trialStatus.daysRemaining} de 14 días restantes
          </p>
        </div>
      )}
    </div>
  );
};

export default TrialStatusBanner;
