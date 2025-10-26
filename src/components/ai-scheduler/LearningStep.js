// =====================================================
// DEPRECATED - no se usa en v1.0
// LEARNING STEP COMPONENT
// Paso del wizard para subir ejemplos de cronogramas
// Este archivo será eliminado en futuras versiones
// =====================================================

import React, { useState, useCallback } from 'react';
import aiLearningService from '../../services/AILearningService';

const LearningStep = ({ 
  onComplete, 
  onBack, 
  projectType = 'general',
  organizationId,
  userId 
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);

  // Inicializar servicio de aprendizaje
  React.useEffect(() => {
    const initializeLearning = async () => {
      try {
        console.log('🔍 DEBUG - Inicializando servicio de aprendizaje:', {
          organizationId,
          userId,
          hasOrganizationId: !!organizationId,
          hasUserId: !!userId,
          organizationIdType: typeof organizationId,
          userIdType: typeof userId
        });

        // Importar SupabaseService dinámicamente
        const { default: supabaseService } = await import('../../services/SupabaseService');
        
        console.log('🔍 DEBUG - SupabaseService importado:', {
          hasSupabase: !!supabaseService.supabase,
          currentUser: supabaseService.currentUser?.email,
          currentUserId: supabaseService.currentUser?.id
        });
        
        if (supabaseService.supabase && organizationId && userId) {
          await aiLearningService.initialize(
            supabaseService.supabase,
            organizationId,
            userId
          );
          console.log('✅ Servicio de aprendizaje inicializado correctamente');
        } else {
          console.warn('⚠️ No se puede inicializar el servicio de aprendizaje:', {
            hasSupabase: !!supabaseService.supabase,
            hasOrganizationId: !!organizationId,
            hasUserId: !!userId
          });
        }
      } catch (error) {
        console.error('❌ Error inicializando el servicio de aprendizaje:', error);
      }
    };

    initializeLearning();
  }, [organizationId, userId]);

  // Manejar drag and drop
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files).filter(file => 
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel' ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls')
      );
      
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, []);

  // Manejar selección de archivos
  const handleFileSelect = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(file => 
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel' ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls')
      );
      
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  // Eliminar archivo
  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Analizar archivos
  const analyzeFiles = async () => {
    if (files.length === 0) {
      setError('Por favor selecciona al menos un archivo Excel');
      return;
    }

    setUploading(true);
    setError(null);
    const results = [];

    try {
      // Verificar estado del servicio antes de analizar
      console.log('🔍 DEBUG - Estado del servicio antes de analizar:', {
        hasSupabase: !!aiLearningService.supabase,
        hasOrganizationId: !!aiLearningService.organizationId,
        hasUserId: !!aiLearningService.userId,
        organizationId: aiLearningService.organizationId,
        userId: aiLearningService.userId
      });

      for (const file of files) {
        console.log('🔍 Analizando archivo:', file.name);
        
        const result = await aiLearningService.analyzeScheduleFile(file, projectType);
        results.push({
          fileName: file.name,
          fileSize: file.size,
          ...result
        });
      }

      setAnalysisResults(results);
      
      // Contar éxitos
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      if (successCount > 0) {
        console.log(`✅ ${successCount}/${totalCount} archivos analizados exitosamente`);
      } else {
        setError('No se pudieron analizar los archivos. Verifica que sean cronogramas válidos.');
      }

    } catch (error) {
      console.error('❌ Error analizando archivos:', error);
      setError(`Error analizando archivos: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Continuar al siguiente paso
  const handleContinue = () => {
    const successfulResults = analysisResults.filter(r => r.success);
    
    if (successfulResults.length > 0) {
      onComplete({
        learningEnabled: true,
        patternsLearned: successfulResults.length,
        analysisResults: successfulResults
      });
    } else {
      // Continuar sin aprendizaje
      onComplete({
        learningEnabled: false,
        patternsLearned: 0,
        analysisResults: []
      });
    }
  };

  // Omitir aprendizaje
  const handleSkip = () => {
    onComplete({
      learningEnabled: false,
      patternsLearned: 0,
      analysisResults: []
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="text-4xl mr-3">🧠</span>
          Comparte ejemplos de cronogramas
        </h2>
        <p className="text-gray-600 text-lg leading-relaxed">
          Ayuda a mejorar el Asistente de IA subiendo ejemplos de cronogramas exitosos. 
          El sistema analizará patrones, duraciones y estructuras para generar mejores cronogramas en el futuro.
        </p>
      </div>

      {/* Zona de drag and drop */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="text-6xl text-gray-400">📊</div>
          <div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Arrastra archivos Excel aquí
            </h3>
            <p className="text-gray-500 mb-4">
              O haz clic para seleccionar archivos
            </p>
            <input
              type="file"
              multiple
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
            >
              <span className="mr-2">📁</span>
              Seleccionar archivos
            </label>
          </div>
          <p className="text-sm text-gray-400">
            Formatos soportados: .xlsx, .xls
          </p>
        </div>
      </div>

      {/* Lista de archivos seleccionados */}
      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Archivos seleccionados ({files.length})
          </h3>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <p className="font-medium text-gray-700">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                  title="Eliminar archivo"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          {/* Botón de análisis */}
          <div className="mt-4 flex space-x-3">
            <button
              onClick={analyzeFiles}
              disabled={uploading}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                uploading
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {uploading ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⏳</span>
                  Analizando...
                </span>
              ) : (
                <span className="flex items-center">
                  <span className="mr-2">🔍</span>
                  Analizar patrones
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Resultados del análisis */}
      {analysisResults.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Resultados del análisis
          </h3>
          <div className="space-y-3">
            {analysisResults.map((result, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  result.success 
                    ? 'bg-green-50 border-green-500' 
                    : 'bg-red-50 border-red-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {result.success ? '✅' : '❌'}
                    </span>
                    <div>
                      <p className="font-medium text-gray-700">{result.fileName}</p>
                      <p className="text-sm text-gray-500">
                        {result.success 
                          ? `Patrones extraídos: ${result.patterns ? Object.keys(result.patterns).length : 0}`
                          : result.error
                        }
                      </p>
                    </div>
                  </div>
                  {result.success && result.patterns && (
                    <div className="text-sm text-gray-600">
                      <div>Actividades: {result.patterns.metadata?.totalTasks || 0}</div>
                      <div>Hitos: {result.patterns.metadata?.totalMilestones || 0}</div>
                      <div>Duración: {result.patterns.metadata?.projectDuration || 0} días</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Información sobre privacidad */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
          <span className="mr-2">🔒</span>
          Privacidad y seguridad
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Solo se extraen patrones y estructuras, no contenido específico</li>
          <li>• Los archivos no se almacenan permanentemente</li>
          <li>• Los patrones aprendidos son privados de tu organización</li>
          <li>• Puedes eliminar los patrones en cualquier momento</li>
        </ul>
      </div>

      {/* Botones de navegación */}
      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Anterior
        </button>
        
        <div className="space-x-3">
          <button
            onClick={handleSkip}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Omitir aprendizaje
          </button>
          
          <button
            onClick={handleContinue}
            disabled={uploading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analysisResults.length > 0 ? 'Continuar con aprendizaje' : 'Continuar sin aprendizaje'} →
          </button>
        </div>
      </div>
    </div>
  );
};

export default LearningStep;
