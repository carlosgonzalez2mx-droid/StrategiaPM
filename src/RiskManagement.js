import React, { useState, useEffect, useMemo, useRef } from 'react';
import FileManager from './FileManager';
// import { useProjectContext } from '../src/contexts/ProjectContext';
// import { RiskCalculationService } from '../src/services/riskCalculationService';
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  Activity,
  Target,
  BarChart3,
  Download,
  Upload,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  DollarSign,
  Calendar,
  Users,
  Zap,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronRight,
  Shuffle,
  Clock,
  FileText,
  PieChart,
  X,
  Save,
  Search
} from 'lucide-react';

const RiskManagement = ({ 
  projects, 
  currentProjectId, 
  setCurrentProjectId,
  risks,
  setRisks
}) => {
  // Los riesgos ahora vienen como props desde App.js
  console.log('RiskManagement - risks recibidos:', risks);
  console.log('RiskManagement - tipo de risks:', typeof risks);
  console.log('RiskManagement - es array:', Array.isArray(risks));

  // Helper function para clonar editingRisk con una propiedad actualizada
  const updateEditingRisk = (property, value) => {
    setEditingRisk({
      id: editingRisk.id,
      code: editingRisk.code,
      name: editingRisk.name,
      description: editingRisk.description,
      category: editingRisk.category,
      phase: editingRisk.phase,
      probability: editingRisk.probability,
      impact: editingRisk.impact,
      priority: editingRisk.priority,
      status: editingRisk.status,
      owner: editingRisk.owner,
      costImpact: editingRisk.costImpact,
      scheduleImpact: editingRisk.scheduleImpact,
      monitoringFrequency: editingRisk.monitoringFrequency,
      response: editingRisk.response,
      reviewDate: editingRisk.reviewDate,
      responsePlan: editingRisk.responsePlan,
      contingencyPlan: editingRisk.contingencyPlan,
      triggerConditions: editingRisk.triggerConditions,
      projectId: editingRisk.projectId,
      createdAt: editingRisk.createdAt,
      updatedAt: editingRisk.updatedAt,
      [property]: value
    });
  };

  // Estados para gestión de riesgos
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [viewMode, setViewMode] = useState('matrix');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showOpportunities, setShowOpportunities] = useState(false);
  const [monteCarloResults, setMonteCarloResults] = useState(null);
  
  // Estados para formularios
  const [showRiskForm, setShowRiskForm] = useState(false);
  const [editingRisk, setEditingRisk] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFileManager, setShowFileManager] = useState(false);
  
  const fileInputRef = useRef(null);

  // Configuración de categorías y respuestas según PMBOK
  const categories = {
    technical: { label: 'Técnico', color: 'blue', icon: Zap },
    financial: { label: 'Financiero', color: 'green', icon: DollarSign },
    organizational: { label: 'Organizacional', color: 'purple', icon: Users },
    external: { label: 'Externo', color: 'orange', icon: AlertCircle },
    schedule: { label: 'Cronograma', color: 'yellow', icon: Calendar },
    resource: { label: 'Recursos', color: 'indigo', icon: Users },
    quality: { label: 'Calidad', color: 'pink', icon: Target },
    scope: { label: 'Alcance', color: 'teal', icon: FileText }
  };

  const responseStrategies = {
    avoid: { label: 'Evitar', color: 'red', description: 'Eliminar la amenaza o proteger el proyecto' },
    mitigate: { label: 'Mitigar', color: 'yellow', description: 'Reducir probabilidad o impacto' },
    transfer: { label: 'Transferir', color: 'blue', description: 'Trasladar el riesgo a un tercero' },
    accept: { label: 'Aceptar', color: 'green', description: 'Reconocer el riesgo sin acción' },
    exploit: { label: 'Explotar', color: 'emerald', description: 'Aprovechar la oportunidad' },
    enhance: { label: 'Mejorar', color: 'cyan', description: 'Aumentar probabilidad o impacto positivo' },
    share: { label: 'Compartir', color: 'violet', description: 'Compartir la oportunidad con terceros' }
  };

  const phases = {
    initiation: 'Iniciación',
    planning: 'Planificación',
    execution: 'Ejecución',
    monitoring: 'Monitoreo y Control',
    closure: 'Cierre'
  };

  const monitoringFrequencies = {
    daily: 'Diario',
    weekly: 'Semanal',
    biweekly: 'Quincenal',
    monthly: 'Mensual',
    quarterly: 'Trimestral'
  };

  // Cálculos de métricas
  const riskMetrics = useMemo(() => {
    // Validación de seguridad para risks
    if (!risks || !Array.isArray(risks)) {
      return {
        totalRisks: 0,
        activeRisks: 0,
        highPriority: 0,
        totalExposure: 0,
        avgRiskScore: '0.00',
        mitigatedRisks: 0,
        occurredRisks: 0
      };
    }
    
    const activeRisks = risks.filter(r => r.status === 'active');
    const highPriority = activeRisks.filter(r => r.priority === 'high').length;
    const totalExposure = activeRisks.reduce((sum, r) => sum + (r.costImpact * r.probability), 0);
    const avgRiskScore = activeRisks.reduce((sum, r) => sum + r.riskScore, 0) / activeRisks.length;
    const mitigatedRisks = risks.filter(r => r.status === 'mitigated').length;
    const occurredRisks = risks.filter(r => r.actualOccurred).length;
    
    return {
      totalRisks: risks.length,
      activeRisks: activeRisks.length,
      highPriority,
      totalExposure: Math.round(totalExposure),
      avgRiskScore: avgRiskScore.toFixed(2),
      mitigatedRisks,
      occurredRisks
    };
  }, [risks]);

  // Obtener proyecto actual
  const currentProject = projects?.find(p => p.id === currentProjectId);

  // Función para calcular reserva de contingencia basada en riesgos activos
  const calculateContingencyReserve = () => {
    // Validación de seguridad para risks
    if (!risks || !Array.isArray(risks)) return currentProject?.budget * 0.05 || 0;
    
    const activeRisks = risks.filter(r => r.status === 'active');
    if (activeRisks.length === 0) return currentProject?.budget * 0.05 || 0; // 5% base si no hay riesgos
    
    // Cálculo base (5% del presupuesto)
    const baseContingency = (currentProject?.budget || 0) * 0.05;
    
    // Cálculo basado en riesgos (suma de impactos esperados)
    const riskBasedContingency = activeRisks.reduce((sum, risk) => {
      const expectedImpact = risk.probability * risk.costImpact;
      // Aplicar factor de prioridad
      const priorityFactor = risk.priority === 'high' ? 1.5 : risk.priority === 'medium' ? 1.2 : 1.0;
      return sum + (expectedImpact * priorityFactor);
    }, 0);
    
    return baseContingency + riskBasedContingency;
  };

  // Función para calcular reserva de gestión
  const calculateManagementReserve = () => {
    if (!currentProject) return 0;
    const projectBudget = currentProject.budget || 0;
    
    // Validación de seguridad para risks
    if (!risks || !Array.isArray(risks)) return projectBudget * 0.1;
    
    const activeRisks = risks.filter(r => r.status === 'active');
    
    // Base 10% del presupuesto
    let managementReserve = projectBudget * 0.1;
    
    // Ajustar según complejidad de riesgos
    if (activeRisks.length > 10) {
      managementReserve *= 1.2; // 20% adicional
    } else if (activeRisks.length > 5) {
      managementReserve *= 1.1; // 10% adicional
    }
    
    // Ajustar por riesgos de alta prioridad
    const highPriorityRisks = activeRisks.filter(r => r.priority === 'high').length;
    if (highPriorityRisks > 3) {
      managementReserve *= 1.15; // 15% adicional
    }
    
    return managementReserve;
  };

  // Función para calcular presupuesto total del proyecto
  const calculateTotalProjectBudget = () => {
    if (!currentProject) return 0;
    const baseBudget = currentProject.budget || 0;
    
    // Validación de seguridad para risks
    if (!risks || !Array.isArray(risks)) return baseBudget * 1.15; // Base + 15% estándar
    
    const contingencyReserve = calculateContingencyReserve();
    const managementReserve = calculateManagementReserve();
    return baseBudget + contingencyReserve + managementReserve;
  };

  // Funciones para gestión de riesgos
  const handleAddRisk = () => {
    setEditingRisk({
      id: `R${Date.now()}`,
      code: '',
      name: '',
      description: '',
      category: 'technical',
      phase: 'planning',
      probability: 0.5,
      impact: 0.5,
      riskScore: 0.25,
      status: 'active',
      priority: 'medium',
      owner: '',
      identifiedDate: new Date().toISOString().split('T')[0],
      reviewDate: '',
      response: 'mitigate',
      responsePlan: '',
      contingencyPlan: '',
      triggerConditions: '',
      costImpact: 0,
      scheduleImpact: 0,
      residualProbability: 0,
      residualImpact: 0,
      monitoringFrequency: 'weekly',
      earlyWarnings: [],
      actualOccurred: false,
      stakeholders: [],
      assumptions: [],
      constraints: []
    });
    setShowRiskForm(true);
  };

  const handleEditRisk = (risk) => {
    setEditingRisk(Object.assign({}, risk));
    setShowRiskForm(true);
  };

  const handleDeleteRisk = (riskId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este riesgo?')) {
      // Validación de seguridad para risks
      if (risks && Array.isArray(risks)) {
        setRisks(risks.filter(r => r.id !== riskId));
      }
    }
  };

  const handleSaveRisk = () => {
    if (editingRisk) {
      // Calcular risk score
      const riskScore = editingRisk.probability * editingRisk.impact;
      const updatedRisk = Object.assign({}, editingRisk, { riskScore });
      
      // Validación de seguridad para risks
      if (!risks || !Array.isArray(risks)) {
        setRisks([updatedRisk]);
      } else if (risks.find(r => r.id === editingRisk.id)) {
        // Actualizar riesgo existente
        setRisks(risks.map(r => r.id === editingRisk.id ? updatedRisk : r));
      } else {
        // Agregar nuevo riesgo
        const newRisks = risks.slice();
        newRisks.push(updatedRisk);
        setRisks(newRisks);
      }
      
      setShowRiskForm(false);
      setEditingRisk(null);
    }
  };

  const handleCancelEdit = () => {
    setShowRiskForm(false);
    setEditingRisk(null);
  };

  // Filtrar riesgos
  const filteredRisks = useMemo(() => {
    // Validación de seguridad para risks
    if (!risks || !Array.isArray(risks)) return [];
    
    return risks.filter(risk => {
      const matchesCategory = filterCategory === 'all' || risk.category === filterCategory;
      const matchesStatus = filterStatus === 'all' || risk.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || risk.priority === filterPriority;
      const matchesSearch = risk.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           risk.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           risk.code.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesCategory && matchesStatus && matchesPriority && matchesSearch;
    });
  }, [risks, filterCategory, filterStatus, filterPriority, searchTerm]);

  // Análisis Monte Carlo mejorado
  const runMonteCarloAnalysis = () => {
    if (!currentProject || !risks || !Array.isArray(risks)) return;
    
    const iterations = 10000;
    const projectBudget = currentProject.budget || 0;
    const activeRisks = risks.filter(risk => risk.status === 'active');
    
    if (activeRisks.length === 0) {
      setMonteCarloResults({
        averageCost: projectBudget,
        p50: projectBudget,
        p80: projectBudget,
        p95: projectBudget,
        iterations,
        note: 'No hay riesgos activos para simular'
      });
      return;
    }

    let totalCost = 0;
    let costSamples = [];
    
    for (let i = 0; i < iterations; i++) {
      let iterationCost = projectBudget;
      
      // Simular ocurrencia de riesgos
      activeRisks.forEach(risk => {
        if (Math.random() < risk.probability) {
          // Aplicar variación en el impacto del riesgo (±20%)
          const variation = 0.8 + (Math.random() * 0.4);
          iterationCost += risk.costImpact * variation;
        }
      });
      
      totalCost += iterationCost;
      costSamples.push(iterationCost);
    }
    
    // Calcular estadísticas
    costSamples.sort((a, b) => a - b);
    const averageCost = totalCost / iterations;
    const p50 = costSamples[Math.floor(iterations * 0.5)];
    const p80 = costSamples[Math.floor(iterations * 0.8)];
    const p95 = costSamples[Math.floor(iterations * 0.95)];
    
    setMonteCarloResults({
      averageCost,
      p50,
      p80,
      p95,
      iterations,
      riskCount: activeRisks.length,
      baseBudget: projectBudget,
      riskImpact: averageCost - projectBudget
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Gestión de Riesgos</h1>
              <p className="text-red-100">Identificación, análisis y respuesta a riesgos del proyecto según PMBOK</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={currentProjectId || ''}
                onChange={(e) => setCurrentProjectId(e.target.value)}
                className="px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <option value="">Seleccionar Proyecto</option>
                {projects?.filter(p => p.status === 'active').map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{riskMetrics.activeRisks}</div>
                <div className="text-sm text-gray-600">Riesgos Activos</div>
              </div>
              <AlertTriangle className="text-red-500" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{riskMetrics.highPriority}</div>
                <div className="text-sm text-gray-600">Alta Prioridad</div>
              </div>
              <Zap className="text-orange-500" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">${(riskMetrics.totalExposure / 1000).toFixed(0)}K</div>
                <div className="text-sm text-gray-600">Exposición Total</div>
              </div>
              <DollarSign className="text-yellow-500" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{riskMetrics.mitigatedRisks}</div>
                <div className="text-sm text-gray-600">Mitigados</div>
              </div>
              <Shield className="text-green-500" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">${(calculateTotalProjectBudget() / 1000).toFixed(0)}K</div>
                <div className="text-sm text-gray-600">Presupuesto Total</div>
              </div>
              <DollarSign className="text-purple-500" size={32} />
            </div>
          </div>
        </div>

        {/* Información de reservas */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Reservas de Costos</h3>
          {currentProject ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">Presupuesto Base</h4>
                <div className="text-2xl font-bold text-gray-900">
                  ${((currentProject.budget || 0) / 1000).toFixed(0)}K
                </div>
                <p className="text-sm text-gray-700 mt-1">
                  Presupuesto asignado al proyecto
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Reserva de Contingencia</h4>
                <div className="text-2xl font-bold text-blue-900">
                  ${(calculateContingencyReserve() / 1000).toFixed(0)}K
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Basada en análisis cuantitativo de riesgos activos
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Reserva de Gestión</h4>
                <div className="text-2xl font-bold text-green-900">
                  ${(calculateManagementReserve(currentProject.budget || 0) / 1000).toFixed(0)}K
                </div>
                <p className="text-sm text-green-700 mt-1">
                  10% del presupuesto base del proyecto
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Shield size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Selecciona un proyecto para ver las reservas de costos</p>
            </div>
          )}
        </div>

        {/* Análisis Monte Carlo */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Análisis Monte Carlo</h3>
            <button
              onClick={runMonteCarloAnalysis}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Shuffle size={16} />
              <span>Ejecutar Simulación</span>
            </button>
          </div>
          
          {monteCarloResults ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Costo Promedio</h4>
                <div className="text-2xl font-bold text-blue-900">
                  ${(monteCarloResults.averageCost / 1000).toFixed(0)}K
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">P50 (Mediana)</h4>
                <div className="text-2xl font-bold text-green-900">
                  ${(monteCarloResults.p50 / 1000).toFixed(0)}K
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">P80</h4>
                <div className="text-2xl font-bold text-yellow-900">
                  ${(monteCarloResults.p80 / 1000).toFixed(0)}K
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">P95</h4>
                <div className="text-2xl font-bold text-red-900">
                  ${(monteCarloResults.p95 / 1000).toFixed(0)}K
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Shuffle size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Ejecuta la simulación Monte Carlo para ver los resultados</p>
            </div>
          )}
        </div>

        {/* Controles de gestión de riesgos */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Gestión de Riesgos</h3>
            <button
              onClick={handleAddRisk}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <Plus size={16} />
              <span>Nuevo Riesgo</span>
            </button>
          </div>

          {/* Filtros y búsqueda */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar riesgos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas las Categorías</option>
              {Object.entries(categories).map(([key, cat]) => (
                <option key={key} value={key}>{cat.label}</option>
              ))}
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los Estados</option>
              <option value="active">Activo</option>
              <option value="mitigated">Mitigado</option>
              <option value="closed">Cerrado</option>
            </select>
            
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas las Prioridades</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
            
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="matrix">Vista Matriz</option>
              <option value="list">Vista Lista</option>
            </select>
          </div>

          {/* Lista de riesgos */}
          <div className="space-y-4">
            {filteredRisks.map(risk => (
              <div key={risk.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-medium text-gray-900">{risk.code}</span>
                      <span className="font-medium text-gray-900">{risk.name}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        risk.priority === 'high' ? 'bg-red-100 text-red-700' :
                        risk.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {risk.priority.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        risk.status === 'active' ? 'bg-red-100 text-red-700' :
                        risk.status === 'mitigated' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {risk.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">{risk.description}</div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-xs text-gray-500">
                      <div>
                        <span className="font-medium">Probabilidad:</span> {(risk.probability * 100).toFixed(0)}%
                      </div>
                      <div>
                        <span className="font-medium">Impacto:</span> {(risk.impact * 100).toFixed(0)}%
                      </div>
                      <div>
                        <span className="font-medium">Costo:</span> ${(risk.costImpact / 1000).toFixed(0)}K
                      </div>
                      <div>
                        <span className="font-medium">Cronograma:</span> {risk.scheduleImpact} días
                      </div>
                      <div>
                        <span className="font-medium">Responsable:</span> {risk.owner}
                      </div>
                      <div>
                        <span className="font-medium">Fase:</span> {phases[risk.phase]}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {risk.riskScore.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">Risk Score</div>
                    </div>
                    
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => handleEditRisk(risk)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteRisk(risk.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredRisks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No se encontraron riesgos con los filtros aplicados</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de formulario de riesgo */}
      {showRiskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingRisk?.id && risks && Array.isArray(risks) && risks.find(r => r.id === editingRisk.id) ? 'Editar Riesgo' : 'Nuevo Riesgo'}
                </h2>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSaveRisk(); }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Información básica */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Información Básica</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Código del Riesgo</label>
                      <input
                        type="text"
                        value={editingRisk?.code || ''}
                        onChange={(e) => setEditingRisk({
                          id: editingRisk.id,
                          code: e.target.value,
                          name: editingRisk.name,
                          description: editingRisk.description,
                          category: editingRisk.category,
                          phase: editingRisk.phase,
                          probability: editingRisk.probability,
                          impact: editingRisk.impact,
                          priority: editingRisk.priority,
                          status: editingRisk.status,
                          owner: editingRisk.owner,
                          costImpact: editingRisk.costImpact,
                          scheduleImpact: editingRisk.scheduleImpact,
                          monitoringFrequency: editingRisk.monitoringFrequency,
                          response: editingRisk.response,
                          reviewDate: editingRisk.reviewDate,
                          responsePlan: editingRisk.responsePlan,
                          contingencyPlan: editingRisk.contingencyPlan,
                          triggerConditions: editingRisk.triggerConditions,
                          projectId: editingRisk.projectId,
                          createdAt: editingRisk.createdAt,
                          updatedAt: editingRisk.updatedAt
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: TECH-001"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Riesgo</label>
                      <input
                        type="text"
                        value={editingRisk?.name || ''}
                        onChange={(e) => setEditingRisk({
                          id: editingRisk.id,
                          code: editingRisk.code,
                          name: e.target.value,
                          description: editingRisk.description,
                          category: editingRisk.category,
                          phase: editingRisk.phase,
                          probability: editingRisk.probability,
                          impact: editingRisk.impact,
                          priority: editingRisk.priority,
                          status: editingRisk.status,
                          owner: editingRisk.owner,
                          costImpact: editingRisk.costImpact,
                          scheduleImpact: editingRisk.scheduleImpact,
                          monitoringFrequency: editingRisk.monitoringFrequency,
                          response: editingRisk.response,
                          reviewDate: editingRisk.reviewDate,
                          responsePlan: editingRisk.responsePlan,
                          contingencyPlan: editingRisk.contingencyPlan,
                          triggerConditions: editingRisk.triggerConditions,
                          projectId: editingRisk.projectId,
                          createdAt: editingRisk.createdAt,
                          updatedAt: editingRisk.updatedAt
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Descripción breve del riesgo"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                      <textarea
                        value={editingRisk?.description || ''}
                        onChange={(e) => updateEditingRisk('description', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Descripción detallada del riesgo"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                        <select
                          value={editingRisk?.category || 'technical'}
                          onChange={(e) => updateEditingRisk('category', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {Object.entries(categories).map(([key, cat]) => (
                            <option key={key} value={key}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fase del Proyecto</label>
                        <select
                          value={editingRisk?.phase || 'planning'}
                          onChange={(e) => updateEditingRisk('phase', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {Object.entries(phases).map(([key, phase]) => (
                            <option key={key} value={key}>{phase}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Análisis cualitativo */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Análisis Cualitativo</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Probabilidad (0-1)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          value={editingRisk?.probability || 0.5}
                          onChange={(e) => updateEditingRisk('probability', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Impacto (0-1)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          value={editingRisk?.impact || 0.5}
                          onChange={(e) => updateEditingRisk('impact', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                        <select
                          value={editingRisk?.priority || 'medium'}
                          onChange={(e) => updateEditingRisk('priority', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="high">Alta</option>
                          <option value="medium">Media</option>
                          <option value="low">Baja</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                        <select
                          value={editingRisk?.status || 'active'}
                          onChange={(e) => updateEditingRisk('status', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="active">Activo</option>
                          <option value="mitigated">Mitigado</option>
                          <option value="closed">Cerrado</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
                      <input
                        type="text"
                        value={editingRisk?.owner || ''}
                        onChange={(e) => updateEditingRisk('owner', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nombre del responsable"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Análisis cuantitativo */}
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Análisis Cuantitativo</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Impacto en Costos (USD)</label>
                      <input
                        type="number"
                        value={editingRisk?.costImpact || 0}
                        onChange={(e) => updateEditingRisk('costImpact', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Impacto en Cronograma (días)</label>
                      <input
                        type="number"
                        value={editingRisk?.scheduleImpact || 0}
                        onChange={(e) => updateEditingRisk('scheduleImpact', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia de Monitoreo</label>
                      <select
                        value={editingRisk?.monitoringFrequency || 'weekly'}
                        onChange={(e) => updateEditingRisk('monitoringFrequency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {Object.entries(monitoringFrequencies).map(([key, freq]) => (
                          <option key={key} value={key}>{freq}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Plan de respuesta */}
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Plan de Respuesta</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estrategia de Respuesta</label>
                      <select
                        value={editingRisk?.response || 'mitigate'}
                        onChange={(e) => updateEditingRisk('response', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {Object.entries(responseStrategies).map(([key, strategy]) => (
                          <option key={key} value={key}>{strategy.label}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {responseStrategies[editingRisk?.response || 'mitigate']?.description}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Revisión</label>
                      <input
                        type="date"
                        value={editingRisk?.reviewDate || ''}
                        onChange={(e) => updateEditingRisk('reviewDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan de Respuesta</label>
                    <textarea
                      value={editingRisk?.responsePlan || ''}
                      onChange={(e) => updateEditingRisk('responsePlan', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe las acciones específicas para responder al riesgo"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan de Contingencia</label>
                    <textarea
                      value={editingRisk?.contingencyPlan || ''}
                      onChange={(e) => updateEditingRisk('contingencyPlan', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe las acciones a tomar si el riesgo se materializa"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Condiciones Trigger</label>
                    <textarea
                      value={editingRisk?.triggerConditions || ''}
                      onChange={(e) => updateEditingRisk('triggerConditions', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe las condiciones que activan el plan de contingencia"
                    />
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Save size={16} />
                    <span>Guardar Riesgo</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Sección de Archivos de Riesgos */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">📎 Evidencia y Documentos de Riesgos</h3>
          <button
            onClick={() => setShowFileManager(!showFileManager)}
            className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:from-red-700 hover:to-orange-700 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {showFileManager ? 'Ocultar' : 'Mostrar'} Gestor
          </button>
        </div>
        
        {showFileManager && (
          <FileManager 
            projectId={currentProjectId}
            category="risk-evidence"
            isContextual={true}
            title="🛡️ Documentos de Riesgos del Proyecto"
            onFileUploaded={() => {
              console.log('✅ Archivo de riesgo subido desde gestión de riesgos');
            }}
          />
        )}
      </div>
    </div>
  );
};

export default RiskManagement;
