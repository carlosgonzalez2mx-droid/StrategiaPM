import React, { useState, useMemo } from 'react';
import useAuditLog from '../hooks/useAuditLog';

const CashFlowProjection = ({ 
  currentProjectId,
  currentProject,
  projects,
  workPackages,
  tasks,
  purchaseOrders,
  advances,
  invoices,
  contracts
}) => {
  // Generar ID único para esta instancia del componente
  const componentId = useMemo(() => Math.random().toString(36).substr(2, 9), []);
  
  console.log(`🔍 CASHFLOW COMPONENT - INSTANCIA ${componentId} INICIANDO:`, {
    currentProject: currentProject?.name,
    tasksCount: tasks?.length || 0,
    timestamp: new Date().toISOString()
  });
  
  // DEBUG: Logging detallado de las tareas recibidas
  console.log(`🔍 CASHFLOW COMPONENT [${componentId}] - TAREAS RECIBIDAS:`, {
    totalTasks: tasks?.length || 0,
    tasksWithCosts: tasks?.filter(t => t.cost > 0).length || 0,
    tasksWithCostsDetails: tasks?.filter(t => t.cost > 0).map(t => ({
      id: t.id,
      name: t.name,
      cost: t.cost,
      startDate: t.startDate,
      endDate: t.endDate,
      isMilestone: t.isMilestone
    })) || []
  });
  
  const [projectionPeriod, setProjectionPeriod] = useState('12'); // meses
  const [projectionStartDate, setProjectionStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [showProjectionSettings, setShowProjectionSettings] = useState(false);
  const [projectionSettings, setProjectionSettings] = useState({
    // Configuración simplificada para tu flujo de negocio
    paymentTerms: 'milestone', // Cambiado a milestone para que use la fecha de aprobación directamente
    revenueRecognition: 'percentage_completion' // 'uniform' o 'percentage_completion'
  });
  
  const { addAuditEvent } = useAuditLog(currentProjectId);

  // Usar el proyecto actual que se pasa como prop (ya procesado por ProjectManagementTabs)
  console.log('🔍 CASHFLOW DEBUG - currentProject recibido:', currentProject);
  console.log('🔍 CASHFLOW DEBUG - currentProjectId:', currentProjectId);

  // Calcular progreso del proyecto
  const calculateProjectProgress = (date) => {
    if (!currentProject) return 0;
    
    const startDate = new Date(currentProject.startDate);
    const endDate = new Date(currentProject.endDate);
    const totalDuration = endDate - startDate;
    const elapsed = date - startDate;
    
    if (totalDuration <= 0) return 0;
    if (elapsed <= 0) return 0;
    if (elapsed >= totalDuration) return 100;
    
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  };

  // Calcular gasto planificado del mes basado en costos del cronograma
  const calculateMonthPlannedExpense = (monthDate) => {
    if (!currentProject || !tasks) {
      console.log('🔍 CashFlow: No hay proyecto o tareas:', { currentProject: !!currentProject, tasks: !!tasks });
      return 0;
    }

    // Normalizar fechas del rango mensual
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    
    console.log('🔍 CashFlow: Calculando gasto planificado para mes:', {
      month: monthDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }),
      monthStart: monthStart.toISOString().split('T')[0],
      monthEnd: monthEnd.toISOString().split('T')[0],
      totalTasks: tasks.length
    });
    
    // DEBUG: Mostrar todas las tareas con costos para julio 2026
    if (monthDate.getMonth() === 6 && monthDate.getFullYear() === 2026) {
      console.log('🔍 DEBUG JULIO 2026 - ANÁLISIS COMPLETO DE TAREAS:');
      console.log('🔍 Rango del mes julio 2026:', {
        monthStart: monthStart.toISOString().split('T')[0],
        monthEnd: monthEnd.toISOString().split('T')[0]
      });

      let totalCostoEsperado = 0;
      let tareasEnJulio = 0;
      let tareasExcluidasJulio = [];

      tasks.forEach((task, index) => {
        if (task.cost && task.cost > 0) {
          totalCostoEsperado += task.cost;

          // Verificar si la tarea está en julio 2026
          const taskStart = new Date(task.startDate);
          const normalizedTaskStart = new Date(
            taskStart.getFullYear(), 
            taskStart.getMonth(), 
            taskStart.getDate(),
            0, 0, 0, 0
          );
          
          const taskEnd = new Date(task.endDate);
          const normalizedTaskEnd = new Date(
            taskEnd.getFullYear(), 
            taskEnd.getMonth(), 
            taskEnd.getDate(),
            23, 59, 59, 999
          );

          let isInMonth = false;
          if (task.isMilestone || task.duration === 0) {
            isInMonth = normalizedTaskStart >= monthStart && normalizedTaskStart <= monthEnd;
          } else {
            isInMonth = normalizedTaskStart <= monthEnd && normalizedTaskEnd >= monthStart;
          }

          if (isInMonth) {
            tareasEnJulio++;
            console.log(`  ✅ INCLUIDA - Tarea ${index + 1}:`, {
              name: task.name || task.title,
              cost: task.cost,
              startDate: task.startDate,
              endDate: task.endDate,
              isMilestone: task.isMilestone,
              duration: task.duration,
              taskStart: taskStart.toISOString().split('T')[0],
              taskEnd: taskEnd.toISOString().split('T')[0]
            });
          } else {
            tareasExcluidasJulio.push({
              index: index + 1,
              name: task.name || task.title,
              cost: task.cost,
              startDate: task.startDate,
              taskStart: taskStart.toISOString().split('T')[0],
              isMilestone: task.isMilestone,
              razon: task.isMilestone ?
                `Hito fuera del rango: ${taskStart.toISOString().split('T')[0]} no está entre ${monthStart.toISOString().split('T')[0]} y ${monthEnd.toISOString().split('T')[0]}` :
                `Tarea normal sin intersección: ${taskStart.toISOString().split('T')[0]} - ${taskEnd.toISOString().split('T')[0]} no intersecta con ${monthStart.toISOString().split('T')[0]} - ${monthEnd.toISOString().split('T')[0]}`
            });
          }
        }
      });

      console.log('🔍 JULIO 2026 - Resumen:', {
        totalTareas: tasks.length,
        tareasConCosto: tasks.filter(t => t.cost > 0).length,
        tareasEnJulio: tareasEnJulio,
        costoTotalEsperado: totalCostoEsperado,
        costoPromedioPorTarea: totalCostoEsperado / tasks.filter(t => t.cost > 0).length
      });

      console.log('🔍 JULIO 2026 - Tareas EXCLUIDAS (posibles causas del error):', tareasExcluidasJulio);
    }
    
    let plannedExpense = 0;
    let tasksWithCosts = 0;
    let tasksInMonth = 0;
    
    // Calcular gasto planificado basado en tareas del cronograma que se ejecutan en este mes
    tasks.forEach((task, index) => {
      console.log(`🔍 CashFlow: Tarea ${index + 1}:`, {
        name: task.name || task.title,
        cost: task.cost,
        startDate: task.startDate,
        endDate: task.endDate,
        hasCost: !!task.cost,
        hasDates: !!(task.startDate && task.endDate),
        isMilestone: task.isMilestone,
        duration: task.duration
      });
      
      // DEBUG ESPECÍFICO: Para la tarea 45 (hito problemático)
      if (index === 44) { // Tarea 45 (índice 44)
        const monthName = monthDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
        console.log('🚨 DEBUG TAREA 45 ESPECÍFICA:', {
          taskName: task.name || task.title,
          taskCost: task.cost,
          taskStartDate: task.startDate,
          taskEndDate: task.endDate,
          isMilestone: task.isMilestone,
          duration: task.duration,
          monthStart: monthStart.toISOString().split('T')[0],
          monthEnd: monthEnd.toISOString().split('T')[0],
          monthName: monthName
        });
        
        // DEBUG: Logging específico para agosto 2026
        if (monthName === 'agosto de 2026' && task.cost > 0) {
          console.log(`🔍 CASHFLOW [${componentId}] - TAREA CON COSTO EN AGOSTO 2026:`, {
            taskIndex: index,
            taskId: task.id,
            taskName: task.name,
            taskCost: task.cost,
            taskStartDate: task.startDate,
            taskEndDate: task.endDate,
            isMilestone: task.isMilestone,
            duration: task.duration,
            monthName: monthName,
            monthStart: monthStart.toISOString().split('T')[0],
            monthEnd: monthEnd.toISOString().split('T')[0]
          });
        }
      }
      
      if (task.cost && task.startDate && task.endDate) {
        tasksWithCosts++;
        const taskStart = new Date(task.startDate);
        const normalizedTaskStart = new Date(
          taskStart.getFullYear(), 
          taskStart.getMonth(), 
          taskStart.getDate(),
          0, 0, 0, 0
        );
        
        const taskEnd = new Date(task.endDate);
        const normalizedTaskEnd = new Date(
          taskEnd.getFullYear(), 
          taskEnd.getMonth(), 
          taskEnd.getDate(),
          23, 59, 59, 999
        );
        
        // DEBUG: Logging específico para julio y agosto 2026
        const monthName = monthDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
        if ((monthName === 'julio de 2026' || monthName === 'agosto de 2026') && task.cost > 0) {
          console.log(`🔍 CASHFLOW [${componentId}] - TAREA CON COSTO EN ${monthName.toUpperCase()}:`, {
            taskIndex: index,
            taskId: task.id,
            taskName: task.name,
            taskCost: task.cost,
            taskStartDate: task.startDate,
            taskEndDate: task.endDate,
            isMilestone: task.isMilestone,
            duration: task.duration,
            monthName: monthName,
            monthStart: monthStart.toISOString().split('T')[0],
            monthEnd: monthEnd.toISOString().split('T')[0]
          });
        }
        
        // Verificar si la tarea se ejecuta en este mes
        // CORRECCIÓN: Para hitos, verificar que la fecha esté exactamente en el mes
        let isInMonth = false;
        
        if (task.isMilestone || task.duration === 0) {
          // Para hitos: verificar que la fecha esté dentro del mes
          isInMonth = normalizedTaskStart >= monthStart && normalizedTaskStart <= monthEnd;
          
  // DEBUG: Logging detallado solo para tareas con costos altos y meses específicos
  if (task.cost > 0 && (monthName === 'julio de 2026' || monthName === 'agosto de 2026')) {
    console.log(`🎯 DEBUG HITO [${componentId}] - Verificación de mes:`, {
      taskName: task.name || task.title,
      taskStartDate: task.startDate,
      taskStart: taskStart.toISOString().split('T')[0],
      monthStart: monthStart.toISOString().split('T')[0],
      monthEnd: monthEnd.toISOString().split('T')[0],
      isInMonth: isInMonth,
      monthName: monthName,
      comparison: {
        taskStartGreaterEqualMonthStart: normalizedTaskStart >= monthStart,
        taskStartLessEqualMonthEnd: normalizedTaskStart <= monthEnd,
        taskStartTime: normalizedTaskStart.getTime(),
        monthStartTime: monthStart.getTime(),
        monthEndTime: monthEnd.getTime()
      }
    });
  }
        } else {
          // Para tareas normales: verificar intersección de fechas
          isInMonth = normalizedTaskStart <= monthEnd && normalizedTaskEnd >= monthStart;
        }
        
        if (isInMonth) {
          tasksInMonth++;
          
          // CORRECCIÓN: Manejo especial para hitos (duración 0)
          if (task.isMilestone || task.duration === 0) {
            // Para hitos: el costo completo se asigna al mes donde ocurre
            const taskCostInMonth = task.cost || 0;
            plannedExpense += taskCostInMonth;
            
            console.log(`💰 CashFlow: HITO "${task.name || task.title}" en mes:`, {
              taskCost: task.cost,
              isMilestone: true,
              startDate: task.startDate,
              endDate: task.endDate,
              costInMonth: taskCostInMonth.toFixed(2)
            });
            
            // DEBUG ESPECÍFICO: Para el hito problemático
            if (task.cost && task.cost > 300000) {
              console.log('🚨 DEBUG HITO PROBLEMÁTICO:', {
                taskName: task.name || task.title,
                taskCost: task.cost,
                taskStartDate: task.startDate,
                taskEndDate: task.endDate,
                monthStart: monthStart.toISOString().split('T')[0],
                monthEnd: monthEnd.toISOString().split('T')[0],
                isInMonth: normalizedTaskStart <= monthEnd && normalizedTaskEnd >= monthStart,
                plannedExpenseBefore: plannedExpense - taskCostInMonth,
                plannedExpenseAfter: plannedExpense
              });
            }
          } else {
            // Para tareas normales: calcular porcentaje basado en duración
            const monthDuration = monthEnd - monthStart + 1; // Duración del mes en ms
            const taskDuration = normalizedTaskEnd - normalizedTaskStart + 1; // Duración de la tarea en ms
            
            // Calcular intersección de fechas
            const intersectionStart = new Date(Math.max(normalizedTaskStart.getTime(), monthStart.getTime()));
            const intersectionEnd = new Date(Math.min(normalizedTaskEnd.getTime(), monthEnd.getTime()));
            const intersectionDuration = intersectionEnd - intersectionStart + 1;
            
            if (intersectionDuration > 0) {
              const percentageInMonth = intersectionDuration / taskDuration;
              const taskCostInMonth = (task.cost || 0) * percentageInMonth;
              plannedExpense += taskCostInMonth;
              
              console.log(`💰 CashFlow: Tarea "${task.name || task.title}" en mes:`, {
                taskCost: task.cost,
                percentageInMonth: (percentageInMonth * 100).toFixed(1) + '%',
                costInMonth: taskCostInMonth.toFixed(2)
              });
            }
          }
        }
      }
    });
    
    console.log('🔍 CashFlow: Resumen del mes:', {
      totalTasks: tasks.length,
      tasksWithCosts,
      tasksInMonth,
      plannedExpense: plannedExpense.toFixed(2)
    });

    // DEBUG ESPECÍFICO PARA JULIO 2026
    if (monthDate.getMonth() === 6 && monthDate.getFullYear() === 2026) {
      console.log('🎯 JULIO 2026 - VALOR FINAL CALCULADO:', {
        plannedExpense: plannedExpense,
        plannedExpenseFixed: plannedExpense.toFixed(3),
        valorEsperadoPorUsuario: 385953.528,
        diferencia: plannedExpense - 385953.528,
        porcentajeDelEsperado: ((plannedExpense / 385953.528) * 100).toFixed(2) + '%'
      });
    }

    return plannedExpense;
  };

  // Calcular gasto comprometido del mes - ÓRDENES DE COMPRA APROBADAS
  const calculateMonthCommittedExpense = (monthDate, daysToPayment) => {
    if (!currentProject) return 0;

    console.log('🔍 CASHFLOW PROJECTION - calculateMonthCommittedExpense iniciando:', {
      monthDate: monthDate.toISOString().substring(0, 7),
      purchaseOrdersLength: purchaseOrders?.length || 0,
      purchaseOrders: purchaseOrders
    });

    // DEBUG: Mostrar todas las órdenes de compra aprobadas
    const approvedPOs = purchaseOrders?.filter(po => po.status === 'approved') || [];
    console.log('🔍 CASHFLOW PROJECTION - Órdenes de compra aprobadas:', approvedPOs.map(po => ({
      id: po.id,
      number: po.number,
      status: po.status,
      totalAmount: po.totalAmount,
      approvalDate: po.approvalDate,
      requestDate: po.requestDate,
      hasApprovalDate: !!(po.approvalDate && po.approvalDate.trim() !== ''),
      hasRequestDate: !!(po.requestDate && po.requestDate.trim() !== '')
    })));

    let committedExpense = 0;
    // Normalizar fechas del rango mensual
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    console.log('🔍 CASHFLOW PROJECTION - Rango de fechas:', {
      monthStart: monthStart.toISOString().split('T')[0],
      monthEnd: monthEnd.toISOString().split('T')[0]
    });

    // GASTO COMPROMETIDO: Solo órdenes de compra aprobadas con fecha de aprobación
    const monthPOs = purchaseOrders?.filter(po => {
      if (po.status !== 'approved') return false;
      
      // SOLO usar approvalDate - si no existe, no incluir la orden
      if (!po.approvalDate || po.approvalDate.trim() === '') {
        console.log('⚠️ CASHFLOW PROJECTION - OC sin fecha de aprobación:', {
          id: po.id,
          number: po.number,
          status: po.status,
          totalAmount: po.totalAmount,
          approvalDate: po.approvalDate
        });
        return false;
      }
      
      // CORREGIDO: Usar fecha local para evitar problemas de zona horaria
      const approvalDate = new Date(po.approvalDate + 'T00:00:00');
      const normalizedApprovalDate = new Date(
        approvalDate.getFullYear(),
        approvalDate.getMonth(),
        approvalDate.getDate(),
        0, 0, 0, 0
      );
      
      const adjustedDate = new Date(normalizedApprovalDate);
      adjustedDate.setDate(normalizedApprovalDate.getDate() + daysToPayment);
      adjustedDate.setHours(0, 0, 0, 0);
      
      const isInMonth = adjustedDate >= monthStart && adjustedDate <= monthEnd;
      
      console.log('🔍 CASHFLOW PROJECTION - Evaluando OC:', {
        id: po.id,
        number: po.number,
        approvalDate: po.approvalDate,
        approvalDateParsed: approvalDate.toISOString().split('T')[0],
        adjustedDate: adjustedDate.toISOString().split('T')[0],
        monthStart: monthStart.toISOString().split('T')[0],
        monthEnd: monthEnd.toISOString().split('T')[0],
        daysToPayment,
        status: po.status,
        totalAmount: po.totalAmount,
        isInMonth,
        willInclude: isInMonth
      });
      
      return isInMonth;
    }) || [];

    // Sumar el total de las órdenes de compra del mes
    committedExpense += monthPOs.reduce((sum, po) => {
      console.log(`✅ CASHFLOW PROJECTION - INCLUYENDO OC ${po.number}: $${po.totalAmount}`);
      return sum + (po.totalAmount || 0);
    }, 0);

    console.log('🔍 CASHFLOW PROJECTION - Resultado final:', {
      monthPOsCount: monthPOs.length,
      committedExpense
    });

    return committedExpense;
  };

  // Calcular gasto real del mes - ANTICIPOS PAGADOS + FACTURAS PAGADAS
  const calculateMonthRealExpense = (monthDate) => {
    if (!currentProject) return 0;

    let realExpense = 0;
    // Normalizar fechas del rango mensual
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    // ANTICIPOS PAGADOS
    const monthAdvances = advances?.filter(advance => {
      if (advance.status !== 'paid') return false;
      
      const paymentDate = new Date(advance.paymentDate || advance.date);
      const normalizedPaymentDate = new Date(
        paymentDate.getFullYear(),
        paymentDate.getMonth(),
        paymentDate.getDate(),
        0, 0, 0, 0
      );
      return normalizedPaymentDate >= monthStart && normalizedPaymentDate <= monthEnd;
    }) || [];

    realExpense += monthAdvances.reduce((sum, advance) => sum + (advance.amount || 0), 0);

    // FACTURAS PAGADAS
    const monthInvoices = invoices?.filter(invoice => {
      if (invoice.status !== 'paid') return false;
      
      const paymentDate = new Date(invoice.paymentDate || invoice.date);
      const normalizedPaymentDate = new Date(
        paymentDate.getFullYear(),
        paymentDate.getMonth(),
        paymentDate.getDate(),
        0, 0, 0, 0
      );
      return normalizedPaymentDate >= monthStart && normalizedPaymentDate <= monthEnd;
    }) || [];

    realExpense += monthInvoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);

    return realExpense;
  };

  // Calcular proyección de flujo de caja
  // FORZAR RECÁLCULO: Agregar timestamp para invalidar cache
  const forceRecalculation = useMemo(() => Date.now(), [currentProject, tasks, projectionPeriod, projectionStartDate]);

  const cashFlowProjection = useMemo(() => {
    if (!currentProject) return null;

    console.log(`🔄 CASHFLOW PROJECTION [${componentId}] - FORZANDO RECÁLCULO COMPLETO:`, {
      currentProject: currentProject?.name,
      projectionPeriod,
      projectionStartDate,
      purchaseOrders: purchaseOrders?.length || 0,
      advances: advances?.length || 0,
      invoices: invoices?.length || 0,
      tasks: tasks?.length || 0,
      forceRecalculation,
      timestamp: new Date().toISOString()
    });

    const startDate = new Date(projectionStartDate);
    const months = parseInt(projectionPeriod);
    const projection = [];

    // Configuración de términos de pago
    const paymentTerms = {
      net30: 30,
      net60: 60,
      net90: 90,
      advance: -15, // 15 días antes
      milestone: 0
    };

    const daysToPayment = paymentTerms[projectionSettings.paymentTerms];

    // DEBUG: Mostrar configuración de proyección
    console.log('🔍 CASHFLOW PROJECTION - CONFIGURACIÓN COMPLETA:', {
      startDate: startDate.toISOString().split('T')[0],
      months: months,
      projectionStartDate: projectionStartDate,
      projectionPeriod: projectionPeriod,
      currentProject: currentProject?.name
    });

    // Calcular flujo de caja mes a mes
    for (let i = 0; i < months; i++) {
      // CORREGIDO: Cálculo robusto de fechas para evitar repetición de meses
      const currentDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);

      const monthKey = currentDate.toISOString().slice(0, 7); // YYYY-MM
      const monthLabel = currentDate.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long'
      });

      console.log(`🔍 CASHFLOW PROJECTION - Procesando mes ${i + 1}: ${monthKey} (${monthLabel})`);

      // DEBUG ESPECÍFICO: Alertar cuando procesamos julio 2026
      if (monthKey === '2026-07') {
        console.log('🎯 JULIO 2026 DETECTADO - Iniciando cálculo detallado...');
      }

      // Calcular gasto planificado del mes
      const monthPlannedExpense = calculateMonthPlannedExpense(currentDate);
      console.log(`🔍 CASHFLOW PROJECTION [${componentId}] - RESULTADO calculateMonthPlannedExpense para ${monthKey}: $${monthPlannedExpense}`);
      
      // Calcular gasto comprometido del mes (OCs)
      console.log(`🔍 CASHFLOW PROJECTION - LLAMANDO calculateMonthCommittedExpense para mes ${monthKey}`);
      const monthCommittedExpense = calculateMonthCommittedExpense(currentDate, daysToPayment);
      console.log(`🔍 CASHFLOW PROJECTION - RESULTADO calculateMonthCommittedExpense: $${monthCommittedExpense}`);
      
      // Calcular gasto real del mes (anticipos pagados + facturas pagadas)
      const monthRealExpense = calculateMonthRealExpense(currentDate);
      
      // Calcular diferencia (gasto planificado - gasto real)
      const netCashFlow = monthPlannedExpense - monthRealExpense;
      
      // Calcular saldo acumulado
      const previousBalance = i > 0 ? projection[i - 1].cumulativeBalance : 0;
      const cumulativeBalance = previousBalance + monthPlannedExpense;

      const monthProjection = {
        month: i + 1,
        monthKey,
        monthLabel,
        date: currentDate,
        revenue: monthPlannedExpense, // Mantener 'revenue' para compatibilidad con el resto del código
        expenses: monthCommittedExpense, // Gasto comprometido (OCs)
        realExpenses: monthRealExpense, // Gasto real (anticipos + facturas pagadas)
        netCashFlow,
        cumulativeBalance,
        cashIn: monthPlannedExpense,
        cashOut: monthRealExpense
      };
      
      // DEBUG: Logging específico para julio y agosto 2026
      if (monthKey === '2026-07' || monthKey === '2026-08') {
        console.log(`🔍 CASHFLOW PROJECTION [${componentId}] - ASIGNANDO VALORES para ${monthKey}:`, {
          monthPlannedExpense: monthPlannedExpense,
          revenue: monthProjection.revenue,
          monthLabel: monthProjection.monthLabel,
          monthKey: monthProjection.monthKey
        });
      }
      
      projection.push(monthProjection);
    }

    // DEBUG: Logging final de la proyección completa
    console.log(`🔍 CASHFLOW PROJECTION [${componentId}] - PROYECCIÓN FINAL COMPLETA:`, {
      totalMonths: projection.length,
      julio2026: projection.find(m => m.monthKey === '2026-07'),
      agosto2026: projection.find(m => m.monthKey === '2026-08'),
      timestamp: new Date().toISOString()
    });

    return projection;
  }, [currentProject, projectionPeriod, projectionStartDate, projectionSettings, purchaseOrders, advances, invoices, contracts, tasks, forceRecalculation]);

  // Calcular métricas de flujo de caja
  const cashFlowMetrics = useMemo(() => {
    if (!cashFlowProjection) return null;

    // Calcular gasto planificado total
    const totalPlannedExpense = cashFlowProjection.reduce((sum, month) => sum + month.revenue, 0);
    
    const totalCommittedExpenses = cashFlowProjection.reduce((sum, month) => sum + month.expenses, 0);
    const totalRealExpenses = cashFlowProjection.reduce((sum, month) => sum + month.realExpenses, 0);
    const totalNetCashFlow = totalPlannedExpense - totalRealExpenses;
    
    const maxCashOutflow = Math.min(...cashFlowProjection.map(m => m.cumulativeBalance));
    const maxCashInflow = Math.max(...cashFlowProjection.map(m => m.cumulativeBalance));
    
    const positiveMonths = cashFlowProjection.filter(m => m.netCashFlow > 0).length;
    const negativeMonths = cashFlowProjection.filter(m => m.netCashFlow < 0).length;
    
    const averageMonthlyPlannedExpense = totalPlannedExpense / cashFlowProjection.length;
    const averageMonthlyCommittedExpenses = totalCommittedExpenses / cashFlowProjection.length;
    const averageMonthlyRealExpenses = totalRealExpenses / cashFlowProjection.length;
    
    return {
      totalRevenue: totalPlannedExpense, // Mantener 'totalRevenue' para compatibilidad
      totalPlannedExpense,
      totalCommittedExpenses,
      totalRealExpenses,
      totalExpenses: totalCommittedExpenses, // Mantener para compatibilidad
      totalNetCashFlow,
      maxCashOutflow,
      maxCashInflow,
      positiveMonths,
      negativeMonths,
      averageMonthlyRevenue: averageMonthlyPlannedExpense,
      averageMonthlyExpenses: averageMonthlyCommittedExpenses,
      averageMonthlyRealExpenses,
      projectDuration: cashFlowProjection.length
    };
  }, [cashFlowProjection]);

  // Exportar proyección a Excel
  const exportProjection = () => {
    if (!cashFlowProjection) return;

    const csvContent = [
      ['Mes', 'Gasto Planificado', 'Gasto Comprometido (OCs)', 'Gasto Real', 'Saldo Acumulado'],
      ...cashFlowProjection.map(month => [
        month.monthLabel,
        formatCurrency(month.revenue),
        formatCurrency(month.expenses),
        formatCurrency(month.realExpenses),
        formatCurrency(month.cumulativeBalance)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proyeccion-flujo-caja-${currentProject?.name || 'proyecto'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    // Registrar en audit log
    addAuditEvent('cash_flow', 'projection_exported', {
      projectId: currentProjectId,
      period: projectionPeriod,
      startDate: projectionStartDate
    });
  };

  // Función para formatear números con formato mexicano: $1.234.567,89
  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '$0,00';
    
    // Formatear con separadores de miles (punto) y decimales (coma)
    // CORRECCIÓN: Permitir hasta 3 decimales para preservar precisión de costos
    const formatted = new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3
    }).format(value);
    
    return `$${formatted}`;
  };

  // Obtener color para el flujo de caja
  const getCashFlowColor = (value) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Obtener color para el saldo acumulado
  const getBalanceColor = (value) => {
    if (value > 0) return 'text-green-700';
    if (value < 0) return 'text-red-700';
    return 'text-gray-700';
  };

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-6">💰</div>
            <div className="text-2xl font-bold text-gray-700 mb-2">
              Proyecto no seleccionado
            </div>
            <div className="text-gray-500">
              Selecciona un proyecto para ver la proyección de flujo de caja
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-100 rounded-2xl shadow-lg p-8 mb-8 text-gray-800 relative overflow-hidden">
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
                  <h1 className="text-4xl font-bold mb-3 text-gray-800">Proyección de Flujo de Caja</h1>
                  <p className="text-gray-600 text-lg">
                    Análisis financiero del proyecto según PMBOK v7 - Gestión de Costos
                  </p>
                  <div className="mt-4 flex items-center space-x-6 text-sm text-gray-700">
                    <span className="flex items-center space-x-1">
                      <span className="text-gray-500">📊</span>
                      <span>Proyecto: {currentProject.name}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="text-gray-500">📅</span>
                      <span>Período: {projectionPeriod} meses</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="text-gray-500">💵</span>
                      <span>Presupuesto: ${(currentProject.budget / 1000).toFixed(0)}K</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="text-gray-500">🛡️</span>
                      <span>Reserva: ${((currentProject.contingencyReserve + currentProject.managementReserve) / 1000).toFixed(0)}K</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  onClick={exportProjection}
                  className="px-6 py-3 bg-white text-green-700 rounded-xl hover:bg-green-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-semibold border border-green-200"
                >
                  📊 Exportar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Métricas principales */}
        {cashFlowMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-800">{formatCurrency(cashFlowMetrics.totalRevenue)}</div>
                  <div className="text-sm text-gray-600">Gasto Planificado Total</div>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-800">{formatCurrency(cashFlowMetrics.totalExpenses)}</div>
                  <div className="text-sm text-gray-600">Gastos Totales</div>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <span className="text-2xl">📉</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-2xl font-bold ${getCashFlowColor(cashFlowMetrics.totalNetCashFlow)}`}>
                    {formatCurrency(cashFlowMetrics.totalNetCashFlow)}
                  </div>
                  <div className="text-sm text-gray-600">Flujo Neto</div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-2xl font-bold ${getBalanceColor(cashFlowMetrics.maxCashOutflow)}`}>
                    {formatCurrency(cashFlowMetrics.maxCashOutflow)}
                  </div>
                  <div className="text-sm text-gray-600">Máximo Déficit</div>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <span className="text-2xl">⚠️</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Configuración de proyección */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Período de Proyección (meses)
              </label>
              <select
                value={projectionPeriod}
                onChange={(e) => setProjectionPeriod(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              >
                <option value="6">6 meses</option>
                <option value="12">12 meses</option>
                <option value="18">18 meses</option>
                <option value="24">24 meses</option>
                <option value="36">36 meses</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🚀 Fecha de Inicio
              </label>
              <input
                type="date"
                value={projectionStartDate}
                onChange={(e) => setProjectionStartDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => setShowProjectionSettings(true)}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                ⚙️ Configuración Avanzada
              </button>
            </div>
          </div>
        </div>

        {/* Tabla de proyección */}
        {cashFlowProjection && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                📊 Proyección Mensual de Flujo de Caja
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mes</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gasto Planificado</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gasto Comprometido (OCs)</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gasto Real</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Acumulado</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cashFlowProjection.map((month) => {
                    // DEBUG: Logging específico para julio y agosto 2026 en el renderizado
                    if (month.monthKey === '2026-07' || month.monthKey === '2026-08') {
                      console.log(`🔍 CASHFLOW RENDER [${componentId}] - RENDERIZANDO ${month.monthKey}:`, {
                        monthLabel: month.monthLabel,
                        revenue: month.revenue,
                        formattedRevenue: formatCurrency(month.revenue),
                        monthObject: month
                      });
                    }
                    
                    return (
                    <tr key={month.month} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{month.monthLabel}</div>
                        <div className="text-sm text-gray-500">Mes {month.month}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-orange-600 font-medium">{formatCurrency(month.revenue)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-blue-600 font-medium">{formatCurrency(month.expenses)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-red-600 font-medium">{formatCurrency(month.realExpenses)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`font-medium ${getBalanceColor(month.cumulativeBalance)}`}>
                          {formatCurrency(month.cumulativeBalance)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          month.cumulativeBalance > 0 
                            ? 'bg-green-100 text-green-800' 
                            : month.cumulativeBalance < 0 
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {month.cumulativeBalance > 0 ? '✅ Positivo' : month.cumulativeBalance < 0 ? '⚠️ Déficit' : '⚖️ Equilibrio'}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Gráfico de flujo de caja */}
        {cashFlowProjection && (
          <div className="bg-white rounded-xl shadow-sm p-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">📈 Gráfico de Flujo de Caja</h3>
            
            {/* Gráfico de barras - Flujo Neto Mensual */}
            <div className="mb-8">
              <h4 className="text-md font-medium text-gray-700 mb-4">💰 Flujo Neto Mensual</h4>
              <div className="h-48 flex items-end justify-between space-x-2">
                {cashFlowProjection.map((month) => {
                  // SOLUCIÓN DEL USUARIO: Calcular altura basada en el valor más alto
                  const maxNetFlow = Math.max(
                    ...cashFlowProjection.map(m => Math.abs(m.netCashFlow))
                  );
                  
                  // Altura proporcional en píxeles: valor actual / valor más alto * altura del contenedor
                  const containerHeight = 192; // h-48 = 192px
                  let height = 0;
                  if (maxNetFlow > 0) {
                    height = (Math.abs(month.netCashFlow) / maxNetFlow) * containerHeight;
                  }
                  
                  // Altura mínima solo para valores exactamente cero
                  if (month.netCashFlow === 0) {
                    height = 2; // Altura mínima para valores exactamente cero
                  }
                  
                  return (
                    <div key={`net-${month.month}`} className="flex-1 flex flex-col items-center">
                      <div className="text-xs text-gray-500 mb-2 text-center">
                        {month.monthLabel.slice(0, 3)}
                      </div>
                      <div 
                        className={`w-full rounded-t transition-all duration-300 ${
                          month.netCashFlow > 0 
                            ? 'bg-green-500' 
                            : month.netCashFlow < 0 
                            ? 'bg-red-500'
                            : 'bg-gray-400'
                        }`}
                        style={{ 
                          height: `${height}px`
                        }}
                      ></div>
                      <div className={`text-xs font-medium mt-1 ${getCashFlowColor(month.netCashFlow)}`}>
                        {formatCurrency(month.netCashFlow)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Gráfico de líneas - Saldo Acumulado */}
            <div className="mb-8">
              <h4 className="text-md font-medium text-gray-700 mb-4">📊 Saldo Acumulado (Línea de Tiempo)</h4>
              <div className="h-48 relative">
                <svg className="w-full h-full" viewBox={`0 0 ${cashFlowProjection.length * 100} 200`}>
                  {/* Líneas de referencia */}
                  <line x1="0" y1="100" x2={cashFlowProjection.length * 100} y2="100" 
                         stroke="#e5e7eb" strokeWidth="1" strokeDasharray="5,5" />
                  
                  {/* Línea del saldo acumulado */}
                  {(() => {
                    const minBalance = Math.min(...cashFlowProjection.map(m => m.cumulativeBalance));
                    const maxBalance = Math.max(...cashFlowProjection.map(m => m.cumulativeBalance));
                    const range = maxBalance - minBalance;
                    
                    const points = cashFlowProjection.map((month, index) => {
                      const normalizedY = range > 0 ? (month.cumulativeBalance - minBalance) / range : 0.5;
                      const y = 200 - (normalizedY * 180);
                      return `${index * 100 + 50},${y}`;
                    }).join(' ');
                    
                    return (
                      <polyline
                        points={points}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })()}
                  
                  {/* Puntos de datos */}
                  {(() => {
                    const minBalance = Math.min(...cashFlowProjection.map(m => m.cumulativeBalance));
                    const maxBalance = Math.max(...cashFlowProjection.map(m => m.cumulativeBalance));
                    const range = maxBalance - minBalance;
                    
                    return cashFlowProjection.map((month, index) => {
                      const normalizedY = range > 0 ? (month.cumulativeBalance - minBalance) / range : 0.5;
                      const y = 200 - (normalizedY * 180);
                      
                      return (
                        <circle
                          key={`point-${month.month}`}
                          cx={index * 100 + 50}
                          cy={y}
                          r="4"
                          fill={month.cumulativeBalance > 0 ? "#10b981" : month.cumulativeBalance < 0 ? "#ef4444" : "#6b7280"}
                          stroke="white"
                          strokeWidth="2"
                        />
                      );
                    });
                  })()}
                </svg>
                
                {/* Etiquetas de meses en el eje X */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4">
                  {cashFlowProjection.map((month) => (
                    <div key={`label-${month.month}`} className="text-xs text-gray-500">
                      {month.monthLabel.slice(0, 3)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            
          </div>
        )}
      </div>

      {/* Modal de configuración */}
      {showProjectionSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-gray-800">⚙️ Configuración de Proyección</h2>
                <button
                  onClick={() => setShowProjectionSettings(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📊 Términos de Pago para Órdenes de Compra
                  </label>
                  <select
                    value={projectionSettings.paymentTerms}
                    onChange={(e) => setProjectionSettings({
                      projectId: projectionSettings.projectId,
                      startDate: projectionSettings.startDate,
                      endDate: projectionSettings.endDate,
                      paymentTerms: e.target.value,
                      revenueRecognition: projectionSettings.revenueRecognition,
                      expenseTiming: projectionSettings.expenseTiming,
                      cashFlowBuffer: projectionSettings.cashFlowBuffer
                    })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  >
                    <option value="net30">Net 30 días</option>
                    <option value="net60">Net 60 días</option>
                    <option value="net90">Net 90 días</option>
                    <option value="advance">Anticipado (15 días antes)</option>
                    <option value="milestone">Por hitos</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Define cuándo se registran los gastos de las órdenes de compra en el flujo de caja
                  </p>
                  <div className="text-xs text-gray-400 mt-2 space-y-1">
                    <div>• <strong>Por hitos:</strong> Usa la fecha de aprobación directamente</div>
                    <div>• <strong>Net 30/60/90:</strong> Fecha de aprobación + días de pago</div>
                    <div>• <strong>Anticipado:</strong> Fecha de aprobación - 15 días</div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📈 Reconocimiento de Ingresos
                  </label>
                  <select
                    value={projectionSettings.revenueRecognition}
                    onChange={(e) => setProjectionSettings({
                      projectId: projectionSettings.projectId,
                      startDate: projectionSettings.startDate,
                      endDate: projectionSettings.endDate,
                      paymentTerms: projectionSettings.paymentTerms,
                      revenueRecognition: e.target.value,
                      expenseTiming: projectionSettings.expenseTiming,
                      cashFlowBuffer: projectionSettings.cashFlowBuffer
                    })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  >
                    <option value="uniform">Distribución Uniforme</option>
                    <option value="percentage_completion">Por Progreso del Proyecto</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Cómo se distribuye el presupuesto del proyecto a lo largo del tiempo
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 pt-6 border-t mt-8">
                <button
                  onClick={() => setShowProjectionSettings(false)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setShowProjectionSettings(false)}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  💾 Guardar Configuración
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashFlowProjection;
