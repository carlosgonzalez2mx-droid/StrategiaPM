/**
 * @fileoverview ConflictResolutionDialog - Diálogo para resolver conflictos de concurrencia
 * 
 * Muestra conflictos detectados cuando múltiples usuarios modifican los mismos datos
 * y permite al usuario elegir cómo resolverlos.
 * 
 * @module components/ConflictResolutionDialog
 */

import React, { useState } from 'react';

/**
 * Diálogo para resolver conflictos de concurrencia
 * 
 * @component
 * @param {Object} props
 * @param {Array} props.conflicts - Lista de conflictos detectados
 * @param {Function} props.onResolve - Callback cuando se resuelven conflictos
 * @param {Function} props.onCancel - Callback cuando se cancela
 */
const ConflictResolutionDialog = ({ conflicts, onResolve, onCancel }) => {
    const [resolutions, setResolutions] = useState({});

    const handleResolve = () => {
        onResolve(resolutions);
    };

    const setResolution = (conflictIndex, choice, customValue = null) => {
        setResolutions(prev => ({
            ...prev,
            [conflictIndex]: { choice, customValue }
        }));
    };

    // Formatear valores para mostrar
    const formatValue = (value) => {
        if (value === null || value === undefined) return 'null';
        if (typeof value === 'object') return JSON.stringify(value, null, 2);
        return String(value);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <span className="mr-3">⚠️</span>
                        Conflictos de Concurrencia Detectados
                    </h2>
                    <button
                        onClick={onCancel}
                        className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                    >
                        ✕
                    </button>
                </div>

                <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <p className="text-yellow-800">
                        Otro usuario modificó <strong>{conflicts.length}</strong> registro(s) mientras editabas.
                        Por favor, elige cómo resolver cada conflicto.
                    </p>
                </div>

                <div className="space-y-6">
                    {conflicts.map((conflict, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="mb-3">
                                <h3 className="font-semibold text-gray-700 mb-1">
                                    Tabla: <span className="text-blue-600">{conflict.table}</span>
                                </h3>
                                <p className="text-sm text-gray-500">
                                    ID: {conflict.recordId}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                {/* Tu Cambio */}
                                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                    <div className="text-xs font-medium text-blue-600 mb-2">
                                        TU CAMBIO
                                    </div>
                                    <div className="text-sm text-blue-900 font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                                        {formatValue(conflict.yourData)}
                                    </div>
                                </div>

                                {/* Cambio del Otro Usuario */}
                                <div className="bg-green-50 p-3 rounded border border-green-200">
                                    <div className="text-xs font-medium text-green-600 mb-2">
                                        CAMBIO DEL OTRO USUARIO
                                    </div>
                                    <div className="text-sm text-green-900 font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                                        {formatValue(conflict.currentData)}
                                    </div>
                                </div>
                            </div>

                            {/* Opciones de Resolución */}
                            <div className="space-y-2 bg-white p-3 rounded">
                                <p className="text-sm font-medium text-gray-700 mb-2">Elige una opción:</p>

                                <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                    <input
                                        type="radio"
                                        name={`conflict-${index}`}
                                        value="yours"
                                        checked={resolutions[index]?.choice === 'yours'}
                                        onChange={() => setResolution(index, 'yours')}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm">Usar mi cambio (sobrescribir)</span>
                                </label>

                                <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                    <input
                                        type="radio"
                                        name={`conflict-${index}`}
                                        value="theirs"
                                        checked={resolutions[index]?.choice === 'theirs'}
                                        onChange={() => setResolution(index, 'theirs')}
                                        className="text-green-600 focus:ring-green-500"
                                    />
                                    <span className="text-sm">Usar cambio del otro usuario (descartar mi cambio)</span>
                                </label>

                                <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                    <input
                                        type="radio"
                                        name={`conflict-${index}`}
                                        value="custom"
                                        checked={resolutions[index]?.choice === 'custom'}
                                        onChange={() => setResolution(index, 'custom')}
                                        className="text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-sm">Usar valor personalizado:</span>
                                </label>

                                {resolutions[index]?.choice === 'custom' && (
                                    <textarea
                                        className="ml-6 mt-2 px-3 py-2 border border-gray-300 rounded w-full font-mono text-sm"
                                        placeholder="Ingresa valor personalizado (JSON si es objeto)"
                                        rows={3}
                                        onChange={(e) => setResolution(index, 'custom', e.target.value)}
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleResolve}
                        disabled={Object.keys(resolutions).length !== conflicts.length}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        Resolver {conflicts.length} Conflicto(s)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConflictResolutionDialog;
