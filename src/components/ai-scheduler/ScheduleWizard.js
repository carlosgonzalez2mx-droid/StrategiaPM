/**
 * ScheduleWizard - Componente principal del Asistente Inteligente de Cronogramas
 * StrategiaPM - MVP Implementation
 * 
 * Wizard de 5 pasos para generar cronogramas automáticamente con IA
 */

import React, { useState, useEffect, useCallback } from 'react';
import ProjectAnalysisStep from './ProjectAnalysisStep';
import ResourceConfigStep from './ResourceConfigStep';
import MilestoneDefinitionStep from './MilestoneDefinitionStep';
import LearningStep from './LearningStep';
import MachineryConfigStep from './MachineryConfigStep';
import SchedulePreview from './SchedulePreview';
import aiSchedulerService from '../../services/AISchedulerService';

const ScheduleWizard = ({ 
  isOpen, 
  onClose, 
  onComplete, 
  projectId, 
  currentProject = null,
  organizationId,
  userId
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({});
  const [generatedSchedule, setGeneratedSchedule] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [availableTemplates, setAvailableTemplates] = useState([]);

  // Inicializar wizard cuando se abre
  useEffect(() => {
    if (isOpen) {
      initializeWizard();
    }
  }, [isOpen]);

  // Inicializar datos del wizard
  const initializeWizard = async () => {
    try {
      setCurrentStep(1);
      setWizardData({});
      setGeneratedSchedule(null);
      setError(null);
      setIsGenerating(false);

      // Cargar templates disponibles
      await loadAvailableTemplates();

      // Pre-llenar datos si hay un proyecto actual
      if (currentProject) {
        setWizardData({
          projectId: projectId,
          projectName: currentProject.name,
          projectDescription: currentProject.description,
          projectManager: currentProject.manager || 'Pendiente',
          startDate: currentProject.startDate || new Date().toISOString().split('T')[0],
          endDate: currentProject.endDate || null
        });
      } else {
        setWizardData({
          projectId: projectId,
          startDate: new Date().toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error('Error inicializando wizard:', error);
      setError('Error inicializando el asistente de cronogramas');
    }
  };

  // Cargar templates disponibles
  const loadAvailableTemplates = async () => {
    try {
      const templates = await aiSchedulerService.getAvailableTemplates();
      setAvailableTemplates(templates);
      console.log('📋 Templates cargados:', templates.length);
    } catch (error) {
      console.error('Error cargando templates:', error);
    }
  };

  // Actualizar datos del wizard
  const updateWizardData = useCallback((newData) => {
    setWizardData(prev => ({
      ...prev,
      ...newData
    }));
  }, []); // CORRECCIÓN: useCallback para evitar recreación en cada render

  // Avanzar al siguiente paso
  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    }
  };

  // Retroceder al paso anterior
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Generar cronograma con IA
  const generateSchedule = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      console.log('🤖 Iniciando generación de cronograma...');
      console.log('📊 Datos del wizard:', wizardData);

      // Validar que tenemos datos suficientes
      if (!wizardData.projectType) {
        throw new Error('Tipo de proyecto no definido');
      }

      // Generar cronograma usando el servicio de IA
      const schedule = await aiSchedulerService.generateSmartSchedule(wizardData);
      
      if (!schedule) {
        throw new Error('No se pudo generar el cronograma');
      }
      
      setGeneratedSchedule(schedule);
      setCurrentStep(5); // Ir al paso 5 (vista previa del cronograma)
      
      console.log('✅ Cronograma generado exitosamente:', schedule);
      console.log('📊 Actividades generadas:', schedule.activities?.length || 0);
      console.log('🎯 Hitos generados:', schedule.milestones?.length || 0);
      
    } catch (error) {
      console.error('❌ Error generando cronograma:', error);
      setError(`Error generando cronograma: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Completar wizard y aplicar cronograma
  const completeWizard = () => {
    if (generatedSchedule && onComplete) {
      onComplete(generatedSchedule);
      onClose();
    }
  };

  // Cerrar wizard
  const handleClose = () => {
    setCurrentStep(1);
    setWizardData({});
    setGeneratedSchedule(null);
    setError(null);
    setIsGenerating(false);
    onClose();
  };

  // Determinar si necesita paso de configuración de maquinaria
  const needsMachineryStep = () => {
    return wizardData.projectType === 'equipment_installation';
  };

  // Obtener el número total de pasos
  const getTotalSteps = () => {
    return 5; // Siempre 5 pasos (sin aprendizaje)
  };


  // Validar paso actual
  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 1:
        return wizardData.projectName && wizardData.projectType;
      case 2:
        return wizardData.teamSize && wizardData.teamExperience;
      case 3:
        return wizardData.milestones && wizardData.milestones.length > 0;
      case 4:
        if (needsMachineryStep()) {
          return wizardData.deliveryTime && wizardData.advancePayments;
        }
        return true; // Paso opcional para otros tipos de proyecto
      case 5:
        return generatedSchedule !== null;
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[95vh] max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                <span className="text-3xl mr-3">🤖</span>
                Asistente Inteligente de Cronogramas
              </h2>
              <p className="text-purple-100 mt-1">
                Genera cronogramas automáticamente con IA
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-purple-200 transition-colors"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-purple-100 mb-2">
              <span>Paso {currentStep} de {getTotalSteps()}</span>
              <span>{Math.round((currentStep / getTotalSteps()) * 100)}% completado</span>
            </div>
            <div className="w-full bg-purple-300 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / getTotalSteps()) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <span className="text-red-500 text-xl mr-3">⚠️</span>
                <div>
                  <h3 className="text-red-800 font-semibold">Error</h3>
                  <p className="text-red-600">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Análisis del Proyecto */}
          {currentStep === 1 && (
            <ProjectAnalysisStep
              wizardData={wizardData}
              onUpdate={updateWizardData}
              availableTemplates={availableTemplates}
            />
          )}

          {/* Step 2: Configuración de Recursos */}
          {currentStep === 2 && (
            <ResourceConfigStep
              wizardData={wizardData}
              onUpdate={updateWizardData}
            />
          )}

          {/* Step 3: Definición de Hitos */}
          {currentStep === 3 && (
            <MilestoneDefinitionStep
              wizardData={wizardData}
              onUpdate={updateWizardData}
            />
          )}

          {/* Step 4: Configuración de Maquinaria (solo para equipment_installation) */}
          {currentStep === 4 && needsMachineryStep() && (
            <MachineryConfigStep
              wizardData={wizardData}
              onUpdate={updateWizardData}
            />
          )}

          {/* Step 4: Aprendizaje de Patrones (solo si no es equipment_installation) */}
          {currentStep === 4 && !needsMachineryStep() && (
            <LearningStep
              wizardData={wizardData}
              onUpdate={updateWizardData}
              onComplete={(learningData) => {
                updateWizardData(learningData);
                nextStep();
              }}
              projectType={wizardData.projectType}
              organizationId={organizationId}
              userId={userId}
            />
          )}

          {/* Step 5: Vista Previa del Cronograma */}
          {currentStep === 5 && (
            <SchedulePreview
              wizardData={wizardData}
              generatedSchedule={generatedSchedule}
              isGenerating={isGenerating}
              onGenerate={generateSchedule}
            />
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
          <div className="flex items-center space-x-4">
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Anterior
              </button>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>

            {currentStep < 5 ? (
              <button
                onClick={nextStep}
                disabled={!isCurrentStepValid()}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  isCurrentStepValid()
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Siguiente →
              </button>
            ) : (
              <button
                onClick={completeWizard}
                disabled={!generatedSchedule}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  generatedSchedule
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                ✅ Aplicar Cronograma
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleWizard;
