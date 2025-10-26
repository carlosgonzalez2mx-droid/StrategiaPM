import React, { useState } from 'react';
import './InvitationModal.css';
import { getAppUrl } from '../utils/config';

function InvitationModal({ isOpen, onClose, invitation }) {
  const [copied, setCopied] = useState(false);
  
  if (!isOpen || !invitation) return null;
  
  // Generar URL de invitación con query params usando helper de configuración
  const invitationUrl = getAppUrl(
    `/signup?email=${encodeURIComponent(invitation.user_email)}&invited=true&org=${invitation.organization_id}`
  );
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Error copiando enlace:', err);
      // Fallback para navegadores antiguos
      const textArea = document.createElement('textarea');
      textArea.value = invitationUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };
  
  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(
      `🎉 ¡Has sido invitado a unirte a nuestra organización en StrategiaPM!\n\n` +
      `Haz clic en este enlace para registrarte:\n${invitationUrl}\n\n` +
      `Importante: Usa el email ${invitation.user_email} al registrarte.`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };
  
  const handleShareEmail = () => {
    const subject = encodeURIComponent('Invitación a StrategiaPM');
    const body = encodeURIComponent(
      `Has sido invitado a unirte a nuestra organización en StrategiaPM.\n\n` +
      `Haz clic en este enlace para registrarte:\n${invitationUrl}\n\n` +
      `Importante: Debes registrarte usando el email ${invitation.user_email}\n\n` +
      `Una vez registrado, tendrás acceso automático a la organización.`
    );
    window.location.href = `mailto:${invitation.user_email}?subject=${subject}&body=${body}`;
  };
  
  return (
    <div className="invitation-modal-overlay" onClick={onClose}>
      <div className="invitation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="invitation-modal-header">
          <h2>✅ Invitación Creada</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="invitation-modal-body">
          <div className="invitation-info">
            <p className="invited-email">
              📧 <strong>{invitation.user_email}</strong>
            </p>
            <p className="invited-role">
              Rol: <span className="role-badge">{invitation.role}</span>
            </p>
          </div>
          
          <div className="invitation-instructions">
            <h3>📋 Cómo compartir esta invitación:</h3>
            <ol>
              <li>Copia el enlace de abajo</li>
              <li>Envíalo al usuario por WhatsApp, email, o Slack</li>
              <li>El usuario solo debe hacer clic y registrarse</li>
              <li>Una vez registrado, tendrá acceso automático</li>
            </ol>
          </div>
          
          <div className="invitation-link-section">
            <label>🔗 Enlace de invitación:</label>
            <div className="link-container">
              <input 
                type="text" 
                value={invitationUrl}
                readOnly
                className="invitation-link-input"
              />
              <button 
                className={`copy-button ${copied ? 'copied' : ''}`}
                onClick={handleCopyLink}
              >
                {copied ? '✅ Copiado' : '📋 Copiar'}
              </button>
            </div>
          </div>
          
          <div className="share-options">
            <h4>O compartir directamente:</h4>
            <div className="share-buttons">
              <button className="share-btn whatsapp" onClick={handleShareWhatsApp}>
                💬 WhatsApp
              </button>
              <button className="share-btn email" onClick={handleShareEmail}>
                📧 Email
              </button>
            </div>
          </div>
          
          <div className="invitation-note">
            <p>⚠️ <strong>Importante:</strong> El usuario debe registrarse usando exactamente el email <strong>{invitation.user_email}</strong></p>
          </div>
        </div>
        
        <div className="invitation-modal-footer">
          <button className="btn-primary" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

export default InvitationModal;
