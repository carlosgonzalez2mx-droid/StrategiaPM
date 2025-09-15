import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/LoginForm';
import UserHeader from './components/UserHeader';
import ScheduleManagement from './components/ScheduleManagement';
import PortfolioDashboard from './components/PortfolioDashboard';
import ProjectSelector from './components/ProjectSelector';
import PortfolioSettings from './components/PortfolioSettings';
import Sidebar from './components/Sidebar';
import RiskManagement from './components/RiskManagement';
import PortfolioStrategic from './components/PortfolioStrategic';
import CorporateAlerts from './components/CorporateAlerts';
import ConsolidatedDashboard from './components/ConsolidatedDashboard';
import IntegratedPMODashboard from './components/IntegratedPMODashboard';
import ProjectManagementTabs from './components/ProjectManagementTabs';
import SyncIndicator from './components/SyncIndicator';
import BackupManager from './components/BackupManager';
import DataManager from './components/DataManager';

function InfoTip({ text }) {
  return (
    <span className="relative group inline-flex items-center ml-2 align-middle cursor-help">
      <span className="text-xs select-none bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center">i</span>
      <span className="absolute z-20 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 -top-2 left-5 w-64 shadow">
        {text}
      </span>
    </span>
  );
}

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
    
    // 2. Si no hay proyecto guardado o ya no está activo, seleccionar el primer proyecto activo
    const firstActiveProject = projects.find(p => p.status === 'active');
    return firstActiveProject ? firstActiveProject.id : '';
  };

  const [currentProjectId, setCurrentProjectId] = useState(getInitialProjectId);
  const [portfolioViewMode, setPortfolioViewMode] = useState('portfolio'); // 'portfolio', 'project', 'schedule'
  const [viewMode, setViewMode] = useState('dashboard');

  // Work Packages por proyecto - cada proyecto tiene su propia estructura WBS
  const [workPackagesByProject, setWorkPackagesByProject] = useState({
    'demo-001': [] // Proyecto de demostración - sin work packages iniciales
  });
        wbs: '1.1',
        name: 'Análisis de Requerimientos',
        plannedValue: 75000,
        earnedValue: 75000,
        actualCost: 72000,
        percentComplete: 100,
        startDate: '2025-01-20',
        endDate: '2025-01-31',
        resources: ['Juan Pérez', 'María García'],
        status: 'completed'
      },
      {
        id: 'WP001-002',
        projectId: 'proj-001',
        wbs: '1.2',
        name: 'Diseño del Sistema',
        plannedValue: 125000,
        earnedValue: 75000,
        actualCost: 78000,
        percentComplete: 60,
        startDate: '2025-02-03',
        endDate: '2025-02-21',
        resources: ['Carlos López', 'Ana Martín'],
        status: 'in-progress'
      },
      {
        id: 'WP001-003',
        projectId: 'proj-001',
        wbs: '1.3',
        name: 'Procurement de Equipos',
        plannedValue: 180000,
        earnedValue: 72000,
        actualCost: 70000,
        percentComplete: 40,
        startDate: '2025-02-03',
        endDate: '2025-02-28',
        resources: ['Pedro Sánchez'],
        status: 'in-progress'
      },
      {
        id: 'WP001-004',
        projectId: 'proj-001',
        wbs: '1.4',
        name: 'Desarrollo e Implementación',
        plannedValue: 200000,
        earnedValue: 0,
        actualCost: 0,
        percentComplete: 0,
        startDate: '2025-02-24',
        endDate: '2025-03-28',
        resources: ['Equipo Desarrollo'],
        status: 'pending'
      },
      {
        id: 'WP001-005',
        projectId: 'proj-001',
        wbs: '1.5',
        name: 'Instalación de Equipos',
        plannedValue: 85000,
        earnedValue: 0,
        actualCost: 0,
        percentComplete: 0,
        startDate: '2025-03-03',
        endDate: '2025-03-14',
        resources: ['Equipo Técnico'],
        status: 'pending'
      },
      {
        id: 'WP001-006',
        projectId: 'proj-001',
        wbs: '1.6',
        name: 'Pruebas y Comisionado',
        plannedValue: 60000,
        earnedValue: 0,
        actualCost: 0,
        percentComplete: 0,
        startDate: '2025-03-17',
        endDate: '2025-04-11',
        resources: ['Equipo QA'],
        status: 'pending'
      }
    ],
    'proj-002': [ // Sistema ERP Corporativo
      {
        id: 'WP002-001',
        projectId: 'proj-002',
        wbs: '1.1',
        name: 'Análisis de Negocio',
        plannedValue: 100000,
        earnedValue: 100000,
        actualCost: 95000,
        percentComplete: 100,
        startDate: '2025-02-01',
        endDate: '2025-02-15',
        resources: ['Ana Martínez', 'Consultores ERP'],
        status: 'completed'
      },
      {
        id: 'WP002-002',
        projectId: 'proj-002',
        wbs: '1.2',
        name: 'Selección de Proveedor',
        plannedValue: 50000,
        earnedValue: 50000,
        actualCost: 48000,
        percentComplete: 100,
        startDate: '2025-02-16',
        endDate: '2025-02-28',
        resources: ['Equipo de Compras'],
        status: 'completed'
      },
      {
        id: 'WP002-003',
        projectId: 'proj-002',
        wbs: '1.3',
        name: 'Configuración del Sistema',
        plannedValue: 200000,
        earnedValue: 80000,
        actualCost: 85000,
        percentComplete: 40,
        startDate: '2025-03-01',
        endDate: '2025-04-30',
        resources: ['Equipo de Implementación'],
        status: 'in-progress'
      },
      {
        id: 'WP002-004',
        projectId: 'proj-002',
        wbs: '1.4',
        name: 'Migración de Datos',
        plannedValue: 150000,
        earnedValue: 30000,
        actualCost: 32000,
        percentComplete: 20,
        startDate: '2025-04-01',
        endDate: '2025-06-30',
        resources: ['Equipo de Datos'],
        status: 'in-progress'
      },
      {
        id: 'WP002-005',
        projectId: 'proj-002',
        wbs: '1.5',
        name: 'Capacitación de Usuarios',
        plannedValue: 80000,
        earnedValue: 0,
        actualCost: 0,
        percentComplete: 0,
        startDate: '2025-06-01',
        endDate: '2025-07-31',
        resources: ['Equipo de Capacitación'],
        status: 'pending'
      },
      {
        id: 'WP002-006',
        projectId: 'proj-002',
        wbs: '1.6',
        name: 'Go-Live y Soporte',
        plannedValue: 170000,
        earnedValue: 0,
        actualCost: 0,
        percentComplete: 0,
        startDate: '2025-08-01',
        endDate: '2025-08-31',
        resources: ['Equipo de Soporte'],
        status: 'pending'
      }
    ],
    'proj-003': [ // Expansión Planta Norte (Completado)
      {
        id: 'WP003-001',
        projectId: 'proj-003',
        wbs: '1.1',
        name: 'Estudios de Factibilidad',
        plannedValue: 30000,
        earnedValue: 30000,
        actualCost: 28000,
        percentComplete: 100,
        startDate: '2024-06-01',
        endDate: '2024-06-30',
        resources: ['Equipo de Ingeniería'],
        status: 'completed'
      },
      {
        id: 'WP003-002',
        projectId: 'proj-003',
        wbs: '1.2',
        name: 'Diseño de Ingeniería',
        plannedValue: 50000,
        earnedValue: 50000,
        actualCost: 52000,
        percentComplete: 100,
        startDate: '2024-07-01',
        endDate: '2024-08-31',
        resources: ['Equipo de Diseño'],
        status: 'completed'
      },
      {
        id: 'WP003-003',
        projectId: 'proj-003',
        wbs: '1.3',
        name: 'Construcción Civil',
        plannedValue: 120000,
        earnedValue: 120000,
        actualCost: 118000,
        percentComplete: 100,
        startDate: '2024-09-01',
        endDate: '2024-11-30',
        resources: ['Contratista Civil'],
        status: 'completed'
      },
      {
        id: 'WP003-004',
        projectId: 'proj-003',
        wbs: '1.4',
        name: 'Instalación de Equipos',
        plannedValue: 80000,
        earnedValue: 80000,
        actualCost: 82000,
        percentComplete: 100,
        startDate: '2024-11-01',
        endDate: '2024-12-15',
        resources: ['Equipo de Instalación'],
        status: 'completed'
      },
      {
        id: 'WP003-005',
        projectId: 'proj-003',
        wbs: '1.5',
        name: 'Pruebas y Comisionado',
        plannedValue: 20000,
        earnedValue: 20000,
        actualCost: 19000,
        percentComplete: 100,
        startDate: '2024-12-16',
        endDate: '2024-12-31',
        resources: ['Equipo de QA'],
        status: 'completed'
      }
    ],
    'proj-004': [ // Modernización Laboratorio
      {
        id: 'WP004-001',
        projectId: 'proj-004',
        wbs: '1.1',
        name: 'Evaluación de Equipos Actuales',
        plannedValue: 25000,
        earnedValue: 25000,
        actualCost: 24000,
        percentComplete: 100,
        startDate: '2025-01-15',
        endDate: '2025-01-31',
        resources: ['Patricia López', 'Técnicos de Laboratorio'],
        status: 'completed'
      },
      {
        id: 'WP004-002',
        projectId: 'proj-004',
        wbs: '1.2',
        name: 'Selección de Nuevos Equipos',
        plannedValue: 35000,
        earnedValue: 17500,
        actualCost: 18000,
        percentComplete: 50,
        startDate: '2025-02-01',
        endDate: '2025-02-28',
        resources: ['Equipo de Compras'],
        status: 'in-progress'
      },
      {
        id: 'WP004-003',
        projectId: 'proj-004',
        wbs: '1.3',
        name: 'Adquisición de Equipos',
        plannedValue: 80000,
        earnedValue: 0,
        actualCost: 0,
        percentComplete: 0,
        startDate: '2025-03-01',
        endDate: '2025-03-31',
        resources: ['Equipo de Compras'],
        status: 'pending'
      },
      {
        id: 'WP004-004',
        projectId: 'proj-004',
        wbs: '1.4',
        name: 'Instalación y Calibración',
        plannedValue: 40000,
        earnedValue: 0,
        actualCost: 0,
        percentComplete: 0,
        startDate: '2025-04-01',
        endDate: '2025-04-30',
        resources: ['Técnicos de Servicio'],
        status: 'pending'
      },
      {
        id: 'WP004-005',
        projectId: 'proj-004',
        wbs: '1.5',
        name: 'Validación y Certificación',
        plannedValue: 20000,
        earnedValue: 0,
        actualCost: 0,
        percentComplete: 0,
        startDate: '2025-05-01',
        endDate: '2025-05-15',
        resources: ['Equipo de Calidad'],
        status: 'pending'
      }
    ],
    'proj-005': [ // Programa Sostenibilidad (En espera)
      {
        id: 'WP005-001',
        projectId: 'proj-005',
        wbs: '1.1',
        name: 'Diagnóstico de Sostenibilidad',
        plannedValue: 30000,
        earnedValue: 0,
        actualCost: 0,
        percentComplete: 0,
        startDate: '2025-03-01',
        endDate: '2025-03-31',
        resources: ['Miguel Torres', 'Consultores Ambientales'],
        status: 'pending'
      },
      {
        id: 'WP005-002',
        projectId: 'proj-005',
        wbs: '1.2',
        name: 'Desarrollo de Estrategia',
        plannedValue: 40000,
        earnedValue: 0,
        actualCost: 0,
        percentComplete: 0,
        startDate: '2025-04-01',
        endDate: '2025-04-30',
        resources: ['Equipo de Sostenibilidad'],
        status: 'pending'
      },
      {
        id: 'WP005-003',
        projectId: 'proj-005',
        wbs: '1.3',
        name: 'Implementación de Iniciativas',
        plannedValue: 60000,
        earnedValue: 0,
        actualCost: 0,
        percentComplete: 0,
        startDate: '2025-05-01',
        endDate: '2025-11-30',
        resources: ['Equipo de Implementación'],
        status: 'pending'
      },
      {
        id: 'WP005-004',
        projectId: 'proj-005',
        wbs: '1.4',
        name: 'Monitoreo y Reportes',
        plannedValue: 20000,
        earnedValue: 0,
        actualCost: 0,
        percentComplete: 0,
        startDate: '2025-12-01',
        endDate: '2025-12-31',
        resources: ['Equipo de Monitoreo'],
        status: 'pending'
      }
    ]
  });

  // Función para obtener work packages del proyecto actual
  const getCurrentProjectWorkPackages = () => {
    const result = workPackagesByProject?.[currentProjectId];
    return Array.isArray(result) ? result : [];
  };

  // Función para actualizar work packages del proyecto actual
  const updateCurrentProjectWorkPackages = (newWorkPackages) => {
    setWorkPackagesByProject(prev => ({
      ...prev,
      [currentProjectId]: newWorkPackages
    }));
    
    // Disparar evento de cambio de datos
    const dataChangeEvent = new CustomEvent('dataChange', {
      detail: { type: 'workpackages_updated', projectId: currentProjectId, count: newWorkPackages.length, timestamp: new Date().toISOString() }
    });
    window.dispatchEvent(dataChangeEvent);
  };

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
    
    // Disparar evento de cambio de datos
    const dataChangeEvent = new CustomEvent('dataChange', {
      detail: { type: 'risks_updated', projectId: currentProjectId, count: newRisks.length, timestamp: new Date().toISOString() }
    });
    window.dispatchEvent(dataChangeEvent);
  };

  // Función para obtener todos los riesgos de todos los proyectos
  const getAllRisks = () => {
    return Object.values(risksByProject).flat();
  };

  // ===== FUNCIONES HELPER PARA DATOS FINANCIEROS POR PROYECTO =====

  // Órdenes de Compra
  const getCurrentProjectPurchaseOrders = () => {
    return purchaseOrdersByProject[currentProjectId] || [];
  };

  const updateCurrentProjectPurchaseOrders = (newPurchaseOrders) => {
    setPurchaseOrdersByProject(prev => ({
      ...prev,
      [currentProjectId]: newPurchaseOrders
    }));
  };

  // Anticipos
  const getCurrentProjectAdvances = () => {
    return advancesByProject[currentProjectId] || [];
  };

  const updateCurrentProjectAdvances = (newAdvances) => {
    setAdvancesByProject(prev => ({
      ...prev,
      [currentProjectId]: newAdvances
    }));
  };

  // Facturas
  const getCurrentProjectInvoices = () => {
    return invoicesByProject[currentProjectId] || [];
  };

  const updateCurrentProjectInvoices = (newInvoices) => {
    setInvoicesByProject(prev => ({
      ...prev,
      [currentProjectId]: newInvoices
    }));
  };

  // Contratos
  const getCurrentProjectContracts = () => {
    return contractsByProject[currentProjectId] || [];
  };

  const updateCurrentProjectContracts = (newContracts) => {
    setContractsByProject(prev => ({
      ...prev,
      [currentProjectId]: newContracts
    }));
  };

  // Función para obtener todos los datos financieros de todos los proyectos
  const getAllFinancialData = () => {
    return {
      purchaseOrders: Object.values(purchaseOrdersByProject).flat(),
      advances: Object.values(advancesByProject).flat(),
      invoices: Object.values(invoicesByProject).flat(),
      contracts: Object.values(contractsByProject).flat()
    };
  };

  // ===== FUNCIONES HELPER PARA GESTIÓN DE RECURSOS =====

  // Recursos globales
  const getGlobalResources = () => {
    return globalResources;
  };

  const updateGlobalResources = (newResources) => {
    setGlobalResources(newResources);
  };

  // Asignaciones de recursos por proyecto
  const getCurrentProjectResourceAssignments = () => {
    return resourceAssignmentsByProject[currentProjectId] || [];
  };

  const updateCurrentProjectResourceAssignments = (newAssignments) => {
    setResourceAssignmentsByProject(prev => ({
      ...prev,
      [currentProjectId]: newAssignments
    }));
  };

  // Función para obtener recursos asignados al proyecto actual
  const getCurrentProjectResources = () => {
    const assignments = getCurrentProjectResourceAssignments();
    return assignments.map(assignment => {
      const resource = globalResources.find(r => r.id === assignment.resourceId);
      return {
        ...resource,
        assignment: assignment
      };
    }).filter(Boolean);
  };

  // Función para obtener recursos disponibles (no asignados al proyecto actual)
  const getAvailableResources = () => {
    const currentAssignments = getCurrentProjectResourceAssignments();
    const assignedResourceIds = currentAssignments.map(a => a.resourceId);
    return globalResources.filter(resource => 
      !assignedResourceIds.includes(resource.id) && resource.status === 'active'
    );
  };

  // Función para calcular carga de trabajo de un recurso
  const calculateResourceWorkload = (resourceId) => {
    const allAssignments = Object.values(resourceAssignmentsByProject).flat();
    const resourceAssignments = allAssignments.filter(a => a.resourceId === resourceId);
    return resourceAssignments.reduce((total, assignment) => total + assignment.allocation, 0);
  };

  // Función para obtener todos los datos de recursos
  const getAllResourceData = () => {
    return {
      globalResources: globalResources,
      assignments: Object.values(resourceAssignmentsByProject).flat()
    };
  };

  // ===== GESTIÓN DE RECURSOS POR PROYECTO =====

  // Pool global de recursos humanos - Inicializado vacío para gestión desde Portafolio
  const [globalResources, setGlobalResources] = useState([]);

  // Asignaciones de recursos por proyecto
  const [resourceAssignmentsByProject, setResourceAssignmentsByProject] = useState({
    'proj-001': [ // Proyecto CAPEX Automatización
      {
        id: 'assign-001',
        projectId: 'proj-001',
        resourceId: 'res-001',
        workPackageId: 'WP001',
        role: 'Project Manager',
        allocation: 100,
        startDate: '2025-01-15',
        endDate: '2025-06-30',
        hourlyRate: 75,
        status: 'active',
        notes: 'Gestión general del proyecto'
      },
      {
        id: 'assign-002',
        projectId: 'proj-001',
        resourceId: 'res-002',
        workPackageId: 'WP002',
        role: 'Desarrollador Senior',
        allocation: 80,
        startDate: '2025-02-01',
        endDate: '2025-05-15',
        hourlyRate: 65,
        status: 'active',
        notes: 'Desarrollo de sistema de control'
      },
      {
        id: 'assign-003',
        projectId: 'proj-001',
        resourceId: 'res-004',
        workPackageId: 'WP003',
        role: 'QA Engineer',
        allocation: 60,
        startDate: '2025-03-01',
        endDate: '2025-06-15',
        hourlyRate: 55,
        status: 'active',
        notes: 'Pruebas de integración'
      }
    ],
    'proj-002': [ // Sistema ERP Corporativo
      {
        id: 'assign-004',
        projectId: 'proj-002',
        resourceId: 'res-001',
        workPackageId: 'WP004',
        role: 'Project Manager',
        allocation: 50,
        startDate: '2025-01-20',
        endDate: '2025-12-31',
        hourlyRate: 75,
        status: 'active',
        notes: 'Gestión del proyecto ERP'
      },
      {
        id: 'assign-005',
        projectId: 'proj-002',
        resourceId: 'res-003',
        workPackageId: 'WP005',
        role: 'Arquitecto de Software',
        allocation: 100,
        startDate: '2025-02-01',
        endDate: '2025-08-31',
        hourlyRate: 85,
        status: 'active',
        notes: 'Arquitectura del sistema ERP'
      },
      {
        id: 'assign-006',
        projectId: 'proj-002',
        resourceId: 'res-005',
        workPackageId: 'WP006',
        role: 'DevOps Engineer',
        allocation: 40,
        startDate: '2025-03-01',
        endDate: '2025-10-31',
        hourlyRate: 70,
        status: 'active',
        notes: 'Infraestructura y despliegue'
      }
    ],
    'proj-003': [], // Expansión de Planta
    'proj-004': [], // Proyecto de Investigación
    'proj-005': []  // Proyecto de Marketing
  });

  // Tareas por proyecto - cada proyecto tiene su propio cronograma
  const [tasksByProject, setTasksByProject] = useState({
    'proj-001': [], // Se inicializará automáticamente desde work packages
    'proj-002': [],
    'proj-003': [],
    'proj-004': [],
    'proj-005': []
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

  // Función para inicializar tareas desde work packages
  const initializeTasksFromWorkPackages = (workPackages) => {
    if (!workPackages || workPackages.length === 0) return [];

    // Convertir Work Packages a tareas del cronograma
    const initialTasks = workPackages.map(wp => ({
      id: wp.id,
      wbsCode: wp.wbs,
      name: wp.name,
      duration: Math.max(1, Math.ceil((new Date(wp.endDate) - new Date(wp.startDate)) / (1000 * 60 * 60 * 24))),
      startDate: wp.startDate,
      endDate: wp.endDate,
      progress: wp.percentComplete,
      predecessors: [],
      successors: [],
      resources: wp.resources || [],
      cost: wp.plannedValue,
      isMilestone: wp.percentComplete === 100,
      isCritical: false,
      earlyStart: wp.startDate,
      earlyFinish: wp.endDate,
      lateStart: wp.startDate,
      lateFinish: wp.endDate,
      totalFloat: 0,
      freeFloat: 0,
      status: wp.status,
      workPackageId: wp.id,
      plannedValue: wp.plannedValue,
      earnedValue: wp.earnedValue,
      actualCost: wp.actualCost
    }));

    // Retornar tareas sin dependencias automáticas - el usuario las definirá manualmente
    console.log('🚀 CORRECCIÓN - Inicializando tareas SIN dependencias automáticas');
    return initialTasks;
  };

  // Datos financieros por proyecto - cada proyecto tiene su propia gestión financiera
  const [purchaseOrdersByProject, setPurchaseOrdersByProject] = useState({
    'proj-001': [ // Proyecto CAPEX Automatización
      {
        id: 'PO001',
        projectId: 'proj-001',
        number: 'PO-2025-001',
        workPackageId: 'WP003',
        supplier: 'TechCorp Solutions',
        description: 'Servidores y equipos de red',
        totalAmount: 45000,
        currency: 'USD',
        status: 'approved',
        requestDate: '2025-02-01',
        approvalDate: '2025-02-03',
        expectedDate: '2025-02-15'
      },
      {
        id: 'PO002',
        projectId: 'proj-001',
        number: 'PO-2025-002',
        workPackageId: 'WP003',
        supplier: 'Hardware Express',
        description: 'Equipos de automatización industrial',
        totalAmount: 25000,
        currency: 'USD',
        status: 'pending',
        requestDate: '2025-02-10',
        approvalDate: null,
        expectedDate: '2025-02-25'
      }
    ],
    'proj-002': [], // Sistema ERP Corporativo
    'proj-003': [], // Expansión de Planta
    'proj-004': [], // Proyecto de Investigación
    'proj-005': []  // Proyecto de Marketing
  });

  const [advancesByProject, setAdvancesByProject] = useState({
    'proj-001': [ // Proyecto CAPEX Automatización
      {
        id: 'ADV001',
        projectId: 'proj-001',
        purchaseOrderId: 'PO001',
        amount: 22500,
        percentage: 50,
        requestDate: '2025-02-03',
        approvalDate: '2025-02-04',
        paymentDate: '2025-02-05',
        status: 'paid',
        reference: 'ADV-001-2025'
      }
    ],
    'proj-002': [],
    'proj-003': [],
    'proj-004': [],
    'proj-005': []
  });

  const [invoicesByProject, setInvoicesByProject] = useState({
    'proj-001': [ // Proyecto CAPEX Automatización
      {
        id: 'INV001',
        projectId: 'proj-001',
        purchaseOrderId: 'PO001',
        invoiceNumber: 'TC-2025-0156',
        supplier: 'TechCorp Solutions',
        amount: 22500,
        receivedDate: '2025-02-18',
        dueDate: '2025-03-05',
        paymentDate: '2025-02-20',
        status: 'paid',
        description: 'Entrega parcial - Servidores'
      }
    ],
    'proj-002': [],
    'proj-003': [],
    'proj-004': [],
    'proj-005': []
  });

  const [contractsByProject, setContractsByProject] = useState({
    'proj-001': [ // Proyecto CAPEX Automatización
      {
        id: 'CON001',
        projectId: 'proj-001',
        contractNumber: 'CON-2025-001',
        supplier: 'TechCorp Solutions',
        description: 'Contrato de servicios de implementación',
        value: 150000,
        currency: 'USD',
        startDate: '2025-01-15',
        endDate: '2025-06-30',
        status: 'active',
        type: 'services',
        terms: 'Pago mensual contra avance de obra'
      }
    ],
    'proj-002': [],
    'proj-003': [],
    'proj-004': [],
    'proj-005': []
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showSchedule, setShowSchedule] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [reportingDate, setReportingDate] = useState('2025-02-24');
  const [showHelp, setShowHelp] = useState(false);
  
  // Estados para modales
  const [showPOModal, setShowPOModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [editingAdvance, setEditingAdvance] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [activeSection, setActiveSection] = useState('projects');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  // Riesgos por proyecto - cada proyecto tiene su propia gestión de riesgos
  const [risksByProject, setRisksByProject] = useState({
    'proj-001': [ // Proyecto CAPEX Automatización
      {
        id: 'R001-001',
        projectId: 'proj-001',
        code: 'TECH-001',
        name: 'Retraso en entrega de equipos críticos',
        description: 'Los equipos de automatización pueden retrasarse debido a problemas en la cadena de suministro',
        category: 'technical',
        phase: 'procurement',
        probability: 0.7,
        impact: 0.8,
        riskScore: 0.56,
        status: 'active',
        priority: 'high',
        owner: 'Pedro Sánchez',
        identifiedDate: '2025-01-15',
        reviewDate: '2025-02-20',
        response: 'mitigate',
        responsePlan: 'Identificar proveedores alternativos y mantener comunicación constante con proveedor principal',
        contingencyPlan: 'Activar contrato con proveedor backup si el retraso supera 2 semanas',
        triggerConditions: 'Confirmación de retraso > 1 semana',
        costImpact: 50000,
        scheduleImpact: 15,
        residualProbability: 0.3,
        residualImpact: 0.4,
        monitoringFrequency: 'weekly',
        earlyWarnings: ['Comunicación irregular del proveedor', 'Cambios en fechas de entrega'],
        actualOccurred: false,
        stakeholders: ['Gerente de Proyecto', 'Compras', 'Logística'],
        assumptions: ['Proveedor principal cumple con cronograma base'],
        constraints: ['Presupuesto limitado para proveedores alternativos'],
        lessonsLearned: 'Mantener siempre un proveedor backup para equipos críticos'
      },
      {
        id: 'R001-002',
        projectId: 'proj-001',
        code: 'SCOPE-001',
        name: 'Cambios en especificaciones técnicas',
        description: 'Posibles modificaciones en requerimientos técnicos durante la ejecución del proyecto',
        category: 'scope',
        phase: 'execution',
        probability: 0.6,
        impact: 0.7,
        riskScore: 0.42,
        status: 'active',
        priority: 'medium',
        owner: 'Carmen Ruiz',
        identifiedDate: '2025-01-20',
        reviewDate: '2025-03-01',
        response: 'accept',
        responsePlan: 'Implementar proceso de control de cambios riguroso y comunicación con stakeholders',
        contingencyPlan: 'Reserva de tiempo y presupuesto para cambios menores',
        triggerConditions: 'Solicitud de cambio en especificaciones técnicas',
        costImpact: 35000,
        scheduleImpact: 10,
        residualProbability: 0.2,
        residualImpact: 0.3,
        monitoringFrequency: 'bi-weekly',
        earlyWarnings: ['Nuevas solicitudes de stakeholders', 'Cambios en estándares técnicos'],
        actualOccurred: false,
        stakeholders: ['Cliente', 'Equipo Técnico', 'Gerente de Proyecto'],
        assumptions: ['Especificaciones técnicas estables durante la ejecución'],
        constraints: ['Tiempo limitado para implementar cambios'],
        lessonsLearned: 'Documentar todos los cambios y su impacto en tiempo y costo'
      }
    ],
    'proj-002': [ // Sistema ERP Corporativo
      {
        id: 'R002-001',
        projectId: 'proj-002',
        code: 'RESOURCE-001',
        name: 'Disponibilidad limitada de especialistas',
        description: 'Escasez de personal técnico especializado en tecnologías específicas del proyecto',
        category: 'resource',
        phase: 'execution',
        probability: 0.5,
        impact: 0.9,
        riskScore: 0.45,
        status: 'active',
        priority: 'high',
        owner: 'Diego Morales',
        identifiedDate: '2025-01-25',
        reviewDate: '2025-02-15',
        response: 'transfer',
        responsePlan: 'Contratar consultores externos y capacitar personal interno',
        contingencyPlan: 'Reasignar personal de otros proyectos si es necesario',
        triggerConditions: 'Confirmación de indisponibilidad > 2 semanas',
        costImpact: 75000,
        scheduleImpact: 20,
        residualProbability: 0.2,
        residualImpact: 0.4,
        monitoringFrequency: 'weekly',
        earlyWarnings: ['Renuncias de personal clave', 'Solicitudes de vacaciones prolongadas'],
        actualOccurred: false,
        stakeholders: ['RRHH', 'Gerente de Proyecto', 'Equipo Técnico'],
        assumptions: ['Personal clave disponible durante todo el proyecto'],
        constraints: ['Presupuesto limitado para consultores externos'],
        lessonsLearned: 'Mantener matriz de habilidades y plan de sucesión para roles críticos'
      },
      {
        id: 'R002-002',
        projectId: 'proj-002',
        code: 'INTEGRATION-001',
        name: 'Complejidad de integración con sistemas legacy',
        description: 'Dificultades en la integración con sistemas existentes de la empresa',
        category: 'technical',
        phase: 'execution',
        probability: 0.8,
        impact: 0.6,
        riskScore: 0.48,
        status: 'active',
        priority: 'medium',
        owner: 'Ana Martínez',
        identifiedDate: '2025-02-01',
        reviewDate: '2025-03-15',
        response: 'mitigate',
        responsePlan: 'Análisis detallado de sistemas legacy y desarrollo de interfaces de integración',
        contingencyPlan: 'Implementar integración por fases si es necesario',
        triggerConditions: 'Identificación de incompatibilidades técnicas',
        costImpact: 45000,
        scheduleImpact: 12,
        residualProbability: 0.3,
        residualImpact: 0.2,
        monitoringFrequency: 'weekly',
        earlyWarnings: ['Errores en pruebas de integración', 'Cambios en sistemas legacy'],
        actualOccurred: false,
        stakeholders: ['Equipo Técnico', 'IT', 'Usuarios Finales'],
        assumptions: ['Sistemas legacy estables durante la implementación'],
        constraints: ['Tiempo limitado para desarrollo de interfaces'],
        lessonsLearned: 'Realizar análisis de integración antes de iniciar desarrollo'
      }
    ],
    'proj-003': [ // Expansión de Planta
      {
        id: 'R003-001',
        projectId: 'proj-003',
        code: 'REGULATORY-001',
        name: 'Retrasos en permisos regulatorios',
        description: 'Posibles demoras en la obtención de permisos ambientales y de construcción',
        category: 'external',
        phase: 'planning',
        probability: 0.6,
        impact: 0.8,
        riskScore: 0.48,
        status: 'active',
        priority: 'high',
        owner: 'Luis Fernández',
        identifiedDate: '2025-01-10',
        reviewDate: '2025-02-28',
        response: 'mitigate',
        responsePlan: 'Iniciar trámites regulatorios con anticipación y mantener comunicación con autoridades',
        contingencyPlan: 'Plan alternativo de construcción por fases',
        triggerConditions: 'Rechazo o retraso en permisos > 1 mes',
        costImpact: 100000,
        scheduleImpact: 30,
        residualProbability: 0.2,
        residualImpact: 0.3,
        monitoringFrequency: 'bi-weekly',
        earlyWarnings: ['Cambios en regulaciones', 'Retrasos en trámites'],
        actualOccurred: false,
        stakeholders: ['Autoridades Regulatorias', 'Gerente de Proyecto', 'Legal'],
        assumptions: ['Regulaciones estables durante el proyecto'],
        constraints: ['Tiempo limitado para obtener permisos'],
        lessonsLearned: 'Iniciar trámites regulatorios lo antes posible'
      }
    ],
    'proj-004': [], // Proyecto de Investigación (sin riesgos iniciales)
    'proj-005': []  // Proyecto de Marketing (sin riesgos iniciales)
  });

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
        if (parsedData.risksByProject) {
          setRisksByProject(parsedData.risksByProject);
        }
        if (parsedData.tasksByProject) {
          setTasksByProject(parsedData.tasksByProject);
        }
        if (parsedData.purchaseOrdersByProject) {
          setPurchaseOrdersByProject(parsedData.purchaseOrdersByProject);
        }
        if (parsedData.advancesByProject) {
          setAdvancesByProject(parsedData.advancesByProject);
        }
        if (parsedData.invoicesByProject) {
          setInvoicesByProject(parsedData.invoicesByProject);
        }
        if (parsedData.contractsByProject) {
          setContractsByProject(parsedData.contractsByProject);
        }
        if (parsedData.globalResources) {
          setGlobalResources(parsedData.globalResources);
        }
        if (parsedData.resourceAssignmentsByProject) {
          setResourceAssignmentsByProject(parsedData.resourceAssignmentsByProject);
        }
        if (parsedData.viewMode) {
          setViewMode(parsedData.viewMode);
        }
      } catch (error) {
        console.warn('Error loading saved data:', error);
      }
    }
  }, []);

  // Persistir y validar la selección del proyecto actual
  useEffect(() => {
    // Guardar el proyecto seleccionado en localStorage
    if (currentProjectId) {
      localStorage.setItem('lastSelectedProjectId', currentProjectId);
    }
  }, [currentProjectId]);

  // Validar que el proyecto seleccionado siga siendo válido
  useEffect(() => {
    if (currentProjectId) {
      const project = projects.find(p => p.id === currentProjectId);
      // Si el proyecto ya no existe o no está activo, seleccionar el primer proyecto activo
      if (!project || project.status !== 'active') {
        const firstActiveProject = projects.find(p => p.status === 'active');
        if (firstActiveProject) {
          setCurrentProjectId(firstActiveProject.id);
        } else {
          setCurrentProjectId('');
        }
      }
    } else {
      // Si no hay proyecto seleccionado, seleccionar el primer proyecto activo
      const firstActiveProject = projects.find(p => p.status === 'active');
      if (firstActiveProject) {
        setCurrentProjectId(firstActiveProject.id);
      }
    }
  }, [projects, currentProjectId, setCurrentProjectId]);

  // Guardar datos en localStorage cuando cambien
  useEffect(() => {
    const dataToSave = {
      projects,
      currentProjectId,
      workPackagesByProject,
      risksByProject,
      tasksByProject,
      purchaseOrdersByProject,
      advancesByProject,
      invoicesByProject,
      contractsByProject,
      globalResources,
      resourceAssignmentsByProject,
      viewMode,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('mi-dashboard-portfolio', JSON.stringify(dataToSave));
    
    // Disparar evento de guardado
    const saveEvent = new CustomEvent('dataSave', {
      detail: {
        timestamp: new Date().toISOString(),
        dataSize: JSON.stringify(dataToSave).length
      }
    });
    window.dispatchEvent(saveEvent);
    
    // Disparar evento de sincronización para todos los componentes
    const syncEvent = new CustomEvent('dataSync', {
      detail: {
        projects,
        currentProjectId,
        workPackages: getCurrentProjectWorkPackages(),
        risks: getCurrentProjectRisks(),
        tasks: getCurrentProjectTasks(),
        portfolioMetrics,
        timestamp: new Date().toISOString()
      }
    });
    window.dispatchEvent(syncEvent);
  }, [projects, currentProjectId, workPackagesByProject, risksByProject, tasksByProject, purchaseOrdersByProject, advancesByProject, invoicesByProject, contractsByProject, globalResources, resourceAssignmentsByProject, viewMode]);

  // ===== DATOS DEL PROYECTO ACTUAL =====
  const currentProject = projects.find(p => p.id === currentProjectId) || projects[0];
  
  const [projectData] = useState({
    projectName: currentProject?.name || 'Proyecto',
    startDate: currentProject?.startDate || '2025-01-01',
    endDate: currentProject?.endDate || '2025-12-31',
    totalBudget: currentProject?.budget || 0,
    contingencyReserve: currentProject?.contingencyReserve || 0,
    managementReserve: currentProject?.managementReserve || 0
  });

  useEffect(() => {
    const onKey = (e) => { 
      if (e.key === 'Escape') {
        setShowHelp(false);
        setShowPOModal(false);
        setShowAdvanceModal(false);
        setShowInvoiceModal(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Actualizar estados de work packages basado en la fecha de reporte
  useEffect(() => {
    const currentWorkPackages = getCurrentProjectWorkPackages();
    const updatedWorkPackages = currentWorkPackages.map(wp => {
      const today = new Date(reportingDate);
      const endDate = new Date(wp.endDate);
      const isOverdue = today > endDate;
      
      let newStatus = wp.status;
      
      if (wp.percentComplete === 100) {
        newStatus = 'completed';
      } else if (wp.percentComplete > 0) {
        if (isOverdue) {
          newStatus = 'delayed';
        } else {
          newStatus = 'in-progress';
        }
      } else {
        if (isOverdue) {
          newStatus = 'delayed';
        } else {
          newStatus = 'pending';
        }
      }
      
      return Object.assign({}, wp, { status: newStatus });
    });
    
    updateCurrentProjectWorkPackages(updatedWorkPackages);
  }, [reportingDate, currentProjectId]);

  // Inicializar tareas cuando cambien los work packages del proyecto actual
  useEffect(() => {
    const currentWorkPackages = getCurrentProjectWorkPackages();
    const currentTasks = getCurrentProjectTasks();
    
    // Solo inicializar si no hay tareas o si los work packages cambiaron
    if (currentWorkPackages.length > 0 && currentTasks.length === 0) {
      console.log('🚀 CORRECCIÓN - Inicializando tareas para proyecto:', currentProjectId);
      const newTasks = initializeTasksFromWorkPackages(currentWorkPackages);
      console.log('🚀 CORRECCIÓN - Tareas inicializadas:', newTasks.map(t => ({ id: t.id, wbsCode: t.wbsCode, name: t.name, predecessors: t.predecessors, successors: t.successors })));
      updateCurrentProjectTasks(newTasks);
    }
  }, [currentProjectId, workPackagesByProject]);

  const updateWP = (id, updater) => {
    const currentWorkPackages = getCurrentProjectWorkPackages();
    const updatedWorkPackages = currentWorkPackages.map(p => {
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
    
    updateCurrentProjectWorkPackages(updatedWorkPackages);
  };

  // Purchase Order functions
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
    if (!editingPO.number || !editingPO.supplier || !editingPO.totalAmount) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    const currentPOs = getCurrentProjectPurchaseOrders();
    
    if (editingPO.id) {
      const updatedPOs = currentPOs.map(po => 
        po.id === editingPO.id ? Object.assign({}, editingPO, { projectId: currentProjectId }) : po
      );
      updateCurrentProjectPurchaseOrders(updatedPOs);
    } else {
      const newPO = Object.assign({}, editingPO, {
        projectId: currentProjectId,
        id: 'PO' + String(Date.now()).slice(-6)
      });
      const updatedPOs = currentPOs.slice();
      updatedPOs.push(newPO);
      updateCurrentProjectPurchaseOrders(updatedPOs);
    }
    
    setShowPOModal(false);
    setEditingPO(null);
  };

  const handleDeletePO = (id) => {
    if (window.confirm('¿Está seguro de eliminar esta orden de compra?')) {
      const currentPOs = getCurrentProjectPurchaseOrders();
      const currentAdvances = getCurrentProjectAdvances();
      const currentInvoices = getCurrentProjectInvoices();
      
      updateCurrentProjectPurchaseOrders(currentPOs.filter(po => po.id !== id));
      updateCurrentProjectAdvances(currentAdvances.filter(adv => 
        !currentPOs.find(po => po.id === adv.purchaseOrderId && po.id === id)
      ));
      updateCurrentProjectInvoices(currentInvoices.filter(inv => 
        !currentPOs.find(po => po.id === inv.purchaseOrderId && po.id === id)
      ));
    }
  };

  // Advance functions
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

    const currentAdvances = getCurrentProjectAdvances();

    if (editingAdvance.id) {
      const updatedAdvances = currentAdvances.map(adv => 
        adv.id === editingAdvance.id ? Object.assign({}, editingAdvance, { projectId: currentProjectId }) : adv
      );
      updateCurrentProjectAdvances(updatedAdvances);
    } else {
      const newAdvance = Object.assign({}, editingAdvance, {
        projectId: currentProjectId,
        id: 'ADV' + String(Date.now()).slice(-6)
      });
      const updatedAdvances = currentAdvances.slice();
      updatedAdvances.push(newAdvance);
      updateCurrentProjectAdvances(updatedAdvances);
    }
    
    setShowAdvanceModal(false);
    setEditingAdvance(null);
  };

  const handleDeleteAdvance = (id) => {
    if (window.confirm('¿Está seguro de eliminar este anticipo?')) {
      const currentAdvances = getCurrentProjectAdvances();
      updateCurrentProjectAdvances(currentAdvances.filter(adv => adv.id !== id));
    }
  };

  // Invoice functions
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

    const currentInvoices = getCurrentProjectInvoices();

    if (editingInvoice.id) {
      const updatedInvoices = currentInvoices.map(inv => 
        inv.id === editingInvoice.id ? Object.assign({}, editingInvoice, { projectId: currentProjectId }) : inv
      );
      updateCurrentProjectInvoices(updatedInvoices);
    } else {
      const newInvoice = Object.assign({}, editingInvoice, {
        projectId: currentProjectId,
        id: 'INV' + String(Date.now()).slice(-6)
      });
      const updatedInvoices = currentInvoices.slice();
      updatedInvoices.push(newInvoice);
      updateCurrentProjectInvoices(updatedInvoices);
    }
    
    setShowInvoiceModal(false);
    setEditingInvoice(null);
  };

  const handleDeleteInvoice = (id) => {
    if (window.confirm('¿Está seguro de eliminar esta factura?')) {
      const currentInvoices = getCurrentProjectInvoices();
      updateCurrentProjectInvoices(currentInvoices.filter(inv => inv.id !== id));
    }
  };

  const evmMetrics = useMemo(() => {
    const currentWorkPackages = getCurrentProjectWorkPackages();
    const BAC = currentWorkPackages.reduce((sum, wp) => sum + wp.plannedValue, 0);

    const PV = currentWorkPackages.reduce((sum, wp) => {
      const today = new Date(reportingDate);
      const start = new Date(wp.startDate);
      const end = new Date(wp.endDate);

      if (today < start) return sum;
      if (today >= end) return sum + wp.plannedValue;

      const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      const elapsedDays = (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      const percentElapsed = totalDays > 0 ? (elapsedDays / totalDays) : 0;

      return sum + (wp.plannedValue * Math.max(0, Math.min(1, percentElapsed)));
    }, 0);

    const EV = currentWorkPackages.reduce((sum, wp) => sum + wp.earnedValue, 0);
    const AC = currentWorkPackages.reduce((sum, wp) => sum + wp.actualCost, 0);

    const CV = EV - AC;
    const SV = EV - PV;
    const CPI = AC > 0 ? EV / AC : 1;
    const SPI = PV > 0 ? EV / PV : 1;
    const ETC = CPI > 0 ? (BAC - EV) / CPI : (BAC - EV);
    const EAC = AC + ETC;
    const VAC = BAC - EAC;
    const TCPI = (BAC - AC) !== 0 ? (BAC - EV) / (BAC - AC) : 0;
    const percentComplete = BAC > 0 ? (EV / BAC) * 100 : 0;
    const percentSpent = BAC > 0 ? (AC / BAC) * 100 : 0;

    return {
      BAC: Math.round(BAC),
      PV: Math.round(PV),
      EV: Math.round(EV),
      AC: Math.round(AC),
      CV: Math.round(CV),
      SV: Math.round(SV),
      CPI: CPI.toFixed(2),
      SPI: SPI.toFixed(2),
      ETC: Math.round(ETC),
      EAC: Math.round(EAC),
      VAC: Math.round(VAC),
      TCPI: TCPI.toFixed(2),
      percentComplete: percentComplete.toFixed(1),
      percentSpent: percentSpent.toFixed(1)
    };
  }, [currentProjectId, workPackagesByProject, reportingDate]);

  // ===== FUNCIONES DE PORTFOLIO MULTI-PROYECTO =====
  
  // Calcular métricas consolidadas del portfolio
  const portfolioMetrics = useMemo(() => {
    if (projects.length === 0) return {};

    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    
    // Solo considerar proyectos activos para métricas financieras
    const activeProjectsList = projects.filter(p => p.status === 'active');
    const totalBudget = activeProjectsList.reduce((sum, p) => sum + p.budget, 0);
    const totalContingency = activeProjectsList.reduce((sum, p) => sum + p.contingencyReserve, 0);
    const totalManagement = activeProjectsList.reduce((sum, p) => sum + p.managementReserve, 0);
    
    // Para el proyecto actual, usar las métricas EVM calculadas
    const currentProjectMetrics = evmMetrics;
    
    return {
      // Conteos
      totalProjects,
      activeProjects,
      completedProjects,
      
      // Financiero (solo proyectos activos)
      totalBudget,
      totalContingency,
      totalManagement,
      currentProjectBudget: currentProject.budget,
      
      // Métricas del proyecto actual
      currentProjectCPI: parseFloat(currentProjectMetrics.CPI),
      currentProjectSPI: parseFloat(currentProjectMetrics.SPI),
      currentProjectCV: currentProjectMetrics.CV,
      currentProjectSV: currentProjectMetrics.SV,
      
      // Estado general
      hasActiveProjects: activeProjects > 0,
      hasCompletedProjects: completedProjects > 0
    };
  }, [projects, evmMetrics, currentProject]);

  // Funciones de gestión de proyectos
  const createProject = (template = null) => {
    const newProject = template ? Object.assign({}, template) : {
      id: 'proj-' + String(Date.now()).slice(-6),
      name: 'Nuevo Proyecto',
      description: 'Descripción del proyecto',
      status: 'inactive',
      priority: 'medium',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      budget: 100000,
      contingencyReserve: 10000,
      managementReserve: 5000,
      manager: 'Gerente del Proyecto',
      sponsor: 'Patrocinador',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    
    setProjects(prev => {
      const newProjects = prev.slice();
      newProjects.push(newProject);
      return newProjects;
    });
    return newProject;
  };

  const updateProject = (id, updates) => {
    setProjects(prev => prev.map(p => 
      p.id === id ? Object.assign({}, p, updates, { updatedAt: new Date().toISOString() }) : p
    ));
  };

  const deleteProject = (id) => {
    if (window.confirm('¿Está seguro de eliminar este proyecto? Esta acción no se puede deshacer.')) {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (currentProjectId === id) {
        setCurrentProjectId(projects[0]?.id || null);
      }
    }
  };

  const duplicateProject = (id) => {
    const projectToDuplicate = projects.find(p => p.id === id);
    if (projectToDuplicate) {
      const duplicated = {
        ...projectToDuplicate,
        id: 'proj-' + String(Date.now()).slice(-6),
        name: projectToDuplicate.name + ' (Copia)',
        status: 'inactive',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setProjects(prev => {
        const newProjects = prev.slice();
        newProjects.push(duplicated);
        return newProjects;
      });
      return duplicated;
    }
  };

  // Función para obtener el audit log de un proyecto
  const getProjectAuditLog = (projectId) => {
    try {
      const savedLog = localStorage.getItem(`audit-log-${projectId}`);
      return savedLog ? JSON.parse(savedLog) : [];
    } catch (error) {
      console.error('Error loading audit log:', error);
      return [];
    }
  };

  // Función para obtener audit logs del proyecto actual
  const getCurrentProjectAuditLogs = () => {
    return getProjectAuditLog(currentProjectId);
  };

  // Función para archivar proyecto
  const archiveProject = (projectId, archiveData) => {
    // Obtener el audit log completo del proyecto
    const projectAuditLog = getProjectAuditLog(projectId);
    
    // Agregar el audit log al expediente
    const completeArchiveData = {
      ...archiveData,
      auditLog: projectAuditLog
    };

    // Cambiar estado del proyecto a archivado
    setProjects(prev => prev.map(p => 
      p.id === projectId 
        ? { ...p, status: 'archived', archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        : p
    ));

    // Limpiar datos del proyecto del sistema activo
    setWorkPackagesByProject(prev => {
      const newState = Object.assign({}, prev);
      delete newState[projectId];
      return newState;
    });

    setRisksByProject(prev => {
      const newState = Object.assign({}, prev);
      delete newState[projectId];
      return newState;
    });

    setTasksByProject(prev => {
      const newState = Object.assign({}, prev);
      delete newState[projectId];
      return newState;
    });

    setPurchaseOrdersByProject(prev => {
      const newState = Object.assign({}, prev);
      delete newState[projectId];
      return newState;
    });

    setAdvancesByProject(prev => {
      const newState = Object.assign({}, prev);
      delete newState[projectId];
      return newState;
    });

    setInvoicesByProject(prev => {
      const newState = Object.assign({}, prev);
      delete newState[projectId];
      return newState;
    });

    setContractsByProject(prev => {
      const newState = Object.assign({}, prev);
      delete newState[projectId];
      return newState;
    });

    setResourceAssignmentsByProject(prev => {
      const newState = Object.assign({}, prev);
      delete newState[projectId];
      return newState;
    });

    // Limpiar el audit log del localStorage (ya está incluido en el expediente)
    localStorage.removeItem(`audit-log-${projectId}`);

    // Limpiar archivos del proyecto del localStorage (ya están incluidos en el expediente)
    localStorage.removeItem(`project-files-${projectId}`);

    // Guardar expediente completo en localStorage
    const archivedProjects = JSON.parse(localStorage.getItem('archived-projects') || '[]');
    archivedProjects.push(completeArchiveData);
    localStorage.setItem('archived-projects', JSON.stringify(archivedProjects));

    console.log('✅ Proyecto archivado exitosamente:', projectId);
    console.log('📋 Audit log incluido:', projectAuditLog.length, 'eventos');
  };

  // Exportar portfolio completo
  const exportPortfolio = () => {
    const portfolioData = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        totalProjects: projects.length,
        totalBudget: projects.reduce((sum, p) => sum + p.budget, 0)
      },
              projects,
        workPackagesByProject,
        risksByProject,
        currentProjectId,
        portfolioMetrics
    };

    const dataStr = JSON.stringify(portfolioData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `portfolio-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Importar portfolio completo
  const importPortfolio = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const portfolioData = JSON.parse(e.target.result);
        
        if (portfolioData.projects) {
          setProjects(portfolioData.projects);
        }
        if (portfolioData.workPackagesByProject) {
          setWorkPackagesByProject(portfolioData.workPackagesByProject);
        }
        if (portfolioData.currentProjectId) {
          setCurrentProjectId(portfolioData.currentProjectId);
        }
        
        alert(`Portfolio importado exitosamente: ${portfolioData.metadata?.totalProjects || 0} proyectos`);
      } catch (error) {
        alert('Error al importar el portfolio. Verifique que el archivo sea válido.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
  };

  // Limpiar datos del portfolio
  const clearPortfolioData = () => {
    if (window.confirm('¿Está seguro de eliminar todos los datos del portfolio? Esta acción no se puede deshacer.')) {
      localStorage.removeItem('mi-dashboard-portfolio');
      setProjects([]);
      setWorkPackagesByProject({});
      setRisksByProject({});
      setTasksByProject({});
      setPurchaseOrdersByProject({});
      setAdvancesByProject({});
      setInvoicesByProject({});
      setContractsByProject({});
      setGlobalResources([]);
      setResourceAssignmentsByProject({});
      setCurrentProjectId(null);
      alert('Datos del portfolio eliminados correctamente.');
    }
  };

  const filteredWorkPackages = useMemo(() => {
    const currentWorkPackages = getCurrentProjectWorkPackages();
    return currentWorkPackages.filter(wp => {
      const matchesSearch = !searchTerm || (
        (wp.name && wp.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (wp.wbs && wp.wbs.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (wp.id && wp.id.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      const matchesStatus = statusFilter === 'all' || wp.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [currentProjectId, workPackagesByProject, searchTerm, statusFilter]);

  const getPerformanceColor = (value, isIndex) => {
    const v = typeof value === 'string' ? parseFloat(value) : value;
    if (isIndex) {
      if (v >= 1.0) return 'text-green-600';
      if (v >= 0.9) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      if (v >= 0) return 'text-green-600';
      if (v >= -10000) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return '✅';
      case 'in-progress': return '🔄';
      case 'delayed': return '⚠️';
      default: return '⏸️';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in-progress': return 'text-blue-600 bg-blue-50';
      case 'delayed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPOStatusColor = (status) => {
    switch(status) {
      case 'approved': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch(status) {
      case 'paid': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'overdue': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const calculatePOSummary = () => {
    const currentPurchaseOrders = getCurrentProjectPurchaseOrders();
    const currentAdvances = getCurrentProjectAdvances();
    const currentInvoices = getCurrentProjectInvoices();
    
    const totalCommitted = currentPurchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);
    const totalAdvances = currentAdvances.reduce((sum, adv) => sum + adv.amount, 0);
    const totalInvoiced = currentInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPaid = currentInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
    
    return {
      totalCommitted,
      totalAdvances,
      totalInvoiced,
      totalPaid,
      pending: totalInvoiced - totalPaid
    };
  };

  const exportWPsCSV = () => {
    const rows = filteredWorkPackages.map(wp => ({
      id: wp.id, wbs: wp.wbs, name: wp.name,
      plannedValue: wp.plannedValue, earnedValue: wp.earnedValue,
      actualCost: wp.actualCost, percentComplete: wp.percentComplete,
      startDate: wp.startDate, endDate: wp.endDate, status: wp.status
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

  const getProjectStatus = () => {
    const spi = parseFloat(evmMetrics.SPI);
    const cpi = parseFloat(evmMetrics.CPI);
    
    if (spi >= 1 && cpi >= 1) {
      return { icon: '✅', message: 'Excelente rendimiento' };
    } else if (spi >= 1 || cpi >= 1) {
      return { icon: '⚠️', message: 'Rendimiento mixto' };
    } else {
      return { icon: '🔴', message: 'Requiere atención' };
    }
  };

  const getCostEfficiency = () => {
    const cpiValue = parseFloat(evmMetrics.CPI);
    const status = cpiValue >= 1 ? 'Eficiente' : 'Ineficiente';
    return status + ' (' + evmMetrics.CPI + ')';
  };

  const projectStatus = getProjectStatus();
  const costEfficiency = getCostEfficiency();

  // Función para importar datos desde archivo JSON
  const importData = (importedData) => {
    try {
      if (importedData.projects) setProjects(importedData.projects);
      if (importedData.currentProjectId) setCurrentProjectId(importedData.currentProjectId);
      if (importedData.workPackagesByProject) setWorkPackagesByProject(importedData.workPackagesByProject);
      if (importedData.risksByProject) setRisksByProject(importedData.risksByProject);
      if (importedData.tasksByProject) setTasksByProject(importedData.tasksByProject);
      if (importedData.purchaseOrdersByProject) setPurchaseOrdersByProject(importedData.purchaseOrdersByProject);
      if (importedData.advancesByProject) setAdvancesByProject(importedData.advancesByProject);
      if (importedData.invoicesByProject) setInvoicesByProject(importedData.invoicesByProject);
      if (importedData.contractsByProject) setContractsByProject(importedData.contractsByProject);
      if (importedData.globalResources) setGlobalResources(importedData.globalResources);
      if (importedData.resourceAssignmentsByProject) setResourceAssignmentsByProject(importedData.resourceAssignmentsByProject);
      if (importedData.viewMode) setViewMode(importedData.viewMode);

      // Disparar evento de importación exitosa
      const importSuccessEvent = new CustomEvent('dataImported', {
        detail: { 
          timestamp: new Date().toISOString(),
          projectsCount: importedData.projects?.length || 0
        }
      });
      window.dispatchEvent(importSuccessEvent);

      console.log('✅ Datos importados exitosamente');
    } catch (error) {
      console.error('❌ Error importando datos:', error);
      alert('Error al importar los datos. Verifique el formato del archivo.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* User Header */}
      <UserHeader />
      
      {/* Indicador de Sincronización */}
      <SyncIndicator />
      
      {/* Gestor de Backups */}
      <BackupManager
        projects={projects}
        workPackagesByProject={workPackagesByProject}
        risksByProject={risksByProject}
        tasksByProject={tasksByProject}
        purchaseOrdersByProject={purchaseOrdersByProject}
        advancesByProject={advancesByProject}
        invoicesByProject={invoicesByProject}
        contractsByProject={contractsByProject}
        globalResources={globalResources}
        resourceAssignmentsByProject={resourceAssignmentsByProject}
        viewMode={viewMode}
        currentProjectId={currentProjectId}
      />

      {/* Gestor de Datos */}
      <DataManager
        projects={projects}
        workPackagesByProject={workPackagesByProject}
        risksByProject={risksByProject}
        tasksByProject={tasksByProject}
        purchaseOrdersByProject={purchaseOrdersByProject}
        advancesByProject={advancesByProject}
        invoicesByProject={invoicesByProject}
        contractsByProject={contractsByProject}
        globalResources={globalResources}
        resourceAssignmentsByProject={resourceAssignmentsByProject}
        viewMode={viewMode}
        currentProjectId={currentProjectId}
        onDataImport={importData}
      />
      
      <div className="flex">
        {/* Sidebar */}
        <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-64'}`}>
          <Sidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            projects={projects}
            currentProjectId={currentProjectId}
            setCurrentProjectId={setCurrentProjectId}
            workPackages={getCurrentProjectWorkPackages()}
            risks={getCurrentProjectRisks()}
            evmMetrics={evmMetrics}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>
      
      {/* Main Content */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="max-w-7xl mx-auto">


        {/* ===== RENDERIZADO CONDICIONAL DE VISTAS ===== */}
        
        {/* Vista Portfolio */}
        {activeSection === 'portfolio' && (
          <PortfolioStrategic
            projects={projects}
            setProjects={setProjects}
            currentProjectId={currentProjectId}
            setCurrentProjectId={setCurrentProjectId}
            portfolioMetrics={portfolioMetrics}
            workPackages={getCurrentProjectWorkPackages()}
            risks={getCurrentProjectRisks()}
            globalResources={globalResources}
            setGlobalResources={setGlobalResources}
            createProject={createProject}
            updateProject={updateProject}
            deleteProject={deleteProject}
            duplicateProject={duplicateProject}
            tasks={getCurrentProjectTasks()}
            purchaseOrders={getCurrentProjectPurchaseOrders()}
            advances={getCurrentProjectAdvances()}
            invoices={getCurrentProjectInvoices()}
            contracts={getCurrentProjectContracts()}
            auditLogs={getCurrentProjectAuditLogs()}
          />
        )}

        {/* Vista Dashboard Ejecutivo Consolidado */}
        {activeSection === 'consolidated' && (
          <ConsolidatedDashboard
            projects={projects}
            portfolioMetrics={portfolioMetrics}
            workPackages={getCurrentProjectWorkPackages()}
            risks={getAllRisks()}
          />
        )}

        {/* Vista Gestión de Proyectos */}
        {activeSection === 'project-management' && (
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
            onArchiveProject={archiveProject}
          />
        )}

        {/* Vista PMO Integrado */}
        {activeSection === 'integrated' && (
          <IntegratedPMODashboard
            projects={projects}
            currentProjectId={currentProjectId}
            workPackages={getCurrentProjectWorkPackages()}
            risks={getCurrentProjectRisks()}
            portfolioMetrics={portfolioMetrics}
          />
        )}

        {/* Vista Gestión de Riesgos */}
        {activeSection === 'risks' && (
          <RiskManagement
            projects={projects}
            currentProjectId={currentProjectId}
            setCurrentProjectId={setCurrentProjectId}
            risks={getCurrentProjectRisks()}
            setRisks={updateCurrentProjectRisks}
          />
        )}

        {/* Vista Estratégica */}
        {activeSection === 'strategic' && (
          <PortfolioStrategic
            projects={projects}
            setProjects={setProjects}
            currentProjectId={currentProjectId}
            setCurrentProjectId={setCurrentProjectId}
            createProject={createProject}
            updateProject={updateProject}
            deleteProject={deleteProject}
            duplicateProject={duplicateProject}
            tasks={getCurrentProjectTasks()}
            purchaseOrders={getCurrentProjectPurchaseOrders()}
            advances={getCurrentProjectAdvances()}
            invoices={getCurrentProjectInvoices()}
            contracts={getCurrentProjectContracts()}
            auditLogs={getCurrentProjectAuditLogs()}
          />
        )}

        {/* Vista Alertas Corporativas */}
        {activeSection === 'alerts' && (
          <CorporateAlerts
            projects={projects}
            portfolioMetrics={portfolioMetrics}
          />
        )}

        {/* Vista Dashboard Ejecutivo */}
        {activeSection === 'executive' && (
                      <ConsolidatedDashboard
              projects={projects}
              portfolioMetrics={portfolioMetrics}
              workPackages={getCurrentProjectWorkPackages()}
              risks={getCurrentProjectRisks()}
            />
        )}

        {/* Vista Proyecto (Dashboard EVM actual) */}
        {activeSection === 'projects' && (
          <>
            {/* Navigation Tabs */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex space-x-2">
            <button 
              onClick={() => setViewMode('dashboard')} 
              className={'px-4 py-2 rounded-lg ' + (viewMode === 'dashboard' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700')}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setViewMode('details')} 
              className={'px-4 py-2 rounded-lg ' + (viewMode === 'details' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700')}
            >
              Detalles WBS
            </button>
            <button 
              onClick={() => setViewMode('financial')} 
              className={'px-4 py-2 rounded-lg ' + (viewMode === 'financial' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700')}
            >
              Control Financiero
            </button>
            <div className="flex-1"></div>
            <button 
              onClick={exportWPsCSV}
              className="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Dashboard View */}
        {viewMode === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Indicadores de Rendimiento</h3>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="text-sm font-medium text-gray-700">
                    Índice de Rendimiento de Cronograma (SPI)
                    <InfoTip text="SPI = EV / PV. Menor a 1: retraso; igual a 1: en tiempo; mayor a 1: adelantado." />
                  </div>
                  <div className={'text-2xl font-bold ' + getPerformanceColor(parseFloat(evmMetrics.SPI), true)}>
                    {evmMetrics.SPI}
                  </div>
                  <div className="text-xs text-gray-600">
                    {parseFloat(evmMetrics.SPI) >= 1 ? 'Proyecto adelantado' : 'Proyecto retrasado'}
                  </div>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <div className="text-sm font-medium text-gray-700">
                    Índice de Rendimiento de Costo (CPI)
                    <InfoTip text="CPI = EV / AC. Menor a 1: sobre presupuesto; igual a 1: en presupuesto; mayor a 1: bajo presupuesto." />
                  </div>
                  <div className={'text-2xl font-bold ' + getPerformanceColor(parseFloat(evmMetrics.CPI), true)}>
                    {evmMetrics.CPI}
                  </div>
                  <div className="text-xs text-gray-600">
                    {parseFloat(evmMetrics.CPI) >= 1 ? 'Bajo presupuesto' : 'Sobre presupuesto'}
                  </div>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <div className="text-sm font-medium text-gray-700">
                    Índice de Rendimiento Para Completar (TCPI)
                    <InfoTip text="TCPI = (BAC - EV) / (BAC - AC). Eficiencia requerida para completar dentro del presupuesto." />
                  </div>
                  <div className={'text-2xl font-bold ' + getPerformanceColor(parseFloat(evmMetrics.TCPI), true)}>
                    {evmMetrics.TCPI}
                  </div>
                  <div className="text-xs text-gray-600">
                    {parseFloat(evmMetrics.TCPI) <= 1.1 ? 'Factible' : 'Requiere mejoras'}
                  </div>
                </div>

                <div className="border-l-4 border-yellow-500 pl-4">
                  <div className="text-sm font-medium text-gray-700">
                    Variación al Completar (VAC)
                    <InfoTip text="VAC = BAC - EAC. Variación esperada del presupuesto al completar el proyecto." />
                  </div>
                  <div className={'text-2xl font-bold ' + getPerformanceColor(evmMetrics.VAC)}>
                    ${(evmMetrics.VAC / 1000).toFixed(0)}K
                  </div>
                  <div className="text-xs text-gray-600">
                    {evmMetrics.VAC >= 0 ? 'Dentro del presupuesto' : 'Sobrecosto esperado'}
                  </div>
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <div className="text-sm font-medium text-gray-700">
                    Varianza de Cronograma (SV)
                    <InfoTip text="SV = EV - PV. Negativo: retraso; positivo: adelantado; cero: en tiempo." />
                  </div>
                  <div className={'text-2xl font-bold ' + getPerformanceColor(evmMetrics.SV)}>
                    ${(evmMetrics.SV / 1000).toFixed(0)}K
                  </div>
                  <div className="text-xs text-gray-600">
                    {evmMetrics.SV >= 0 ? 'Proyecto adelantado' : 'Proyecto retrasado'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Resumen del Proyecto</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Proyecto:</span>
                    <div className="font-medium">{projectData.projectName}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Fecha de Reporte:</span>
                    <div className="font-medium">{new Date(reportingDate).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Inicio:</span>
                    <div className="font-medium">{new Date(projectData.startDate).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Fin:</span>
                    <div className="font-medium">{new Date(projectData.endDate).toLocaleDateString()}</div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="text-sm text-gray-600 mb-2">Progreso General</div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-500 h-3 rounded-full" 
                      style={{ width: evmMetrics.percentComplete + '%' }} 
                    />
                  </div>
                  <div className="text-xs text-gray-600 mt-1">{evmMetrics.percentComplete}% completado</div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <div className="font-medium">Paquetes</div>
                    <div className="text-xl font-bold text-blue-600">{getCurrentProjectWorkPackages().length}</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="font-medium">Completados</div>
                    <div className="text-xl font-bold text-green-600">
                      {getCurrentProjectWorkPackages().filter(wp => wp.status === 'completed').length}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 rounded">
                    <div className="font-medium">En Progreso</div>
                    <div className="text-xl font-bold text-yellow-600">
                      {getCurrentProjectWorkPackages().filter(wp => wp.status === 'in-progress').length}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Work Package Financial Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Resumen por Paquete de Trabajo</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">WBS</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paquete</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Presupuesto</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comprometido</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Facturado</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Disponible</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">% Comprometido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getCurrentProjectWorkPackages().map(wp => {
                      const currentPurchaseOrders = getCurrentProjectPurchaseOrders();
                      const currentInvoices = getCurrentProjectInvoices();
                      
                      const wpPOs = currentPurchaseOrders.filter(po => po.workPackageId === wp.id);
                      const committed = wpPOs.reduce((sum, po) => sum + po.totalAmount, 0);
                      const invoiced = currentInvoices.filter(inv => 
                        wpPOs.some(po => po.id === inv.purchaseOrderId)
                      ).reduce((sum, inv) => sum + inv.amount, 0);
                      const available = wp.plannedValue - committed;
                      const commitmentPercentage = wp.plannedValue > 0 ? (committed / wp.plannedValue) * 100 : 0;
                      
                      return (
                        <tr key={wp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono">{wp.wbs}</td>
                          <td className="px-4 py-3 text-sm font-medium">{wp.name}</td>
                          <td className="px-4 py-3 text-sm text-right">${wp.plannedValue.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right">${committed.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right">${invoiced.toLocaleString()}</td>
                          <td className={'px-4 py-3 text-sm text-right font-semibold ' + (available >= 0 ? 'text-green-600' : 'text-red-600')}>
                            ${available.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${commitmentPercentage > 100 ? 'bg-red-500' : commitmentPercentage > 80 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                                  style={{ width: Math.min(100, commitmentPercentage) + '%' }} 
                                />
                              </div>
                              <span className="text-xs">{commitmentPercentage.toFixed(0)}%</span>
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

        )}

        {viewMode === 'dashboard' && (
          <>
            {/* Alertas de Costos y Cronograma */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            🚨 Alertas de Costos y Cronograma
          </h3>
          <div className="space-y-3">
            {parseFloat(evmMetrics.CPI) < 0.9 && (
              <div className="flex items-center p-3 bg-red-50 border-l-4 border-red-500 rounded">
                <span className="text-red-500 mr-3">⚠️</span>
                <div>
                  <div className="font-medium text-red-700">CPI Bajo: {evmMetrics.CPI}</div>
                  <div className="text-sm text-red-600">El proyecto está sobre presupuesto</div>
                </div>
              </div>
            )}
            
            {parseFloat(evmMetrics.SPI) < 0.9 && (
              <div className="flex items-center p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                <span className="text-yellow-500 mr-3">⏰</span>
                <div>
                  <div className="font-medium text-yellow-700">SPI Bajo: {evmMetrics.SPI}</div>
                  <div className="text-sm text-yellow-600">El proyecto está atrasado</div>
                </div>
              </div>
            )}
            
            {evmMetrics.CV < -10000 && (
              <div className="flex items-center p-3 bg-red-50 border-l-4 border-red-500 rounded">
                <span className="text-red-500 mr-3">💰</span>
                <div>
                  <div className="font-medium text-red-700">Sobrecosto Crítico: ${Math.abs(evmMetrics.CV / 1000).toFixed(0)}K</div>
                  <div className="text-sm text-red-600">Revisar presupuesto y gastos</div>
                </div>
              </div>
            )}
            
            {evmMetrics.SV < -10000 && (
              <div className="flex items-center p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                <span className="text-yellow-500 mr-3">📅</span>
                <div>
                  <div className="font-medium text-yellow-700">Retraso Crítico: ${Math.abs(evmMetrics.SV / 1000).toFixed(0)}K</div>
                  <div className="text-sm text-yellow-600">Revisar cronograma y recursos</div>
                </div>
              </div>
            )}
            
            {evmMetrics.VAC < -50000 && (
              <div className="flex items-center p-3 bg-red-50 border-l-4 border-red-500 rounded">
                <span className="text-red-500 mr-3">🎯</span>
                <div>
                  <div className="font-medium text-red-700">Sobrecosto Esperado: ${Math.abs(evmMetrics.VAC / 1000).toFixed(0)}K</div>
                  <div className="text-sm text-red-600">Proyección de sobrecosto al completar</div>
                </div>
              </div>
            )}
            
            {parseFloat(evmMetrics.CPI) >= 1.1 && parseFloat(evmMetrics.SPI) >= 1.1 && (
              <div className="flex items-center p-3 bg-green-50 border-l-4 border-green-500 rounded">
                <span className="text-green-500 mr-3">✅</span>
                <div>
                  <div className="font-medium text-green-700">Excelente Rendimiento</div>
                  <div className="text-sm text-green-600">Proyecto bajo presupuesto y adelantado</div>
                </div>
              </div>
            )}
            
            {!parseFloat(evmMetrics.CPI) < 0.9 && !parseFloat(evmMetrics.SPI) < 0.9 && !evmMetrics.CV < -10000 && !evmMetrics.SV < -10000 && !evmMetrics.VAC < -50000 && parseFloat(evmMetrics.CPI) < 1.1 && parseFloat(evmMetrics.SPI) < 1.1 && (
              <div className="flex items-center p-3 bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                <span className="text-blue-500 mr-3">ℹ️</span>
                <div>
                  <div className="font-medium text-blue-700">Estado Normal</div>
                  <div className="text-sm text-blue-600">Proyecto dentro de parámetros esperados</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Curva S - EVM Performance */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            📈 Curva S - Análisis de Rendimiento EVM
          </h3>
          <div className="mb-4 text-sm text-gray-600">
            Evolución del Valor Planificado (PV), Valor Ganado (EV) y Costo Real (AC) a lo largo del tiempo
          </div>
          
          {/* Gráfico SVG de la Curva S */}
          <div className="w-full overflow-x-auto">
            <svg width="800" height="300" className="border border-gray-200 rounded">
              {/* Ejes */}
              <line x1="50" y1="250" x2="750" y2="250" stroke="#374151" strokeWidth="2" />
              <line x1="50" y1="50" x2="50" y2="250" stroke="#374151" strokeWidth="2" />
              
              {/* Etiquetas de ejes */}
              <text x="400" y="285" textAnchor="middle" className="text-sm font-medium">Tiempo del Proyecto</text>
              <text x="12" y="150" textAnchor="middle" className="text-xs font-medium" transform="rotate(-90, 12, 150)">Valor ($K)</text>
              
              {/* Escala del eje Y */}
              <text x="35" y="250" textAnchor="end" className="text-xs text-gray-500">$0K</text>
              <text x="35" y="200" textAnchor="end" className="text-xs text-gray-500">${(evmMetrics.BAC / 2000).toFixed(0)}K</text>
              <text x="35" y="150" textAnchor="end" className="text-xs text-gray-500">${(evmMetrics.BAC / 1000).toFixed(0)}K</text>
              <text x="35" y="100" textAnchor="end" className="text-xs text-gray-500">${(evmMetrics.BAC * 1.5 / 1000).toFixed(0)}K</text>
              <text x="35" y="50" textAnchor="end" className="text-xs text-gray-500">${(evmMetrics.BAC * 2 / 1000).toFixed(0)}K</text>
              
              {/* Líneas de referencia horizontales */}
              <line x1="50" y1="200" x2="750" y2="200" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="50" y1="150" x2="750" y2="150" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="50" y1="100" x2="750" y2="100" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="50" y1="50" x2="750" y2="50" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="5,5" />
              
              {/* Escala del eje X - Fechas del proyecto */}
              <text x="50" y="275" textAnchor="middle" className="text-xs text-gray-500">
                {new Date(projectData.startDate).toLocaleDateString('es', { month: 'short', day: 'numeric' })}
              </text>
              <text x="200" y="275" textAnchor="middle" className="text-xs text-gray-500">
                {new Date(new Date(projectData.startDate).getTime() + (new Date(projectData.endDate).getTime() - new Date(projectData.startDate).getTime()) * 0.25).toLocaleDateString('es', { month: 'short', day: 'numeric' })}
              </text>
              <text x="400" y="275" textAnchor="middle" className="text-xs text-gray-500">
                {new Date(new Date(projectData.startDate).getTime() + (new Date(projectData.endDate).getTime() - new Date(projectData.startDate).getTime()) * 0.5).toLocaleDateString('es', { month: 'short', day: 'numeric' })}
              </text>
              <text x="600" y="275" textAnchor="middle" className="text-xs text-gray-500">
                {new Date(new Date(projectData.startDate).getTime() + (new Date(projectData.endDate).getTime() - new Date(projectData.startDate).getTime()) * 0.75).toLocaleDateString('es', { month: 'short', day: 'numeric' })}
              </text>
              <text x="750" y="275" textAnchor="middle" className="text-xs text-gray-500">
                {new Date(projectData.endDate).toLocaleDateString('es', { month: 'short', day: 'numeric' })}
              </text>
              
              {/* Líneas de referencia verticales para fechas */}
              <line x1="200" y1="50" x2="200" y2="250" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="400" y1="50" x2="400" y2="250" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="5,5" />
              <line x1="600" y1="50" x2="600" y2="250" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="5,5" />
              
              {/* Curva S del Valor Planificado (PV) - Línea azul */}
              <path 
                d={`M 50,${250 - (evmMetrics.PV / (evmMetrics.BAC * 2 / 1000)) * 200} Q 200,${250 - (evmMetrics.PV / (evmMetrics.BAC * 2 / 1000)) * 150} 400,${250 - (evmMetrics.PV / (evmMetrics.BAC * 2 / 1000)) * 100} T 750,${250 - (evmMetrics.PV / (evmMetrics.BAC * 2 / 1000)) * 50}`}
                fill="none" 
                stroke="#3B82F6" 
                strokeWidth="3"
              />
              
              {/* Curva S del Valor Ganado (EV) - Línea verde */}
              <path 
                d={`M 50,${250 - (evmMetrics.EV / (evmMetrics.BAC * 2 / 1000)) * 200} Q 200,${250 - (evmMetrics.EV / (evmMetrics.BAC * 2 / 1000)) * 150} 400,${250 - (evmMetrics.EV / (evmMetrics.BAC * 2 / 1000)) * 100} T 750,${250 - (evmMetrics.EV / (evmMetrics.BAC * 2 / 1000)) * 50}`}
                fill="none" 
                stroke="#10B981" 
                strokeWidth="3"
              />
              
              {/* Curva S del Costo Real (AC) - Línea naranja */}
              <path 
                d={`M 50,${250 - (evmMetrics.AC / (evmMetrics.BAC * 2 / 1000)) * 200} Q 200,${250 - (evmMetrics.AC / (evmMetrics.BAC * 2 / 1000)) * 150} 400,${250 - (evmMetrics.AC / (evmMetrics.BAC * 2 / 1000)) * 100} T 750,${250 - (evmMetrics.AC / (evmMetrics.BAC * 2 / 1000)) * 50}`}
                fill="none" 
                stroke="#F59E0B" 
                strokeWidth="3"
              />
              
              {/* Puntos de datos actuales */}
              <circle 
                cx="400" 
                cy={250 - (evmMetrics.PV / (evmMetrics.BAC * 2 / 1000)) * 200} 
                r="6" 
                fill="#3B82F6" 
                stroke="white" 
                strokeWidth="2"
              />
              <circle 
                cx="400" 
                cy={250 - (evmMetrics.EV / (evmMetrics.BAC * 2 / 1000)) * 200} 
                r="6" 
                fill="#10B981" 
                stroke="white" 
                strokeWidth="2"
              />
              <circle 
                cx="400" 
                cy={250 - (evmMetrics.AC / (evmMetrics.BAC * 2 / 1000)) * 200} 
                r="6" 
                fill="#F59E0B" 
                stroke="white" 
                strokeWidth="2"
              />
              
              {/* Línea de tiempo actual */}
              <line x1="400" y1="50" x2="400" y2="250" stroke="#EF4444" strokeWidth="2" strokeDasharray="5,5" />
              <text x="410" y="40" className="text-xs font-medium text-red-600">HOY</text>
            </svg>
          </div>
          
          {/* Leyenda */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-700">PV (Valor Planificado): ${(evmMetrics.PV / 1000).toFixed(0)}K</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-700">EV (Valor Ganado): ${(evmMetrics.EV / 1000).toFixed(0)}K</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-orange-500 rounded-full mr-2"></div>
              <span className="text-gray-700">AC (Costo Real): ${(evmMetrics.AC / 1000).toFixed(0)}K</span>
            </div>
          </div>
          
          {/* Análisis de la Curva S */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
              <div className="font-medium text-blue-700">Análisis PV</div>
              <div className="text-blue-600">
                {evmMetrics.PV > evmMetrics.EV ? '⚠️ Planificado > Ganado' : '✅ En línea con el plan'}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded border-l-4 border-green-500">
              <div className="font-medium text-green-700">Análisis EV</div>
              <div className="text-green-600">
                {evmMetrics.EV > evmMetrics.AC ? '✅ Ganado > Costo' : '⚠️ Costo > Ganado'}
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded border-l-4 border-orange-500">
              <div className="font-medium text-orange-700">Análisis AC</div>
              <div className="text-orange-600">
                {evmMetrics.AC > evmMetrics.EV ? '⚠️ Sobrecosto' : '✅ Bajo presupuesto'}
              </div>
            </div>
          </div>
        </div>
          </>
        )}

        {/* Project Status Summary */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl mb-1">{projectStatus.icon}</div>
              <div className="font-medium">Estado del Proyecto</div>
              <div className="text-gray-600">{projectStatus.message}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">📊</div>
              <div className="font-medium">Progreso General</div>
              <div className="text-gray-600">{evmMetrics.percentComplete}% completado</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">💰</div>
              <div className="font-medium">Eficiencia de Costo</div>
              <div className="text-gray-600">{costEfficiency}</div>
            </div>
          </div>
        </div>

        {/* Details View */}
        {viewMode === 'details' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b">
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  placeholder="Buscar paquetes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border rounded px-3 py-2"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="all">Todos los estados</option>
                  <option value="completed">Completado</option>
                  <option value="in-progress">En progreso</option>
                  <option value="pending">Pendiente</option>
                  <option value="delayed">Retrasado</option>
                </select>
              </div>
            </div>
            
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
                  {filteredWorkPackages.map(wp => {
                    const wpCV = wp.earnedValue - wp.actualCost;
                    const wpCPI = wp.actualCost > 0 ? wp.earnedValue / wp.actualCost : 1;
                    return (
                      <tr key={wp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono">{wp.wbs}</td>
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
                        <td className="px-4 py-3 text-sm text-right">${(wp.earnedValue / 1000).toFixed(0)}K</td>
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
                        <td className={'px-4 py-3 text-sm text-right font-semibold ' + getPerformanceColor(wpCV)}>
                          ${(wpCV / 1000).toFixed(0)}K
                        </td>
                        <td className={'px-4 py-3 text-sm text-right font-semibold ' + getPerformanceColor(wpCPI, true)}>
                          {wpCPI.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-12 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: wp.percentComplete + '%' }} 
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
                                  p.earnedValue = (val / 100) * p.plannedValue;
                                });
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={'inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ' + getStatusColor(wp.status)}>
                            <span>{getStatusIcon(wp.status)}</span>
                            <span className="capitalize">{wp.status}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 px-4 py-3 border-t">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 inline-flex items-center">
                    Total PV:
                    <InfoTip text="PV (Planned Value): valor del trabajo planificado hasta la fecha según línea base." />
                  </span>
                  <span className="ml-2 font-semibold">${(evmMetrics.PV / 1000).toFixed(0)}K</span>
                </div>
                <div>
                  <span className="text-gray-600 inline-flex items-center">
                    Total EV:
                    <InfoTip text="EV (Earned Value): valor del trabajo realmente completado hasta la fecha." />
                  </span>
                  <span className="ml-2 font-semibold">${(evmMetrics.EV / 1000).toFixed(0)}K</span>
                </div>
                <div>
                  <span className="text-gray-600 inline-flex items-center">
                    Total AC:
                    <InfoTip text="AC (Actual Cost): costo real incurrido hasta la fecha." />
                  </span>
                  <span className="ml-2 font-semibold">${(evmMetrics.AC / 1000).toFixed(0)}K</span>
                </div>
                <div>
                  <span className="text-gray-600 inline-flex items-center">EAC:</span>
                  <span className="ml-2 font-semibold">${(evmMetrics.EAC / 1000).toFixed(0)}K</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Financial View */}
        {viewMode === 'financial' && (
          <div className="space-y-6">
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
                <div className="text-xs text-gray-500 mb-1">Total Comprometido</div>
                <div className="text-2xl font-bold text-gray-800">
                  ${(calculatePOSummary().totalCommitted / 1000).toFixed(0)}K
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
                <div className="text-xs text-gray-500 mb-1">Anticipos Pagados</div>
                <div className="text-2xl font-bold text-gray-800">
                  ${(calculatePOSummary().totalAdvances / 1000).toFixed(0)}K
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
                <div className="text-xs text-gray-500 mb-1">Total Facturado</div>
                <div className="text-2xl font-bold text-gray-800">
                  ${(calculatePOSummary().totalInvoiced / 1000).toFixed(0)}K
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
                <div className="text-xs text-gray-500 mb-1">Total Pagado</div>
                <div className="text-2xl font-bold text-gray-800">
                  ${(calculatePOSummary().totalPaid / 1000).toFixed(0)}K
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
                <div className="text-xs text-gray-500 mb-1">Pendiente de Pago</div>
                <div className="text-2xl font-bold text-gray-800">
                  ${(calculatePOSummary().pending / 1000).toFixed(0)}K
                </div>
              </div>
            </div>

            {/* Purchase Orders Table */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Órdenes de Compra</h3>
                  <button 
                    onClick={handleNewPO}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Nueva OC
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
                    {getCurrentProjectPurchaseOrders().map(po => {
                      const workPackage = getCurrentProjectWorkPackages().find(wp => wp.id === po.workPackageId);
                      return (
                        <tr key={po.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono">{po.number}</td>
                          <td className="px-4 py-3 text-sm">
                            {workPackage ? `${workPackage.wbs} - ${workPackage.name}` : 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">{po.supplier}</td>
                          <td className="px-4 py-3 text-sm">{po.description}</td>
                          <td className="px-4 py-3 text-sm text-right">${po.totalAmount.toLocaleString()}</td>
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

            {/* Advances and Invoices Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Anticipos</h3>
                    <button 
                      onClick={handleNewAdvance}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Nuevo Anticipo
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
                                      {getCurrentProjectAdvances().map(advance => {
                  const po = getCurrentProjectPurchaseOrders().find(p => p.id === advance.purchaseOrderId);
                        return (
                          <tr key={advance.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-mono">{po?.number || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-right">${advance.amount.toLocaleString()}</td>
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

              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Facturas</h3>
                    <button 
                      onClick={handleNewInvoice}
                    >
                      Nueva Factura
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
                                      {getCurrentProjectInvoices().map(invoice => {
                  const po = getCurrentProjectPurchaseOrders().find(p => p.id === invoice.purchaseOrderId);
                        const isOverdue = new Date(invoice.dueDate) < new Date(reportingDate) && invoice.status !== 'paid';
                        const displayStatus = isOverdue ? 'overdue' : invoice.status;
                        return (
                          <tr key={invoice.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-mono">{invoice.invoiceNumber}</td>
                            <td className="px-4 py-3 text-sm font-mono">{po?.number || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-right">${invoice.amount.toLocaleString()}</td>
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
          </div>
        )}
        </>
        )}

        {/* Vista Cronograma */}
        {viewMode === 'schedule' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold mb-4">📅 Cronograma del Proyecto</h2>
            <p className="text-gray-600 mb-6">
              Accede al cronograma completo con Gantt, Network Diagram y gestión de dependencias.
            </p>
            <button
              onClick={() => setShowSchedule(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <span>📅</span>
              <span>Abrir Cronograma Completo</span>
            </button>
          </div>
        )}

        {/* Help Modal */}
        {showHelp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Glosario EVM - Earned Value Management</h2>
                  <button 
                    onClick={() => setShowHelp(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Métricas Principales</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <strong>BAC (Budget at Completion):</strong> Presupuesto total del proyecto
                      </div>
                      <div>
                        <strong>PV (Planned Value):</strong> Valor del trabajo planificado hasta la fecha
                      </div>
                      <div>
                        <strong>EV (Earned Value):</strong> Valor del trabajo realmente completado
                      </div>
                      <div>
                        <strong>AC (Actual Cost):</strong> Costo real incurrido hasta la fecha
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-3">Índices de Rendimiento</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <strong>CPI (Cost Performance Index):</strong> EV / AC
                        <br />
                        <span className="text-gray-600">CPI mayor a 1: Bajo presupuesto | CPI menor a 1: Sobre presupuesto</span>
                      </div>
                      <div>
                        <strong>SPI (Schedule Performance Index):</strong> EV / PV
                        <br />
                        <span className="text-gray-600">SPI mayor a 1: Adelantado | SPI menor a 1: Retrasado</span>
                      </div>
                      <div>
                        <strong>TCPI (To Complete Performance Index):</strong> (BAC - EV) / (BAC - AC)
                        <br />
                        <span className="text-gray-600">Eficiencia requerida para completar dentro del presupuesto</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-3">Variaciones</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <strong>CV (Cost Variance):</strong> EV - AC
                        <br />
                        <span className="text-gray-600">CV mayor a 0: Bajo presupuesto | CV menor a 0: Sobre presupuesto</span>
                      </div>
                      <div>
                        <strong>SV (Schedule Variance):</strong> EV - PV
                        <br />
                        <span className="text-gray-600">SV mayor a 0: Adelantado | SV menor a 0: Retrasado</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-3">Proyecciones</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <strong>EAC (Estimate at Completion):</strong> AC + ETC
                        <br />
                        <span className="text-gray-600">Estimación del costo total al terminar</span>
                      </div>
                      <div>
                        <strong>ETC (Estimate to Complete):</strong> (BAC - EV) / CPI
                        <br />
                        <span className="text-gray-600">Estimación del costo restante</span>
                      </div>
                      <div>
                        <strong>VAC (Variance at Completion):</strong> BAC - EAC
                        <br />
                        <span className="text-gray-600">Variación esperada al completar</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded">
                  <h4 className="font-semibold mb-2">Interpretación Rápida</h4>
                  <div className="text-sm space-y-1">
                    <div>✅ <strong>Proyecto saludable:</strong> CPI mayor o igual a 1.0 y SPI mayor o igual a 1.0</div>
                    <div>⚠️ <strong>Atención requerida:</strong> CPI o SPI entre 0.8 - 1.0</div>
                    <div>🔴 <strong>Problemas críticos:</strong> CPI o SPI menor a 0.8</div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-green-50 rounded">
                  <h4 className="font-semibold mb-2">Estados Automáticos</h4>
                  <div className="text-sm space-y-1">
                    <div>✅ <strong>Completado:</strong> 100% de completado</div>
                    <div>🔄 <strong>En progreso:</strong> 1-99% de completado, dentro de fechas</div>
                    <div>⏸️ <strong>Pendiente:</strong> 0% de completado, dentro de fechas</div>
                    <div>⚠️ <strong>Retrasado:</strong> Fecha de fin ya pasó y no está 100% completo</div>
                    <div className="text-xs text-gray-600 mt-2">Los estados se actualizan automáticamente al cambiar el % de completado o la fecha de reporte.</div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-purple-50 rounded">
                  <h4 className="font-semibold mb-2">Control Financiero</h4>
                  <div className="text-sm space-y-2">
                    <div><strong>Órdenes de Compra:</strong> Gestión de compromisos por paquete de trabajo</div>
                    <div><strong>Anticipos:</strong> Control de pagos adelantados a proveedores</div>
                    <div><strong>Facturas:</strong> Seguimiento de facturas recibidas y pagos pendientes</div>
                    <div><strong>Flujo de Compromisos:</strong> Monitoreo del presupuesto disponible vs comprometido</div>
                    <div className="text-xs text-gray-600 mt-2">
                      <strong>Estados financieros:</strong><br/>
                      • <span className="text-green-600">Paid/Approved:</span> Completado<br/>
                      • <span className="text-yellow-600">Pending:</span> En proceso<br/>
                      • <span className="text-red-600">Overdue:</span> Vencido
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Purchase Order Modal */}
        {showPOModal && editingPO && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">
                    {editingPO.id ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
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
                      value={editingPO.number}
                      onChange={(e) => setEditingPO({
                        id: editingPO.id,
                        number: e.target.value,
                        workPackageId: editingPO.workPackageId,
                        supplier: editingPO.supplier,
                        totalAmount: editingPO.totalAmount,
                        status: editingPO.status,
                        requestDate: editingPO.requestDate,
                        expectedDate: editingPO.expectedDate,
                        description: editingPO.description,
                        projectId: editingPO.projectId,
                        createdAt: editingPO.createdAt,
                        updatedAt: editingPO.updatedAt
                      })}
                      placeholder="PO-2025-XXX"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paquete de Trabajo *</label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={editingPO.workPackageId}
                      onChange={(e) => setEditingPO({
                        id: editingPO.id,
                        number: editingPO.number,
                        workPackageId: e.target.value,
                        supplier: editingPO.supplier,
                        totalAmount: editingPO.totalAmount,
                        status: editingPO.status,
                        requestDate: editingPO.requestDate,
                        expectedDate: editingPO.expectedDate,
                        description: editingPO.description,
                        projectId: editingPO.projectId,
                        createdAt: editingPO.createdAt,
                        updatedAt: editingPO.updatedAt
                      })}
                    >
                      <option value="">Seleccionar...</option>
                      {getCurrentProjectWorkPackages().map(wp => (
                        <option key={wp.id} value={wp.id}>
                          {wp.wbs} - {wp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      value={editingPO.supplier}
                      onChange={(e) => setEditingPO({
                        id: editingPO.id,
                        number: editingPO.number,
                        workPackageId: editingPO.workPackageId,
                        supplier: e.target.value,
                        totalAmount: editingPO.totalAmount,
                        status: editingPO.status,
                        requestDate: editingPO.requestDate,
                        expectedDate: editingPO.expectedDate,
                        description: editingPO.description,
                        projectId: editingPO.projectId,
                        createdAt: editingPO.createdAt,
                        updatedAt: editingPO.updatedAt
                      })}
                      placeholder="Nombre del proveedor"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto Total *</label>
                    <input
                      type="number"
                      className="w-full border rounded px-3 py-2"
                      value={editingPO.totalAmount}
                      onChange={(e) => setEditingPO({
                        id: editingPO.id,
                        number: editingPO.number,
                        workPackageId: editingPO.workPackageId,
                        supplier: editingPO.supplier,
                        totalAmount: Number(e.target.value),
                        status: editingPO.status,
                        requestDate: editingPO.requestDate,
                        expectedDate: editingPO.expectedDate,
                        description: editingPO.description,
                        projectId: editingPO.projectId,
                        createdAt: editingPO.createdAt,
                        updatedAt: editingPO.updatedAt
                      })}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={editingPO.status}
                      onChange={(e) => setEditingPO({
                        id: editingPO.id,
                        number: editingPO.number,
                        workPackageId: editingPO.workPackageId,
                        supplier: editingPO.supplier,
                        totalAmount: editingPO.totalAmount,
                        status: e.target.value,
                        requestDate: editingPO.requestDate,
                        expectedDate: editingPO.expectedDate,
                        description: editingPO.description,
                        projectId: editingPO.projectId,
                        createdAt: editingPO.createdAt,
                        updatedAt: editingPO.updatedAt
                      })}
                    >
                      <option value="pending">Pendiente</option>
                      <option value="approved">Aprobada</option>
                      <option value="rejected">Rechazada</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Esperada</label>
                    <input
                      type="date"
                      className="w-full border rounded px-3 py-2"
                      value={editingPO.expectedDate}
                      onChange={(e) => setEditingPO({
                        id: editingPO.id,
                        number: editingPO.number,
                        workPackageId: editingPO.workPackageId,
                        supplier: editingPO.supplier,
                        totalAmount: editingPO.totalAmount,
                        status: editingPO.status,
                        requestDate: editingPO.requestDate,
                        expectedDate: e.target.value,
                        description: editingPO.description,
                        projectId: editingPO.projectId,
                        createdAt: editingPO.createdAt,
                        updatedAt: editingPO.updatedAt
                      })}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea
                      className="w-full border rounded px-3 py-2"
                      rows="3"
                      value={editingPO.description}
                      onChange={(e) => setEditingPO({
                        id: editingPO.id,
                        number: editingPO.number,
                        workPackageId: editingPO.workPackageId,
                        supplier: editingPO.supplier,
                        totalAmount: editingPO.totalAmount,
                        status: editingPO.status,
                        requestDate: editingPO.requestDate,
                        expectedDate: editingPO.expectedDate,
                        description: e.target.value,
                        projectId: editingPO.projectId,
                        createdAt: editingPO.createdAt,
                        updatedAt: editingPO.updatedAt
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
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advance Modal */}
        {showAdvanceModal && editingAdvance && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">
                    {editingAdvance.id ? 'Editar Anticipo' : 'Nuevo Anticipo'}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Orden de Compra *</label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={editingAdvance.purchaseOrderId}
                      onChange={(e) => setEditingAdvance({
                        id: editingAdvance.id,
                        purchaseOrderId: e.target.value,
                        amount: editingAdvance.amount,
                        percentage: editingAdvance.percentage,
                        status: editingAdvance.status,
                        requestDate: editingAdvance.requestDate,
                        paymentDate: editingAdvance.paymentDate,
                        reference: editingAdvance.reference,
                        projectId: editingAdvance.projectId,
                        createdAt: editingAdvance.createdAt,
                        updatedAt: editingAdvance.updatedAt
                      })}
                    >
                      <option value="">Seleccionar OC...</option>
                      {getCurrentProjectPurchaseOrders().filter(po => po.status === 'approved').map(po => (
                        <option key={po.id} value={po.id}>
                          {po.number} - {po.supplier}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                    <input
                      type="number"
                      className="w-full border rounded px-3 py-2"
                      value={editingAdvance.amount}
                      onChange={(e) => setEditingAdvance({
                        id: editingAdvance.id,
                        purchaseOrderId: editingAdvance.purchaseOrderId,
                        amount: Number(e.target.value),
                        percentage: editingAdvance.percentage,
                        status: editingAdvance.status,
                        requestDate: editingAdvance.requestDate,
                        paymentDate: editingAdvance.paymentDate,
                        reference: editingAdvance.reference,
                        projectId: editingAdvance.projectId,
                        createdAt: editingAdvance.createdAt,
                        updatedAt: editingAdvance.updatedAt
                      })}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje</label>
                    <input
                      type="number"
                      className="w-full border rounded px-3 py-2"
                      value={editingAdvance.percentage}
                      onChange={(e) => setEditingAdvance({
                        id: editingAdvance.id,
                        purchaseOrderId: editingAdvance.purchaseOrderId,
                        amount: editingAdvance.amount,
                        percentage: Number(e.target.value),
                        status: editingAdvance.status,
                        requestDate: editingAdvance.requestDate,
                        paymentDate: editingAdvance.paymentDate,
                        reference: editingAdvance.reference,
                        projectId: editingAdvance.projectId,
                        createdAt: editingAdvance.createdAt,
                        updatedAt: editingAdvance.updatedAt
                      })}
                      min="0"
                      max="100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={editingAdvance.status}
                      onChange={(e) => setEditingAdvance({
                        id: editingAdvance.id,
                        purchaseOrderId: editingAdvance.purchaseOrderId,
                        amount: editingAdvance.amount,
                        percentage: editingAdvance.percentage,
                        status: e.target.value,
                        requestDate: editingAdvance.requestDate,
                        paymentDate: editingAdvance.paymentDate,
                        reference: editingAdvance.reference,
                        projectId: editingAdvance.projectId,
                        createdAt: editingAdvance.createdAt,
                        updatedAt: editingAdvance.updatedAt
                      })}
                    >
                      <option value="pending">Pendiente</option>
                      <option value="paid">Pagado</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Solicitud</label>
                    <input
                      type="date"
                      className="w-full border rounded px-3 py-2"
                      value={editingAdvance.requestDate}
                      onChange={(e) => setEditingAdvance({
                        id: editingAdvance.id,
                        purchaseOrderId: editingAdvance.purchaseOrderId,
                        amount: editingAdvance.amount,
                        percentage: editingAdvance.percentage,
                        status: editingAdvance.status,
                        requestDate: e.target.value,
                        paymentDate: editingAdvance.paymentDate,
                        reference: editingAdvance.reference,
                        projectId: editingAdvance.projectId,
                        createdAt: editingAdvance.createdAt,
                        updatedAt: editingAdvance.updatedAt
                      })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Pago</label>
                    <input
                      type="date"
                      className="w-full border rounded px-3 py-2"
                      value={editingAdvance.paymentDate || ''}
                      onChange={(e) => setEditingAdvance({
                        id: editingAdvance.id,
                        purchaseOrderId: editingAdvance.purchaseOrderId,
                        amount: editingAdvance.amount,
                        percentage: editingAdvance.percentage,
                        status: editingAdvance.status,
                        requestDate: editingAdvance.requestDate,
                        paymentDate: e.target.value,
                        reference: editingAdvance.reference,
                        projectId: editingAdvance.projectId,
                        createdAt: editingAdvance.createdAt,
                        updatedAt: editingAdvance.updatedAt
                      })}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      value={editingAdvance.reference}
                      onChange={(e) => setEditingAdvance({
                        id: editingAdvance.id,
                        purchaseOrderId: editingAdvance.purchaseOrderId,
                        amount: editingAdvance.amount,
                        percentage: editingAdvance.percentage,
                        status: editingAdvance.status,
                        requestDate: editingAdvance.requestDate,
                        paymentDate: editingAdvance.paymentDate,
                        reference: e.target.value,
                        projectId: editingAdvance.projectId,
                        createdAt: editingAdvance.createdAt,
                        updatedAt: editingAdvance.updatedAt
                      })}
                      placeholder="Referencia del anticipo"
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
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Modal */}
        {showInvoiceModal && editingInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">
                    {editingInvoice.id ? 'Editar Factura' : 'Nueva Factura'}
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
                      value={editingInvoice.invoiceNumber}
                      onChange={(e) => setEditingInvoice({
                        id: editingInvoice.id,
                        invoiceNumber: e.target.value,
                        amount: editingInvoice.amount,
                        status: editingInvoice.status,
                        receivedDate: editingInvoice.receivedDate,
                        dueDate: editingInvoice.dueDate,
                        paymentDate: editingInvoice.paymentDate,
                        description: editingInvoice.description,
                        projectId: editingInvoice.projectId,
                        createdAt: editingInvoice.createdAt,
                        updatedAt: editingInvoice.updatedAt
                      })}
                      placeholder="FAC-2025-XXX"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Orden de Compra *</label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={editingInvoice.purchaseOrderId}
                      onChange={(e) => {
                        const selectedPO = getCurrentProjectPurchaseOrders().find(po => po.id === e.target.value);
                        setEditingInvoice(Object.assign({}, editingInvoice, { 
                          purchaseOrderId: e.target.value,
                          supplier: selectedPO?.supplier || ''
                        }));
                      }}
                    >
                      <option value="">Seleccionar OC...</option>
                      {getCurrentProjectPurchaseOrders().filter(po => po.status === 'approved').map(po => (
                        <option key={po.id} value={po.id}>
                          {po.number} - {po.supplier}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2 bg-gray-50"
                      value={editingInvoice.supplier}
                      readOnly
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                    <input
                      type="number"
                      className="w-full border rounded px-3 py-2"
                      value={editingInvoice.amount}
                      onChange={(e) => setEditingInvoice({
                        id: editingInvoice.id,
                        invoiceNumber: editingInvoice.invoiceNumber,
                        amount: Number(e.target.value),
                        status: editingInvoice.status,
                        receivedDate: editingInvoice.receivedDate,
                        dueDate: editingInvoice.dueDate,
                        paymentDate: editingInvoice.paymentDate,
                        description: editingInvoice.description,
                        projectId: editingInvoice.projectId,
                        createdAt: editingInvoice.createdAt,
                        updatedAt: editingInvoice.updatedAt
                      })}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={editingInvoice.status}
                      onChange={(e) => setEditingInvoice({
                        id: editingInvoice.id,
                        invoiceNumber: editingInvoice.invoiceNumber,
                        amount: editingInvoice.amount,
                        status: e.target.value,
                        receivedDate: editingInvoice.receivedDate,
                        dueDate: editingInvoice.dueDate,
                        paymentDate: editingInvoice.paymentDate,
                        description: editingInvoice.description,
                        projectId: editingInvoice.projectId,
                        createdAt: editingInvoice.createdAt,
                        updatedAt: editingInvoice.updatedAt
                      })}
                    >
                      <option value="pending">Pendiente</option>
                      <option value="paid">Pagada</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Recepción</label>
                    <input
                      type="date"
                      className="w-full border rounded px-3 py-2"
                      value={editingInvoice.receivedDate}
                      onChange={(e) => setEditingInvoice({
                        id: editingInvoice.id,
                        invoiceNumber: editingInvoice.invoiceNumber,
                        amount: editingInvoice.amount,
                        status: editingInvoice.status,
                        receivedDate: e.target.value,
                        dueDate: editingInvoice.dueDate,
                        paymentDate: editingInvoice.paymentDate,
                        description: editingInvoice.description,
                        projectId: editingInvoice.projectId,
                        createdAt: editingInvoice.createdAt,
                        updatedAt: editingInvoice.updatedAt
                      })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
                    <input
                      type="date"
                      className="w-full border rounded px-3 py-2"
                      value={editingInvoice.dueDate}
                      onChange={(e) => setEditingInvoice({
                        id: editingInvoice.id,
                        invoiceNumber: editingInvoice.invoiceNumber,
                        amount: editingInvoice.amount,
                        status: editingInvoice.status,
                        receivedDate: editingInvoice.receivedDate,
                        dueDate: e.target.value,
                        paymentDate: editingInvoice.paymentDate,
                        description: editingInvoice.description,
                        projectId: editingInvoice.projectId,
                        createdAt: editingInvoice.createdAt,
                        updatedAt: editingInvoice.updatedAt
                      })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Pago</label>
                    <input
                      type="date"
                      className="w-full border rounded px-3 py-2"
                      value={editingInvoice.paymentDate || ''}
                      onChange={(e) => setEditingInvoice({
                        id: editingInvoice.id,
                        invoiceNumber: editingInvoice.invoiceNumber,
                        amount: editingInvoice.amount,
                        status: editingInvoice.status,
                        receivedDate: editingInvoice.receivedDate,
                        dueDate: editingInvoice.dueDate,
                        paymentDate: e.target.value,
                        description: editingInvoice.description,
                        projectId: editingInvoice.projectId,
                        createdAt: editingInvoice.createdAt,
                        updatedAt: editingInvoice.updatedAt
                      })}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea
                      className="w-full border rounded px-3 py-2"
                      rows="3"
                      value={editingInvoice.description}
                      onChange={(e) => setEditingInvoice({
                        id: editingInvoice.id,
                        invoiceNumber: editingInvoice.invoiceNumber,
                        amount: editingInvoice.amount,
                        status: editingInvoice.status,
                        receivedDate: editingInvoice.receivedDate,
                        dueDate: editingInvoice.dueDate,
                        paymentDate: editingInvoice.paymentDate,
                        description: e.target.value,
                        projectId: editingInvoice.projectId,
                        createdAt: editingInvoice.createdAt,
                        updatedAt: editingInvoice.updatedAt
                      })}
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

        {/* Modal del Cronograma Completo */}
      {showSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-5/6 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-gray-50 flex-shrink-0">
              <h2 className="text-xl font-semibold text-gray-800">📅 Cronograma Completo del Proyecto</h2>
              <button
                onClick={() => setShowSchedule(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
                              <ScheduleManagement 
                  projectData={projectData}
                  workPackages={getCurrentProjectWorkPackages()}
                  tasks={getCurrentProjectTasks()}
                  setTasks={updateCurrentProjectTasks}
                  onUpdateWorkPackages={updateCurrentProjectWorkPackages}
                  reportingDate={reportingDate}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración del Portfolio */}
      {showSettings && (
        <PortfolioSettings
          projects={projects}
          portfolioMetrics={portfolioMetrics}
          onClose={() => setShowSettings(false)}
          exportPortfolio={exportPortfolio}
          importPortfolio={importPortfolio}
          clearPortfolioData={clearPortfolioData}
        />
      )}
      </div>
    </div>
  );
}

// Componente principal con Router y Autenticación
export default function EVMCostManagement() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

// Componente de rutas
function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando StrategiaPM...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/" replace /> : <LoginForm />} 
      />
      <Route 
        path="/*" 
        element={user ? <MainApp /> : <Navigate to="/login" replace />} 
      />
    </Routes>
  );
}