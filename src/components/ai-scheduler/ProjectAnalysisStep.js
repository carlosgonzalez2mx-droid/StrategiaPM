/**
 * ProjectAnalysisStep - Paso 1 del wizard: Análisis del Proyecto
 * StrategiaPM - MVP Implementation
 */

import React, { useState, useEffect } from 'react';

const ProjectAnalysisStep = ({ wizardData, onUpdate, availableTemplates }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customProjectType, setCustomProjectType] = useState('');

  // Opciones predefinidas
  const projectTypes = [
    { value: 'development', label: 'Desarrollo de Software', icon: '💻' },
    { value: 'equipment_installation', label: 'Compra e Instalación de Equipos', icon: '🏭' },
    { value: 'construction', label: 'Construcción', icon: '🏗️' },
    { value: 'campaign', label: 'Campaña de Marketing', icon: '📢' },
    { value: 'research', label: 'Proyecto de Investigación', icon: '🔬' },
    { value: 'custom', label: 'Personalizado', icon: '⚙️' }
  ];

  const methodologies = [
    { value: 'agile', label: 'Agile/Scrum', description: 'Iterativo, adaptativo' },
    { value: 'waterfall', label: 'Waterfall', description: 'Secuencial, planificado' },
    { value: 'hybrid', label: 'Híbrido', description: 'Combinación de ambos' },
    { value: 'kanban', label: 'Kanban', description: 'Flujo continuo' }
  ];

  const industries = [
    { value: 'software', label: 'Software/Tecnología' },
    { value: 'equipment', label: 'Maquinaria/Equipos' },
    { value: 'construction', label: 'Construcción' },
    { value: 'marketing', label: 'Marketing/Publicidad' },
    { value: 'research', label: 'Investigación/Desarrollo' },
    { value: 'manufacturing', label: 'Manufactura' },
    { value: 'services', label: 'Servicios' },
    { value: 'other', label: 'Otro' }
  ];

  // Efecto para actualizar datos cuando cambia el template seleccionado
  useEffect(() => {
    if (selectedTemplate) {
      onUpdate({
        projectType: selectedTemplate.project_type,
        industry: selectedTemplate.industry,
        methodology: selectedTemplate.methodology,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name
      });
    }
  }, [selectedTemplate, onUpdate]);

  // Efecto para manejar tipo de proyecto personalizado
  useEffect(() => {
    if (wizardData.projectType === 'custom' && customProjectType) {
      onUpdate({
        projectType: customProjectType.toLowerCase().replace(/\s+/g, '_'),
        customProjectType: customProjectType
      });
    }
  }, [customProjectType, wizardData.projectType, onUpdate]);

  const handleProjectTypeChange = (projectType) => {
    onUpdate({ projectType });
    
    // Buscar template que coincida con el tipo de proyecto
    const matchingTemplate = availableTemplates.find(template => 
      template.project_type === projectType
    );
    
    if (matchingTemplate) {
      setSelectedTemplate(matchingTemplate);
    } else {
      setSelectedTemplate(null);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          📋 Análisis del Proyecto
        </h3>
        <p className="text-gray-600">
          Proporciona información básica sobre tu proyecto para generar el cronograma más apropiado
        </p>
      </div>

      {/* Información del Proyecto */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-xl mr-2">📝</span>
          Información Básica
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Proyecto *
            </label>
            <input
              type="text"
              value={wizardData.projectName || ''}
              onChange={(e) => onUpdate({ projectName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Ej: Sistema de Gestión de Inventarios"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gerente del Proyecto
            </label>
            <input
              type="text"
              value={wizardData.projectManager || ''}
              onChange={(e) => onUpdate({ projectManager: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Ej: Juan Pérez"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción del Proyecto
          </label>
          <textarea
            value={wizardData.projectDescription || ''}
            onChange={(e) => onUpdate({ projectDescription: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Describe brevemente los objetivos y alcance del proyecto..."
          />
        </div>
      </div>

      {/* Tipo de Proyecto */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-xl mr-2">🎯</span>
          Tipo de Proyecto *
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projectTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => handleProjectTypeChange(type.value)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                wizardData.projectType === type.value
                  ? 'border-purple-500 bg-purple-50 text-purple-800'
                  : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
              }`}
            >
              <div className="flex items-center">
                <span className="text-2xl mr-3">{type.icon}</span>
                <div>
                  <div className="font-semibold">{type.label}</div>
                  {type.value === 'equipment_installation' && (
                    <div className="text-sm text-gray-600 mt-1">
                      Incluye compra, instalación y puesta en marcha
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Campo personalizado */}
        {wizardData.projectType === 'custom' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Especifica el tipo de proyecto
            </label>
            <input
              type="text"
              value={customProjectType}
              onChange={(e) => setCustomProjectType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Ej: Migración de Datos, Implementación de ERP"
            />
          </div>
        )}
      </div>

      {/* Industria */}
      <div className="bg-green-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-xl mr-2">🏢</span>
          Industria
        </h4>
        
        <select
          value={wizardData.industry || ''}
          onChange={(e) => onUpdate({ industry: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">Selecciona una industria</option>
          {industries.map((industry) => (
            <option key={industry.value} value={industry.value}>
              {industry.label}
            </option>
          ))}
        </select>
      </div>

      {/* Metodología */}
      <div className="bg-yellow-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-xl mr-2">📊</span>
          Metodología Preferida
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {methodologies.map((method) => (
            <button
              key={method.value}
              onClick={() => onUpdate({ methodology: method.value })}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                wizardData.methodology === method.value
                  ? 'border-purple-500 bg-purple-50 text-purple-800'
                  : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
              }`}
            >
              <div className="font-semibold">{method.label}</div>
              <div className="text-sm text-gray-600 mt-1">{method.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Templates Disponibles */}
      {availableTemplates.length > 0 && (
        <div className="bg-purple-50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="text-xl mr-2">📋</span>
            Templates Disponibles
          </h4>
          
          <div className="space-y-3">
            {availableTemplates
              .filter(template => 
                !wizardData.projectType || 
                template.project_type === wizardData.projectType ||
                template.industry === wizardData.industry
              )
              .map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedTemplate?.id === template.id
                      ? 'border-purple-500 bg-purple-100 text-purple-800'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{template.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {template.description}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {template.methodology} • {template.estimated_duration_days} días • 
                        Equipo: {template.team_size_min}-{template.team_size_max} personas
                      </div>
                    </div>
                    {selectedTemplate?.id === template.id && (
                      <span className="text-purple-600 text-xl">✓</span>
                    )}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Fechas del Proyecto */}
      <div className="bg-orange-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-xl mr-2">📅</span>
          Fechas del Proyecto
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Inicio
            </label>
            <input
              type="date"
              value={wizardData.startDate || ''}
              onChange={(e) => onUpdate({ startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Límite (Opcional)
            </label>
            <input
              type="date"
              value={wizardData.endDate || ''}
              onChange={(e) => onUpdate({ endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Resumen de Selección */}
      {(wizardData.projectName || wizardData.projectType) && (
        <div className="bg-gray-100 rounded-lg p-4">
          <h5 className="font-semibold text-gray-800 mb-2">Resumen de Selección:</h5>
          <div className="text-sm text-gray-600 space-y-1">
            {wizardData.projectName && <div>• Proyecto: {wizardData.projectName}</div>}
            {wizardData.projectType && <div>• Tipo: {projectTypes.find(t => t.value === wizardData.projectType)?.label}</div>}
            {wizardData.industry && <div>• Industria: {industries.find(i => i.value === wizardData.industry)?.label}</div>}
            {wizardData.methodology && <div>• Metodología: {methodologies.find(m => m.value === wizardData.methodology)?.label}</div>}
            {selectedTemplate && <div>• Template: {selectedTemplate.name}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectAnalysisStep;
