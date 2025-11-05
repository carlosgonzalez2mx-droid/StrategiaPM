// src/components/subscription/SubscriptionSuccess.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Página de éxito después de completar el checkout de Stripe
 * Se muestra cuando el usuario regresa de Stripe después de un pago exitoso
 */
const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    // Obtener el session_id de la URL
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session_id');
    setSessionId(session);

    // Countdown para redirigir automáticamente
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/'); // Redirigir al dashboard principal
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleGoToDashboard = () => {
    navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        padding: '48px',
        textAlign: 'center'
      }}>
        {/* Icono de éxito animado */}
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto 24px',
          backgroundColor: '#10b981',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'successPop 0.6s ease-out'
        }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {/* Título */}
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '16px'
        }}>
          ¡Pago Exitoso!
        </h1>

        {/* Mensaje */}
        <p style={{
          fontSize: '18px',
          color: '#6b7280',
          marginBottom: '32px',
          lineHeight: '1.6'
        }}>
          Tu suscripción al <strong>Plan Professional</strong> ha sido activada exitosamente.
          Ahora tienes acceso a todas las funcionalidades premium.
        </p>

        {/* Beneficios */}
        <div style={{
          backgroundColor: '#f0fdf4',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          textAlign: 'left'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#059669',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            Beneficios Activados
          </h3>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0
          }}>
            <li style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
              fontSize: '15px',
              color: '#065f46'
            }}>
              <span style={{ fontSize: '20px' }}>✓</span>
              <span>Proyectos ilimitados</span>
            </li>
            <li style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
              fontSize: '15px',
              color: '#065f46'
            }}>
              <span style={{ fontSize: '20px' }}>✓</span>
              <span>Usuarios ilimitados</span>
            </li>
            <li style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
              fontSize: '15px',
              color: '#065f46'
            }}>
              <span style={{ fontSize: '20px' }}>✓</span>
              <span>Soporte prioritario</span>
            </li>
            <li style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '15px',
              color: '#065f46'
            }}>
              <span style={{ fontSize: '20px' }}>✓</span>
              <span>Reportes avanzados</span>
            </li>
          </ul>
        </div>

        {/* Session ID (para debugging) */}
        {sessionId && process.env.NODE_ENV === 'development' && (
          <div style={{
            fontSize: '12px',
            color: '#9ca3af',
            marginBottom: '24px',
            padding: '12px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            fontFamily: 'monospace'
          }}>
            Session ID: {sessionId}
          </div>
        )}

        {/* Botón de acción */}
        <button
          onClick={handleGoToDashboard}
          style={{
            width: '100%',
            backgroundColor: '#10b981',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '12px',
            border: 'none',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            marginBottom: '16px'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
        >
          Ir al Dashboard
        </button>

        {/* Countdown */}
        <p style={{
          fontSize: '14px',
          color: '#9ca3af'
        }}>
          Serás redirigido automáticamente en {countdown} segundo{countdown !== 1 ? 's' : ''}...
        </p>

        {/* Nota de confirmación */}
        <div style={{
          marginTop: '32px',
          padding: '16px',
          backgroundColor: '#eff6ff',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#1e40af'
        }}>
          📧 Recibirás un email de confirmación con los detalles de tu suscripción.
        </div>
      </div>

      {/* Estilos para la animación */}
      <style>
        {`
          @keyframes successPop {
            0% {
              transform: scale(0);
              opacity: 0;
            }
            50% {
              transform: scale(1.1);
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
};

export default SubscriptionSuccess;
