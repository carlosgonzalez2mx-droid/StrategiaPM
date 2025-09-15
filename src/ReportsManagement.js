import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

const ReportsManagement = ({ 
  projects, 
  workPackages, 
  risks, 
  currentProject,
  evmMetrics 
}) => {
  const [selectedReport, setSelectedReport] = useState('executive');
  const [dateRange, setDateRange] = useState('month');
  const [exportFormat, setExportFormat] = useState('pdf');

  // Tipos de reportes disponibles
  const reportTypes = [
    { id: 'executive', name: '📊 Reporte Ejecutivo', icon: '📊' },
    { id: 'progress', name: '📈 Reporte de Progreso', icon: '📈' },
    { id: 'financial', name: '💰 Reporte Financiero', icon: '💰' },
    { id: 'risks', name: '⚠️ Reporte de Riesgos', icon: '⚠️' },
    { id: 'trends', name: '📉 Análisis de Tendencias', icon: '📉' },
    { id: 'performance', name: '🎯 Análisis de Rendimiento', icon: '🎯' }
  ];

  // Calcular métricas para reportes
  const reportMetrics = useMemo(() => {
    if (!currentProject) return {};

    const activeWorkPackages = workPackages.filter(wp => wp.status === 'active' || wp.status === 'in-progress');
    const completedWorkPackages = workPackages.filter(wp => wp.status === 'completed');
    const delayedWorkPackages = workPackages.filter(wp => wp.status === 'delayed');
    const activeRisks = risks.filter(r => r.status === 'active');
    const highPriorityRisks = risks.filter(r => r.priority === 'high' && r.status === 'active');

    // Tendencias (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentWorkPackages = workPackages.filter(wp => 
      new Date(wp.updatedAt || wp.startDate) >= thirtyDaysAgo
    );

    return {
      // Métricas generales
      totalWorkPackages: workPackages.length,
      activeWorkPackages: activeWorkPackages.length,
      completedWorkPackages: completedWorkPackages.length,
      delayedWorkPackages: delayedWorkPackages.length,
      
      // Progreso
      progressPercentage: workPackages.length > 0 ? 
        (completedWorkPackages.length / workPackages.length) * 100 : 0,
      
      // Riesgos
      totalRisks: risks.length,
      activeRisks: activeRisks.length,
      highPriorityRisks: highPriorityRisks.length,
      
      // Tendencias
      recentActivity: recentWorkPackages.length,
      
      // EVM
      cpi: evmMetrics.CPI || 1,
      spi: evmMetrics.SPI || 1,
      cv: evmMetrics.CV || 0,
      sv: evmMetrics.SV || 0,
      
      // Predicciones
      estimatedCompletion: evmMetrics.CPI < 1 ? 
        'Retraso esperado' : 'En tiempo',
      estimatedBudget: evmMetrics.CPI < 1 ? 
        'Sobre costo esperado' : 'Dentro del presupuesto'
    };
  }, [currentProject, workPackages, risks, evmMetrics]);

  // Función para exportar reporte
  const exportReport = () => {
    const reportData = {
      projectName: currentProject?.name,
      reportDate: new Date().toLocaleDateString(),
      metrics: reportMetrics,
      workPackages: workPackages,
      risks: risks,
      evmMetrics: evmMetrics
    };

    if (exportFormat === 'excel') {
      // Exportar a Excel
      const ws = XLSX.utils.json_to_sheet([reportData]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
      XLSX.writeFile(wb, `Reporte_${currentProject?.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      // Exportar a JSON (simular PDF)
      const dataStr = JSON.stringify(reportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reporte_${currentProject?.name}_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    }
  };

  // Componente de Reporte Ejecutivo
  const ExecutiveReport = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">📊 Reporte Ejecutivo</h2>
        <p className="text-blue-100">Resumen ejecutivo del proyecto {currentProject?.name}</p>
        <div className="mt-4 text-sm">
          <p>Fecha: {new Date().toLocaleDateString()}</p>
          <p>Gerente: {currentProject?.manager}</p>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
          <div className="text-2xl font-bold text-blue-600">
            {reportMetrics.progressPercentage?.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Progreso General</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
          <div className="text-2xl font-bold text-green-600">
            {reportMetrics.completedWorkPackages}/{reportMetrics.totalWorkPackages}
          </div>
          <div className="text-sm text-gray-600">Work Packages</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
          <div className="text-2xl font-bold text-red-600">
            {reportMetrics.highPriorityRisks}
          </div>
          <div className="text-sm text-gray-600">Riesgos Críticos</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
          <div className="text-2xl font-bold text-purple-600">
            {reportMetrics.cpi?.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">CPI</div>
        </div>
      </div>

      {/* Estado del Proyecto */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Estado del Proyecto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Rendimiento</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>CPI (Cost Performance Index):</span>
                <span className={`font-semibold ${reportMetrics.cpi >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                  {reportMetrics.cpi?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>SPI (Schedule Performance Index):</span>
                <span className={`font-semibold ${reportMetrics.spi >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                  {reportMetrics.spi?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Variance at Completion:</span>
                <span className={`font-semibold ${evmMetrics.VAC >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${(evmMetrics.VAC / 1000)?.toFixed(0)}K
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-2">Predicciones</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Completación:</span>
                <span className={`font-semibold ${reportMetrics.cpi >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                  {reportMetrics.estimatedCompletion}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Presupuesto:</span>
                <span className={`font-semibold ${reportMetrics.cpi >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                  {reportMetrics.estimatedBudget}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Componente de Reporte de Progreso
  const ProgressReport = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-blue-700 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">📈 Reporte de Progreso</h2>
        <p className="text-green-100">Análisis detallado del progreso del proyecto</p>
      </div>

      {/* Progreso por Work Packages */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Progreso por Work Packages</h3>
        <div className="space-y-4">
          {workPackages.map((wp, index) => (
            <div key={wp.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">{wp.name}</h4>
                <span className={`px-2 py-1 rounded text-xs ${
                  wp.status === 'completed' ? 'bg-green-100 text-green-800' :
                  wp.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                  wp.status === 'delayed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {wp.status}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progreso:</span>
                  <span>{wp.percentComplete || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${wp.percentComplete || 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Inicio: {wp.startDate}</span>
                  <span>Fin: {wp.endDate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Componente de Reporte Financiero
  const FinancialReport = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-yellow-600 to-orange-700 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">💰 Reporte Financiero</h2>
        <p className="text-yellow-100">Análisis financiero y métricas EVM</p>
      </div>

      {/* Métricas EVM */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-blue-600">
            ${(evmMetrics.BAC / 1000)?.toFixed(0)}K
          </div>
          <div className="text-sm text-gray-600">BAC (Budget at Completion)</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-green-600">
            ${(evmMetrics.EV / 1000)?.toFixed(0)}K
          </div>
          <div className="text-sm text-gray-600">EV (Earned Value)</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-red-600">
            ${(evmMetrics.AC / 1000)?.toFixed(0)}K
          </div>
          <div className="text-sm text-gray-600">AC (Actual Cost)</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-purple-600">
            ${(evmMetrics.EAC / 1000)?.toFixed(0)}K
          </div>
          <div className="text-sm text-gray-600">EAC (Estimate at Completion)</div>
        </div>
      </div>

      {/* Análisis de Varianzas */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Análisis de Varianzas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Varianzas de Costo</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>CV (Cost Variance):</span>
                <span className={`font-semibold ${evmMetrics.CV >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${(evmMetrics.CV / 1000)?.toFixed(0)}K
                </span>
              </div>
              <div className="flex justify-between">
                <span>CPI (Cost Performance Index):</span>
                <span className={`font-semibold ${evmMetrics.CPI >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                  {evmMetrics.CPI?.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-2">Varianzas de Cronograma</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>SV (Schedule Variance):</span>
                <span className={`font-semibold ${evmMetrics.SV >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${(evmMetrics.SV / 1000)?.toFixed(0)}K
                </span>
              </div>
              <div className="flex justify-between">
                <span>SPI (Schedule Performance Index):</span>
                <span className={`font-semibold ${evmMetrics.SPI >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                  {evmMetrics.SPI?.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Componente de Reporte de Riesgos
  const RisksReport = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-600 to-pink-700 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">⚠️ Reporte de Riesgos</h2>
        <p className="text-red-100">Análisis de riesgos y estado de mitigación</p>
      </div>

      {/* Resumen de Riesgos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
          <div className="text-2xl font-bold text-red-600">
            {reportMetrics.totalRisks}
          </div>
          <div className="text-sm text-gray-600">Total de Riesgos</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
          <div className="text-2xl font-bold text-yellow-600">
            {reportMetrics.activeRisks}
          </div>
          <div className="text-sm text-gray-600">Riesgos Activos</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
          <div className="text-2xl font-bold text-orange-600">
            {reportMetrics.highPriorityRisks}
          </div>
          <div className="text-sm text-gray-600">Alta Prioridad</div>
        </div>
      </div>

      {/* Lista de Riesgos */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Riesgos del Proyecto</h3>
        <div className="space-y-4">
          {risks.map((risk, index) => (
            <div key={risk.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">{risk.name}</h4>
                <div className="flex space-x-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    risk.priority === 'high' ? 'bg-red-100 text-red-800' :
                    risk.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {risk.priority}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    risk.status === 'active' ? 'bg-red-100 text-red-800' :
                    risk.status === 'mitigated' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {risk.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">{risk.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Probabilidad:</span> {risk.probability}%
                </div>
                <div>
                  <span className="font-medium">Impacto:</span> ${(risk.costImpact / 1000)?.toFixed(0)}K
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Componente de Análisis de Tendencias
  const TrendsReport = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">📉 Análisis de Tendencias</h2>
        <p className="text-purple-100">Tendencias y patrones del proyecto</p>
      </div>

      {/* Métricas de Tendencias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Tendencia de Progreso</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span>Progreso Actual:</span>
              <span className="font-semibold">{reportMetrics.progressPercentage?.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                style={{ width: `${reportMetrics.progressPercentage}%` }}
              />
            </div>
            <div className="text-sm text-gray-600">
              {reportMetrics.progressPercentage >= 75 ? '🟢 Progreso excelente' :
               reportMetrics.progressPercentage >= 50 ? '🟡 Progreso moderado' :
               '🔴 Progreso lento'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Tendencia de Rendimiento</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span>CPI Promedio:</span>
              <span className={`font-semibold ${reportMetrics.cpi >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                {reportMetrics.cpi?.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>SPI Promedio:</span>
              <span className={`font-semibold ${reportMetrics.spi >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                {reportMetrics.spi?.toFixed(2)}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {reportMetrics.cpi >= 1 && reportMetrics.spi >= 1 ? '🟢 Rendimiento excelente' :
               reportMetrics.cpi >= 0.9 && reportMetrics.spi >= 0.9 ? '🟡 Rendimiento aceptable' :
               '🔴 Rendimiento crítico'}
            </div>
          </div>
        </div>
      </div>

      {/* Actividad Reciente */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Actividad Reciente (Últimos 30 días)</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Work Packages actualizados:</span>
            <span className="font-semibold">{reportMetrics.recentActivity}</span>
          </div>
          <div className="flex justify-between">
            <span>Riesgos activos:</span>
            <span className="font-semibold">{reportMetrics.activeRisks}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Componente de Análisis de Rendimiento
  const PerformanceReport = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">🎯 Análisis de Rendimiento</h2>
        <p className="text-indigo-100">Análisis detallado del rendimiento del proyecto</p>
      </div>

      {/* Scorecard de Rendimiento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {reportMetrics.cpi >= 1.1 ? 'A+' :
             reportMetrics.cpi >= 1.0 ? 'A' :
             reportMetrics.cpi >= 0.9 ? 'B' :
             reportMetrics.cpi >= 0.8 ? 'C' : 'D'}
          </div>
          <div className="text-sm text-gray-600">Calificación Costo</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {reportMetrics.spi >= 1.1 ? 'A+' :
             reportMetrics.spi >= 1.0 ? 'A' :
             reportMetrics.spi >= 0.9 ? 'B' :
             reportMetrics.spi >= 0.8 ? 'C' : 'D'}
          </div>
          <div className="text-sm text-gray-600">Calificación Cronograma</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {reportMetrics.progressPercentage >= 90 ? 'A+' :
             reportMetrics.progressPercentage >= 75 ? 'A' :
             reportMetrics.progressPercentage >= 60 ? 'B' :
             reportMetrics.progressPercentage >= 45 ? 'C' : 'D'}
          </div>
          <div className="text-sm text-gray-600">Calificación Progreso</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 text-center">
          <div className="text-3xl font-bold text-orange-600 mb-2">
            {reportMetrics.highPriorityRisks === 0 ? 'A+' :
             reportMetrics.highPriorityRisks <= 2 ? 'A' :
             reportMetrics.highPriorityRisks <= 5 ? 'B' :
             reportMetrics.highPriorityRisks <= 8 ? 'C' : 'D'}
          </div>
          <div className="text-sm text-gray-600">Calificación Riesgos</div>
        </div>
      </div>

      {/* Recomendaciones */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Recomendaciones</h3>
        <div className="space-y-3">
          {reportMetrics.cpi < 1 && (
            <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
              <span className="text-red-600 text-xl">⚠️</span>
              <div>
                <h4 className="font-medium text-red-800">Control de Costos</h4>
                <p className="text-sm text-red-700">El CPI indica sobrecostos. Revisar presupuestos y optimizar recursos.</p>
              </div>
            </div>
          )}
          
          {reportMetrics.spi < 1 && (
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
              <span className="text-yellow-600 text-xl">⏰</span>
              <div>
                <h4 className="font-medium text-yellow-800">Control de Cronograma</h4>
                <p className="text-sm text-yellow-700">El SPI indica retrasos. Acelerar actividades críticas.</p>
              </div>
            </div>
          )}
          
          {reportMetrics.highPriorityRisks > 3 && (
            <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
              <span className="text-orange-600 text-xl">🚨</span>
              <div>
                <h4 className="font-medium text-orange-800">Gestión de Riesgos</h4>
                <p className="text-sm text-orange-700">Muchos riesgos de alta prioridad. Implementar planes de mitigación.</p>
              </div>
            </div>
          )}
          
          {reportMetrics.progressPercentage < 50 && (
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <span className="text-blue-600 text-xl">📊</span>
              <div>
                <h4 className="font-medium text-blue-800">Progreso Lento</h4>
                <p className="text-sm text-blue-700">El progreso está por debajo del 50%. Revisar recursos y planificación.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Renderizar el reporte seleccionado
  const renderReport = () => {
    switch (selectedReport) {
      case 'executive':
        return <ExecutiveReport />;
      case 'progress':
        return <ProgressReport />;
      case 'financial':
        return <FinancialReport />;
      case 'risks':
        return <RisksReport />;
      case 'trends':
        return <TrendsReport />;
      case 'performance':
        return <PerformanceReport />;
      default:
        return <ExecutiveReport />;
    }
  };

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📈</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Selecciona un Proyecto</h2>
        <p className="text-gray-600">Elige un proyecto activo para generar reportes</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header de Reportes */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📈 Reportes y Análisis</h1>
            <p className="text-gray-600">Genera reportes detallados del proyecto {currentProject.name}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="pdf">Exportar PDF</option>
              <option value="excel">Exportar Excel</option>
            </select>
            
            <button
              onClick={exportReport}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              📥 Exportar Reporte
            </button>
          </div>
        </div>
      </div>

      {/* Selector de Reportes */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex flex-wrap space-x-8 px-6">
            {reportTypes.map(report => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${selectedReport === report.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="mr-2">{report.icon}</span>
                {report.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenido del Reporte */}
        <div className="p-6">
          {renderReport()}
        </div>
      </div>
    </div>
  );
};

export default ReportsManagement;
