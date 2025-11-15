import React, { useState, useMemo, useEffect } from 'react';
import useAuditLog from '../hooks/useAuditLog';
import useChangeIntegration from '../hooks/useChangeIntegration';
import useChangeManagement from '../hooks/useChangeManagement';
import subscriptionService from '../services/SubscriptionService';
import { getRequiredApprover } from '../utils/changeAuthority';
import { getFunctionalRoleLabel } from '../constants/unifiedRoles';
import CCBPanel from './change-management/CCBPanel';
import ImpactAnalysisPanel from './change-management/ImpactAnalysisPanel';
import ImpactAnalysisForm from './change-management/ImpactAnalysisForm';
import AlternativesPanel from './change-management/AlternativesPanel';
import AlternativeSelectionPanel from './change-management/AlternativeSelectionPanel';
import ChangeMetricsDashboard from './change-management/ChangeMetricsDashboard';

const ChangeManagement = ({ 
  currentProjectId,
  projects,
  workPackages,
  tasks,
  purchaseOrders,
  advances,
  invoices,
  contracts,
  onUpdateProject
}) => {
  const [changes, setChanges] = useState([]);
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [editingChange, setEditingChange] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showChangeDetails, setShowChangeDetails] = useState(null);
  const [showCCBPanel, setShowCCBPanel] = useState(false);
  const [showImpactAnalysis, setShowImpactAnalysis] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);

  const { addAuditEvent } = useAuditLog(currentProjectId);
  const { applyChangeToProject } = useChangeIntegration(currentProjectId, onUpdateProject);

  // Hook para permisos y gestión de usuarios
  const {
    permissions,
    permissionsLoading,
    canCreate,
    canApprove,
    canReject,
    canImplement,
    canVoteInCCB,
    canAssign,
    getCurrentUserInfo,
    enrichChangeWithUser,
    notifyAssignment,
    notifyApproval,
    notifyCCBMembers,
    notifyStatusChange,
    processing: notificationProcessing
  } = useChangeManagement(currentProjectId);

  // Obtener proyecto actual
  const currentProject = useMemo(() =>
    projects?.find(p => p.id === currentProjectId),
    [projects, currentProjectId]
  );

  // Verificar modo read-only al cargar
  useEffect(() => {
    const checkReadOnlyMode = async () => {
      if (currentProject?.organizationId) {
        try {
          const editPermission = await subscriptionService.canEdit(currentProject.organizationId);
          setIsReadOnlyMode(!editPermission.allowed);
        } catch (error) {
          console.error('[READ-ONLY MODE] Error verificando permisos:', error);
          setIsReadOnlyMode(false);
        }
      }
    };
    checkReadOnlyMode();
  }, [currentProject?.organizationId]);

  // Verificar que haya proyecto seleccionado
  useEffect(() => {
    if (!currentProjectId) {
      console.warn('⚠️ No hay proyecto seleccionado para Control de Cambios');
    }
  }, [currentProjectId]);

  // Estados para el formulario de cambio
  const [changeForm, setChangeForm] = useState({
    title: '',
    description: '',
    justification: '',
    impactScope: '',
    impactSchedule: '',
    impactCost: '',
    impactQuality: '',
    impactResources: '',
    priority: 'medium',
    category: 'scope',
    requestedBy: '',
    requestedDate: new Date().toISOString().split('T')[0],
    expectedImplementationDate: '',
    attachments: [],
    stakeholders: []
  });

  // Handler genérico para cambios en el formulario
  const handleFormChange = (field, value) => {
    setChangeForm(prev => ({ ...prev, [field]: value }));
  };

  // Cargar cambios desde localStorage
  useEffect(() => {
    if (!currentProjectId) {
      console.warn('No hay proyecto activo, no se pueden cargar cambios');
      setChanges([]);
      return;
    }

    const savedChanges = localStorage.getItem(`project-changes-${currentProjectId}`);
    if (savedChanges) {
      try {
        const parsedChanges = JSON.parse(savedChanges);
        setChanges(Array.isArray(parsedChanges) ? parsedChanges : []);
      } catch (error) {
        console.error('Error parseando cambios guardados:', error);
        setChanges([]);
      }
    } else {
      setChanges([]);
    }
  }, [currentProjectId]);

  // Guardar cambios en localStorage
  const saveChanges = (changesList) => {
    if (!currentProjectId) {
      console.warn('No hay proyecto activo, no se pueden guardar cambios');
      return;
    }
    
    try {
      localStorage.setItem(`project-changes-${currentProjectId}`, JSON.stringify(changesList));
    } catch (error) {
      console.error('Error guardando cambios:', error);
    }
  };

  // Categorías de cambios según PMBOK v7
  const changeCategories = {
    scope: { label: 'Alcance', icon: '📋', color: 'bg-blue-100 text-blue-800' },
    schedule: { label: 'Cronograma', icon: '📅', color: 'bg-green-100 text-green-800' },
    cost: { label: 'Costos', icon: '💰', color: 'bg-yellow-100 text-yellow-800' },
    quality: { label: 'Calidad', icon: '⭐', color: 'bg-purple-100 text-purple-800' },
    resources: { label: 'Recursos', icon: '👥', color: 'bg-indigo-100 text-indigo-800' },
    risk: { label: 'Riesgos', icon: '🛡️', color: 'bg-red-100 text-red-800' },
    procurement: { label: 'Adquisiciones', icon: '🛒', color: 'bg-orange-100 text-orange-800' },
    communication: { label: 'Comunicaciones', icon: '📢', color: 'bg-teal-100 text-teal-800' }
  };

  // Estados de cambio según PMBOK v7 - Workflow mejorado
  const changeStatuses = {
    submitted: { label: 'Solicitado', icon: '📤', color: 'bg-blue-100 text-blue-800' },
    impactAnalysis: { label: 'Análisis de Impacto', icon: '📊', color: 'bg-cyan-100 text-cyan-800' },
    readyForReview: { label: 'Listo para Revisión', icon: '✅', color: 'bg-green-100 text-green-800' },
    underReview: { label: 'En Revisión CCB', icon: '🗳️', color: 'bg-indigo-100 text-indigo-800' },
    approved: { label: 'Aprobado - Seleccionar Alternativa', icon: '✔️', color: 'bg-emerald-100 text-emerald-800' },
    implementing: { label: 'Implementando', icon: '🚀', color: 'bg-purple-100 text-purple-800' },
    implemented: { label: 'Implementado', icon: '✨', color: 'bg-green-100 text-green-800' },
    rejected: { label: 'Rechazado', icon: '❌', color: 'bg-red-100 text-red-800' },
    cancelled: { label: 'Cancelado', icon: '⛔', color: 'bg-gray-100 text-gray-600' }
  };

  // Prioridades de cambio
  const changePriorities = {
    low: { label: 'Baja', icon: '🟢', color: 'bg-green-100 text-green-800' },
    medium: { label: 'Media', icon: '🟡', color: 'bg-yellow-100 text-yellow-800' },
    high: { label: 'Alta', icon: '🟠', color: 'bg-orange-100 text-orange-800' },
    critical: { label: 'Crítica', icon: '🔴', color: 'bg-red-100 text-red-800' }
  };

  // Filtrar cambios
  const filteredChanges = useMemo(() => {
    let filtered = changes;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(change => change.status === filterStatus);
    }
    
    if (filterPriority !== 'all') {
      filtered = filtered.filter(change => change.priority === filterPriority);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(change => 
        change.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        change.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        change.requestedBy.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => new Date(b.requestedDate) - new Date(a.requestedDate));
  }, [changes, filterStatus, filterPriority, searchTerm]);

  // Calcular métricas de cambios
  const changeMetrics = useMemo(() => {
    const totalChanges = changes.length;
    const pendingChanges = changes.filter(c => 
      ['submitted', 'initialReview', 'impactAnalysis', 'underReview', 'approvalPending'].includes(c.status)
    ).length;
    const approvedChanges = changes.filter(c => c.status === 'approved').length;
    const implementedChanges = changes.filter(c => c.status === 'implemented').length;
    const rejectedChanges = changes.filter(c => c.status === 'rejected').length;
    
    // Calcular impacto total en costos
    const totalCostImpact = changes
      .filter(c => c.status === 'approved' || c.status === 'implemented')
      .reduce((sum, c) => sum + (parseFloat(c.impactCost) || 0), 0);
    
    // Calcular impacto total en cronograma (días)
    const totalScheduleImpact = changes
      .filter(c => c.status === 'approved' || c.status === 'implemented')
      .reduce((sum, c) => sum + (parseFloat(c.impactSchedule) || 0), 0);
    
    return {
      totalChanges,
      pendingChanges,
      approvedChanges,
      implementedChanges,
      rejectedChanges,
      totalCostImpact,
      totalScheduleImpact
    };
  }, [changes]);

  // Crear nuevo cambio
  const handleCreateChange = () => {
    // Validar permisos
    if (!canCreate()) {
      alert('No tienes permisos para crear cambios');
      return;
    }

    const costImpact = parseFloat(changeForm.impactCost) || 0;
    const scheduleImpact = parseFloat(changeForm.impactSchedule) || 0;
    const { approver, level } = getRequiredApprover(costImpact, scheduleImpact);
    
    // Enriquecer con información del usuario
    const enrichedForm = enrichChangeWithUser(changeForm);
    
    // Determinar estado inicial
    const needsAnalysis = costImpact >= 25000 || scheduleImpact >= 15;
    const initialStatus = needsAnalysis ? 'impactAnalysis' : 'readyForReview';
    
    const newChange = {
      id: `change-${Date.now()}`,
      projectId: currentProjectId,
      projectName: currentProject?.name || 'Sin nombre',
      ...enrichedForm,
      status: initialStatus,
      requiredApprover: approver,
      authorityLevel: level,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      changeNumber: `CHG-${String(changes.length + 1).padStart(6, '0')}`,
      ccbVotes: null,
      alternatives: null,
      impactAnalysisComplete: false,
      selectedAlternative: null
    };
    
    const updatedChanges = [newChange, ...changes];
    setChanges(updatedChanges);
    saveChanges(updatedChanges);
    
    // Registrar en audit log
    addAuditEvent('change_management', 'change_created', {
      changeId: newChange.id,
      changeTitle: newChange.title,
      changeNumber: newChange.changeNumber,
      createdBy: newChange.createdBy?.userName,
      requiredApprover: approver,
      needsAnalysis
    });
    
    // Resetear formulario
    setChangeForm({
      title: '',
      description: '',
      justification: '',
      impactScope: '',
      impactSchedule: '',
      impactCost: '',
      impactQuality: '',
      impactResources: '',
      priority: 'medium',
      category: 'scope',
      requestedBy: '',
      requestedDate: new Date().toISOString().split('T')[0],
      expectedImplementationDate: '',
      attachments: [],
      stakeholders: []
    });
    
    setShowChangeForm(false);
    
    // Mostrar mensaje según el tipo
    if (needsAnalysis) {
      alert(`✅ Cambio creado. Requiere análisis de impacto completo antes de la revisión.`);
    } else {
      alert(`✅ Cambio creado. Listo para aprobación directa.`);
    }
  };

  // Verificar si el cambio requiere votación CCB
  const requiresCCB = (change) => {
    return change.requiredApprover === 'ccb' || 
           change.requiredApprover === 'executive_board' ||
           change.authorityLevel === 'high' ||
           change.authorityLevel === 'critical' ||
           (parseFloat(change.impactCost) || 0) > 100000 ||
           (parseFloat(change.impactSchedule) || 0) > 30;
  };

  // Verificar si el cambio requiere análisis de impacto completo
  const needsImpactAnalysis = (change) => {
    const cost = parseFloat(change.impactCost) || 0;
    const schedule = parseFloat(change.impactSchedule) || 0;
    
    // Cambios pequeños NO necesitan análisis
    return cost >= 25000 || schedule >= 15;
  };

  // Verificar si el análisis está completo
  const isImpactAnalysisComplete = (change) => {
    if (!needsImpactAnalysis(change)) return true;
    
    // Verificar que tenga análisis completo
    const hasCompleteAnalysis = change.impactAnalysisComplete === true;
    
    // Verificar que tenga mínimo 3 alternativas
    const hasAlternatives = change.alternatives && change.alternatives.length >= 3;
    
    return hasCompleteAnalysis && hasAlternatives;
  };

  // Marcar análisis de impacto como completo
  const handleCompleteImpactAnalysis = (changeId) => {
    const change = changes.find(c => c.id === changeId);
    if (!change) return;
    
    // Verificar que tenga alternativas
    if (!change.alternatives || change.alternatives.length < 3) {
      alert('❌ Debes agregar al menos 3 alternativas antes de completar el análisis');
      return;
    }
    
    const updatedChanges = changes.map(c => {
      if (c.id === changeId) {
        return {
          ...c,
          status: 'readyForReview',
          impactAnalysisComplete: true,
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    });
    
    setChanges(updatedChanges);
    saveChanges(updatedChanges);
    
    addAuditEvent('change_management', 'impact_analysis_completed', {
      changeId,
      changeNumber: change.changeNumber,
      alternativesCount: change.alternatives.length
    });
    
    alert('✅ Análisis de impacto completado. El cambio está listo para revisión.');
  };

  // Seleccionar alternativa después de aprobar
  const handleSelectAlternativeForChange = (changeId, alternativeIndex) => {
    const change = changes.find(c => c.id === changeId);
    if (!change) return;
    
    if (change.status !== 'approved') {
      alert('❌ Solo se puede seleccionar alternativa después de aprobar el cambio');
      return;
    }
    
    const updatedChanges = changes.map(c => {
      if (c.id === changeId) {
        return {
          ...c,
          selectedAlternative: alternativeIndex,
          status: 'implementing',
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    });
    
    setChanges(updatedChanges);
    saveChanges(updatedChanges);
    
    addAuditEvent('change_management', 'alternative_selected', {
      changeId,
      changeNumber: change.changeNumber,
      alternativeIndex,
      alternativeName: change.alternatives[alternativeIndex]?.name
    });
    
    alert('✅ Alternativa seleccionada. El cambio pasa a implementación.');
  };

  // Actualizar estado de cambio
  const handleUpdateChangeStatus = async (changeId, newStatus, comments = '') => {
    const change = changes.find(c => c.id === changeId);
    if (!change) return;
    
    const oldStatus = change.status;
    
    // Validar permisos según la acción
    if (newStatus === 'approved' && !canApprove(change)) {
      alert('No tienes permisos para aprobar este cambio o excede tu límite de aprobación');
      return;
    }
    
    if (newStatus === 'rejected' && !canReject()) {
      alert('No tienes permisos para rechazar cambios');
      return;
    }
    
    if (newStatus === 'implemented' && !canImplement()) {
      alert('No tienes permisos para implementar cambios');
      return;
    }
    
    const userInfo = getCurrentUserInfo();
    
    const updatedChanges = changes.map(c => {
      if (c.id === changeId) {
        const updatedChange = {
          ...c,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          statusHistory: [
            ...(c.statusHistory || []),
            {
              status: newStatus,
              date: new Date().toISOString(),
              comments,
              updatedBy: userInfo?.userName || 'Sistema',
              userEmail: userInfo?.userEmail
            }
          ]
        };
        
        // Si se aprueba, actualizar el proyecto
        if (newStatus === 'approved') {
          applyChangeToProject(updatedChange, currentProject);
        }
        
        return updatedChange;
      }
      return c;
    });
    
    setChanges(updatedChanges);
    saveChanges(updatedChanges);
    
    // Registrar en audit log
    addAuditEvent('change_management', 'change_status_updated', {
      changeId,
      oldStatus,
      newStatus,
      comments,
      updatedBy: userInfo?.userName
    });
    
    // Notificar cambio de estado
    if (change.createdBy?.userEmail) {
      await notifyStatusChange(
        { ...change, changeNumber: change.changeNumber, title: change.title },
        oldStatus,
        newStatus,
        [{ email: change.createdBy.userEmail, id: change.createdBy.userId }]
      );
    }
  };

  // Actualizar votos CCB
  const handleUpdateCCBVotes = (changeId, votes) => {
    const updatedChanges = changes.map(change => {
      if (change.id === changeId) {
        return { ...change, ccbVotes: votes };
      }
      return change;
    });
    
    setChanges(updatedChanges);
    saveChanges(updatedChanges);
  };

  // Actualizar alternativas
  const handleUpdateAlternatives = (changeId, alternatives) => {
    const updatedChanges = changes.map(change => {
      if (change.id === changeId) {
        return { ...change, alternatives };
      }
      return change;
    });
    
    setChanges(updatedChanges);
    saveChanges(updatedChanges);
  };

  // Obtener color de impacto
  const getImpactColor = (impact) => {
    if (impact < 10) return 'text-green-600';
    if (impact < 25) return 'text-yellow-600';
    if (impact < 50) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {!currentProjectId ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-yellow-800 mb-2">
              No hay proyecto seleccionado
            </h3>
            <p className="text-yellow-700">
              Selecciona un proyecto desde el menú principal para gestionar sus cambios
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-100 rounded-2xl shadow-lg p-8 mb-8 text-gray-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100/30 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-100/30 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-white/60 backdrop-blur rounded-2xl p-3 mr-4 shadow-sm">
                  <span className="text-3xl">🔄</span>
                </div>
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <h1 className="text-4xl font-bold text-gray-800">Control de Cambios</h1>
                    {currentProject && (
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        📁 {currentProject.name}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-lg">
                    Gestión integral de cambios del proyecto según PMBOK v7
                  </p>
                  <div className="mt-4 flex items-center space-x-6 text-sm text-gray-700">
                    <span className="flex items-center space-x-1">
                      <span className="text-gray-500">📋</span>
                      <span>Total: {changeMetrics.totalChanges}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="text-gray-500">⏳</span>
                      <span>Pendientes: {changeMetrics.pendingChanges}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="text-gray-500">✅</span>
                      <span>Aprobados: {changeMetrics.approvedChanges}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="text-gray-500">🚀</span>
                      <span>Implementados: {changeMetrics.implementedChanges}</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setShowChangeForm(true)}
                disabled={!canCreate() || isReadOnlyMode}
                className={`px-8 py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-semibold border ${
                  canCreate() && !isReadOnlyMode
                    ? 'bg-white text-purple-700 hover:bg-purple-50 border-purple-200'
                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                }`}
                title={isReadOnlyMode ? 'No disponible (modo solo lectura)' : !canCreate() ? 'No tienes permisos para crear cambios' : ''}
              >
                📝 Solicitar Cambio
              </button>
              
              {permissions.changeRole && (
                <div className="text-sm bg-white/80 px-4 py-2 rounded-lg border border-purple-200">
                  <div className="text-gray-600">Tu rol:</div>
                  <div className="font-semibold text-purple-700">
                    {getFunctionalRoleLabel(permissions.functionalRole) || permissions.changeRole}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Métricas principales con dashboard mejorado */}
        <div className="mb-8">
          <ChangeMetricsDashboard changes={changes} />
        </div>

        {/* Métricas tradicionales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{changeMetrics.totalChanges}</div>
                <div className="text-sm text-gray-600">Total de Cambios</div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <span className="text-2xl">🔄</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{changeMetrics.pendingChanges}</div>
                <div className="text-sm text-gray-600">Pendientes</div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <span className="text-2xl">⏳</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">${changeMetrics.totalCostImpact.toFixed(0)}K</div>
                <div className="text-sm text-gray-600">Impacto en Costos</div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-800">{changeMetrics.totalScheduleImpact}</div>
                <div className="text-sm text-gray-600">Días de Impacto</div>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <span className="text-2xl">📅</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">🔍</span>
                </div>
                <input
                  type="text"
                  placeholder="Buscar cambios por título, descripción o solicitante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
            
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              >
                <option value="all">Todos los Estados</option>
                {Object.entries(changeStatuses).map(([key, status]) => (
                  <option key={key} value={key}>
                    {status.icon} {status.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              >
                <option value="all">Todas las Prioridades</option>
                {Object.entries(changePriorities).map(([key, priority]) => (
                  <option key={key} value={key}>
                    {priority.icon} {priority.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Lista de cambios */}
        <div className="space-y-4">
          {filteredChanges.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="text-6xl mb-6">🔍</div>
              <div className="text-2xl font-bold text-gray-700 mb-2">
                No hay cambios registrados
              </div>
              <div className="text-gray-500">
                {searchTerm || filterStatus !== 'all' || filterPriority !== 'all' 
                  ? 'No se encontraron cambios con los filtros aplicados'
                  : 'Comienza solicitando el primer cambio del proyecto'
                }
              </div>
            </div>
          ) : (
            filteredChanges.map((change) => (
              <div key={change.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${changeCategories[change.category]?.color}`}>
                          {changeCategories[change.category]?.icon} {changeCategories[change.category]?.label}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${changeStatuses[change.status]?.color}`}>
                          {changeStatuses[change.status]?.icon} {changeStatuses[change.status]?.label}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${changePriorities[change.priority]?.color}`}>
                          {changePriorities[change.priority]?.icon} {changePriorities[change.priority]?.label}
                        </span>
                        
                        {/* Badge CCB Required */}
                        {requiresCCB(change) && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-300">
                            🗳️ Requiere CCB
                          </span>
                        )}
                        
                        <span className="text-sm text-gray-500 font-mono">
                          {change.changeNumber}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">{change.title}</h3>
                      <p className="text-gray-600 mb-3 line-clamp-2">{change.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Solicitante:</span>
                          <div className="font-medium">{change.requestedBy}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Fecha:</span>
                          <div className="font-medium">{new Date(change.requestedDate).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Impacto Costo:</span>
                          <div className={`font-medium ${getImpactColor(change.impactCost)}`}>
                            ${change.impactCost || 0}K
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Impacto Cronograma:</span>
                          <div className={`font-medium ${getImpactColor(change.impactSchedule)}`}>
                            {change.impactSchedule || 0} días
                          </div>
                        </div>
                      </div>
                      
                      {change.requiredApprover && (
                        <div className="mt-3 text-xs text-gray-600">
                          🎯 Aprobador requerido: <span className="font-medium">{change.requiredApprover}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2 ml-4">
                      <button
                        onClick={() => setShowChangeDetails(change)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver detalles"
                      >
                        👁️
                      </button>
                      
                      {/* ANÁLISIS DE IMPACTO */}
                      {change.status === 'impactAnalysis' && (
                        <button
                          onClick={() => setShowChangeDetails(change)}
                          className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm"
                        >
                          📊 Completar Análisis
                        </button>
                      )}
                      
                      {/* LISTO PARA REVISIÓN: Aprobación directa o enviar a CCB */}
                      {change.status === 'readyForReview' && !requiresCCB(change) && (
                        <>
                          {canApprove(change) && (
                            <button 
                              onClick={() => handleUpdateChangeStatus(change.id, 'approved', 'Cambio aprobado directamente')}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                            >
                              ✅ Aprobar
                            </button>
                          )}
                          {canReject() && (
                            <button
                              onClick={() => handleUpdateChangeStatus(change.id, 'rejected', 'Cambio rechazado')}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                            >
                              ❌ Rechazar
                            </button>
                          )}
                        </>
                      )}
                      
                      {/* LISTO PARA REVISIÓN: Enviar a CCB */}
                      {change.status === 'readyForReview' && requiresCCB(change) && (
                        <button
                          onClick={() => handleUpdateChangeStatus(change.id, 'underReview', 'Enviado a CCB para votación')}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                        >
                          🗳️ Enviar a CCB
                        </button>
                      )}
                      
                      {/* EN REVISIÓN CCB: Ver panel */}
                      {change.status === 'underReview' && (
                        <button
                          onClick={() => setShowChangeDetails(change)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                        >
                          🗳️ Ver Panel CCB
                        </button>
                      )}
                      
                      {/* APROBADO: Seleccionar alternativa */}
                      {change.status === 'approved' && !change.selectedAlternative && (
                        <button
                          onClick={() => setShowChangeDetails(change)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm animate-pulse"
                        >
                          🎯 Seleccionar Alternativa
                        </button>
                      )}
                      
                      {/* IMPLEMENTANDO: Completar */}
                      {change.status === 'implementing' && canImplement() && (
                        <button
                          onClick={() => handleUpdateChangeStatus(change.id, 'implemented', 'Cambio implementado exitosamente')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          ✨ Completar Implementación
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal de formulario de cambio */}
        {showChangeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-gray-800">📝 Solicitar Cambio</h2>
                <button
                  onClick={() => setShowChangeForm(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); handleCreateChange(); }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📋 Título del Cambio *
                    </label>
                    <input
                      type="text"
                      required
                      value={changeForm.title}
                      onChange={(e) => handleFormChange('title', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                      placeholder="Título descriptivo del cambio"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🏷️ Categoría *
                    </label>
                    <select
                      required
                      value={changeForm.category}
                      onChange={(e) => handleFormChange('category', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    >
                      {Object.entries(changeCategories).map(([key, category]) => (
                        <option key={key} value={key}>
                          {category.icon} {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ⚡ Prioridad *
                    </label>
                    <select
                      required
                      value={changeForm.priority}
                      onChange={(e) => handleFormChange('priority', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    >
                      {Object.entries(changePriorities).map(([key, priority]) => (
                        <option key={key} value={key}>
                          {priority.icon} {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      👤 Solicitante *
                    </label>
                    <input
                      type="text"
                      required
                      value={changeForm.requestedBy}
                      onChange={(e) => handleFormChange('requestedBy', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                      placeholder="Nombre del solicitante"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📝 Descripción Detallada *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={changeForm.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
                    placeholder="Describe detalladamente el cambio solicitado, incluyendo el contexto y la necesidad"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🎯 Justificación del Cambio *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={changeForm.justification}
                    onChange={(e) => handleFormChange('justification', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
                    placeholder="Explica por qué es necesario este cambio y qué beneficios aportará"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      💰 Impacto en Costos (K)
                    </label>
                    <input
                      type="number"
                      value={changeForm.impactCost}
                      onChange={(e) => handleFormChange('impactCost', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                      placeholder="0"
                      min="0"
                      step="0.1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📅 Impacto en Cronograma (días)
                    </label>
                    <input
                      type="number"
                      value={changeForm.impactSchedule}
                      onChange={(e) => handleFormChange('impactSchedule', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                      placeholder="0"
                      min="0"
                      step="0.5"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📋 Impacto en Alcance
                  </label>
                  <textarea
                    rows={2}
                    value={changeForm.impactScope}
                    onChange={(e) => handleFormChange('impactScope', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
                    placeholder="Describe el impacto en el alcance del proyecto"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📅 Fecha de Solicitud
                    </label>
                    <input
                      type="date"
                      value={changeForm.requestedDate}
                      onChange={(e) => handleFormChange('requestedDate', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🎯 Fecha Esperada de Implementación
                    </label>
                    <input
                      type="date"
                      value={changeForm.expectedImplementationDate}
                      onChange={(e) => handleFormChange('expectedImplementationDate', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setShowChangeForm(false)}
                    className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    📤 Enviar Solicitud
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        )}

        {/* Modal de detalles del cambio */}
        {showChangeDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto my-8">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-gray-800">
                  📋 Detalles del Cambio: {showChangeDetails.changeNumber}
                </h2>
                <button
                  onClick={() => setShowChangeDetails(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Información básica */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">📋 Información Básica</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Título:</span>
                      <div className="font-medium">{showChangeDetails.title}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Categoría:</span>
                      <div className="font-medium">
                        {changeCategories[showChangeDetails.category]?.icon} {changeCategories[showChangeDetails.category]?.label}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Prioridad:</span>
                      <div className="font-medium">
                        {changePriorities[showChangeDetails.priority]?.icon} {changePriorities[showChangeDetails.priority]?.label}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Estado:</span>
                      <div className="font-medium">
                        {changeStatuses[showChangeDetails.status]?.icon} {changeStatuses[showChangeDetails.status]?.label}
                      </div>
                    </div>
                    {showChangeDetails.requiredApprover && (
                      <div className="md:col-span-2">
                        <span className="text-sm text-gray-500">Aprobador Requerido:</span>
                        <div className="font-medium text-purple-700">
                          🎯 {showChangeDetails.requiredApprover} (Nivel: {showChangeDetails.authorityLevel})
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Descripción y justificación */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">📝 Descripción y Justificación</h3>
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-500">Descripción:</span>
                      <div className="mt-1">{showChangeDetails.description}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Justificación:</span>
                      <div className="mt-1">{showChangeDetails.justification}</div>
                    </div>
                  </div>
                </div>
                
                {/* Análisis de Impacto */}
                {currentProject && (
                  <>
                    {/* Si está en análisis: Mostrar formulario */}
                    {showChangeDetails.status === 'impactAnalysis' ? (
                      <ImpactAnalysisForm
                        change={showChangeDetails}
                        onComplete={() => handleCompleteImpactAnalysis(showChangeDetails.id)}
                        onUpdateAlternatives={(alts) => handleUpdateAlternatives(showChangeDetails.id, alts)}
                      />
                    ) : (
                      /* Si ya pasó el análisis: Mostrar panel de resultados */
                      <ImpactAnalysisPanel 
                        change={showChangeDetails} 
                        project={currentProject}
                      />
                    )}
                  </>
                )}
                
                {/* CCB Panel */}
                {showChangeDetails.status === 'underReview' && (
                  <CCBPanel 
                    change={showChangeDetails}
                    currentUserPermissions={permissions}
                    onUpdateVotes={(votes) => handleUpdateCCBVotes(showChangeDetails.id, votes)}
                  />
                )}
                
                {/* Análisis de Alternativas O Selección */}
                {showChangeDetails.status === 'approved' && !showChangeDetails.selectedAlternative ? (
                  /* Si está aprobado: Mostrar panel de selección */
                  <AlternativeSelectionPanel
                    change={showChangeDetails}
                    onSelectAlternative={(index) => handleSelectAlternativeForChange(showChangeDetails.id, index)}
                  />
                ) : (
                  /* Caso contrario: Mostrar panel normal de alternativas */
                  <AlternativesPanel
                    change={showChangeDetails}
                    currentUserPermissions={permissions}
                    onUpdateAlternatives={(alts) => handleUpdateAlternatives(showChangeDetails.id, alts)}
                    onSelectAlternative={(index) => handleSelectAlternativeForChange(showChangeDetails.id, index)}
                    canSelect={false}
                  />
                )}
                
                {/* Historial de estados */}
                {showChangeDetails.statusHistory && showChangeDetails.statusHistory.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 Historial de Estados</h3>
                    <div className="space-y-3">
                      {showChangeDetails.statusHistory.map((status, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${changeStatuses[status.status]?.color}`}>
                            {changeStatuses[status.status]?.icon} {changeStatuses[status.status]?.label}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(status.date).toLocaleDateString()}
                          </span>
                          {status.comments && (
                            <span className="text-sm text-gray-600">- {status.comments}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Acciones */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <button
                    onClick={() => setShowChangeDetails(null)}
                    className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </>
      )}
      </div>
    </div>
  );
};

export default ChangeManagement;