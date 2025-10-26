import React, { useState, useMemo } from 'react';
import {
  BarChart3, AlertTriangle, Clock, DollarSign, Target, Activity, Shield, CheckCircle, 
  AlertCircle, XCircle, Users, Calendar, RefreshCw, Download, Settings, Info, GitBranch,
  FileText, TrendingUp, Zap, Navigation, ArrowRight, Plus, Edit, Trash2, Save, X
} from 'lucide-react';

const IntegratedPMODashboard = () => {
  // Estados del proyecto y datos base
  const [projects] = useState([
    {
      id: 'PRJ001',
      name: 'Proyecto CAPEX Automatización',
      startDate: '2025-01-20',
      plannedEndDate: '2025-04-30',
      currentDate: '2025-02-24',
      sponsor: 'Gerencia General',
      manager: 'Juan Pérez',
      totalBudget: 500000,
      phase: 'Ejecución',
      priority: 'Alta',
      category: 'Tecnología',
      status: 'En Progreso',
      businessCase: {
        roi: 25.5,
        npv: 150000,
        paybackPeriod: 18,
        benefits: 'Reducción costos operativos 20%, Mejora eficiencia 35%',
        risks: 'Resistencia al cambio, Complejidad técnica',
        success: 'Implementación exitosa sistema automatización'
      }
    },
    {
      id: 'PRJ002',
      name: 'Sistema ERP Corporativo',
      startDate: '2025-02-01',
      plannedEndDate: '2025-08-31',
      currentDate: '2025-02-24',
      sponsor: 'Dirección de TI',
      manager: 'Ana Martínez',
      totalBudget: 750000,
      phase: 'Planificación',
      priority: 'Alta',
      category: 'Sistemas',
      status: 'En Progreso',
      businessCase: {
        roi: 18.2,
        npv: 120000,
        paybackPeriod: 24,
        benefits: 'Integración de procesos, Reducción de errores 40%',
        risks: 'Complejidad de integración, Resistencia de usuarios',
        success: 'Sistema ERP funcionando en toda la empresa'
      }
    }
  ]);

  const [selectedProjectId, setSelectedProjectId] = useState('PRJ001');
  const [selectedModule, setSelectedModule] = useState('dashboard');
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [showBusinessCase, setShowBusinessCase] = useState(false);

  // Proyecto seleccionado
  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  // Calcular métricas del proyecto
  const projectMetrics = useMemo(() => {
    const daysElapsed = Math.floor((new Date(selectedProject.currentDate) - new Date(selectedProject.startDate)) / (1000 * 60 * 60 * 24));
    const totalDays = Math.floor((new Date(selectedProject.plannedEndDate) - new Date(selectedProject.startDate)) / (1000 * 60 * 60 * 24));
    const progress = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
    
    return {
      daysElapsed,
      totalDays,
      progress,
      daysRemaining: Math.max(0, totalDays - daysElapsed),
      isOnTrack: progress <= 100,
      budgetUtilization: 65, // Simulado
      riskLevel: selectedProject.priority === 'Alta' ? 'Alto' : 'Medio'
    };
  }, [selectedProject]);

  const getPhaseColor = (phase) => {
    switch(phase) {
      case 'Iniciación': return 'bg-blue-100 text-blue-800';
      case 'Planificación': return 'bg-yellow-100 text-yellow-800';
      case 'Ejecución': return 'bg-green-100 text-green-800';
      case 'Monitoreo': return 'bg-purple-100 text-purple-800';
      case 'Cierre': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Alta': return 'bg-red-100 text-red-800';
      case 'Media': return 'bg-yellow-100 text-yellow-800';
      case 'Baja': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Principal */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-xl shadow-lg p-6 mb-6 text-white">
          <h1 className="text-3xl font-bold mb-2">🎯 Dashboard PMO Integrado</h1>
          <p className="text-indigo-100">Control integral del proyecto basado en PMBOK v7</p>
        </div>
        
        {/* Selector de Proyectos */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Selección de Proyecto</h2>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Proyecto</div>
              <div className="font-semibold text-gray-800">{selectedProject.name}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">PM</div>
              <div className="font-semibold text-gray-800">{selectedProject.manager}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Sponsor</div>
              <div className="font-semibold text-gray-800">{selectedProject.sponsor}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Presupuesto</div>
              <div className="font-semibold text-gray-800">${(selectedProject.totalBudget / 1000).toFixed(0)}K</div>
            </div>
          </div>
        </div>

        {/* Métricas del Proyecto */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">Progreso</div>
                <div className="text-2xl font-bold text-gray-800">
                  {projectMetrics.progress.toFixed(1)}%
                </div>
              </div>
              <div className="text-blue-500 text-2xl">📊</div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${projectMetrics.progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">ROI</div>
                <div className="text-2xl font-bold text-gray-800">
                  {selectedProject.businessCase.roi}%
                </div>
              </div>
              <div className="text-green-500 text-2xl">💰</div>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Retorno de Inversión
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">NPV</div>
                <div className="text-2xl font-bold text-gray-800">
                  ${(selectedProject.businessCase.npv / 1000).toFixed(0)}K
                </div>
              </div>
              <div className="text-purple-500 text-2xl">📈</div>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Valor Presente Neto
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">Payback</div>
                <div className="text-2xl font-bold text-gray-800">
                  {selectedProject.businessCase.paybackPeriod} meses
                </div>
              </div>
              <div className="text-yellow-500 text-2xl">⏱️</div>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Período de Recuperación
            </div>
          </div>
        </div>

        {/* Business Case Detallado */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Business Case</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Beneficios Esperados</h4>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-800">{selectedProject.businessCase.benefits}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Riesgos Identificados</h4>
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-sm text-red-800">{selectedProject.businessCase.risks}</p>
              </div>
            </div>
            <div className="md:col-span-2">
              <h4 className="font-medium text-gray-700 mb-2">Criterio de Éxito</h4>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">{selectedProject.businessCase.success}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Estado del Proyecto */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Estado del Proyecto</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Fase:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPhaseColor(selectedProject.phase)}`}>
                  {selectedProject.phase}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Prioridad:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedProject.priority)}`}>
                  {selectedProject.priority}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Categoría:</span>
                <span className="text-sm font-medium text-gray-800">{selectedProject.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Días Restantes:</span>
                <span className="text-sm font-medium text-gray-800">{projectMetrics.daysRemaining}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📅 Cronograma</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Inicio:</span>
                <span className="text-sm font-medium text-gray-800">{selectedProject.startDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Fin Planificado:</span>
                <span className="text-sm font-medium text-gray-800">{selectedProject.plannedEndDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Fecha Actual:</span>
                <span className="text-sm font-medium text-gray-800">{selectedProject.currentDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Estado:</span>
                <span className="text-sm font-medium text-gray-800">{selectedProject.status}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">🎯 KPIs</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Progreso:</span>
                <span className="text-sm font-medium text-gray-800">{projectMetrics.progress.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Utilización Presupuesto:</span>
                <span className="text-sm font-medium text-gray-800">{projectMetrics.budgetUtilization}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Nivel de Riesgo:</span>
                <span className="text-sm font-medium text-gray-800">{projectMetrics.riskLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">En Tiempo:</span>
                <span className={`text-sm font-medium ${projectMetrics.isOnTrack ? 'text-green-600' : 'text-red-600'}`}>
                  {projectMetrics.isOnTrack ? 'Sí' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegratedPMODashboard;
