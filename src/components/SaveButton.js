import React from 'react';
import { formatRelativeTime } from '../utils/formatters';
import './SaveButton.css';

/**
 * Componente de botón de guardado manual con estados visuales
 * 
 * @param {Object} props
 * @param {Function} props.onSave - Función a ejecutar al hacer clic en guardar
 * @param {boolean} props.hasUnsavedChanges - Si hay cambios sin guardar
 * @param {boolean} props.isSaving - Si está guardando actualmente
 * @param {Date|string|number} props.lastSaved - Timestamp del último guardado
 * @param {boolean} props.disabled - Si el botón está deshabilitado
 */
export default function SaveButton({
    onSave,
    hasUnsavedChanges = false,
    isSaving = false,
    lastSaved = null,
    disabled = false
}) {
    const handleClick = () => {
        if (!disabled && !isSaving && hasUnsavedChanges) {
            onSave();
        }
    };

    // Determinar el estado del botón
    const isDisabled = disabled || isSaving || !hasUnsavedChanges;

    return (
        <div className="save-button-container">
            <button
                onClick={handleClick}
                disabled={isDisabled}
                className={`save-button ${hasUnsavedChanges ? 'has-changes' : ''} ${isSaving ? 'saving' : ''}`}
                title={
                    isSaving
                        ? 'Guardando...'
                        : hasUnsavedChanges
                            ? 'Guardar cambios (Ctrl+S)'
                            : 'No hay cambios para guardar'
                }
            >
                {isSaving ? (
                    <>
                        <span className="save-spinner"></span>
                        Guardando...
                    </>
                ) : (
                    <>
                        <svg
                            className="save-icon"
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                        >
                            <path
                                d="M13 1H3C1.89543 1 1 1.89543 1 3V13C1 14.1046 1.89543 15 3 15H13C14.1046 15 15 14.1046 15 13V3C15 1.89543 14.1046 1 13 1Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M11 1V6H5V1"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M5 11H11"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        Guardar
                        {hasUnsavedChanges && <span className="unsaved-badge">•</span>}
                    </>
                )}
            </button>

            {/* Indicador de estado */}
            <div className="save-status">
                {isSaving && (
                    <span className="status-text saving-text">
                        Guardando cambios...
                    </span>
                )}

                {!isSaving && hasUnsavedChanges && (
                    <span className="status-text unsaved-text">
                        ⚠️ Cambios sin guardar
                    </span>
                )}

                {!isSaving && !hasUnsavedChanges && lastSaved && (
                    <span className="status-text saved-text">
                        ✅ Guardado {formatRelativeTime(lastSaved)}
                    </span>
                )}
            </div>
        </div>
    );
}
