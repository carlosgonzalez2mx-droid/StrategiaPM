import React, { useState, useEffect } from 'react';
import subscriptionService from '../../services/SubscriptionService';
import SubscriptionBadge from './SubscriptionBadge';
import './UsageIndicator.css';

const UsageIndicator = ({ organizationId, variant = 'full' }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState(null);

  useEffect(() => {
    const loadUsageStats = async () => {
      if (!organizationId) {
        setLoading(false);
        return;
      }

      try {
        // Obtener estadísticas de uso
        const usageStats = await subscriptionService.getUsageStats(organizationId);
        setStats(usageStats);

        // Obtener datos de la organización desde localStorage
        const portfolioData = localStorage.getItem('strategiapm_portfolio_data');
        if (portfolioData) {
          const portfolio = JSON.parse(portfolioData);
          setOrganization(portfolio?.organization);
        }
      } catch (error) {
        console.error('Error cargando estadísticas de uso:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsageStats();
  }, [organizationId]);

  if (loading) {
    return (
      <div className="usage-indicator usage-indicator-loading">
        <div className="usage-spinner"></div>
      </div>
    );
  }

  if (!stats || !organization) {
    return null;
  }

  const plan = organization.subscriptionPlan || 'free';
  const status = organization.subscriptionStatus || 'active';

  // Extraer datos de uso (el servicio retorna un objeto con projects y users)
  const currentProjects = stats.projects?.current || 0;
  const maxProjects = stats.projects?.max;
  const currentUsers = stats.users?.current || 0;
  const maxUsers = stats.users?.max;

  // Calcular porcentajes de uso
  const projectUsagePercent = maxProjects === null ? 0 : (currentProjects / maxProjects) * 100;
  const userUsagePercent = maxUsers === null ? 0 : (currentUsers / maxUsers) * 100;

  // Determinar color basado en porcentaje
  const getUsageColor = (percent) => {
    if (percent >= 90) return 'usage-danger';
    if (percent >= 70) return 'usage-warning';
    return 'usage-safe';
  };

  // Variante compacta (solo números)
  if (variant === 'compact') {
    return (
      <div className="usage-indicator usage-indicator-compact">
        <SubscriptionBadge plan={plan} status={status} size="sm" showIcon={false} />
        <div className="usage-stats-compact">
          <span className={`usage-stat ${getUsageColor(projectUsagePercent)}`}>
            📊 {currentProjects}{maxProjects !== null ? `/${maxProjects}` : ''}
          </span>
          <span className={`usage-stat ${getUsageColor(userUsagePercent)}`}>
            👥 {currentUsers}{maxUsers !== null ? `/${maxUsers}` : ''}
          </span>
        </div>
      </div>
    );
  }

  // Variante completa (con barras de progreso)
  return (
    <div className="usage-indicator usage-indicator-full">
      <div className="usage-header">
        <h3 className="usage-title">Uso del Plan</h3>
        <SubscriptionBadge plan={plan} status={status} size="sm" showIcon={true} />
      </div>

      <div className="usage-items">
        {/* Proyectos */}
        <div className="usage-item">
          <div className="usage-item-header">
            <span className="usage-item-label">
              <span className="usage-item-icon">📊</span>
              Proyectos
            </span>
            <span className="usage-item-count">
              {currentProjects}
              {maxProjects !== null && (
                <span className="usage-item-limit"> / {maxProjects}</span>
              )}
              {maxProjects === null && (
                <span className="usage-item-unlimited"> / ilimitados</span>
              )}
            </span>
          </div>
          {maxProjects !== null && (
            <div className="usage-progress-bar">
              <div
                className={`usage-progress-fill ${getUsageColor(projectUsagePercent)}`}
                style={{ width: `${Math.min(projectUsagePercent, 100)}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Usuarios */}
        <div className="usage-item">
          <div className="usage-item-header">
            <span className="usage-item-label">
              <span className="usage-item-icon">👥</span>
              Usuarios
            </span>
            <span className="usage-item-count">
              {currentUsers}
              {maxUsers !== null && (
                <span className="usage-item-limit"> / {maxUsers}</span>
              )}
              {maxUsers === null && (
                <span className="usage-item-unlimited"> / ilimitados</span>
              )}
            </span>
          </div>
          {maxUsers !== null && (
            <div className="usage-progress-bar">
              <div
                className={`usage-progress-fill ${getUsageColor(userUsagePercent)}`}
                style={{ width: `${Math.min(userUsagePercent, 100)}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>

      {/* Mensaje de advertencia si está cerca del límite */}
      {(projectUsagePercent >= 80 || userUsagePercent >= 80) && plan === 'free' && (
        <div className="usage-warning-message">
          <span className="usage-warning-icon">⚠️</span>
          <span>Te estás acercando al límite de tu plan.</span>
          <button className="usage-upgrade-link" onClick={() => {
            // TODO: Abrir modal de upgrade
            console.log('Abrir modal de upgrade');
          }}>
            Actualizar
          </button>
        </div>
      )}
    </div>
  );
};

export default UsageIndicator;
