import React, { useState, useMemo } from 'react';
import useAuditLog from '../hooks/useAuditLog';
import AuditDiagnostic from './AuditDiagnostic';

const ProjectAudit = ({ 
  projects, 
  currentProjectId, 
  workPackages, 
  risks, 
  tasks, 
  purchaseOrders, 
  advances, 
  invoices, 
  contracts,
  resourceAssignments,
  useSupabase = false
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateFilter, setDateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const currentProject = projects.find(p => p.id === currentProjectId);
  
  // Usar el hook de auditoría
  const { auditLog, isLoading, exportAuditLog, clearAuditLog } = useAuditLog(currentProjectId, useSupabase);

  // Combinar eventos generados automáticamente con el log de auditoría
  const auditEvents = useMemo(() => {
    if (!currentProject) return [];

    const events = [];
    const projectStartDate = new Date(currentProject.updatedAt || currentProject.createdAt);

    // Agregar eventos del log de auditoría
    events.push(...auditLog);

    // Evento de activación del proyecto (si no existe en el log)
    if (currentProject.status === 'active' && !auditLog.find(e => e.action === 'project-activated')) {
      events.push({
        id: `event-${Date.now()}-1`,
        timestamp: new Date().toISOString(), // Usar fecha actual en formato ISO
        category: 'project-status',
        action: 'project-activated',
        description: `Proyecto "${currentProject.name}" activado`,
        details: {
          previousStatus: 'inactive',
          newStatus: 'active',
          manager: currentProject.manager,
          budget: currentProject.budget,
          startDate: currentProject.startDate || 'No definida',
          endDate: currentProject.endDate || 'No definida'
        },
        severity: 'high',
        user: currentProject.manager
      });
    }

    // Eventos de work packages
    workPackages.forEach((wp, index) => {
      if (wp.status === 'active' || wp.status === 'in-progress' || wp.status === 'completed') {
        events.push({
          id: `event-${Date.now()}-wp-${index}`,
          timestamp: new Date().toISOString(), // Usar fecha actual
          category: 'work-package',
          action: 'work-package-created',
          description: `Work Package "${wp.name}" creado`,
          details: {
            workPackageId: wp.id,
            name: wp.name,
            budget: wp.budget,
            status: wp.status,
            progress: wp.progress || 0
          },
          severity: 'medium',
          user: currentProject.manager
        });
      }
    });

    // Eventos de riesgos
    risks.forEach((risk, index) => {
      if (risk.status === 'active' || risk.status === 'mitigated') {
        events.push({
          id: `event-${Date.now()}-risk-${index}`,
          timestamp: new Date(risk.updatedAt || risk.createdAt || projectStartDate),
          category: 'risk',
          action: 'risk-identified',
          description: `Riesgo "${risk.name}" identificado`,
          details: {
            riskId: risk.id,
            name: risk.name,
            probability: risk.probability,
            impact: risk.impact,
            priority: risk.priority,
            status: risk.status
          },
          severity: risk.priority === 'high' ? 'high' : 'medium',
          user: currentProject.manager
        });
      }
    });

    // Eventos de tareas del cronograma
    tasks.forEach((task, index) => {
      if (task.status === 'active' || task.status === 'in-progress' || task.status === 'completed') {
        events.push({
          id: `event-${Date.now()}-task-${index}`,
          timestamp: new Date(task.updatedAt || task.createdAt || projectStartDate),
          category: 'schedule',
          action: 'task-created',
          description: `Tarea "${task.name}" creada`,
          details: {
            taskId: task.id,
            name: task.name,
            duration: task.duration,
            status: task.status,
            startDate: task.startDate,
            endDate: task.endDate
          },
          severity: 'medium',
          user: currentProject.manager
        });
      }
    });

    // Eventos financieros
    purchaseOrders.forEach((po, index) => {
      events.push({
        id: `event-${Date.now()}-po-${index}`,
        timestamp: new Date(po.updatedAt || po.createdAt || projectStartDate),
        category: 'financial',
        action: 'purchase-order-created',
        description: `Orden de Compra "${po.description}" creada`,
        details: {
          poId: po.id,
          description: po.description,
          amount: po.amount,
          status: po.status,
          supplier: po.supplier
        },
        severity: 'high',
        user: currentProject.manager
      });
    });

    advances.forEach((advance, index) => {
      events.push({
        id: `event-${Date.now()}-advance-${index}`,
        timestamp: new Date(advance.updatedAt || advance.createdAt || projectStartDate),
        category: 'financial',
        action: 'advance-created',
        description: `Anticipo "${advance.description}" creado`,
        details: {
          advanceId: advance.id,
          description: advance.description,
          amount: advance.amount,
          status: advance.status,
          recipient: advance.recipient
        },
        severity: 'high',
        user: currentProject.manager
      });
    });

    invoices.forEach((invoice, index) => {
      events.push({
        id: `event-${Date.now()}-invoice-${index}`,
        timestamp: new Date(invoice.updatedAt || invoice.createdAt || projectStartDate),
        category: 'financial',
        action: 'invoice-created',
        description: `Factura "${invoice.description}" creada`,
        details: {
          invoiceId: invoice.id,
          description: invoice.description,
          amount: invoice.amount,
          status: invoice.status,
          supplier: invoice.supplier
        },
        severity: 'high',
        user: currentProject.manager
      });
    });

    // Eventos de contratos
    contracts.forEach((contract, index) => {
      events.push({
        id: `event-${Date.now()}-contract-${index}`,
        timestamp: new Date(contract.updatedAt || contract.createdAt || projectStartDate),
        category: 'contracts',
        action: 'contract-created',
        description: `Contrato "${contract.name}" creado`,
        details: {
          contractId: contract.id,
          name: contract.name,
          value: contract.value,
          status: contract.status,
          contractor: contract.contractor
        },
        severity: 'high',
        user: currentProject.manager
      });
    });

    // Eventos de asignación de recursos
    resourceAssignments.forEach((assignment, index) => {
      events.push({
        id: `event-${Date.now()}-resource-${index}`,
        timestamp: new Date(assignment.updatedAt || assignment.createdAt || projectStartDate),
        category: 'resources',
        action: 'resource-assigned',
        description: `Recurso asignado al proyecto`,
        details: {
          assignmentId: assignment.id,
          resourceId: assignment.resourceId,
          role: assignment.role,
          startDate: assignment.startDate,
          endDate: assignment.endDate,
          allocation: assignment.allocation
        },
        severity: 'medium',
        user: currentProject.manager
      });
    });

    // Ordenar eventos por fecha (más recientes primero)
    return events.sort((a, b) => b.timestamp - a.timestamp);
  }, [currentProject, workPackages, risks, tasks, purchaseOrders, advances, invoices, contracts, resourceAssignments]);

  // Filtrar eventos
  const filteredEvents = useMemo(() => {
    let filtered = auditEvents;

    // Filtro por categoría
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(event => event.category === categoryFilter);
    }

    // Filtro por fecha
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(event => event.timestamp >= filterDate);
          break;
        case 'week':
          filterDate.setDate(filterDate.getDate() - 7);
          filtered = filtered.filter(event => event.timestamp >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(filterDate.getMonth() - 1);
          filtered = filtered.filter(event => event.timestamp >= filterDate);
          break;
        case 'quarter':
          filterDate.setMonth(filterDate.getMonth() - 3);
          filtered = filtered.filter(event => event.timestamp >= filterDate);
          break;
      }
    }

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(event => 
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.details?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [auditEvents, categoryFilter, dateFilter, searchTerm]);

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'project-status': return '🏢';
      case 'work-package': return '📦';
      case 'risk': return '⚠️';
      case 'schedule': return '📅';
      case 'financial': return '💰';
      case 'contracts': return '📋';
      case 'resources': return '👥';
      default: return '📝';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getActionDescription = (action) => {
    switch (action) {
      case 'project-activated': return 'Proyecto Activado';
      case 'work-package-created': return 'Work Package Creado';
      case 'risk-identified': return 'Riesgo Identificado';
      case 'task-created': return 'Tarea Creada';
      case 'purchase-order-created': return 'Orden de Compra Creada';
      case 'advance-created': return 'Anticipo Creado';
      case 'invoice-created': return 'Factura Creada';
      case 'contract-created': return 'Contrato Creado';
      case 'resource-assigned': return 'Recurso Asignado';
      default: return action;
    }
  };

  const exportAuditReport = () => {
    exportAuditLog();
  };

  if (!currentProject) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-4">📋</div>
        <div className="text-lg mb-2">Selecciona un proyecto para ver su auditoría</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">📋 Auditoría Documental</h1>
            <p className="text-purple-100 text-lg">
              Registro completo de movimientos del proyecto "{currentProject.name}"
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">
              {filteredEvents.length}
            </div>
            <div className="text-purple-100">Eventos Registrados</div>
          </div>
        </div>
      </div>

      {/* Nota Informativa */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-purple-600 text-xl mr-3">ℹ️</div>
          <div className="text-purple-800">
            <strong>Sistema de Auditoría Automática:</strong> Este sistema registra automáticamente todos los movimientos 
            del proyecto desde que cambia a estado "Activo". Los eventos se guardan localmente y se pueden exportar 
            para análisis externos o cumplimiento regulatorio.
          </div>
        </div>
      </div>

      {/* Diagnóstico del Sistema de Auditoría */}
      <AuditDiagnostic 
        projectId={currentProjectId} 
        useSupabase={useSupabase} 
      />

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <select 
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Todas las categorías</option>
              <option value="project-status">Estado del Proyecto</option>
              <option value="work-package">Work Packages</option>
              <option value="risk">Riesgos</option>
              <option value="schedule">Cronograma</option>
              <option value="financial">Financiero</option>
              <option value="contracts">Contratos</option>
              <option value="resources">Recursos</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
            <select 
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">Todo el período</option>
              <option value="today">Hoy</option>
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
              <option value="quarter">Último trimestre</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Buscar eventos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-end space-x-2">
            <button
              onClick={exportAuditReport}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              📄 Exportar Reporte
            </button>
            <button
              onClick={() => {
                if (window.confirm('¿Está seguro de limpiar todo el log de auditoría? Esta acción no se puede deshacer.')) {
                  clearAuditLog();
                }
              }}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              title="Limpiar log de auditoría"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-500 mb-1">Total Eventos</div>
          <div className="text-2xl font-bold text-gray-800">{filteredEvents.length}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
          <div className="text-sm text-gray-500 mb-1">Eventos Financieros</div>
          <div className="text-2xl font-bold text-gray-800">
            {filteredEvents.filter(e => e.category === 'financial').length}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
          <div className="text-sm text-gray-500 mb-1">Alta Severidad</div>
          <div className="text-2xl font-bold text-gray-800">
            {filteredEvents.filter(e => e.severity === 'high').length}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
          <div className="text-sm text-gray-500 mb-1">Último Evento</div>
          <div className="text-sm font-bold text-gray-800">
            {filteredEvents.length > 0 
              ? new Date(filteredEvents[0].timestamp).toLocaleDateString() 
              : 'N/A'
            }
          </div>
        </div>
      </div>

      {/* Lista de Eventos */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Registro de Eventos</h3>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">📭</div>
              <div className="text-lg mb-2">No hay eventos que coincidan con los filtros</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredEvents.map((event) => (
                <div key={event.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start space-x-4">
                    <div className="text-2xl">
                      {getCategoryIcon(event.category)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {event.description}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(event.severity)}`}>
                            {event.severity.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Acción:</strong> {getActionDescription(event.action)}
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Usuario:</strong> {event.user}
                      </div>
                      
                      {event.details && (
                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-sm text-gray-700">
                            <strong>Detalles:</strong>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {Object.entries(event.details).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="font-medium">{key}:</span>
                                <span>{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectAudit;
