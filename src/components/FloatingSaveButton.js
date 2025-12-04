import React, { useState, useEffect } from 'react';

/**
 * Botón flotante de guardado manual
 * - Siempre visible en esquina inferior derecha
 * - Rojo cuando hay cambios pendientes
 * - Verde cuando está guardado
 * - Azul cuando está guardando
 */
const FloatingSaveButton = ({ onSave, hasUnsavedChanges = false }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaveTime, setLastSaveTime] = useState(null);
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        const handleSaveStart = () => {
            setIsSaving(true);
        };

        const handleSaveComplete = () => {
            setIsSaving(false);
            setLastSaveTime(new Date());
        };

        const handleSaveError = () => {
            setIsSaving(false);
        };

        window.addEventListener('supabaseSyncing', handleSaveStart);
        window.addEventListener('supabaseSynced', handleSaveComplete);
        window.addEventListener('supabaseError', handleSaveError);

        return () => {
            window.removeEventListener('supabaseSyncing', handleSaveStart);
            window.removeEventListener('supabaseSynced', handleSaveComplete);
            window.removeEventListener('supabaseError', handleSaveError);
        };
    }, []);

    const handleClick = () => {
        if (!isSaving && onSave) {
            onSave();
        }
    };

    const formatTime = (date) => {
        if (!date) return '';
        return date.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Determinar color del botón
    const getButtonColor = () => {
        if (isSaving) {
            return 'bg-blue-600 hover:bg-blue-700';
        }
        if (hasUnsavedChanges) {
            return 'bg-red-600 hover:bg-red-700 animate-pulse';
        }
        return 'bg-green-600 hover:bg-green-700';
    };

    // Determinar icono
    const getIcon = () => {
        if (isSaving) {
            return (
                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            );
        }
        return (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
        );
    };

    // Determinar texto del tooltip
    const getTooltipText = () => {
        if (isSaving) return 'Guardando...';
        if (hasUnsavedChanges) return 'Hay cambios sin guardar - Click para guardar';
        if (lastSaveTime) return `Último guardado: ${formatTime(lastSaveTime)}`;
        return 'Guardar cambios';
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Tooltip */}
            {showTooltip && (
                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap shadow-lg">
                    {getTooltipText()}
                    <div className="absolute top-full right-4 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900"></div>
                    </div>
                </div>
            )}

            {/* Botón flotante */}
            <button
                onClick={handleClick}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                disabled={isSaving}
                className={`
          ${getButtonColor()}
          text-white rounded-full p-4 shadow-2xl
          transition-all duration-300 ease-in-out
          transform hover:scale-110 active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-4 focus:ring-offset-2
          ${hasUnsavedChanges ? 'focus:ring-red-300' : 'focus:ring-green-300'}
        `}
                aria-label="Guardar cambios"
            >
                {getIcon()}
            </button>

            {/* Indicador de cambios pendientes */}
            {hasUnsavedChanges && !isSaving && (
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-white animate-ping"></div>
            )}
        </div>
    );
};

export default FloatingSaveButton;
