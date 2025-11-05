// src/components/subscription/SubscriptionCancelled.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Página cuando el usuario cancela el checkout de Stripe
 * Se muestra cuando el usuario presiona "Back" en Stripe Checkout
 */
const SubscriptionCancelled = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
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
        {/* Icono de cancelación */}
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto 24px',
          backgroundColor: '#fef3c7',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>

        {/* Título */}
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '16px'
        }}>
          Proceso Cancelado
        </h1>

        {/* Mensaje */}
        <p style={{
          fontSize: '18px',
          color: '#6b7280',
          marginBottom: '32px',
          lineHeight: '1.6'
        }}>
          No se completó el proceso de suscripción.
          <br />
          No te preocupes, no se realizó ningún cargo a tu tarjeta.
        </p>

        {/* Información adicional */}
        <div style={{
          backgroundColor: '#fffbeb',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          textAlign: 'left'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#d97706',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            ¿Necesitas ayuda?
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
              color: '#92400e'
            }}>
              <span style={{ fontSize: '20px' }}>💬</span>
              <span>Contacta con soporte para resolver dudas</span>
            </li>
            <li style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
              fontSize: '15px',
              color: '#92400e'
            }}>
              <span style={{ fontSize: '20px' }}>📊</span>
              <span>Puedes intentar de nuevo cuando lo desees</span>
            </li>
            <li style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '15px',
              color: '#92400e'
            }}>
              <span style={{ fontSize: '20px' }}>🆓</span>
              <span>Sigue usando tu plan actual sin restricciones</span>
            </li>
          </ul>
        </div>

        {/* Recordatorio de beneficios */}
        <div style={{
          backgroundColor: '#f0fdf4',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '32px'
        }}>
          <p style={{
            fontSize: '14px',
            color: '#065f46',
            marginBottom: '12px',
            fontWeight: 'bold'
          }}>
            Recuerda que al actualizar a Professional obtienes:
          </p>
          <p style={{
            fontSize: '14px',
            color: '#047857',
            margin: 0,
            lineHeight: '1.8'
          }}>
            ✓ Proyectos ilimitados<br />
            ✓ Usuarios ilimitados<br />
            ✓ Soporte prioritario<br />
            ✓ Reportes avanzados
          </p>
        </div>

        {/* Botones de acción */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <button
            onClick={handleGoToDashboard}
            style={{
              width: '100%',
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '16px 24px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            Volver al Dashboard
          </button>

          <button
            onClick={() => window.history.back()}
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
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
          >
            Intentar de Nuevo
          </button>
        </div>

        {/* Countdown */}
        <p style={{
          fontSize: '14px',
          color: '#9ca3af',
          marginTop: '24px'
        }}>
          Serás redirigido automáticamente en {countdown} segundo{countdown !== 1 ? 's' : ''}...
        </p>

        {/* Contacto de soporte */}
        <div style={{
          marginTop: '32px',
          padding: '16px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#4b5563'
        }}>
          ¿Preguntas? Escríbenos a{' '}
          <a
            href="mailto:soporte@strategiapm.com"
            style={{
              color: '#3b82f6',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            soporte@strategiapm.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCancelled;
