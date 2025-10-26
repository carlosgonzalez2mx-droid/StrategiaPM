import { useState, useEffect, useCallback } from 'react';

const useAuditLog = (projectId) => {
  const [auditLog, setAuditLog] = useState([]);

  // Cargar log de auditoría desde localStorage
  useEffect(() => {
    const savedLog = localStorage.getItem(`audit-log-${projectId}`);
    if (savedLog) {
      try {
        setAuditLog(JSON.parse(savedLog));
      } catch (error) {
        console.error('Error loading audit log:', error);
      }
    }
  }, [projectId]);

  // Guardar log de auditoría en localStorage
  const saveAuditLog = useCallback((log) => {
    localStorage.setItem(`audit-log-${projectId}`, JSON.stringify(log));
  }, [projectId]);

  // Agregar evento de auditoría
  const addAuditEvent = useCallback((event) => {
    const newEvent = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      projectId,
      ...event
    };

    setAuditLog(prevLog => {
      const updatedLog = [newEvent, ...prevLog];
      saveAuditLog(updatedLog);
      return updatedLog;
    });

    return newEvent;
  }, [projectId, saveAuditLog]);

  // Registrar cambio de estado del proyecto
  const logProjectStatusChange = useCallback((previousStatus, newStatus, projectData) => {
    addAuditEvent({
      category: 'project-status',
      action: 'status-changed',
      description: `Estado del proyecto cambiado de "${previousStatus}" a "${newStatus}"`,
      details: {
        previousStatus,
        newStatus,
        projectName: projectData.name,
        manager: projectData.manager,
        budget: projectData.budget
      },
      severity: 'high',
      user: projectData.manager || 'Sistema'
    });
  }, [addAuditEvent]);

  // Registrar creación de work package
  const logWorkPackageCreated = useCallback((workPackage, projectData) => {
    addAuditEvent({
      category: 'work-package',
      action: 'created',
      description: `Work Package "${workPackage.name}" creado`,
      details: {
        workPackageId: workPackage.id,
        name: workPackage.name,
        budget: workPackage.budget,
        status: workPackage.status
      },
      severity: 'medium',
      user: projectData.manager || 'Sistema'
    });
  }, [addAuditEvent]);

  // Registrar modificación de work package
  const logWorkPackageModified = useCallback((workPackage, changes, projectData) => {
    addAuditEvent({
      category: 'work-package',
      action: 'modified',
      description: `Work Package "${workPackage.name}" modificado`,
      details: {
        workPackageId: workPackage.id,
        name: workPackage.name,
        changes: Object.keys(changes),
        previousValues: changes
      },
      severity: 'medium',
      user: projectData.manager || 'Sistema'
    });
  }, [addAuditEvent]);

  // Registrar creación de riesgo
  const logRiskCreated = useCallback((risk, projectData) => {
    addAuditEvent({
      category: 'risk',
      action: 'created',
      description: `Riesgo "${risk.name}" identificado`,
      details: {
        riskId: risk.id,
        name: risk.name,
        probability: risk.probability,
        impact: risk.impact,
        priority: risk.priority
      },
      severity: risk.priority === 'high' ? 'high' : 'medium',
      user: projectData.manager || 'Sistema'
    });
  }, [addAuditEvent]);

  // Registrar evento financiero
  const logFinancialEvent = useCallback((type, item, projectData) => {
    const eventMap = {
      'purchase-order': {
        action: 'created',
        description: `Orden de Compra "${item.description}" creada`,
        details: {
          poId: item.id,
          description: item.description,
          amount: item.amount,
          supplier: item.supplier
        }
      },
      'advance': {
        action: 'created',
        description: `Anticipo "${item.description}" creado`,
        details: {
          advanceId: item.id,
          description: item.description,
          amount: item.amount,
          recipient: item.recipient
        }
      },
      'invoice': {
        action: 'created',
        description: `Factura "${item.description}" creada`,
        details: {
          invoiceId: item.id,
          description: item.description,
          amount: item.amount,
          supplier: item.supplier
        }
      },
      'contract': {
        action: 'created',
        description: `Contrato "${item.name}" creado`,
        details: {
          contractId: item.id,
          name: item.name,
          value: item.value,
          contractor: item.contractor
        }
      }
    };

    const eventConfig = eventMap[type];
    if (eventConfig) {
      addAuditEvent({
        category: 'financial',
        action: eventConfig.action,
        description: eventConfig.description,
        details: eventConfig.details,
        severity: 'high',
        user: projectData.manager || 'Sistema'
      });
    }
  }, [addAuditEvent]);

  // Registrar asignación de recursos
  const logResourceAssignment = useCallback((assignment, projectData) => {
    addAuditEvent({
      category: 'resources',
      action: 'assigned',
      description: `Recurso asignado al proyecto`,
      details: {
        assignmentId: assignment.id,
        resourceId: assignment.resourceId,
        role: assignment.role,
        allocation: assignment.allocation
      },
      severity: 'medium',
      user: projectData.manager || 'Sistema'
    });
  }, [addAuditEvent]);

  // Limpiar log de auditoría
  const clearAuditLog = useCallback(() => {
    setAuditLog([]);
    localStorage.removeItem(`audit-log-${projectId}`);
  }, [projectId]);

  // Exportar log de auditoría
  const exportAuditLog = useCallback(() => {
    const exportData = {
      projectId,
      exportDate: new Date().toISOString(),
      totalEvents: auditLog.length,
      events: auditLog
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${projectId}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [auditLog, projectId]);

  return {
    auditLog,
    addAuditEvent,
    logProjectStatusChange,
    logWorkPackageCreated,
    logWorkPackageModified,
    logRiskCreated,
    logFinancialEvent,
    logResourceAssignment,
    clearAuditLog,
    exportAuditLog
  };
};

export default useAuditLog;
