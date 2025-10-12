import React from 'react';
import ConsolidatedCashFlow from './components/ConsolidatedCashFlow';
import PortfolioOverview from './components/dashboard/PortfolioOverview';
import ProjectIndicators from './components/dashboard/ProjectIndicators';
import FinancialIndicators from './components/dashboard/FinancialIndicators';
import CashFlowChart from './components/dashboard/CashFlowChart';
import RiskIndicators from './components/dashboard/RiskIndicators';
import MilestoneSection from './components/dashboard/MilestoneSection';
import PMBOKIndicators from './components/dashboard/PMBOKIndicators';
import { usePortfolioMetrics } from './hooks/usePortfolioMetrics';
import { useFinancialMetrics } from './hooks/useFinancialMetrics';
import { useRiskMetrics } from './hooks/useRiskMetrics';
import { useMilestoneMetrics } from './hooks/useMilestoneMetrics';
import { useEVMMetrics } from './hooks/useEVMMetrics';

const ConsolidatedDashboard = ({ 
  projects, 
  portfolioMetrics, 
  risks = [], 
  purchaseOrders = [], 
  advances = [], 
  invoices = [],
  tasksByProject = {},
  purchaseOrdersByProject = {},
  advancesByProject = {},
  invoicesByProject = {}
}) => {
  
  // Usar custom hooks para calcular todas las métricas
  const {
    activeProjects,
    totalBudget,
    totalReserves,
    earliestStart,
    latestEnd
  } = usePortfolioMetrics(projects);

  const {
    totalPurchaseOrders,
    totalAdvances,
    totalInvoices
  } = useFinancialMetrics(purchaseOrders, advances, invoices);

  const {
    activeRisks,
    highPriorityRisks,
    mediumPriorityRisks,
    lowPriorityRisks
  } = useRiskMetrics(risks);

  const {
    milestones,
    completedMilestones,
    inProgressMilestones,
    delayedMilestones,
    pendingMilestones
  } = useMilestoneMetrics(tasksByProject);

  const {
    totalWorkPackageBudget,
    totalWorkPackageEarned,
    totalWorkPackageActual,
    consolidatedCPI,
    consolidatedSPI,
    consolidatedCV,
    consolidatedSV,
    consolidatedVAC,
    consolidatedEAC
  } = useEVMMetrics(tasksByProject);

  return (
    <div className="space-y-8">
      {/* Header Ejecutivo */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">📈 Dashboard Consolidado</h1>
        <p className="text-indigo-100 text-lg">
          Vista ejecutiva del estado general del portfolio de proyectos
        </p>
      </div>

      {/* 1. Vista General del Portfolio */}
      <PortfolioOverview 
        activeProjects={activeProjects}
        projects={projects}
        totalBudget={totalBudget}
        earliestStart={earliestStart}
        latestEnd={latestEnd}
      />

      {/* 2. Indicadores por Proyecto */}
      <ProjectIndicators activeProjects={activeProjects} />

      {/* 3. Indicadores Financieros Consolidados */}
      <FinancialIndicators 
        totalPurchaseOrders={totalPurchaseOrders}
        totalAdvances={totalAdvances}
        totalInvoices={totalInvoices}
        totalReserves={totalReserves}
      />

      {/* 3.5. Gráfica de Flujo de Caja */}
      <CashFlowChart 
        totalPurchaseOrders={totalPurchaseOrders}
        totalAdvances={totalAdvances}
        totalInvoices={totalInvoices}
      />

      {/* 4. Indicadores de Riesgos del Portfolio */}
      <RiskIndicators 
        activeRisks={activeRisks}
        highPriorityRisks={highPriorityRisks}
        mediumPriorityRisks={mediumPriorityRisks}
        lowPriorityRisks={lowPriorityRisks}
      />

      {/* 5. Hitos del Portafolio por Proyecto */}
      <MilestoneSection 
        projects={projects}
        tasksByProject={tasksByProject}
        completedMilestones={completedMilestones}
        inProgressMilestones={inProgressMilestones}
        delayedMilestones={delayedMilestones}
        milestones={milestones}
      />

      {/* 6. Indicadores PMBOK v7 con Explicaciones */}
      <PMBOKIndicators 
        consolidatedCPI={consolidatedCPI}
        consolidatedSPI={consolidatedSPI}
        consolidatedVAC={consolidatedVAC}
        consolidatedEAC={consolidatedEAC}
        tasksByProject={tasksByProject}
      />

      {/* 7. Flujo de Caja Consolidado */}
      <ConsolidatedCashFlow 
        projects={projects}
        tasksByProject={tasksByProject}
        purchaseOrdersByProject={purchaseOrdersByProject}
        advancesByProject={advancesByProject}
        invoicesByProject={invoicesByProject}
      />
    </div>
  );
};

export default ConsolidatedDashboard;