import React, { useState, useMemo } from 'react';
import useAuditLog from '../hooks/useAuditLog';

// ===== Utilidades de días laborables =====
const toISO = (d) => {
  if (!d) return new Date().toISOString().split('T')[0];
  const date = new Date(d);
  if (isNaN(date.getTime())) {
    console.warn('Invalid date in toISO:', d);
    return new Date().toISOString().split('T')[0];
  }
  return date.toISOString().split('T')[0];
};

// Función para verificar si un día es laboral (lunes a viernes)
const isWorkingDay = (date) => {
  const dayOfWeek = new Date(date).getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5; // 1=Lunes, 5=Viernes
};

// Función para calcular diferencia de días laborales (exclusivo)
const diffWorkingDaysExclusive = (a, b) => {
  const startDate = new Date(toISO(a));
  const endDate = new Date(toISO(b));
  let workingDays = 0;
  
  let currentDate = new Date(startDate);
  currentDate.setDate(currentDate.getDate() + 1); // Empezar desde el día siguiente
  
  while (currentDate < endDate) {
    if (isWorkingDay(currentDate)) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
};

// Función para calcular duración de días laborales (inclusivo)
const durationWorkingDaysInclusive = (start, end) => {
  const startDate = new Date(toISO(start));
  const endDate = new Date(toISO(end));
  let workingDays = 0;
  
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    if (isWorkingDay(currentDate)) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
};

// Función para calcular diferencia de días (exclusivo) - respeta configuración de días laborables
const diffDaysExclusive = (a, b, includeWeekends = false) => {
  if (includeWeekends) {
    // Comportamiento original: incluye sábados y domingos
    const d1 = new Date(toISO(a));
    const d2 = new Date(toISO(b));
    const DAY = 1000 * 60 * 60 * 24;
    return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / DAY));
  } else {
    // Nuevo comportamiento: solo días laborales
    return diffWorkingDaysExclusive(a, b);
  }
};

// Función para calcular duración de días (inclusivo) - respeta configuración de días laborables
const durationDaysInclusive = (start, end, includeWeekends = false) => {
  if (includeWeekends) {
    // Comportamiento original: incluye sábados y domingos
    const startDate = new Date(toISO(start));
    const endDate = new Date(toISO(end));
    const DAY = 1000 * 60 * 60 * 24;
    return Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / DAY) + 1);
  } else {
    // Nuevo comportamiento: solo días laborales
    return durationWorkingDaysInclusive(start, end);
  }
};

const FinancialManagement = ({ 
  workPackages, 
  setWorkPackages,
  currentProject,
  risks = [], // Agregar riesgos como prop
  scheduleData = null, // Nuevo prop para datos del cronograma
  includeWeekends = false, // Configuración de días laborables
  purchaseOrders = [], // Recibir órdenes de compra como prop
  setPurchaseOrders, // Función para actualizar órdenes de compra
  advances = [], // Recibir anticipos como prop
  setAdvances, // Función para actualizar anticipos
  invoices = [], // Recibir facturas como prop
  setInvoices, // Función para actualizar facturas
  contracts = [], // Recibir contratos como prop
  setContracts, // Función para actualizar contratos
  useSupabase = false // Prop para habilitar Supabase
}) => {
  const [showPOModal, setShowPOModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [editingAdvance, setEditingAdvance] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);

  // NOTA: Los estados purchaseOrders, advances, invoices, contracts ahora vienen como props
  // desde el componente padre para mantener la persistencia correcta
  
  // Estados para gestión de contratos PMBOK (solo modales)
  const [showContractModal, setShowContractModal] = useState(false);
  const [editingContract, setEditingContract] = useState(null);


  // Hook de auditoría
  const { logFinancialEvent } = useAuditLog(currentProject?.id, useSupabase);

  // Función para sincronizar con cronograma
  const syncWithSchedule = (scheduleUpdates) => {
    if (!scheduleUpdates || !scheduleUpdates.tasks) return;
    
    console.log('🔄 Sincronizando métricas financieras con cronograma...');
    
    // Actualizar work packages basado en progreso del cronograma
    const updatedWorkPackages = workPackages.map(wp => {
      const scheduleTask = scheduleUpdates.tasks.find(task => task.workPackageId === wp.id);
      if (scheduleTask) {
        return {
          id: wp.id,
          name: wp.name,
          description: wp.description,
          startDate: wp.startDate,
          endDate: wp.endDate,
          budget: wp.budget,
          actualCost: wp.actualCost,
          status: wp.status,
          priority: wp.priority,
          percentComplete: scheduleTask.progress || wp.percentComplete,
          plannedValue: wp.plannedValue,
          earnedValue: scheduleTask.progress ? (wp.plannedValue * scheduleTask.progress / 100) : wp.earnedValue,
          resources: wp.resources,
          startDate: scheduleTask.startDate || wp.startDate,
          endDate: scheduleTask.endDate || wp.endDate,
          status: scheduleTask.status || wp.status
        };
      }
      return wp;
    });
    
    setWorkPackages(updatedWorkPackages);
    console.log('✅ Work packages actualizados desde cronograma');
  };

  // Sincronizar cuando cambien los datos del cronograma
  React.useEffect(() => {
    if (scheduleData) {
      syncWithSchedule(scheduleData);
    }
  }, [scheduleData]);

  // Funciones para cálculo de reservas (deben estar antes del useMemo)
  const calculateContingencyReserve = () => {
    if (!risks || !Array.isArray(risks)) return (currentProject?.budget || 0) * 0.05;
    
    const activeRisks = risks.filter(r => r.status === 'active');
    if (activeRisks.length === 0) return (currentProject?.budget || 0) * 0.05;
    
    // Cálculo base (5% del presupuesto)
    const baseContingency = (currentProject?.budget || 0) * 0.05;
    
    // Cálculo basado en riesgos (suma de impactos esperados)
    const riskBasedContingency = activeRisks.reduce((sum, risk) => {
      const expectedImpact = (risk.probability || 0) * (risk.costImpact || 0);
      const priorityFactor = risk.priority === 'high' ? 1.5 : risk.priority === 'medium' ? 1.2 : 1.0;
      return sum + (expectedImpact * priorityFactor);
    }, 0);
    
    return baseContingency + riskBasedContingency;
  };

  const calculateManagementReserve = () => {
    if (!currentProject) return 0;
    const projectBudget = currentProject.budget || 0;
    
    if (!risks || !Array.isArray(risks)) return projectBudget * 0.1;
    
    const activeRisks = risks.filter(r => r.status === 'active');
    
    // Base 10% del presupuesto
    let managementReserve = projectBudget * 0.1;
    
    // Ajustar según complejidad de riesgos
    if (activeRisks.length > 10) {
      managementReserve *= 1.2;
    } else if (activeRisks.length > 5) {
      managementReserve *= 1.1;
    }
    
    // Ajustar por riesgos de alta prioridad
    const highPriorityRisks = activeRisks.filter(r => r.priority === 'high').length;
    if (highPriorityRisks > 3) {
      managementReserve *= 1.15;
    }
    
    return managementReserve;
  };

  // Calcular métricas financieras
  const financialMetrics = useMemo(() => {
    // Validar que los arrays existan y sean arrays válidos
    const safePurchaseOrders = Array.isArray(purchaseOrders) ? purchaseOrders : [];
    const safeAdvances = Array.isArray(advances) ? advances : [];
    const safeInvoices = Array.isArray(invoices) ? invoices : [];
    
    console.log('🔍 FINANCIAL METRICS DEBUG:', {
      purchaseOrdersType: typeof purchaseOrders,
      purchaseOrdersIsArray: Array.isArray(purchaseOrders),
      purchaseOrdersLength: safePurchaseOrders.length,
      advancesType: typeof advances,
      advancesIsArray: Array.isArray(advances),
      advancesLength: safeAdvances.length,
      invoicesType: typeof invoices,
      invoicesIsArray: Array.isArray(invoices),
      invoicesLength: safeInvoices.length
    });
    
    const totalPO = safePurchaseOrders.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
    const totalAdvances = safeAdvances.reduce((sum, adv) => sum + (adv.amount || 0), 0);
    const totalInvoices = safeInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const paidInvoices = safeInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const pendingInvoices = totalInvoices - paidInvoices;

    // Métricas EVM completas
    const BAC = currentProject?.budget || 0;
    const AC = totalInvoices; // Costo real incurrido
    const EV = paidInvoices; // Valor ganado (facturas pagadas)
    const PV = totalPO + totalAdvances; // Valor planificado (órdenes de compra + anticipos)
    
    // Incluir contratos en las métricas
    const totalContracts = contracts.reduce((sum, contract) => sum + (contract.value || 0), 0);
    const activeContracts = contracts.filter(contract => contract.status === 'active').reduce((sum, contract) => sum + (contract.value || 0), 0);
    
    const CV = EV - AC; // Cost Variance
    const SV = EV - PV; // Schedule Variance
    const CPI = AC > 0 ? EV / AC : 1; // Cost Performance Index
    const SPI = PV > 0 ? EV / PV : 1; // Schedule Performance Index
    
    // Proyecciones PMBOK
    const ETC = BAC - EV; // Estimate to Complete
    const EAC = AC + ETC; // Estimate at Completion
    const VAC = BAC - EAC; // Variance at Completion
    const TCPI = (BAC - EV) / (BAC - AC); // To Complete Performance Index

    return {
      // Métricas básicas
      totalPO,
      totalAdvances,
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      totalContracts,
      activeContracts,
      committedBudget: totalPO + totalAdvances + activeContracts,
      availableBudget: BAC - (totalPO + totalAdvances + activeContracts),
      
      // Métricas EVM completas
      BAC,
      AC,
      EV,
      PV,
      CV,
      SV,
      CPI,
      SPI,
      ETC,
      EAC,
      VAC,
      TCPI,
      
      // Porcentajes
      percentComplete: BAC > 0 ? (EV / BAC) * 100 : 0,
      percentSpent: BAC > 0 ? (AC / BAC) * 100 : 0,
      
      // Reservas
      contingencyReserve: calculateContingencyReserve(),
      managementReserve: calculateManagementReserve(),
      totalReserves: calculateContingencyReserve() + calculateManagementReserve(),
      totalProjectBudget: (currentProject?.budget || 0) + calculateContingencyReserve() + calculateManagementReserve()
    };
  }, [purchaseOrders, advances, invoices, contracts, currentProject, risks]);

  // Handlers para órdenes de compra
  const handleSavePO = () => {
    console.log('💾 GUARDANDO OC - editingPO:', editingPO);
    
    // Validación: Si está aprobada, debe tener fecha de aprobación
    if (editingPO.status === 'approved' && (!editingPO.approvalDate || editingPO.approvalDate.trim() === '')) {
      alert('⚠️ Error: Las órdenes de compra aprobadas deben tener una fecha de aprobación para el cálculo del flujo de caja.');
      return;
    }
    
    // Asegurar que purchaseOrders sea un array válido
    const currentOrders = Array.isArray(purchaseOrders) ? purchaseOrders : [];
    
    if (editingPO.id) {
      // Editar orden existente
      const updatedOrders = currentOrders.map(po => po.id === editingPO.id ? editingPO : po);
      console.log('📝 EDITANDO OC EXISTENTE:', editingPO.id, 'Total órdenes:', updatedOrders.length);
      setPurchaseOrders(updatedOrders);
    } else {
      // Crear nueva orden
      const newPO = {
        id: Date.now().toString(),
        number: editingPO.number,
        supplier: editingPO.supplier,
        description: editingPO.description,
        totalAmount: editingPO.totalAmount,
        currency: editingPO.currency || 'USD',
        status: editingPO.status,
        requestDate: editingPO.requestDate,
        approvalDate: editingPO.approvalDate,
        expectedDate: editingPO.expectedDate,
        projectId: editingPO.projectId
      };
      const newOrders = [...currentOrders, newPO];
      console.log('➕ CREANDO NUEVA OC:', newPO.id, 'Total órdenes:', newOrders.length);
      setPurchaseOrders(newOrders);
      
      // Registrar evento de auditoría
      if (logFinancialEvent && currentProject) {
        logFinancialEvent('purchase-order', newPO, currentProject);
      }
    }
    setShowPOModal(false);
    setEditingPO(null);
  };

  const handleDeletePO = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta orden de compra?')) {
      try {
        // Importar el servicio de Supabase dinámicamente
        const { default: supabaseService } = await import('../services/SupabaseService');
        
        // Eliminar de Supabase primero
        const result = await supabaseService.deletePurchaseOrder(id);
        
        if (result.success) {
          // Si se eliminó correctamente de Supabase, eliminar del estado local
          const currentOrders = Array.isArray(purchaseOrders) ? purchaseOrders : [];
          const filteredOrders = currentOrders.filter(po => po.id !== id);
          console.log('🗑️ ELIMINANDO OC:', id, 'Órdenes restantes:', filteredOrders.length);
          setPurchaseOrders(filteredOrders);
          console.log('✅ Orden de compra eliminada localmente y de Supabase');
        } else {
          console.error('❌ Error eliminando orden de compra de Supabase:', result.error);
          alert('Error eliminando la orden de compra. Inténtalo de nuevo.');
        }
      } catch (error) {
        console.error('❌ Error inesperado eliminando orden de compra:', error);
        alert('Error inesperado eliminando la orden de compra. Inténtalo de nuevo.');
      }
    }
  };

  // Handlers para anticipos
  const handleSaveAdvance = () => {
    const currentAdvances = Array.isArray(advances) ? advances : [];
    
    if (editingAdvance.id) {
      const updatedAdvances = currentAdvances.map(adv => adv.id === editingAdvance.id ? editingAdvance : adv);
      setAdvances(updatedAdvances);
    } else {
      const newAdvance = {
        id: Date.now().toString(),
        number: editingAdvance.number,
        supplier: editingAdvance.supplier,
        amount: editingAdvance.amount,
        paymentDate: editingAdvance.paymentDate,
        description: editingAdvance.description,
        projectId: editingAdvance.projectId
      };
      const newAdvances = [...currentAdvances, newAdvance];
      setAdvances(newAdvances);
      
      // Registrar evento de auditoría
      if (logFinancialEvent && currentProject) {
        logFinancialEvent('advance', newAdvance, currentProject);
      }
    }
    setShowAdvanceModal(false);
    setEditingAdvance(null);
  };

  const handleDeleteAdvance = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este anticipo?')) {
      try {
        // Importar el servicio de Supabase dinámicamente
        const { default: supabaseService } = await import('../services/SupabaseService');
        
        // Eliminar de Supabase primero
        const result = await supabaseService.deleteAdvance(id);
        
        if (result.success) {
          // Si se eliminó correctamente de Supabase, eliminar del estado local
          const currentAdvances = Array.isArray(advances) ? advances : [];
          const filteredAdvances = currentAdvances.filter(adv => adv.id !== id);
          setAdvances(filteredAdvances);
          console.log('✅ Anticipo eliminado localmente y de Supabase');
        } else {
          console.error('❌ Error eliminando anticipo de Supabase:', result.error);
          alert('Error eliminando el anticipo. Inténtalo de nuevo.');
        }
      } catch (error) {
        console.error('❌ Error inesperado eliminando anticipo:', error);
        alert('Error inesperado eliminando el anticipo. Inténtalo de nuevo.');
      }
    }
  };

  // Handlers para facturas
  const handleSaveInvoice = () => {
    const currentInvoices = Array.isArray(invoices) ? invoices : [];
    
    if (editingInvoice.id) {
      const updatedInvoices = currentInvoices.map(inv => inv.id === editingInvoice.id ? editingInvoice : inv);
      setInvoices(updatedInvoices);
    } else {
      const newInvoice = {
        id: Date.now().toString(),
        number: editingInvoice.number,
        supplier: editingInvoice.supplier,
        amount: editingInvoice.amount,
        dueDate: editingInvoice.dueDate,
        description: editingInvoice.description,
        projectId: editingInvoice.projectId
      };
      const newInvoices = [...currentInvoices, newInvoice];
      setInvoices(newInvoices);
      
      // Registrar evento de auditoría
      if (logFinancialEvent && currentProject) {
        logFinancialEvent('invoice', newInvoice, currentProject);
      }
    }
    setShowInvoiceModal(false);
    setEditingInvoice(null);
  };

  const handleDeleteInvoice = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta factura?')) {
      try {
        // Importar el servicio de Supabase dinámicamente
        const { default: supabaseService } = await import('../services/SupabaseService');
        
        // Eliminar de Supabase primero
        const result = await supabaseService.deleteInvoice(id);
        
        if (result.success) {
          // Si se eliminó correctamente de Supabase, eliminar del estado local
          const currentInvoices = Array.isArray(invoices) ? invoices : [];
          const filteredInvoices = currentInvoices.filter(inv => inv.id !== id);
          setInvoices(filteredInvoices);
          console.log('✅ Factura eliminada localmente y de Supabase');
        } else {
          console.error('❌ Error eliminando factura de Supabase:', result.error);
          alert('Error eliminando la factura. Inténtalo de nuevo.');
        }
      } catch (error) {
        console.error('❌ Error inesperado eliminando factura:', error);
        alert('Error inesperado eliminando la factura. Inténtalo de nuevo.');
      }
    }
  };

  // Handlers para contratos
  const handleSaveContract = () => {
    if (editingContract.id) {
      setContracts(prev => prev.map(contract => contract.id === editingContract.id ? editingContract : contract));
    } else {
      setContracts(prev => {
        const newContracts = prev.slice();
        const newContract = {
          id: Date.now().toString(),
          number: editingContract.number,
          supplier: editingContract.supplier,
          value: editingContract.value,
          type: editingContract.type,
          status: editingContract.status,
          startDate: editingContract.startDate,
          endDate: editingContract.endDate,
          description: editingContract.description,
          projectId: editingContract.projectId
        };
        newContracts.push(newContract);
        return newContracts;
      });
      
      // Registrar evento de auditoría
      if (logFinancialEvent && currentProject) {
        logFinancialEvent('contract', editingContract, currentProject);
      }
    }
    setShowContractModal(false);
    setEditingContract(null);
  };

  const handleDeleteContract = (id) => {
    setContracts(prev => prev.filter(contract => contract.id !== id));
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Principal - Diseño Verde Pastel */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-100 rounded-2xl shadow-lg p-6 text-gray-800 relative overflow-hidden">
        {/* Elementos decorativos de fondo */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-100/30 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-100/30 rounded-full translate-y-12 -translate-x-12"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-white/60 backdrop-blur rounded-2xl p-3 mr-4 shadow-sm">
                <span className="text-3xl">💰</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2 text-gray-800">Gestión Financiera</h1>
                <p className="text-gray-600 text-lg">Control de costos, órdenes de compra, anticipos y facturas</p>
              </div>
            </div>
            
            {/* Indicador de configuración de días laborables */}
            <div className="bg-white/60 backdrop-blur rounded-2xl px-4 py-2 shadow-sm">
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-gray-600">📅 Días laborables:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  includeWeekends 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {includeWeekends ? 'Lunes a Domingo' : 'Lunes a Viernes'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primera Fila - Métricas Principales EVM */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1 flex items-center">
                BAC (Presupuesto)
                <span className="ml-1 text-blue-500 cursor-help" title="Budget at Completion: Presupuesto total aprobado para el proyecto">❓</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                ${(financialMetrics.BAC / 1000).toFixed(0)}K
              </div>
            </div>
            <div className="text-blue-500 text-2xl">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1 flex items-center">
                EV (Valor Ganado)
                <span className="ml-1 text-green-500 cursor-help" title="Earned Value: Valor del trabajo realmente completado">❓</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                ${(financialMetrics.EV / 1000).toFixed(0)}K
              </div>
            </div>
            <div className="text-green-500 text-2xl">📈</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1 flex items-center">
                AC (Costo Real)
                <span className="ml-1 text-yellow-500 cursor-help" title="Actual Cost: Costo real incurrido hasta la fecha">❓</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                ${(financialMetrics.AC / 1000).toFixed(0)}K
              </div>
            </div>
            <div className="text-yellow-500 text-2xl">💸</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1 flex items-center">
                EAC (Estimación Final)
                <span className="ml-1 text-purple-500 cursor-help" title="Estimate at Completion: Estimación del costo total al terminar">❓</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                ${(financialMetrics.EAC / 1000).toFixed(0)}K
              </div>
            </div>
            <div className="text-purple-500 text-2xl">🎯</div>
          </div>
        </div>
      </div>

      {/* Segunda Fila - Índices de Rendimiento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1 flex items-center">
                CPI
                <span className="ml-1 text-blue-500 cursor-help" title="Cost Performance Index: EV/AC">❓</span>
              </div>
              <div className={`text-2xl font-bold ${financialMetrics.CPI >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                {financialMetrics.CPI.toFixed(2)}
              </div>
              <div className="text-xs text-gray-600">Cost Performance</div>
            </div>
            <div className="text-blue-500 text-2xl">📊</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1 flex items-center">
                SPI
                <span className="ml-1 text-orange-500 cursor-help" title="Schedule Performance Index: EV/PV">❓</span>
              </div>
              <div className={`text-2xl font-bold ${financialMetrics.SPI >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                {financialMetrics.SPI.toFixed(2)}
              </div>
              <div className="text-xs text-gray-600">Schedule Performance</div>
            </div>
            <div className="text-orange-500 text-2xl">⏱️</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1 flex items-center">
                VAC
                <span className="ml-1 text-red-500 cursor-help" title="Variance at Completion: BAC-EAC">❓</span>
              </div>
              <div className={`text-2xl font-bold ${financialMetrics.VAC >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${(financialMetrics.VAC / 1000).toFixed(0)}K
              </div>
              <div className="text-xs text-gray-600">Variance at Completion</div>
            </div>
            <div className="text-red-500 text-2xl">📉</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-teal-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1 flex items-center">
                TCPI
                <span className="ml-1 text-teal-500 cursor-help" title="To Complete Performance Index">❓</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {financialMetrics.TCPI.toFixed(2)}
              </div>
              <div className="text-xs text-gray-600">To Complete Performance</div>
            </div>
            <div className="text-teal-500 text-2xl">🎯</div>
          </div>
        </div>
      </div>

      {/* Tercera Fila - Métricas de Proyecto */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1 flex items-center">
                Contratos Activos
                <span className="ml-1 text-purple-500 cursor-help" title="Valor total de contratos activos">❓</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                ${(financialMetrics.activeContracts / 1000).toFixed(0)}K
              </div>
              <div className="text-xs text-gray-600">Valor total</div>
            </div>
            <div className="text-purple-500 text-2xl">📋</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1 flex items-center">
                % Completado
                <span className="ml-1 text-green-500 cursor-help" title="Porcentaje de trabajo completado">❓</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {financialMetrics.percentComplete.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600">Progreso del proyecto</div>
            </div>
            <div className="text-green-500 text-2xl">📈</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1 flex items-center">
                % Gastado
                <span className="ml-1 text-orange-500 cursor-help" title="Porcentaje del presupuesto utilizado">❓</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {financialMetrics.percentSpent.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600">Presupuesto utilizado</div>
            </div>
            <div className="text-orange-500 text-2xl">💸</div>
          </div>
        </div>
      </div>

      {/* Sección de Reservas y Contingencias */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">🛡️ Reservas y Contingencias</h3>
          <span className="text-sm text-gray-500">Basado en análisis de riesgos</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center">
                  Presupuesto Base
                  <span className="ml-1 text-gray-500 cursor-help" title="Presupuesto inicial aprobado del proyecto">❓</span>
                </div>
                <div className="text-2xl font-bold text-gray-800">
                  ${((currentProject?.budget || 0) / 1000).toFixed(0)}K
                </div>
              </div>
              <div className="text-gray-500 text-2xl">💰</div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center">
                  Reserva de Contingencia
                  <span className="ml-1 text-blue-500 cursor-help" title="Reserva para riesgos identificados. Fórmula: 5% base + impacto esperado de riesgos activos">❓</span>
                </div>
                <div className="text-2xl font-bold text-blue-800">
                  ${(financialMetrics.contingencyReserve / 1000).toFixed(0)}K
                </div>
              </div>
              <div className="text-blue-500 text-2xl">🛡️</div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center">
                  Reserva de Gestión
                  <span className="ml-1 text-green-500 cursor-help" title="Reserva para riesgos no identificados. Fórmula: 10% base + ajustes por complejidad">❓</span>
                </div>
                <div className="text-2xl font-bold text-green-800">
                  ${(financialMetrics.managementReserve / 1000).toFixed(0)}K
                </div>
              </div>
              <div className="text-green-500 text-2xl">📊</div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center">
                  Presupuesto Total
                  <span className="ml-1 text-purple-500 cursor-help" title="Presupuesto base + reservas de contingencia y gestión">❓</span>
                </div>
                <div className="text-2xl font-bold text-purple-800">
                  ${(financialMetrics.totalProjectBudget / 1000).toFixed(0)}K
                </div>
              </div>
              <div className="text-purple-500 text-2xl">🎯</div>
            </div>
          </div>
        </div>

        {/* Detalles de cálculo */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">📋 Detalles del Cálculo</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
            <div>
              <p><strong>Reserva de Contingencia:</strong> 5% del presupuesto base + impacto esperado de riesgos activos</p>
              <p><strong>Riesgos Activos:</strong> {risks?.filter(r => r.status === 'active').length || 0} identificados</p>
            </div>
            <div>
              <p><strong>Reserva de Gestión:</strong> 10% del presupuesto base + ajustes por complejidad</p>
              <p><strong>Riesgos de Alta Prioridad:</strong> {risks?.filter(r => r.status === 'active' && r.priority === 'high').length || 0} identificados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Secciones de Gestión */}
      <div className="grid grid-cols-1 gap-6">
        {/* Órdenes de Compra */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">📋 Órdenes de Compra</h3>
            <button
              onClick={() => {
                setEditingPO({
                  id: '',
                  number: '',
                  supplier: '',
                  description: '',
                  totalAmount: 0,
                  currency: 'USD',
                  status: 'pending',
                  requestDate: new Date().toISOString().split('T')[0],
                  approvalDate: '',
                  expectedDate: '',
                  projectId: currentProject?.id || ''
                });
                setShowPOModal(true);
              }}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              + Nueva
            </button>
          </div>
          
          <div className="space-y-3">
            {(!Array.isArray(purchaseOrders) || purchaseOrders.length === 0) ? (
              <p className="text-gray-500 text-sm">No hay órdenes de compra</p>
            ) : (
              purchaseOrders.map(po => (
                <div key={po.id} className="border rounded p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{po.number}</div>
                      <div className="text-xs text-gray-600">{po.supplier}</div>
                      <div className="text-xs text-gray-600">${po.totalAmount?.toLocaleString()}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          po.status === 'approved' ? 'bg-green-100 text-green-800' : 
                          po.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'
                        }`}>
                          {po.status === 'approved' ? 'Aprobada' : 
                           po.status === 'pending' ? 'Pendiente' : 'Rechazada'}
                        </span>
                        {po.status === 'approved' && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            po.approvalDate && po.approvalDate.trim() !== '' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {po.approvalDate && po.approvalDate.trim() !== '' 
                              ? `✅ ${new Date(po.approvalDate + 'T00:00:00').toLocaleDateString('es-ES')}` 
                              : '⚠️ Sin fecha de aprobación'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          setEditingPO(po);
                          setShowPOModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeletePO(po.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Anticipos */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">💳 Anticipos</h3>
            <button
              onClick={() => {
                setEditingAdvance({});
                setShowAdvanceModal(true);
              }}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
            >
              + Nuevo
            </button>
          </div>
          
          <div className="space-y-3">
            {advances.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay anticipos</p>
            ) : (
              advances.map(adv => (
                <div key={adv.id} className="border rounded p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-sm">{adv.number}</div>
                      <div className="text-xs text-gray-600">{adv.supplier}</div>
                      <div className="text-xs text-gray-600">${adv.amount?.toLocaleString()}</div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          setEditingAdvance(adv);
                          setShowAdvanceModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteAdvance(adv.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Facturas */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">📄 Facturas</h3>
            <button
              onClick={() => {
                setEditingInvoice({});
                setShowInvoiceModal(true);
              }}
              className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700"
            >
              + Nueva
            </button>
          </div>
          
          <div className="space-y-3">
            {invoices.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay facturas</p>
            ) : (
              invoices.map(inv => (
                <div key={inv.id} className="border rounded p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-sm">{inv.number}</div>
                      <div className="text-xs text-gray-600">{inv.supplier}</div>
                      <div className="text-xs text-gray-600">${inv.amount?.toLocaleString()}</div>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(inv.status)}`}>
                        {inv.status}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          setEditingInvoice(inv);
                          setShowInvoiceModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteInvoice(inv.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Modal de Orden de Compra */}
      {showPOModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editingPO?.id ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
                </h2>
                <button 
                  onClick={() => setShowPOModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de OC *</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={editingPO?.number || ''}
                    onChange={(e) => setEditingPO({
                      ...editingPO,
                      number: e.target.value
                    })}
                    placeholder="PO-2025-XXX"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={editingPO?.supplier || ''}
                    onChange={(e) => setEditingPO({
                      ...editingPO,
                      supplier: e.target.value
                    })}
                    placeholder="Nombre del proveedor"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto Total *</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    value={editingPO?.totalAmount || ''}
                    onChange={(e) => setEditingPO({
                      ...editingPO,
                      totalAmount: Number(e.target.value)
                    })}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={editingPO?.status || 'pending'}
                    onChange={(e) => setEditingPO({
                      ...editingPO,
                      status: e.target.value
                    })}
                  >
                    <option value="pending">Pendiente</option>
                    <option value="approved">Aprobada</option>
                    <option value="rejected">Rechazada</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Aprobación *
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={editingPO?.approvalDate || ''}
                    onChange={(e) => setEditingPO({
                      ...editingPO,
                      approvalDate: e.target.value
                    })}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Fecha cuando la orden fue aprobada (usada para flujo de caja)
                  </p>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    rows="3"
                    value={editingPO?.description || ''}
                    onChange={(e) => setEditingPO({
                      ...editingPO,
                      description: e.target.value
                    })}
                    placeholder="Descripción de los productos/servicios"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPOModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePO}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Anticipo */}
      {showAdvanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editingAdvance?.id ? 'Editar Anticipo' : 'Nuevo Anticipo'}
                </h2>
                <button 
                  onClick={() => setShowAdvanceModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de Anticipo *</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={editingAdvance?.number || ''}
                    onChange={(e) => setEditingAdvance({
                      id: editingAdvance.id,
                      number: editingAdvance.number,
                      supplier: editingAdvance.supplier,
                      amount: editingAdvance.amount,
                      paymentDate: editingAdvance.paymentDate,
                      description: editingAdvance.description,
                      projectId: editingAdvance.projectId, number: e.target.value})}
                    placeholder="ADV-2025-XXX"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={editingAdvance?.supplier || ''}
                    onChange={(e) => setEditingAdvance({
                      id: editingAdvance.id,
                      number: editingAdvance.number,
                      supplier: editingAdvance.supplier,
                      amount: editingAdvance.amount,
                      paymentDate: editingAdvance.paymentDate,
                      description: editingAdvance.description,
                      projectId: editingAdvance.projectId, supplier: e.target.value})}
                    placeholder="Nombre del proveedor"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    value={editingAdvance?.amount || ''}
                    onChange={(e) => setEditingAdvance({
                      id: editingAdvance.id,
                      number: editingAdvance.number,
                      supplier: editingAdvance.supplier,
                      amount: editingAdvance.amount,
                      paymentDate: editingAdvance.paymentDate,
                      description: editingAdvance.description,
                      projectId: editingAdvance.projectId, amount: Number(e.target.value)})}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Pago</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={editingAdvance?.paymentDate || ''}
                    onChange={(e) => setEditingAdvance({
                      id: editingAdvance.id,
                      number: editingAdvance.number,
                      supplier: editingAdvance.supplier,
                      amount: editingAdvance.amount,
                      paymentDate: editingAdvance.paymentDate,
                      description: editingAdvance.description,
                      projectId: editingAdvance.projectId, paymentDate: e.target.value})}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    rows="3"
                    value={editingAdvance?.description || ''}
                    onChange={(e) => setEditingAdvance({
                      id: editingAdvance.id,
                      number: editingAdvance.number,
                      supplier: editingAdvance.supplier,
                      amount: editingAdvance.amount,
                      paymentDate: editingAdvance.paymentDate,
                      description: editingAdvance.description,
                      projectId: editingAdvance.projectId, description: e.target.value})}
                    placeholder="Descripción del anticipo"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAdvanceModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveAdvance}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Factura */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editingInvoice?.id ? 'Editar Factura' : 'Nueva Factura'}
                </h2>
                <button 
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de Factura *</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={editingInvoice?.number || ''}
                    onChange={(e) => setEditingInvoice({
                      id: editingInvoice.id,
                      number: editingInvoice.number,
                      supplier: editingInvoice.supplier,
                      amount: editingInvoice.amount,
                      status: editingInvoice.status,
                      receivedDate: editingInvoice.receivedDate,
                      dueDate: editingInvoice.dueDate,
                      description: editingInvoice.description,
                      projectId: editingInvoice.projectId, number: e.target.value})}
                    placeholder="INV-2025-XXX"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={editingInvoice?.supplier || ''}
                    onChange={(e) => setEditingInvoice({
                      id: editingInvoice.id,
                      number: editingInvoice.number,
                      supplier: editingInvoice.supplier,
                      amount: editingInvoice.amount,
                      status: editingInvoice.status,
                      receivedDate: editingInvoice.receivedDate,
                      dueDate: editingInvoice.dueDate,
                      description: editingInvoice.description,
                      projectId: editingInvoice.projectId, supplier: e.target.value})}
                    placeholder="Nombre del proveedor"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                  <input
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    value={editingInvoice?.amount || ''}
                    onChange={(e) => setEditingInvoice({
                      id: editingInvoice.id,
                      number: editingInvoice.number,
                      supplier: editingInvoice.supplier,
                      amount: editingInvoice.amount,
                      status: editingInvoice.status,
                      receivedDate: editingInvoice.receivedDate,
                      dueDate: editingInvoice.dueDate,
                      description: editingInvoice.description,
                      projectId: editingInvoice.projectId, amount: Number(e.target.value)})}
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={editingInvoice?.status || 'pending'}
                    onChange={(e) => setEditingInvoice({
                      id: editingInvoice.id,
                      number: editingInvoice.number,
                      supplier: editingInvoice.supplier,
                      amount: editingInvoice.amount,
                      status: editingInvoice.status,
                      receivedDate: editingInvoice.receivedDate,
                      dueDate: editingInvoice.dueDate,
                      description: editingInvoice.description,
                      projectId: editingInvoice.projectId, status: e.target.value})}
                  >
                    <option value="pending">Pendiente</option>
                    <option value="paid">Pagada</option>
                    <option value="overdue">Vencida</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Recepción</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={editingInvoice?.receivedDate || ''}
                    onChange={(e) => setEditingInvoice({
                      id: editingInvoice.id,
                      number: editingInvoice.number,
                      supplier: editingInvoice.supplier,
                      amount: editingInvoice.amount,
                      status: editingInvoice.status,
                      receivedDate: editingInvoice.receivedDate,
                      dueDate: editingInvoice.dueDate,
                      description: editingInvoice.description,
                      projectId: editingInvoice.projectId, receivedDate: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={editingInvoice?.dueDate || ''}
                    onChange={(e) => setEditingInvoice({
                      id: editingInvoice.id,
                      number: editingInvoice.number,
                      supplier: editingInvoice.supplier,
                      amount: editingInvoice.amount,
                      status: editingInvoice.status,
                      receivedDate: editingInvoice.receivedDate,
                      dueDate: editingInvoice.dueDate,
                      description: editingInvoice.description,
                      projectId: editingInvoice.projectId, dueDate: e.target.value})}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    rows="3"
                    value={editingInvoice?.description || ''}
                    onChange={(e) => setEditingInvoice({
                      id: editingInvoice.id,
                      number: editingInvoice.number,
                      supplier: editingInvoice.supplier,
                      amount: editingInvoice.amount,
                      status: editingInvoice.status,
                      receivedDate: editingInvoice.receivedDate,
                      dueDate: editingInvoice.dueDate,
                      description: editingInvoice.description,
                      projectId: editingInvoice.projectId, description: e.target.value})}
                    placeholder="Descripción de la factura"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveInvoice}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Sección de Proyección de Flujo de Caja */}


    </div>
  );
};

export default FinancialManagement;
