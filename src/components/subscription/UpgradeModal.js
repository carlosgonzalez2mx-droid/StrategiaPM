import React, { useState } from 'react';
import './UpgradeModal.css';
import subscriptionService from '../../services/SubscriptionService';
import { createClient } from '@supabase/supabase-js';

// Inicializar Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// IMPORTANTE: Este es tu Price ID de Stripe
// Debes reemplazarlo con el real después de crear el producto en Stripe Dashboard
const STRIPE_PRICE_ID = process.env.REACT_APP_STRIPE_PRICE_ID || 'price_XXXXXX';

const UpgradeModal = ({
  isOpen,
  onClose,
  limitType = 'project', // 'project' or 'user'
  currentPlan = 'free',
  currentCount = 0,
  maxCount = 0,
  organizationId = null,
  onUpgradeSuccess = null
}) => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [paymentMode, setPaymentMode] = useState('stripe'); // 'stripe' or 'simulation'

  if (!isOpen) return null;

  const messages = {
    project: {
      title: '¡Alcanzaste el límite de proyectos!',
      current: `Tienes ${currentCount} de ${maxCount} proyectos`,
      benefit: 'Proyectos ilimitados'
    },
    user: {
      title: '¡Alcanzaste el límite de usuarios!',
      current: `Tienes ${currentCount} de ${maxCount} usuarios`,
      benefit: 'Usuarios ilimitados'
    }
  };

  const message = messages[limitType] || messages.project;

  // Función para crear sesión de Stripe Checkout
  const handleStripeCheckout = async () => {
    if (!organizationId) {
      alert('❌ Error: No se pudo identificar la organización. Intenta recargar la página.');
      return;
    }

    if (!supabase) {
      alert('❌ Error: Supabase no está configurado correctamente.');
      return;
    }

    setIsUpgrading(true);

    try {
      // Obtener el usuario actual de Supabase
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || 'noemail@example.com';

      // Obtener información de la organización desde localStorage (con error handling)
      let organizationName = 'Organization';
      try {
        const portfolioData = localStorage.getItem('strategiapm_portfolio_data');
        if (portfolioData) {
          const portfolio = JSON.parse(portfolioData);
          organizationName = portfolio?.organization?.name || organizationName;
        }
      } catch (parseError) {
        console.warn('[UpgradeModal] Error parseando portfolio data:', parseError);
        // Continuar con nombre por defecto
      }

      console.log('[UpgradeModal] Creando sesión de checkout para:', {
        organizationId,
        organizationName,
        userEmail
      });

      // Crear timeout de 30 segundos para evitar modal congelado
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: La solicitud a Stripe tardó demasiado (30s)')), 30000)
      );

      // Llamar a la Edge Function para crear sesión de checkout con timeout
      const { data, error } = await Promise.race([
        supabase.functions.invoke('create-checkout-session', {
          body: {
            organizationId,
            organizationName,
            userEmail,
            priceId: STRIPE_PRICE_ID,
            plan: 'professional'
          }
        }),
        timeoutPromise
      ]);

      if (error) {
        throw new Error(error.message || 'Error al crear sesión de checkout');
      }

      if (!data || !data.url) {
        throw new Error('No se recibió URL de checkout de Stripe');
      }

      console.log('[UpgradeModal] Sesión creada, redirigiendo a Stripe...');

      // Redirigir a Stripe Checkout
      window.location.href = data.url;

    } catch (error) {
      console.error('[UpgradeModal] Error en checkout:', error);
      alert(`❌ Error al procesar el pago: ${error.message}\n\nPor favor intenta de nuevo o contacta con soporte.`);
      setIsUpgrading(false);
    }
  };

  // Función para simulación (desarrollo/testing)
  const handleSimulatedUpgrade = async () => {
    if (!organizationId) {
      alert('❌ Error: No se pudo identificar la organización. Intenta recargar la página.');
      return;
    }

    // Confirmar con el usuario
    const confirmMessage = '⚠️ MODO SIMULACIÓN (Solo para desarrollo)\n\n¿Confirmas que deseas actualizar al Plan Professional?\n\n📊 Beneficios:\n• Proyectos ilimitados\n• Usuarios ilimitados\n• Soporte prioritario\n• Reportes avanzados\n\nNOTA: Esto es una simulación SIN PAGO REAL.\n\n¿Continuar?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsUpgrading(true);

    try {
      // Obtener el usuario actual desde localStorage (con error handling)
      let userId = null;
      try {
        const portfolioData = localStorage.getItem('strategiapm_portfolio_data');
        if (portfolioData) {
          const portfolio = JSON.parse(portfolioData);
          userId = portfolio?.user?.id;
        }
      } catch (parseError) {
        console.warn('[UpgradeModal] Error parseando portfolio data en simulación:', parseError);
        // Continuar sin userId
      }

      // Cambiar plan usando el servicio
      const result = await subscriptionService.changePlan(organizationId, 'professional', userId);

      if (result.success) {
        alert('✅ ¡Plan actualizado exitosamente a Professional!\n\nBeneficios activados:\n• Proyectos ilimitados ✓\n• Usuarios ilimitados ✓\n• Soporte prioritario ✓\n\n🔄 Recarga la página para ver los cambios reflejados.');

        // Llamar callback si existe
        if (onUpgradeSuccess) {
          onUpgradeSuccess();
        }

        // Cerrar modal
        onClose();

        // Recargar la página después de 2 segundos
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error actualizando plan:', error);
      alert(`❌ Error al actualizar el plan: ${error.message}\n\nPor favor intenta de nuevo o contacta con soporte.`);
    } finally {
      setIsUpgrading(false);
    }
  };

  // Función principal que decide qué método usar
  const handleUpgrade = () => {
    if (paymentMode === 'stripe') {
      handleStripeCheckout();
    } else {
      handleSimulatedUpgrade();
    }
  };

  return (
    <div className="upgrade-modal-overlay" onClick={onClose}>
      <div className="upgrade-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="upgrade-modal-close" onClick={onClose}>×</button>

        <div className="upgrade-modal-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" fill="#FEF3C7" />
            <path d="M32 16L38 28H26L32 16Z" fill="#F59E0B" />
            <circle cx="32" cy="36" r="2" fill="#F59E0B" />
            <rect x="30" y="42" width="4" height="8" rx="2" fill="#F59E0B" />
          </svg>
        </div>

        <h2 className="upgrade-modal-title">{message.title}</h2>
        <p className="upgrade-modal-subtitle">{message.current}</p>

        <div className="upgrade-plans-comparison">
          {/* Plan Actual */}
          <div className="upgrade-plan-card upgrade-plan-current">
            <div className="upgrade-plan-header">
              <h3>Plan Free</h3>
              <span className="upgrade-plan-badge">Plan Actual</span>
            </div>
            <div className="upgrade-plan-price">$0<span>/mes</span></div>
            <ul className="upgrade-plan-features">
              <li className="upgrade-feature-limited">
                <span className="upgrade-feature-icon">📊</span>
                <span>1 proyecto</span>
              </li>
              <li className="upgrade-feature-limited">
                <span className="upgrade-feature-icon">👥</span>
                <span>3 usuarios</span>
              </li>
              <li className="upgrade-feature-included">
                <span className="upgrade-feature-icon">✓</span>
                <span>Todas las funciones básicas</span>
              </li>
            </ul>
          </div>

          {/* Plan Professional */}
          <div className="upgrade-plan-card upgrade-plan-recommended">
            <div className="upgrade-plan-header">
              <h3>Plan Professional</h3>
              <span className="upgrade-plan-badge upgrade-plan-badge-pro">Recomendado</span>
            </div>
            <div className="upgrade-plan-price">$39<span>/mes</span></div>
            <ul className="upgrade-plan-features">
              <li className="upgrade-feature-included">
                <span className="upgrade-feature-icon">✓</span>
                <span><strong>Proyectos ilimitados</strong></span>
              </li>
              <li className="upgrade-feature-included">
                <span className="upgrade-feature-icon">✓</span>
                <span><strong>Usuarios ilimitados</strong></span>
              </li>
              <li className="upgrade-feature-included">
                <span className="upgrade-feature-icon">✓</span>
                <span>Soporte prioritario</span>
              </li>
              <li className="upgrade-feature-included">
                <span className="upgrade-feature-icon">✓</span>
                <span>Reportes avanzados</span>
              </li>
            </ul>
            <button
              className="upgrade-btn-primary"
              onClick={handleUpgrade}
              disabled={isUpgrading}
            >
              {isUpgrading
                ? (paymentMode === 'stripe' ? 'Procesando...' : 'Actualizando...')
                : (paymentMode === 'stripe' ? 'Ir a Checkout de Stripe' : 'Actualizar a Professional (Simulación)')
              }
            </button>
          </div>
        </div>

        {/* Toggle para modo de pago (solo visible en desarrollo) */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            marginTop: '20px',
            padding: '12px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            border: '1px dashed #9ca3af'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              color: '#4b5563',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={paymentMode === 'simulation'}
                onChange={(e) => setPaymentMode(e.target.checked ? 'simulation' : 'stripe')}
                style={{ width: '16px', height: '16px' }}
              />
              <span>
                {paymentMode === 'stripe'
                  ? '💳 Modo: Stripe (Pago real)'
                  : '⚠️ Modo: Simulación (Sin pago)'
                }
              </span>
            </label>
          </div>
        )}

        <p className="upgrade-modal-footer">
          ¿Preguntas? <a href="mailto:soporte@strategiapm.com">Contacta con soporte</a>
        </p>

        <button className="upgrade-btn-secondary" onClick={onClose}>
          Ahora no
        </button>
      </div>
    </div>
  );
};

export default UpgradeModal;
