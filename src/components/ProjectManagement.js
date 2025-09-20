import React, { useState } from 'react';
import ScheduleManagement from './ScheduleManagement';

const ProjectManagement = ({ 
  projects, 
  currentProjectId, 
  setCurrentProjectId,
  risks,
  workPackages,
  setWorkPackages,
  reportingDate
}) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Los riesgos ahora vienen como props desde App.js
  console.log('ProjectManagement - risks recibidos:', risks);
  console.log('ProjectManagement - tipo de risks:', typeof risks);
  console.log('ProjectManagement - es array:', Array.isArray(risks));

  // Helper functions para clonación explícita
  const updateEditingPO = (property, value) => {
    setEditingPO({
      id: editingPO.id,
      number: editingPO.number,
      workPackageId: editingPO.workPackageId,
      supplier: editingPO.supplier,
      description: editingPO.description,
      totalAmount: editingPO.totalAmount,
      currency: editingPO.currency,
      status: editingPO.status,
      requestDate: editingPO.requestDate,
      approvalDate: editingPO.approvalDate,
      expectedDate: editingPO.expectedDate,
      projectId: editingPO.projectId,
      createdAt: editingPO.createdAt,
      updatedAt: editingPO.updatedAt,
      [property]: value
    });
  };

  const updateEditingAdvance = (property, value) => {
    setEditingAdvance({
      id: editingAdvance.id,
      purchaseOrderId: editingAdvance.purchaseOrderId,
      amount: editingAdvance.amount,
      percentage: editingAdvance.percentage,
      status: editingAdvance.status,
      reference: editingAdvance.reference,
      requestDate: editingAdvance.requestDate,
      paymentDate: editingAdvance.paymentDate,
      projectId: editingAdvance.projectId,
      createdAt: editingAdvance.createdAt,
      updatedAt: editingAdvance.updatedAt,
      [property]: value
    });
  };

  const updateEditingInvoice = (property, value) => {
    setEditingInvoice({
      id: editingInvoice.id,
      invoiceNumber: editingInvoice.invoiceNumber,
      purchaseOrderId: editingInvoice.purchaseOrderId,
      amount: editingInvoice.amount,
      status: editingInvoice.status,
      receivedDate: editingInvoice.receivedDate,
      dueDate: editingInvoice.dueDate,
      paymentDate: editingInvoice.paymentDate,
      description: editingInvoice.description,
      projectId: editingInvoice.projectId,
      createdAt: editingInvoice.createdAt,
      updatedAt: editingInvoice.updatedAt,
      [property]: value
    });
  };

  // ===== ESTADOS DEL CONTROL FINANCIERO COMPLETO =====
  const [purchaseOrders, setPurchaseOrders] = useState([
    {
      id: 'PO001',
      number: 'PO-2025-001',
      workPackageId: 'WP001',
      supplier: 'TechCorp Solutions',
      description: 'Servicios de consultoría y análisis',
      totalAmount: 45000,
      currency: 'USD',
      status: 'approved',
      requestDate: '2025-02-01',
      approvalDate: '2025-02-03',
      expectedDate: '2025-02-15'
    },
    {
      id: 'PO002',
      number: 'PO-2025-002',
      workPackageId: 'WP001',
      supplier: 'Hardware Express',
      description: 'Equipos de computación para análisis',
      totalAmount: 25000,
      currency: 'USD',
      status: 'pending',
      requestDate: '2025-02-10',
      approvalDate: null,
      expectedDate: '2025-02-25'
    },
    {
      id: 'PO003',
      number: 'PO-2025-003',
      workPackageId: 'WP002',
      supplier: 'Software Solutions Inc',
      description: 'Licencias de software especializado',
      totalAmount: 35000,
      currency: 'USD',
      status: 'approved',
      requestDate: '2025-02-05',
      approvalDate: '2025-02-07',
      expectedDate: '2025-03-01'
    }
  ]);

  const [advances, setAdvances] = useState([
    {
      id: 'ADV001',
      purchaseOrderId: 'PO001',
      amount: 22500,
      percentage: 50,
      requestDate: '2025-02-03',
      approvalDate: '2025-02-04',
      paymentDate: '2025-02-05',
      status: 'paid',
      reference: 'ADV-001-2025'
    }
  ]);

  const [invoices, setInvoices] = useState([
    {
      id: 'INV001',
      purchaseOrderId: 'PO001',
      invoiceNumber: 'INV-001-2025',
      supplier: 'TechCorp Solutions',
      amount: 45000,
      receivedDate: '2025-02-15',
      dueDate: '2025-03-15',
      paymentDate: null,
      status: 'pending',
      description: 'Servicios de consultoría y análisis'
    },
    {
      id: 'INV002',
      purchaseOrderId: 'PO003',
      invoiceNumber: 'INV-002-2025',
      supplier: 'Software Solutions Inc',
      amount: 35000,
      receivedDate: '2025-02-20',
      dueDate: '2025-03-20',
      paymentDate: null,
      status: 'pending',
      description: 'Licencias de software especializado'
    }
  ]);

  // Estados para modales
  const [showPOModal, setShowPOModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [editingAdvance, setEditingAdvance] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const currentProject = projects.find(p => p.id === currentProjectId);

  const getProjectStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProjectStatusIcon = (status) => {
    switch(status) {
      case 'active': return '🔄';
      case 'completed': return '✅';
      case 'on-hold': return '⏸️';
      case 'cancelled': return '❌';
      default: return '⏸️';
    }
  };

  // ===== FUNCIONES DEL CONTROL FINANCIERO COMPLETO =====
  
  // Funciones de Órdenes de Compra
  const handleNewPO = () => {
    setEditingPO({
      id: '',
      number: '',
      workPackageId: '',
      supplier: '',
      description: '',
      totalAmount: 0,
      currency: 'USD',
      status: 'pending',
      requestDate: reportingDate,
      approvalDate: null,
      expectedDate: ''
    });
    setShowPOModal(true);
  };

  const handleEditPO = (po) => {
    setEditingPO(Object.assign({}, po));
    setShowPOModal(true);
  };

  const handleSavePO = () => {
    console.log('💾 GUARDANDO OC - editingPO:', editingPO);
    
    if (!editingPO.number || !editingPO.supplier || !editingPO.totalAmount) {
      console.log('❌ VALIDACIÓN FALLIDA:', {
        number: editingPO.number,
        supplier: editingPO.supplier,
        totalAmount: editingPO.totalAmount
      });
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    if (editingPO.id) {
      console.log('📝 EDITANDO OC EXISTENTE:', editingPO.id);
      setPurchaseOrders(prev => prev.map(po => 
        po.id === editingPO.id ? editingPO : po
      ));
    } else {
      console.log('➕ CREANDO NUEVA OC');
      const newPO = Object.assign({}, editingPO, {
        id: 'PO' + String(Date.now()).slice(-6),
        projectId: currentProjectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('💾 NUEVA OC CREADA:', newPO);
      setPurchaseOrders(prev => {
        const newPOs = prev.slice();
        newPOs.push(newPO);
        console.log('📋 LISTA ACTUALIZADA:', newPOs);
        return newPOs;
      });
    }
    
    setShowPOModal(false);
    setEditingPO(null);
  };

  const handleDeletePO = (id) => {
    if (window.confirm('¿Está seguro de eliminar esta orden de compra?')) {
      setPurchaseOrders(prev => prev.filter(po => po.id !== id));
      setAdvances(prev => prev.filter(adv => 
        !purchaseOrders.find(po => po.id === adv.purchaseOrderId && po.id === id)
      ));
      setInvoices(prev => prev.filter(inv => 
        !purchaseOrders.find(po => po.id === inv.purchaseOrderId && po.id === id)
      ));
    }
  };

  // Funciones de Anticipos
  const handleNewAdvance = () => {
    setEditingAdvance({
      id: '',
      purchaseOrderId: '',
      amount: 0,
      percentage: 0,
      requestDate: reportingDate,
      approvalDate: null,
      paymentDate: null,
      status: 'pending',
      reference: ''
    });
    setShowAdvanceModal(true);
  };

  const handleEditAdvance = (advance) => {
    setEditingAdvance(Object.assign({}, advance));
    setShowAdvanceModal(true);
  };

  const handleSaveAdvance = () => {
    if (!editingAdvance.purchaseOrderId || !editingAdvance.amount) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    if (editingAdvance.id) {
      setAdvances(prev => prev.map(adv => 
        adv.id === editingAdvance.id ? editingAdvance : adv
      ));
    } else {
      const newAdvance = Object.assign({}, editingAdvance, {
        id: 'ADV' + String(Date.now()).slice(-6)
      });
      setAdvances(prev => {
        const newAdvances = prev.slice();
        newAdvances.push(newAdvance);
        return newAdvances;
      });
    }
    
    setShowAdvanceModal(false);
    setEditingAdvance(null);
  };

  const handleDeleteAdvance = (id) => {
    if (window.confirm('¿Está seguro de eliminar este anticipo?')) {
      setAdvances(prev => prev.filter(adv => adv.id !== id));
    }
  };

  // Funciones de Facturas
  const handleNewInvoice = () => {
    setEditingInvoice({
      id: '',
      purchaseOrderId: '',
      invoiceNumber: '',
      supplier: '',
      amount: 0,
      receivedDate: reportingDate,
      dueDate: '',
      paymentDate: null,
      status: 'pending',
      description: ''
    });
    setShowInvoiceModal(true);
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(Object.assign({}, invoice));
    setShowInvoiceModal(true);
  };

  const handleSaveInvoice = () => {
    if (!editingInvoice.invoiceNumber || !editingInvoice.purchaseOrderId || !editingInvoice.amount) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    if (editingInvoice.id) {
      setInvoices(prev => prev.map(inv => 
        inv.id === editingInvoice.id ? editingInvoice : inv
      ));
    } else {
      const newInvoice = Object.assign({}, editingInvoice, {
        id: 'INV' + String(Date.now()).slice(-6)
      });
      setInvoices(prev => {
        const newInvoices = prev.slice();
        newInvoices.push(newInvoice);
        return newInvoices;
      });
    }
    
    setShowInvoiceModal(false);
    setEditingInvoice(null);
  };

  const handleDeleteInvoice = (id) => {
    if (window.confirm('¿Está seguro de eliminar esta factura?')) {
      setInvoices(prev => prev.filter(inv => inv.id !== id));
    }
  };

  // Funciones auxiliares
  const getPOStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-green-800';
    }
  };

  // ===== FUNCIONES AUXILIARES DEL WBS =====
  
  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return '✅';
      case 'in-progress': return '🔄';
      case 'delayed': return '⚠️';
      default: return '⏸️';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in-progress': return 'text-blue-600 bg-blue-50';
      case 'delayed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Función para actualizar work packages
  const updateWP = (id, updater) => {
    setWorkPackages(prev => {
      return prev.map(p => {
        if (p.id !== id) return p;
        const updated = Object.assign({}, p);
        updater(updated);
        
        const today = new Date(reportingDate);
        const endDate = new Date(updated.endDate);
        const isOverdue = today > endDate;
        
        if (updated.percentComplete === 100) {
          updated.status = 'completed';
        } else if (updated.percentComplete > 0) {
          if (isOverdue) {
            updated.status = 'delayed';
          } else {
            updated.status = 'in-progress';
          }
        } else {
          if (isOverdue) {
            updated.status = 'delayed';
          } else {
            updated.status = 'pending';
          }
        }
        
        return updated;
      });
    });
  };

  // Función para exportar CSV
  const exportWPsCSV = () => {
    const rows = workPackages && workPackages.map(wp => ({
      id: wp.id, 
      wbs: wp.wbs || wp.id, 
      name: wp.name,
      plannedValue: wp.plannedValue || 0, 
      earnedValue: wp.earnedValue || 0,
      actualCost: wp.actualCost || 0, 
      percentComplete: wp.percentComplete || 0,
      startDate: wp.startDate, 
      endDate: wp.endDate, 
      status: wp.status || 'pending'
    }));
    
    if (!rows || !rows.length) return;
    const headers = Object.keys(rows[0]);
    const esc = v => '"' + String(v || '').replace(/"/g,'""') + '"';
    const lines = [headers.join(',')].concat(rows.map(r => 
      headers.map(h => esc(r[h])).join(',')
    ));
    const csv = lines.join('\n');
    
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a');
    a.href = url; 
    a.download = 'workpackages.csv'; 
    a.click(); 
    URL.revokeObjectURL(url);
  };

  // Calcular métricas del proyecto actual usando el servicio de riesgos
  const projectMetrics = currentProject ? {
    totalBudget: currentProject.budget,
    // Calcular reserva de contingencia basada en riesgos activos
    contingencyReserve: (() => {
      // Validación de seguridad para risks
      if (!risks || !Array.isArray(risks)) return currentProject.budget * 0.05;
      
      const activeRisks = risks.filter(r => r.status === 'active');
      if (activeRisks.length === 0) return currentProject.budget * 0.05; // 5% base si no hay riesgos
      
      // Cálculo base (5% del presupuesto)
      const baseContingency = currentProject.budget * 0.05;
      
      // Cálculo basado en riesgos (suma de impactos esperados)
      const riskBasedContingency = activeRisks.reduce((sum, risk) => {
        const expectedImpact = risk.probability * risk.costImpact;
        const priorityFactor = risk.priority === 'high' ? 1.5 : risk.priority === 'medium' ? 1.2 : 1.0;
        return sum + (expectedImpact * priorityFactor);
      }, 0);
      
      return baseContingency + riskBasedContingency;
    })(),
    // Calcular reserva de gestión
    managementReserve: (() => {
      // Validación de seguridad para risks
      if (!risks || !Array.isArray(risks)) return currentProject.budget * 0.1;
      
      const activeRisks = risks.filter(r => r.status === 'active');
      let managementReserve = currentProject.budget * 0.1; // Base 10%
      
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
    })(),
    // Calcular presupuesto total incluyendo reservas
    totalBudgetWithReserves: (() => {
      // Validación de seguridad para risks
      if (!risks || !Array.isArray(risks)) return currentProject.budget * 1.15; // Base + 15% estándar
      
      const activeRisks = risks.filter(r => r.status === 'active');
      const baseContingency = currentProject.budget * 0.05;
      const riskBasedContingency = activeRisks.reduce((sum, risk) => {
        const expectedImpact = risk.probability * risk.costImpact;
        const priorityFactor = risk.priority === 'high' ? 1.5 : risk.priority === 'medium' ? 1.2 : 1.0;
        return sum + (expectedImpact * priorityFactor);
      }, 0);
      
      let managementReserve = currentProject.budget * 0.1;
      if (activeRisks.length > 10) managementReserve *= 1.2;
      else if (activeRisks.length > 5) managementReserve *= 1.1;
      
      const highPriorityRisks = activeRisks.filter(r => r.priority === 'high').length;
      if (highPriorityRisks > 3) managementReserve *= 1.15;
      
      return currentProject.budget + baseContingency + riskBasedContingency + managementReserve;
    })(),
    // Calcular reservas totales
    totalReserves: (() => {
      // Validación de seguridad para risks
      if (!risks || !Array.isArray(risks)) return currentProject.budget * 0.15; // 15% estándar
      
      const activeRisks = risks.filter(r => r.status === 'active');
      const baseContingency = currentProject.budget * 0.05;
      const riskBasedContingency = activeRisks.reduce((sum, risk) => {
        const expectedImpact = risk.probability * risk.costImpact;
        const priorityFactor = risk.priority === 'high' ? 1.5 : risk.priority === 'medium' ? 1.2 : 1.0;
        return sum + (expectedImpact * priorityFactor);
      }, 0);
      
      let managementReserve = currentProject.budget * 0.1;
      if (activeRisks.length > 10) managementReserve *= 1.2;
      else if (activeRisks.length > 5) managementReserve *= 1.1;
      
      const highPriorityRisks = activeRisks.filter(r => r.priority === 'high').length;
      if (highPriorityRisks > 3) managementReserve *= 1.15;
      
      return baseContingency + riskBasedContingency + managementReserve;
    })(),
    // Calcular presupuesto disponible (base - compromisos)
    availableBudget: currentProject.budget - purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0),
    // Calcular presupuesto disponible total (incluyendo reservas)
    availableBudgetWithReserves: (() => {
      // Validación de seguridad para risks
      if (!risks || !Array.isArray(risks)) return (currentProject.budget * 1.15) - purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);
      
      const activeRisks = risks.filter(r => r.status === 'active');
      const baseContingency = currentProject.budget * 0.05;
      const riskBasedContingency = activeRisks.reduce((sum, risk) => {
        const expectedImpact = risk.probability * risk.costImpact;
        const priorityFactor = risk.priority === 'high' ? 1.5 : risk.priority === 'medium' ? 1.2 : 1.0;
        return sum + (expectedImpact * priorityFactor);
      }, 0);
      
      let managementReserve = currentProject.budget * 0.1;
      if (activeRisks.length > 10) managementReserve *= 1.2;
      else if (activeRisks.length > 5) managementReserve *= 1.1;
      
      const highPriorityRisks = activeRisks.filter(r => r.priority === 'high').length;
      if (highPriorityRisks > 3) managementReserve *= 1.15;
      
      const totalBudget = currentProject.budget + baseContingency + riskBasedContingency + managementReserve;
      return totalBudget - purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);
    })(),
    progress: 0, // Se calcularía basado en workPackages
    startDate: new Date(currentProject.startDate),
    endDate: new Date(currentProject.endDate),
    duration: Math.ceil((new Date(currentProject.endDate) - new Date(currentProject.startDate)) / (1000 * 60 * 60 * 24))
  } : null;

  if (!currentProject) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">📊 Gestión de Proyectos</h1>
          <p className="text-orange-100 text-lg">
            Control operativo y seguimiento de proyectos activos
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Selecciona un Proyecto
          </h2>
          <p className="text-gray-600 mb-6">
            Para acceder a la gestión de proyectos, primero debes seleccionar un proyecto del portfolio
          </p>
          <div className="text-sm text-gray-500">
            Ve a "Portfolio de Proyectos" para crear o seleccionar un proyecto
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header del Proyecto */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">📊 Gestión de Proyectos</h1>
            <p className="text-orange-100 text-lg">
              Control operativo y seguimiento de proyectos activos
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-orange-100 mb-1">Proyecto Actual</div>
            <div className="text-xl font-bold">{currentProject.name}</div>
          </div>
        </div>
      </div>

      {/* Selector de Proyectos */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Seleccionar Proyecto</h3>
          <div className="text-sm text-gray-500">
            {projects.filter(p => p.status === 'active').length} proyectos activos
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.filter(p => p.status === 'active').map((project) => (
            <div
              key={project.id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
                currentProjectId === project.id 
                  ? 'border-orange-500 bg-orange-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setCurrentProjectId(project.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{project.name}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(project.priority)}`}>
                  {project.priority}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 mb-2">
                {project.description}
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>👤 {project.manager}</span>
                <span>💰 ${(project.budget / 1000).toFixed(0)}K USD</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Información del Proyecto Seleccionado */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Información del Proyecto</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-blue-600 text-2xl mb-2">💰</div>
            <div className="text-sm text-blue-600 mb-1">Presupuesto Total</div>
            <div className="text-2xl font-bold text-blue-800">
              ${(projectMetrics.totalBudget / 1000).toFixed(0)}K USD
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-green-600 text-2xl mb-2">📊</div>
            <div className="text-sm text-green-600 mb-1">Presupuesto Disponible</div>
            <div className="text-2xl font-bold text-green-800">
              ${(projectMetrics.availableBudget / 1000).toFixed(0)}K USD
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="text-purple-600 text-2xl mb-2">📅</div>
            <div className="text-sm text-purple-600 mb-1">Duración</div>
            <div className="text-2xl font-bold text-purple-800">
              {projectMetrics.duration} días
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="text-orange-600 text-2xl mb-2">🎯</div>
            <div className="text-sm text-orange-600 mb-1">Estado</div>
            <div className="text-lg font-bold text-orange-800">
              {getStatusIcon(currentProject.status)} {currentProject.status}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Detalles del Proyecto</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div><span className="font-medium">Manager:</span> {currentProject.manager}</div>
              <div><span className="font-medium">Sponsor:</span> {currentProject.sponsor}</div>
              <div><span className="font-medium">Prioridad:</span> 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getPriorityColor(currentProject.priority)}`}>
                  {currentProject.priority}
                </span>
              </div>
              <div><span className="font-medium">Fecha Inicio:</span> {currentProject.startDate}</div>
              <div><span className="font-medium">Fecha Fin:</span> {currentProject.endDate}</div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Métricas Financieras</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div><span className="font-medium">Reserva Contingencia:</span> ${(currentProject.contingencyReserve / 1000).toFixed(0)}K USD</div>
              <div><span className="font-medium">Reserva Gestión:</span> ${(currentProject.managementReserve / 1000).toFixed(0)}K USD</div>
              <div><span className="font-medium">Total Reservas:</span> ${(projectMetrics.totalReserves / 1000).toFixed(0)}K USD</div>
              {currentProject.irr > 0 && (
                <div><span className="font-medium">TIR:</span> {currentProject.irr.toFixed(2)}%</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs de Navegación */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: '📊' },
              { id: 'wbs', name: 'Detalles WBS', icon: '📋' },
              { id: 'financial', name: 'Control Financiero', icon: '💰' },
              { id: 'schedule', name: 'Cronograma', icon: '📅' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Tab: Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Dashboard del Proyecto</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-lg border">
                  <h4 className="font-semibold text-gray-800 mb-4">Resumen de Actividades</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Work Packages:</span>
                      <span className="font-medium">{workPackages && workPackages.length ? workPackages.length : 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Actividades Críticas:</span>
                      <span className="font-medium text-red-600">
                        {workPackages && workPackages.filter(wp => wp.isCritical).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dependencias:</span>
                      <span className="font-medium">
                        {workPackages && workPackages.reduce((sum, wp) => sum + (wp.dependencies?.length || 0), 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg border">
                  <h4 className="font-semibold text-gray-800 mb-4">Próximos Hitos</h4>
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🎯</div>
                    <div>Configura hitos en el cronograma</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg border">
                <h4 className="font-semibold text-gray-800 mb-4">Acciones Rápidas</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveTab('wbs')}
                    className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors text-center"
                  >
                    <div className="text-2xl mb-2">📋</div>
                    <div className="font-semibold">Gestionar WBS</div>
                    <div className="text-sm text-blue-100">Estructura del proyecto</div>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('financial')}
                    className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors text-center"
                  >
                    <div className="text-2xl mb-2">💰</div>
                    <div className="font-semibold">Control Financiero</div>
                    <div className="text-sm text-green-100">Seguimiento de costos</div>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors text-center"
                  >
                    <div className="text-2xl mb-2">📅</div>
                    <div className="font-semibold">Gestionar Cronograma</div>
                    <div className="text-sm text-purple-100">Planificación temporal</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Detalles WBS */}
          {activeTab === 'wbs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Estructura de Desglose del Trabajo (WBS)</h3>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  + Agregar Work Package
                </button>
              </div>
              
              {/* Filtros y Búsqueda */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    placeholder="Buscar paquetes..."
                    className="border rounded px-3 py-2 flex-1"
                  />
                  <select className="border rounded px-3 py-2">
                    <option value="all">Todos los estados</option>
                    <option value="completed">Completado</option>
                    <option value="in-progress">En progreso</option>
                    <option value="pending">Pendiente</option>
                    <option value="delayed">Retrasado</option>
                  </select>
                  <button 
                    onClick={exportWPsCSV}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Exportar CSV
                  </button>
                </div>
              </div>

              {/* Tabla de Work Packages */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">WBS</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paquete</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">PV</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">EV</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">AC</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CV</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CPI</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">% Comp</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {workPackages && workPackages.map(wp => {
                        const wpCV = (wp.earnedValue || 0) - (wp.actualCost || 0);
                        const wpCPI = (wp.actualCost || 0) > 0 ? (wp.earnedValue || 0) / (wp.actualCost || 0) : 1;
                        return (
                          <tr key={wp.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-mono">{wp.wbs || wp.id}</td>
                            <td className="px-4 py-3 text-sm font-medium">{wp.name}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              <input
                                type="number"
                                min="0"
                                className="w-28 text-right border rounded px-2 py-1"
                                value={Number(wp.plannedValue || 0)}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value || 0));
                                  updateWP(wp.id, p => { 
                                    p.plannedValue = val; 
                                  });
                                }}
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-right">${((wp.earnedValue || 0) / 1000).toFixed(0)}K</td>
                            <td className="px-4 py-3 text-sm text-right">
                              <input
                                type="number"
                                min="0"
                                className="w-28 text-right border rounded px-2 py-1"
                                value={Number(wp.actualCost || 0)}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value || 0));
                                  updateWP(wp.id, p => { 
                                    p.actualCost = val; 
                                  });
                                }}
                              />
                            </td>
                            <td className={'px-4 py-3 text-sm text-right font-semibold ' + (wpCV >= 0 ? 'text-green-600' : 'text-red-600')}>
                              ${(wpCV / 1000).toFixed(0)}K
                            </td>
                            <td className={'px-4 py-3 text-sm text-right font-semibold ' + (wpCPI >= 1 ? 'text-green-600' : 'text-red-600')}>
                              {wpCPI.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <div className="w-12 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-500 h-2 rounded-full" 
                                    style={{ width: (wp.percentComplete || 0) + '%' }} 
                                  />
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  className="w-16 text-center border rounded px-1 py-0.5 text-xs"
                                  value={Number(wp.percentComplete || 0)}
                                                                  onChange={(e) => {
                                  const val = Math.max(0, Math.min(100, Number(e.target.value || 0)));
                                  updateWP(wp.id, p => { 
                                    p.percentComplete = val; 
                                    p.earnedValue = (val / 100) * (p.plannedValue || 0);
                                  });
                                }}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span className={'inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ' + getStatusColor(wp.status)}>
                                <span>{getStatusIcon(wp.status)}</span>
                                <span className="capitalize">{wp.status || 'pending'}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Resumen de Métricas */}
                <div className="bg-gray-50 px-4 py-3 border-t">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total PV:</span>
                      <span className="ml-2 font-semibold">
                        ${workPackages ? (workPackages.reduce((sum, wp) => sum + (wp.plannedValue || 0), 0) / 1000).toFixed(0) : 0}K
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total EV:</span>
                      <span className="ml-2 font-semibold">
                        ${workPackages ? (workPackages.reduce((sum, wp) => sum + (wp.earnedValue || 0), 0) / 1000).toFixed(0) : 0}K
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total AC:</span>
                      <span className="ml-2 font-semibold">
                        ${workPackages ? (workPackages.reduce((sum, wp) => sum + (wp.actualCost || 0), 0) / 1000).toFixed(0) : 0}K
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">EAC:</span>
                      <span className="ml-2 font-semibold">
                        ${workPackages ? (workPackages.reduce((sum, wp) => sum + (wp.plannedValue || 0), 0) / 1000).toFixed(0) : 0}K
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen del PROYECTO COMPLETO */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Resumen Financiero del PROYECTO COMPLETO</h4>
                
                {/* Métricas del Proyecto */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ${workPackages && workPackages.reduce((sum, wp) => sum + (wp.plannedValue || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-blue-700">Presupuesto Total del Proyecto</div>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      ${purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-orange-700">Total Comprometido en OCs</div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ${(workPackages && workPackages.reduce((sum, wp) => sum + (wp.plannedValue || 0), 0) - purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0)).toLocaleString()}
                    </div>
                    <div className="text-sm text-green-700">Presupuesto Disponible</div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {((purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0) / (workPackages && workPackages.reduce((sum, wp) => sum + (wp.plannedValue || 0), 0))) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-purple-700">% Presupuesto Comprometido</div>
                  </div>
                </div>

                {/* Tabla de Resumen por Work Package */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">WBS</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paquete</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Presupuesto WBS</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">OCs Asociadas</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Facturado</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {workPackages && workPackages.map(wp => {
                        const wpPOs = purchaseOrders.filter(po => po.workPackageId === wp.id);
                        const wpCommitted = wpPOs.reduce((sum, po) => sum + po.totalAmount, 0);
                        const invoiced = invoices.filter(inv => 
                          wpPOs.some(po => po.id === inv.purchaseOrderId)
                        ).reduce((sum, inv) => sum + inv.amount, 0);
                        
                        return (
                          <tr key={wp.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-mono">{wp.wbs || wp.id}</td>
                            <td className="px-4 py-3 text-sm font-medium">{wp.name}</td>
                            <td className="px-4 py-3 text-sm text-right">${(wp.plannedValue || 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              {wpPOs.length > 0 ? (
                                <div className="text-right">
                                  <div className="font-medium">${wpCommitted.toLocaleString()}</div>
                                  <div className="text-xs text-gray-500">{wpPOs.length} OC(s)</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">Sin OCs</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">${invoiced.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span className={'inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ' + getStatusColor(wp.status)}>
                                <span>{getStatusIcon(wp.status)}</span>
                                <span className="capitalize">{wp.status || 'pending'}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
                  </table>
                </div>

                {/* Resumen de Órdenes de Compra del Proyecto */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-semibold text-gray-800 mb-3">Órdenes de Compra del Proyecto</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total OCs:</span>
                      <span className="ml-2 font-semibold">{purchaseOrders.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">OCs Aprobadas:</span>
                      <span className="ml-2 font-semibold text-green-600">
                        {purchaseOrders.filter(po => po.status === 'approved').length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">OCs Pendientes:</span>
                      <span className="ml-2 font-semibold text-yellow-600">
                        {purchaseOrders.filter(po => po.status === 'pending').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Resumen de Presupuesto y Reservas */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Resumen de Presupuesto y Reservas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-3">Desglose del Presupuesto</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Presupuesto Base:</span>
                        <span className="font-semibold">${(projectMetrics.totalBudget / 1000).toFixed(0)}K USD</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Reserva de Contingencia:</span>
                        <span className="font-semibold text-blue-600">+${(projectMetrics.contingencyReserve / 1000).toFixed(0)}K USD</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Reserva de Gestión:</span>
                        <span className="font-semibold text-green-600">+${(projectMetrics.managementReserve / 1000).toFixed(0)}K USD</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-t-2 border-gray-300 pt-2">
                        <span className="font-medium text-gray-800">Presupuesto Total:</span>
                        <span className="font-bold text-lg text-purple-600">${(projectMetrics.totalBudgetWithReserves / 1000).toFixed(0)}K USD</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-700 mb-3">Estado de Compromisos</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Presupuesto Total:</span>
                        <span className="font-semibold">${(projectMetrics.totalBudgetWithReserves / 1000).toFixed(0)}K USD</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Comprometido en OCs:</span>
                        <span className="font-semibold text-orange-600">-${(purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0) / 1000).toFixed(0)}K USD</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-t-2 border-gray-300 pt-2">
                        <span className="font-medium text-gray-800">Disponible Total:</span>
                        <span className="font-bold text-lg text-green-600">${(projectMetrics.availableBudgetWithReserves / 1000).toFixed(0)}K USD</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <div className="text-yellow-600 text-xl">⚠️</div>
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Importante: Integración con Gestión de Riesgos</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Las reservas mostradas incluyen un cálculo base automático. Para un análisis personalizado basado en riesgos específicos 
                        de tu proyecto, utiliza el módulo de <strong>Gestión de Riesgos</strong> donde podrás:
                      </p>
                      <ul className="text-xs text-yellow-700 mt-2 ml-4 list-disc space-y-1">
                        <li>Identificar riesgos específicos del proyecto</li>
                        <li>Calcular reservas basadas en probabilidad e impacto real</li>
                        <li>Ejecutar análisis Monte Carlo para estimaciones precisas</li>
                        <li>Monitorear la evolución de riesgos y ajustar reservas</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Control Financiero */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Control Financiero del Proyecto</h3>
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                  📊 Reporte Financiero
                </button>
              </div>
              
              {/* KPIs Financieros */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                  <div className="text-blue-600 text-3xl mb-2">💰</div>
                  <div className="text-2xl font-bold text-gray-800">
                    ${(projectMetrics.totalBudget / 1000).toFixed(0)}K USD
                  </div>
                  <div className="text-sm text-gray-600">Presupuesto Base</div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                  <div className="text-green-600 text-3xl mb-2">📊</div>
                  <div className="text-2xl font-bold text-gray-800">
                    ${(projectMetrics.availableBudget / 1000).toFixed(0)}K USD
                  </div>
                  <div className="text-sm text-gray-600">Disponible (Base)</div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                  <div className="text-orange-600 text-3xl mb-2">🛡️</div>
                  <div className="text-2xl font-bold text-gray-800">
                    ${(projectMetrics.totalReserves / 1000).toFixed(0)}K USD
                  </div>
                  <div className="text-sm text-gray-600">Reservas Totales</div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                  <div className="text-purple-600 text-3xl mb-2">📈</div>
                  <div className="text-2xl font-bold text-gray-800">
                    ${(projectMetrics.totalBudgetWithReserves / 1000).toFixed(0)}K USD
                  </div>
                  <div className="text-sm text-gray-600">Presupuesto Total</div>
                </div>
              </div>

              {/* Información de Reservas */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Desglose de Reservas de Costos</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-2">Presupuesto Base</h4>
                    <div className="text-2xl font-bold text-gray-900">
                      ${(projectMetrics.totalBudget / 1000).toFixed(0)}K USD
                    </div>
                    <p className="text-sm text-gray-700 mt-1">
                      Presupuesto asignado al proyecto
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Reserva de Contingencia</h4>
                    <div className="text-2xl font-bold text-blue-900">
                      ${(projectMetrics.contingencyReserve / 1000).toFixed(0)}K USD
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      5% base + impacto esperado de riesgos activos
                    </p>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Reserva de Gestión</h4>
                    <div className="text-2xl font-bold text-green-900">
                      ${(projectMetrics.managementReserve / 1000).toFixed(0)}K USD
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      10% del presupuesto base del proyecto
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-medium text-purple-800 mb-2">Presupuesto Total</h4>
                    <div className="text-2xl font-bold text-purple-900">
                      ${(projectMetrics.totalBudgetWithReserves / 1000).toFixed(0)}K USD
                    </div>
                    <p className="text-sm text-purple-700 mt-1">
                      Base + Contingencia + Gestión
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <div className="text-blue-600 text-xl">ℹ️</div>
                    <div>
                      <p className="text-sm font-medium text-blue-800">Integración con Gestión de Riesgos</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Las reservas se calculan automáticamente considerando riesgos identificados. 
                        Para un análisis detallado y personalizado, ve al módulo de <strong>Gestión de Riesgos</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Flujo de Compromisos */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Flujo de Compromisos del PROYECTO COMPLETO</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      ${(projectMetrics.totalBudgetWithReserves / 1000).toFixed(0)}K USD
                    </div>
                    <div className="text-sm text-blue-700">Presupuesto Total (con Reservas)</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      ${(purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0) / 1000).toFixed(0)}K USD
                    </div>
                    <div className="text-sm text-orange-700">Total Comprometido en OCs</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      ${(projectMetrics.availableBudgetWithReserves / 1000).toFixed(0)}K USD
                    </div>
                    <div className="text-sm text-green-700">Presupuesto Disponible (con Reservas)</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {((purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0) / projectMetrics.totalBudgetWithReserves) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-purple-700">% Presupuesto Comprometido</div>
                  </div>
                </div>
                
                {/* Resumen de Órdenes de Compra */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-semibold text-gray-800 mb-3">Resumen de Órdenes de Compra del Proyecto</h5>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total OCs:</span>
                      <span className="ml-2 font-semibold">{purchaseOrders.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">OCs Aprobadas:</span>
                      <span className="ml-2 font-semibold text-green-600">
                        {purchaseOrders.filter(po => po.status === 'approved').length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">OCs Pendientes:</span>
                      <span className="ml-2 font-semibold text-yellow-600">
                        {purchaseOrders.filter(po => po.status === 'pending').length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Monto Total OCs:</span>
                      <span className="ml-2 font-semibold">
                        ${purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0).toLocaleString()} USD
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Órdenes de Compra */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">Órdenes de Compra</h3>
                    <button 
                      onClick={handleNewPO}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      + Nueva OC
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">WBS</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Fecha Esperada</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {purchaseOrders.map(po => {
                        const workPackage = workPackages.find(wp => wp.id === po.workPackageId);
                        return (
                          <tr key={po.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-mono">{po.number}</td>
                            <td className="px-4 py-3 text-sm">
                              {workPackage ? `${workPackage.wbs} - ${workPackage.name}` : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">{po.supplier}</td>
                            <td className="px-4 py-3 text-sm">{po.description}</td>
                            <td className="px-4 py-3 text-sm text-right">${po.totalAmount.toLocaleString()} USD</td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span className={'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ' + getPOStatusColor(po.status)}>
                                {po.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              {new Date(po.expectedDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => handleEditPO(po)}
                                  className="text-blue-600 hover:text-blue-800 text-xs"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeletePO(po.id)}
                                  className="text-red-600 hover:text-red-800 text-xs"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Anticipos y Facturas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-800">Anticipos</h3>
                      <button 
                        onClick={handleNewAdvance}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        + Nuevo Anticipo
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">OC</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">%</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {advances.map(advance => {
                          const po = purchaseOrders.find(p => p.id === advance.purchaseOrderId);
                          return (
                            <tr key={advance.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-mono">{po?.number || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-right">${advance.amount.toLocaleString()} USD</td>
                              <td className="px-4 py-3 text-sm text-center">{advance.percentage}%</td>
                              <td className="px-4 py-3 text-sm text-center">
                                <span className={'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ' + getPaymentStatusColor(advance.status)}>
                                  {advance.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  <button
                                    onClick={() => handleEditAdvance(advance)}
                                    className="text-blue-600 hover:text-blue-800 text-xs"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAdvance(advance.id)}
                                    className="text-red-600 hover:text-red-800 text-xs"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-800">Facturas</h3>
                      <button 
                        onClick={handleNewInvoice}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        + Nueva Factura
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">OC</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {invoices.map(invoice => {
                          const po = purchaseOrders.find(p => p.id === invoice.purchaseOrderId);
                          const isOverdue = new Date(invoice.dueDate) < new Date(reportingDate) && invoice.status !== 'paid';
                          const displayStatus = isOverdue ? 'overdue' : invoice.status;
                          return (
                            <tr key={invoice.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-mono">{invoice.invoiceNumber}</td>
                              <td className="px-4 py-3 text-sm font-mono">{po?.number || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-right">${invoice.amount.toLocaleString()} USD</td>
                              <td className="px-4 py-3 text-sm text-center">
                                <span className={'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ' + getPaymentStatusColor(displayStatus)}>
                                  {displayStatus}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                {new Date(invoice.dueDate).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  <button
                                    onClick={() => handleEditInvoice(invoice)}
                                    className="text-blue-600 hover:text-blue-800 text-xs"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => handleDeleteInvoice(invoice.id)}
                                    className="text-red-600 hover:text-red-800 text-xs"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Estados Financieros */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Estados Financieros</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    <span><strong>Paid/Approved:</strong> Completado</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                    <span><strong>Pending:</strong> En proceso</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    <span><strong>Overdue:</strong> Vencido</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Cronograma */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Cronograma del Proyecto</h3>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  📅 Ver Cronograma Completo
                </button>
              </div>
              
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📅</div>
                <div className="text-lg mb-2">Cronograma del Proyecto</div>
                <div className="text-sm">Accede al cronograma completo para gestión detallada</div>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  Abrir Cronograma
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== MODALES DEL CONTROL FINANCIERO ===== */}
      
      {/* Modal de Órdenes de Compra */}
      {showPOModal && editingPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex-shrink-0 bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                {editingPO.id ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
              </h2>
              <button
                onClick={() => setShowPOModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Número de OC *</label>
                  <input
                    type="text"
                    value={editingPO.number}
                    onChange={(e) => updateEditingPO('number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="PO-2025-001"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Work Package</label>
                  <select
                    value={editingPO.workPackageId}
                    onChange={(e) => updateEditingPO('workPackageId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar Work Package</option>
                    {workPackages && workPackages.map(wp => (
                      <option key={wp.id} value={wp.id}>{wp.wbs} - {wp.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor *</label>
                <input
                  type="text"
                  value={editingPO.supplier}
                  onChange={(e) => updateEditingPO('supplier', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre del proveedor"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monto Total (USD) *</label>
                  <input
                    type="number"
                    value={editingPO.totalAmount}
                    onChange={(e) => updateEditingPO('totalAmount', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                  <select
                    value={editingPO.status}
                    onChange={(e) => updateEditingPO('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="approved">Aprobada</option>
                    <option value="rejected">Rechazada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Solicitud</label>
                  <input
                    type="date"
                    value={editingPO.requestDate}
                    onChange={(e) => updateEditingPO('requestDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Esperada</label>
                  <input
                    type="date"
                    value={editingPO.expectedDate}
                    onChange={(e) => updateEditingPO('expectedDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={editingPO.description}
                  onChange={(e) => updateEditingPO('description', e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descripción detallada de la orden de compra"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowPOModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePO}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Guardar OC
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Anticipos */}
      {showAdvanceModal && editingAdvance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex-shrink-0 bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                {editingAdvance.id ? 'Editar Anticipo' : 'Nuevo Anticipo'}
              </h2>
              <button
                onClick={() => setShowAdvanceModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Orden de Compra *</label>
                <select
                  value={editingAdvance.purchaseOrderId}
                  onChange={(e) => updateEditingAdvance('purchaseOrderId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar OC</option>
                  {purchaseOrders.map(po => (
                    <option key={po.id} value={po.id}>{po.number} - {po.supplier}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monto (USD) *</label>
                  <input
                    type="number"
                    value={editingAdvance.amount}
                    onChange={(e) => updateEditingAdvance('amount', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Porcentaje (%)</label>
                  <input
                    type="number"
                    value={editingAdvance.percentage}
                    onChange={(e) => updateEditingAdvance('percentage', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                  <select
                    value={editingAdvance.status}
                    onChange={(e) => updateEditingAdvance('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="paid">Pagado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Referencia</label>
                  <input
                    type="text"
                    value={editingAdvance.reference}
                    onChange={(e) => updateEditingAdvance('reference', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Referencia del anticipo"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Solicitud</label>
                  <input
                    type="date"
                    value={editingAdvance.requestDate}
                    onChange={(e) => updateEditingAdvance('requestDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Pago</label>
                  <input
                    type="date"
                    value={editingAdvance.paymentDate || ''}
                    onChange={(e) => updateEditingAdvance('paymentDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAdvanceModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveAdvance}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Guardar Anticipo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Facturas */}
      {showInvoiceModal && editingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex-shrink-0 bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                {editingInvoice.id ? 'Editar Factura' : 'Nueva Factura'}
              </h2>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Número de Factura *</label>
                  <input
                    type="text"
                    value={editingInvoice.invoiceNumber}
                    onChange={(e) => updateEditingInvoice('invoiceNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="INV-001-2025"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Orden de Compra *</label>
                  <select
                    value={editingInvoice.purchaseOrderId}
                    onChange={(e) => updateEditingInvoice('purchaseOrderId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar OC</option>
                    {purchaseOrders.map(po => (
                      <option key={po.id} value={po.id}>{po.number} - {po.supplier}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monto (USD) *</label>
                  <input
                    type="number"
                    value={editingInvoice.amount}
                    onChange={(e) => updateEditingInvoice('amount', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                  <select
                    value={editingInvoice.status}
                    onChange={(e) => updateEditingInvoice('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="paid">Pagada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Recepción</label>
                  <input
                    type="date"
                    value={editingInvoice.receivedDate}
                    onChange={(e) => updateEditingInvoice('receivedDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={editingInvoice.dueDate}
                    onChange={(e) => updateEditingInvoice('dueDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={editingInvoice.description}
                    onChange={(e) => updateEditingInvoice('description', e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descripción de la factura"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveInvoice}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Guardar Factura
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal del Cronograma */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
            <div className="flex-shrink-0 bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                Cronograma: {currentProject.name}
              </h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              <ScheduleManagement
                tasks={[]}
                setTasks={() => {}}
                importTasks={() => {}}
                projectData={currentProject}
                workPackages={workPackages}
                setWorkPackages={setWorkPackages}
                reportingDate={reportingDate}
                includeWeekends={false}
                setIncludeWeekends={() => {}}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;
