import { logger } from '../utils/logger';

import React, { useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import * as XLSX from 'xlsx';

// Registrar los componentes de Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ConsolidatedCashFlow = ({ 
  projects = [],
  tasksByProject = {},
  purchaseOrdersByProject = {},
  advancesByProject = {},
  invoicesByProject = {}
}) => {
  const [projectionPeriod, setProjectionPeriod] = useState('12'); // meses
  const [projectionStartDate, setProjectionStartDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Filtrar solo proyectos activos
  const activeProjects = projects.filter(p => p.status === 'active');
  
  // Logs de depuración
  logger.debug('🔍 CONSOLIDATED CASHFLOW DEBUG:', {
    projects: projects?.length || 0,
    activeProjects: activeProjects.length,
    tasksByProject: Object.keys(tasksByProject || {}).length,
    purchaseOrdersByProject: Object.keys(purchaseOrdersByProject || {}).length,
    advancesByProject: Object.keys(advancesByProject || {}).length,
    invoicesByProject: Object.keys(invoicesByProject || {}).length,
    activeProjectIds: activeProjects.map(p => p.id)
  });
  
  // Log detallado de órdenes de compra
  Object.keys(purchaseOrdersByProject || {}).forEach(projectId => {
    const pos = purchaseOrdersByProject[projectId] || [];
    logger.debug(`🔍 ÓRDENES DE COMPRA para proyecto ${projectId}:`, {
      total: pos.length,
      orders: pos.map(po => ({
        id: po.id,
        number: po.number,
        approvalDate: po.approvalDate,
        date: po.date,
        status: po.status,
        totalAmount: po.totalAmount
      }))
    });
  });
  
  // Calcular gasto planificado del mes basado en costos del cronograma
  const calculateMonthPlannedExpense = (tasks, monthDate) => {
    if (!tasks || tasks.length === 0) return 0;
    
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    
    return tasks.reduce((total, task) => {
      const taskStart = new Date(task.startDate);
      const taskEnd = new Date(task.endDate);
      
      // Verificar si la tarea se ejecuta en este mes
      if (taskStart <= monthEnd && taskEnd >= monthStart) {
        return total + (task.cost || 0);
      }
      return total;
    }, 0);
  };
  
  // Calcular gasto comprometido del mes (ordenes de compra aprobadas)
  const calculateMonthCommittedExpense = (purchaseOrders, monthDate) => {
    logger.debug('🔍 CALCULANDO GASTO COMPROMETIDO - Iniciando función:', {
      purchaseOrdersLength: purchaseOrders?.length || 0,
      monthDate: monthDate.toISOString().substring(0, 7),
      purchaseOrders: purchaseOrders
    });
    
    if (!purchaseOrders || purchaseOrders.length === 0) {
      logger.debug('🔍 No hay órdenes de compra para calcular gasto comprometido');
      return 0;
    }
    
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    
    // Ajustar las fechas para incluir todo el día
    monthStart.setHours(0, 0, 0, 0);
    monthEnd.setHours(23, 59, 59, 999);
    
    logger.debug('🔍 Calculando gasto comprometido para mes:', {
      month: monthDate.toISOString().substring(0, 7),
      monthStart: monthStart.toISOString().split('T')[0],
      monthEnd: monthEnd.toISOString().split('T')[0],
      totalPOs: purchaseOrders.length
    });
    
    // Log detallado de cada orden de compra ANTES del reduce
    logger.debug('🔍 DETALLE COMPLETO DE ÓRDENES DE COMPRA:');
    purchaseOrders.forEach((po, index) => {
      logger.debug(`🔍 OC ${index + 1}:`, {
        id: po.id,
        number: po.number,
        approvalDate: po.approvalDate,
        date: po.date,
        status: po.status,
        totalAmount: po.totalAmount,
        allFields: Object.keys(po)
      });
    });
    
    return purchaseOrders.reduce((total, po) => {
      // Validar que la orden esté aprobada
      const isApproved = po.status === 'approved' || po.status === 'delivered';
      if (!isApproved) return total;
      
      // Validar y crear fecha de forma segura
      let poDate;
      if (po.approvalDate && po.approvalDate.trim() !== '') {
        poDate = new Date(po.approvalDate + 'T00:00:00');
      } else if (po.date && po.date.trim() !== '') {
        poDate = new Date(po.date + 'T00:00:00');
      } else {
        logger.debug('⚠️ OC sin fecha válida:', {
          id: po.id,
          number: po.number,
          approvalDate: po.approvalDate,
          date: po.date
        });
        return total;
      }
      
      // Verificar que la fecha sea válida
      if (isNaN(poDate.getTime())) {
        logger.debug('⚠️ OC con fecha inválida:', {
          id: po.id,
          number: po.number,
          approvalDate: po.approvalDate,
          date: po.date,
          poDate: poDate
        });
        return total;
      }
      
      const isInMonth = poDate >= monthStart && poDate <= monthEnd;
      
      logger.debug('🔍 Evaluando OC:', {
        id: po.id,
        number: po.number,
        approvalDate: po.approvalDate,
        date: po.date,
        poDate: poDate.toISOString().split('T')[0],
        monthStart: monthStart.toISOString().split('T')[0],
        monthEnd: monthEnd.toISOString().split('T')[0],
        status: po.status,
        totalAmount: po.totalAmount,
        isInMonth,
        isApproved,
        willInclude: isInMonth && isApproved
      });
      
      if (isInMonth) {
        logger.debug(`✅ INCLUYENDO OC ${po.number}: $${po.totalAmount} en mes ${monthDate.toISOString().substring(0, 7)}`);
        return total + (po.totalAmount || 0);
      }
      return total;
    }, 0);
  };
  
  // Calcular gasto real del mes (anticipos pagados + facturas pagadas)
  const calculateMonthRealExpense = (advances, invoices, monthDate) => {
    if (!advances && !invoices) return 0;
    
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    
    let totalReal = 0;
    
    // Sumar anticipos pagados
    if (advances && advances.length > 0) {
      totalReal += advances.reduce((sum, advance) => {
        if (!advance.paymentDate || advance.paymentDate.trim() === '') return sum;
        
        const advanceDate = new Date(advance.paymentDate + 'T00:00:00');
        if (isNaN(advanceDate.getTime())) return sum;
        
        const isInMonth = advanceDate >= monthStart && advanceDate <= monthEnd;
        const isPaid = advance.status === 'paid';
        
        if (isInMonth && isPaid) {
          return sum + (advance.amount || 0);
        }
        return sum;
      }, 0);
    }
    
    // Sumar facturas pagadas
    if (invoices && invoices.length > 0) {
      totalReal += invoices.reduce((sum, invoice) => {
        if (!invoice.paymentDate || invoice.paymentDate.trim() === '') return sum;
        
        const invoiceDate = new Date(invoice.paymentDate + 'T00:00:00');
        if (isNaN(invoiceDate.getTime())) return sum;
        
        const isInMonth = invoiceDate >= monthStart && invoiceDate <= monthEnd;
        const isPaid = invoice.status === 'pagada';
        
        if (isInMonth && isPaid) {
          return sum + (invoice.amount || 0);
        }
        return sum;
      }, 0);
    }
    
    return totalReal;
  };
  
  // Calcular flujo de caja consolidado
  const consolidatedCashFlow = useMemo(() => {
    if (activeProjects.length === 0) return { projection: [], metrics: {} };
    
    const months = [];
    const startDate = new Date(projectionStartDate);
    
    for (let i = 0; i < parseInt(projectionPeriod); i++) {
      const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      const monthKey = monthDate.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
      
      let totalPlannedExpense = 0;
      let totalCommittedExpense = 0;
      let totalRealExpense = 0;
      
      // Consolidar datos de todos los proyectos activos
      activeProjects.forEach(project => {
        const projectTasks = tasksByProject[project.id] || [];
        const projectPurchaseOrders = purchaseOrdersByProject[project.id] || [];
        const projectAdvances = advancesByProject[project.id] || [];
        const projectInvoices = invoicesByProject[project.id] || [];
        
        logger.debug(`🔍 Proyecto ${project.id} (${project.name}):`, {
          tasks: projectTasks.length,
          purchaseOrders: projectPurchaseOrders.length,
          advances: projectAdvances.length,
          invoices: projectInvoices.length
        });
        
        // Calcular gasto planificado del mes (basado en costos del cronograma)
        const monthPlannedExpense = calculateMonthPlannedExpense(projectTasks, monthDate);
        totalPlannedExpense += monthPlannedExpense;
        
        // Calcular gasto comprometido del mes (ordenes de compra aprobadas)
        logger.debug(`🔍 LLAMANDO calculateMonthCommittedExpense para proyecto ${project.id} en mes ${monthKey}`);
        const monthCommittedExpense = calculateMonthCommittedExpense(projectPurchaseOrders, monthDate);
        logger.debug(`🔍 RESULTADO calculateMonthCommittedExpense: $${monthCommittedExpense}`);
        totalCommittedExpense += monthCommittedExpense;
        
        // Calcular gasto real del mes (anticipos pagados + facturas pagadas)
        const monthRealExpense = calculateMonthRealExpense(projectAdvances, projectInvoices, monthDate);
        totalRealExpense += monthRealExpense;
        
        logger.debug(`🔍 Gastos del mes ${monthKey} para proyecto ${project.id}:`, {
          planned: monthPlannedExpense,
          committed: monthCommittedExpense,
          real: monthRealExpense
        });
      });
      
      months.push({
        month: monthDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        monthKey,
        revenue: totalPlannedExpense, // Gasto planificado
        expenses: totalCommittedExpense, // Gasto comprometido
        realExpenses: totalRealExpense, // Gasto real
        netFlow: totalPlannedExpense - totalRealExpense // Flujo neto (planificado - real)
      });
    }
    
    return {
      projection: months,
      metrics: {
        totalPlannedExpense: months.reduce((sum, m) => sum + m.revenue, 0),
        totalCommittedExpenses: months.reduce((sum, m) => sum + m.expenses, 0),
        totalRealExpenses: months.reduce((sum, m) => sum + m.realExpenses, 0),
        totalNetCashFlow: months.reduce((sum, m) => sum + m.netFlow, 0)
      }
    };
  }, [activeProjects, tasksByProject, purchaseOrdersByProject, advancesByProject, invoicesByProject, projectionPeriod, projectionStartDate]);
  
  // Exportar a Excel
  const exportToExcel = () => {
    const data = consolidatedCashFlow.projection.map(month => ({
      'Mes': month.month,
      'Gasto Planificado': month.revenue,
      'Gasto Comprometido (OCs)': month.expenses,
      'Gasto Real': month.realExpenses,
      'Flujo Neto': month.netFlow
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Flujo de Caja Consolidado');
    
    const fileName = `Flujo_Caja_Consolidado_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };
  
  if (activeProjects.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="text-3xl mr-3">💰</span>
          Flujo de Caja Consolidado
        </h2>
        <div className="text-center py-8">
          <div className="text-gray-500 text-lg">No hay proyectos activos para mostrar el flujo de caja consolidado</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <span className="text-3xl mr-3">💰</span>
          Flujo de Caja Consolidado
        </h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Período:</label>
            <select
              value={projectionPeriod}
              onChange={(e) => setProjectionPeriod(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="6">6 meses</option>
              <option value="12">12 meses</option>
              <option value="18">18 meses</option>
              <option value="24">24 meses</option>
            </select>
          </div>
          <button
            onClick={exportToExcel}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors"
          >
            <span>📊</span>
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>
      
      {/* Métricas consolidadas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg">💰</span>
            <span className="text-sm font-medium text-orange-600">Gasto Planificado Total</span>
          </div>
          <div className="text-2xl font-bold text-orange-800">
            ${(consolidatedCashFlow.metrics.totalPlannedExpense / 1000).toFixed(0)}K
          </div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg">📋</span>
            <span className="text-sm font-medium text-blue-600">Gasto Comprometido Total</span>
          </div>
          <div className="text-2xl font-bold text-blue-800">
            ${(consolidatedCashFlow.metrics.totalCommittedExpenses / 1000).toFixed(0)}K
          </div>
        </div>
        
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg">💸</span>
            <span className="text-sm font-medium text-red-600">Gasto Real Total</span>
          </div>
          <div className="text-2xl font-bold text-red-800">
            ${(consolidatedCashFlow.metrics.totalRealExpenses / 1000).toFixed(0)}K
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg">📈</span>
            <span className="text-sm font-medium text-green-600">Flujo Neto Total</span>
          </div>
          <div className="text-2xl font-bold text-green-800">
            ${(consolidatedCashFlow.metrics.totalNetCashFlow / 1000).toFixed(0)}K
          </div>
        </div>
      </div>
      
      {/* Gráfico de barras */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Gasto Planificado vs Gasto Comprometido vs Gasto Real</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <Bar 
            data={{
              labels: consolidatedCashFlow.projection.map(month => month.month),
              datasets: [
                {
                  label: 'Gasto Planificado',
                  data: consolidatedCashFlow.projection.map(month => month.revenue),
                  backgroundColor: 'rgba(255, 159, 64, 0.8)',
                  borderColor: 'rgba(255, 159, 64, 1)',
                  borderWidth: 1
                },
                {
                  label: 'Gasto Comprometido (OCs)',
                  data: consolidatedCashFlow.projection.map(month => month.expenses),
                  backgroundColor: 'rgba(54, 162, 235, 0.8)',
                  borderColor: 'rgba(54, 162, 235, 1)',
                  borderWidth: 1
                },
                {
                  label: 'Gasto Real',
                  data: consolidatedCashFlow.projection.map(month => month.realExpenses),
                  backgroundColor: 'rgba(255, 99, 132, 0.8)',
                  borderColor: 'rgba(255, 99, 132, 1)',
                  borderWidth: 1
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                title: {
                  display: false
                },
                legend: {
                  position: 'bottom',
                  labels: {
                    padding: 20,
                    usePointStyle: true
                  }
                }
              },
              scales: {
                x: {
                  stacked: false,
                  title: {
                    display: true,
                    text: 'Meses'
                  },
                  ticks: {
                    maxRotation: 60,
                    minRotation: 60,
                    padding: 15,
                    font: {
                      size: 9
                    }
                  }
                },
                y: {
                  stacked: false,
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Monto (USD)'
                  },
                  ticks: {
                    callback: function(value) {
                      return '$' + value.toLocaleString();
                    }
                  }
                }
              }
            }}
            height={400}
          />
        </div>
      </div>
      
      {/* Tabla de proyección mensual */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="w-1/5 border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">Mes</th>
              <th className="w-1/5 border border-gray-300 px-4 py-3 text-right font-semibold text-gray-700">Gasto Planificado</th>
              <th className="w-1/5 border border-gray-300 px-4 py-3 text-right font-semibold text-gray-700">Gasto Comprometido (OCs)</th>
              <th className="w-1/5 border border-gray-300 px-4 py-3 text-right font-semibold text-gray-700">Gasto Real</th>
              <th className="w-1/5 border border-gray-300 px-4 py-3 text-right font-semibold text-gray-700">Flujo Neto</th>
            </tr>
          </thead>
          <tbody>
            {consolidatedCashFlow.projection.map((month, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="w-1/5 border border-gray-300 px-4 py-3 font-medium text-gray-800">
                  {month.month}
                </td>
                <td className="w-1/5 border border-gray-300 px-4 py-3 text-right text-orange-600 font-medium">
                  ${month.revenue.toLocaleString()}
                </td>
                <td className="w-1/5 border border-gray-300 px-4 py-3 text-right text-blue-600 font-medium">
                  ${month.expenses.toLocaleString()}
                </td>
                <td className="w-1/5 border border-gray-300 px-4 py-3 text-right text-red-600 font-medium">
                  ${month.realExpenses.toLocaleString()}
                </td>
                <td className={`w-1/5 border border-gray-300 px-4 py-3 text-right font-medium ${
                  month.netFlow >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${month.netFlow.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ConsolidatedCashFlow;
