import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import './index.css';

// Componentes
import LoginForm from './components/LoginForm';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import ConsolidatedDashboard from './components/ConsolidatedDashboard';
import IntegratedPMODashboard from './components/IntegratedPMODashboard';
import PortfolioStrategic from './components/PortfolioStrategic';
import ProjectManagementTabs from './components/ProjectManagementTabs';
import ScheduleManagement from './components/ScheduleManagement';
import FinancialManagement from './components/FinancialManagement';
import ResourceManagement from './components/ResourceManagement';
import RiskManagement from './components/RiskManagement';
import ChangeManagement from './components/ChangeManagement';
import CashFlowProjection from './components/CashFlowProjection';
import FileManager from './components/FileManager';
import ReportsManagement from './components/ReportsManagement';
import ProjectAudit from './components/ProjectAudit';
import ProjectArchive from './components/ProjectArchive';
import SyncIndicator from './components/SyncIndicator';
import BackupManager from './components/BackupManager';
import DataManager from './components/DataManager';

// Contextos
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';

// Componente principal de la aplicación (requiere autenticación)
function MainApp() {
  const { user } = useAuth();
  
  // ===== ESTADO MULTI-PROYECTO =====
  const [projects, setProjects] = useState([
    // Proyecto de demostración para familiarizarse con el sistema
    {
      id: 'demo-001',
      name: 'Proyecto de Demostración',
      description: 'Proyecto de ejemplo para familiarizarse con el sistema. Puede eliminarse cuando agregue sus proyectos reales.',
      status: 'active',
      priority: 'medium',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días desde hoy
      budget: 100000,
      contingencyReserve: 10000,
      managementReserve: 5000,
      manager: 'Usuario Demo',
      sponsor: 'Organización',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0',
      progress: 0
    }
  ]);

  // Función para obtener el proyecto inicial con lógica de respaldo
  const getInitialProjectId = () => {
    // 1. Intentar cargar el último proyecto seleccionado desde localStorage
    const lastSelectedProjectId = localStorage.getItem('lastSelectedProjectId');
    
    if (lastSelectedProjectId) {
      // Verificar si el proyecto aún existe y está activo
      const project = projects.find(p => p.id === lastSelectedProjectId);
      if (project && project.status === 'active') {
        return lastSelectedProjectId;
      }
    }
    
    // 2. Si no hay proyecto seleccionado o no está activo, buscar el primer proyecto activo
    const activeProject = projects.find(p => p.status === 'active');
    if (activeProject) {
      return activeProject.id;
    }
    
    // 3. Si no hay proyectos activos, usar el primer proyecto disponible
    if (projects.length > 0) {
      return projects[0].id;
    }
    
    // 4. Fallback por defecto
    return 'demo-001';
  };

  const [currentProjectId, setCurrentProjectId] = useState(getInitialProjectId);
  const [portfolioViewMode, setPortfolioViewMode] = useState('portfolio'); // 'portfolio', 'project', 'schedule'
  const [viewMode, setViewMode] = useState('dashboard');

  // Work Packages por proyecto - cada proyecto tiene su propia estructura WBS
  const [workPackagesByProject, setWorkPackagesByProject] = useState({
    'demo-001': [] // Proyecto de demostración - sin work packages iniciales
  });

  // Tareas por proyecto - cada proyecto tiene su propio cronograma
  const [tasksByProject, setTasksByProject] = useState({
    'demo-001': [] // Proyecto de demostración - sin tareas iniciales
  });

  // Función para obtener tareas del proyecto actual
  const getCurrentProjectTasks = () => {
    return tasksByProject[currentProjectId] || [];
  };

  // Función para actualizar tareas del proyecto actual
  const updateCurrentProjectTasks = (newTasks) => {
    setTasksByProject(prev => ({
      ...prev,
      [currentProjectId]: newTasks
    }));
  };

  // Riesgos por proyecto - cada proyecto tiene su propia gestión de riesgos
  const [risksByProject, setRisksByProject] = useState({
    'demo-001': [] // Proyecto de demostración - sin riesgos iniciales
  });

  // Función para obtener riesgos del proyecto actual
  const getCurrentProjectRisks = () => {
    return risksByProject[currentProjectId] || [];
  };

  // Función para actualizar riesgos del proyecto actual
  const updateCurrentProjectRisks = (newRisks) => {
    setRisksByProject(prev => ({
      ...prev,
      [currentProjectId]: newRisks
    }));
  };

  // ===== SISTEMA DE PERSISTENCIA =====
  
  // Cargar datos del localStorage al iniciar
  useEffect(() => {
    const savedData = localStorage.getItem('mi-dashboard-portfolio');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        if (parsedData.projects) {
          setProjects(parsedData.projects);
        }
        if (parsedData.currentProjectId) {
          setCurrentProjectId(parsedData.currentProjectId);
        }
        if (parsedData.workPackagesByProject) {
          setWorkPackagesByProject(parsedData.workPackagesByProject);
        }
        if (parsedData.tasksByProject) {
          setTasksByProject(parsedData.tasksByProject);
        }
        if (parsedData.risksByProject) {
          setRisksByProject(parsedData.risksByProject);
        }
      } catch (error) {
        console.error('Error al cargar datos del localStorage:', error);
      }
    }
  }, []);

  // Guardar datos en localStorage cuando cambien
  useEffect(() => {
    const dataToSave = {
      projects,
      currentProjectId,
      workPackagesByProject,
      tasksByProject,
      risksByProject,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('mi-dashboard-portfolio', JSON.stringify(dataToSave));
    
    // Disparar evento de sincronización
    const syncEvent = new CustomEvent('dataSync', { 
      detail: { 
        type: 'portfolio_data_saved', 
        timestamp: new Date().toISOString() 
      } 
    });
    window.dispatchEvent(syncEvent);
  }, [projects, currentProjectId, workPackagesByProject, tasksByProject, risksByProject]);

  // ===== FUNCIONES DE GESTIÓN DE PROYECTOS =====
  
  const createProject = (projectData) => {
    const newProject = {
      id: `proj-${Date.now()}`,
      ...projectData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0',
      progress: 0
    };
    
    setProjects(prev => {
      const newProjects = prev.slice();
      newProjects.push(newProject);
      return newProjects;
    });
    
    // Inicializar datos del proyecto
    setWorkPackagesByProject(prev => ({
      ...prev,
      [newProject.id]: []
    }));
    
    setTasksByProject(prev => ({
      ...prev,
      [newProject.id]: []
    }));
    
    setRisksByProject(prev => ({
      ...prev,
      [newProject.id]: []
    }));
    
    return newProject;
  };

  const updateProject = (projectId, updates) => {
    setProjects(prev => prev.map(project => 
      project.id === projectId 
        ? Object.assign({}, project, updates, { updatedAt: new Date().toISOString() })
        : project
    ));
  };

  const deleteProject = (projectId) => {
    setProjects(prev => prev.filter(project => project.id !== projectId));
    
    // Limpiar datos del proyecto eliminado
    setWorkPackagesByProject(prev => {
      const newData = Object.assign({}, prev);
      delete newData[projectId];
      return newData;
    });
    
    setTasksByProject(prev => {
      const newData = Object.assign({}, prev);
      delete newData[projectId];
      return newData;
    });
    
    setRisksByProject(prev => {
      const newData = Object.assign({}, prev);
      delete newData[projectId];
      return newData;
    });
  };

  // ===== FUNCIONES DE WORK PACKAGES =====
  
  const getCurrentProjectWorkPackages = () => {
    return workPackagesByProject[currentProjectId] || [];
  };

  const updateCurrentProjectWorkPackages = (newWorkPackages) => {
    setWorkPackagesByProject(prev => ({
      ...prev,
      [currentProjectId]: newWorkPackages
    }));
    
    // Disparar evento de cambio de datos
    const dataChangeEvent = new CustomEvent('dataChange', { 
      detail: { 
        type: 'workpackages_updated', 
        projectId: currentProjectId,
        timestamp: new Date().toISOString() 
      } 
    });
    window.dispatchEvent(dataChangeEvent);
  };

  // ===== FUNCIONES DE GESTIÓN FINANCIERA =====
  
  const [purchaseOrdersByProject, setPurchaseOrdersByProject] = useState({
    'demo-001': [] // Proyecto de demostración - sin órdenes iniciales
  });

  const [advancesByProject, setAdvancesByProject] = useState({
    'demo-001': [] // Proyecto de demostración - sin anticipos iniciales
  });

  const [invoicesByProject, setInvoicesByProject] = useState({
    'demo-001': [] // Proyecto de demostración - sin facturas iniciales
  });

  const [contractsByProject, setContractsByProject] = useState({
    'demo-001': [] // Proyecto de demostración - sin contratos iniciales
  });

  const getCurrentProjectPurchaseOrders = () => {
    return purchaseOrdersByProject[currentProjectId] || [];
  };

  const getCurrentProjectAdvances = () => {
    return advancesByProject[currentProjectId] || [];
  };

  const getCurrentProjectInvoices = () => {
    return invoicesByProject[currentProjectId] || [];
  };

  const getCurrentProjectContracts = () => {
    return contractsByProject[currentProjectId] || [];
  };

  // ===== FUNCIONES DE GESTIÓN DE RECURSOS =====
  
  const [globalResources, setGlobalResources] = useState([]);
  const [resourceAssignmentsByProject, setResourceAssignmentsByProject] = useState({
    'demo-001': [] // Proyecto de demostración - sin asignaciones iniciales
  });

  const getCurrentProjectResourceAssignments = () => {
    return resourceAssignmentsByProject[currentProjectId] || [];
  };

  // ===== FUNCIONES DE AUDITORÍA =====
  
  const [auditLogsByProject, setAuditLogsByProject] = useState({
    'demo-001': [] // Proyecto de demostración - sin logs iniciales
  });

  const getCurrentProjectAuditLogs = () => {
    return auditLogsByProject[currentProjectId] || [];
  };

  // ===== MÉTRICAS DEL PORTAFOLIO =====
  
  const portfolioMetrics = useMemo(() => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalProgress = projects.reduce((sum, p) => sum + (p.progress || 0), 0);
    const averageProgress = totalProjects > 0 ? totalProgress / totalProjects : 0;

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalBudget,
      averageProgress,
      healthScore: averageProgress > 80 ? 'excellent' : averageProgress > 60 ? 'good' : 'needs_attention'
    };
  }, [projects]);

  // ===== FUNCIONES DE IMPORTACIÓN/EXPORTACIÓN =====
  
  const importData = (data) => {
    try {
      if (data.projects) setProjects(data.projects);
      if (data.currentProjectId) setCurrentProjectId(data.currentProjectId);
      if (data.workPackagesByProject) setWorkPackagesByProject(data.workPackagesByProject);
      if (data.tasksByProject) setTasksByProject(data.tasksByProject);
      if (data.risksByProject) setRisksByProject(data.risksByProject);
      if (data.purchaseOrdersByProject) setPurchaseOrdersByProject(data.purchaseOrdersByProject);
      if (data.advancesByProject) setAdvancesByProject(data.advancesByProject);
      if (data.invoicesByProject) setInvoicesByProject(data.invoicesByProject);
      if (data.contractsByProject) setContractsByProject(data.contractsByProject);
      if (data.globalResources) setGlobalResources(data.globalResources);
      if (data.resourceAssignmentsByProject) setResourceAssignmentsByProject(data.resourceAssignmentsByProject);
      if (data.auditLogsByProject) setAuditLogsByProject(data.auditLogsByProject);
      
      // Disparar evento de sincronización
      const syncEvent = new CustomEvent('dataSync', { 
        detail: { 
          type: 'data_imported', 
          timestamp: new Date().toISOString() 
        } 
      });
      window.dispatchEvent(syncEvent);
      
      return true;
    } catch (error) {
      console.error('Error al importar datos:', error);
      return false;
    }
  };

  // ===== ESTADOS DE INTERFAZ =====
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showSchedule, setShowSchedule] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [reportingDate, setReportingDate] = useState(new Date().toISOString().split('T')[0]);
  const [showHelp, setShowHelp] = useState(false);
  const [activeSection, setActiveSection] = useState('projects');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Estados de modales
  const [showPOModal, setShowPOModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [editingAdvance, setEditingAdvance] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);

  // ===== RENDERIZADO =====
  
  const currentProject = projects.find(p => p.id === currentProjectId);

  return (
    <div className="min-h-screen bg-gray-50">
      <SyncIndicator />
      <BackupManager onRestoreData={importData} />
      <DataManager onDataImport={importData} />
      
      <div className="flex">
        <Sidebar 
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        
        <main className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
          <div className="p-6">
            {/* Dashboard Consolidado */}
            {activeSection === 'dashboard' && (
              <ConsolidatedDashboard 
                projects={projects}
                currentProjectId={currentProjectId}
                workPackages={getCurrentProjectWorkPackages()}
                risks={getCurrentProjectRisks()}
                tasks={getCurrentProjectTasks()}
                portfolioMetrics={portfolioMetrics}
              />
            )}

            {/* Dashboard Integrado PMO */}
            {activeSection === 'pmo' && (
              <IntegratedPMODashboard 
                projects={projects}
                currentProjectId={currentProjectId}
                workPackages={getCurrentProjectWorkPackages()}
                risks={getCurrentProjectRisks()}
                portfolioMetrics={portfolioMetrics}
              />
            )}

            {/* Portafolio Estratégico */}
            {activeSection === 'portfolio' && (
              <PortfolioStrategic 
                projects={projects}
                currentProjectId={currentProjectId}
                setCurrentProjectId={setCurrentProjectId}
                workPackages={getCurrentProjectWorkPackages()}
                risks={getCurrentProjectRisks()}
                globalResources={globalResources}
                setGlobalResources={setGlobalResources}
                createProject={createProject}
                updateProject={updateProject}
                deleteProject={deleteProject}
                tasks={getCurrentProjectTasks()}
                purchaseOrders={getCurrentProjectPurchaseOrders()}
                advances={getCurrentProjectAdvances()}
                invoices={getCurrentProjectInvoices()}
                contracts={getCurrentProjectContracts()}
                auditLogs={getCurrentProjectAuditLogs()}
              />
            )}

            {/* Gestión de Proyectos */}
            {activeSection === 'projects' && (
              <ProjectManagementTabs 
                projects={projects}
                currentProjectId={currentProjectId}
                setCurrentProjectId={setCurrentProjectId}
                workPackages={getCurrentProjectWorkPackages()}
                setWorkPackages={updateCurrentProjectWorkPackages}
                risks={getCurrentProjectRisks()}
                setRisks={updateCurrentProjectRisks}
                reportingDate={reportingDate}
                setReportingDate={setReportingDate}
                tasks={getCurrentProjectTasks()}
                setTasks={updateCurrentProjectTasks}
                purchaseOrders={getCurrentProjectPurchaseOrders()}
                advances={getCurrentProjectAdvances()}
                invoices={getCurrentProjectInvoices()}
                contracts={getCurrentProjectContracts()}
                resourceAssignments={getCurrentProjectResourceAssignments()}
              />
            )}

            {/* Vista Estratégica */}
            {activeSection === 'strategic' && (
              <PortfolioStrategic 
                projects={projects}
                currentProjectId={currentProjectId}
                setCurrentProjectId={setCurrentProjectId}
                workPackages={getCurrentProjectWorkPackages()}
                risks={getCurrentProjectRisks()}
                globalResources={globalResources}
                setGlobalResources={setGlobalResources}
                createProject={createProject}
                updateProject={updateProject}
                deleteProject={deleteProject}
                tasks={getCurrentProjectTasks()}
                purchaseOrders={getCurrentProjectPurchaseOrders()}
                advances={getCurrentProjectAdvances()}
                invoices={getCurrentProjectInvoices()}
                contracts={getCurrentProjectContracts()}
                auditLogs={getCurrentProjectAuditLogs()}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// Componente principal de la aplicación
function App() {
  return (
    <Router>
      <AuthProvider>
        <ProjectProvider>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route 
              path="/*" 
              element={
                <ProtectedRoute>
                  <MainApp />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </ProjectProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
