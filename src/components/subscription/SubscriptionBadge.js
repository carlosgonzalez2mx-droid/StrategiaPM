// src/components/subscription/SubscriptionBadge.js
import React from 'react';
import { Crown, Zap, Rocket, Shield } from 'lucide-react';

/**
 * Componente para mostrar el badge del plan de suscripción
 *
 * @param {Object} props
 * @param {string} props.plan - Plan de suscripción (legacy, free, professional, enterprise)
 * @param {string} props.status - Estado de suscripción (active, trialing, past_due, canceled, expired)
 * @param {string} props.size - Tamaño del badge (sm, md, lg)
 * @param {boolean} props.showIcon - Mostrar icono del plan
 * @param {boolean} props.showStatus - Mostrar estado debajo del plan
 */
const SubscriptionBadge = ({
  plan = 'free',
  status = 'active',
  size = 'md',
  showIcon = true,
  showStatus = false,
  className = ''
}) => {

  // Configuración de planes
  const planConfig = {
    legacy: {
      label: 'Legacy',
      icon: Shield,
      bgColor: 'bg-gradient-to-r from-purple-600 to-indigo-600',
      textColor: 'text-white',
      description: 'Plan exclusivo sin límites'
    },
    free: {
      label: 'Free',
      icon: Zap,
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      description: '1 proyecto, 3 usuarios'
    },
    professional: {
      label: 'Professional',
      icon: Rocket,
      bgColor: 'bg-gradient-to-r from-blue-600 to-cyan-600',
      textColor: 'text-white',
      description: 'Proyectos ilimitados'
    }
  };

  // Configuración de estados
  const statusConfig = {
    active: {
      label: 'Activo',
      color: 'text-green-600',
      dotColor: 'bg-green-600'
    },
    trialing: {
      label: 'Periodo de prueba',
      color: 'text-blue-600',
      dotColor: 'bg-blue-600'
    },
    past_due: {
      label: 'Pago pendiente',
      color: 'text-yellow-600',
      dotColor: 'bg-yellow-600'
    },
    canceled: {
      label: 'Cancelado',
      color: 'text-red-600',
      dotColor: 'bg-red-600'
    },
    expired: {
      label: 'Expirado',
      color: 'text-gray-600',
      dotColor: 'bg-gray-600'
    }
  };

  // Tamaños
  const sizes = {
    sm: {
      container: 'px-2 py-1 text-xs',
      icon: 'w-3 h-3',
      gap: 'gap-1'
    },
    md: {
      container: 'px-3 py-1.5 text-sm',
      icon: 'w-4 h-4',
      gap: 'gap-1.5'
    },
    lg: {
      container: 'px-4 py-2 text-base',
      icon: 'w-5 h-5',
      gap: 'gap-2'
    }
  };

  const config = planConfig[plan] || planConfig.free;
  const statusConf = statusConfig[status] || statusConfig.active;
  const sizeConf = sizes[size] || sizes.md;
  const Icon = config.icon;

  return (
    <div className={`inline-flex flex-col ${className}`}>
      {/* Badge principal */}
      <div
        className={`
          inline-flex items-center ${sizeConf.gap}
          ${config.bgColor} ${config.textColor}
          ${sizeConf.container}
          rounded-full font-semibold shadow-sm
        `}
        title={config.description}
      >
        {showIcon && <Icon className={sizeConf.icon} />}
        <span>{config.label}</span>
      </div>

      {/* Estado (opcional) */}
      {showStatus && (
        <div className={`flex items-center ${sizeConf.gap} mt-1 text-xs ${statusConf.color}`}>
          <span className={`w-2 h-2 rounded-full ${statusConf.dotColor}`}></span>
          <span>{statusConf.label}</span>
        </div>
      )}
    </div>
  );
};

export default SubscriptionBadge;
