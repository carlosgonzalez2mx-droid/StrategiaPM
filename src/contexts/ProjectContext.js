/**
 * Contexto de Proyecto
 * Maneja el estado global de la aplicación de gestión de proyectos
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Estado inicial
const initialState = {
  projects: [],
  currentProjectId: null,
  workPackages: [],
  purchaseOrders: [],
  advances: [],
  invoices: [],
  risks: [],
  viewMode: 'dashboard',
  reportingDate: new Date().toISOString().split('T')[0],
  isLoading: false,
  error: null
};

// Tipos de acciones
const ACTIONS = {
  SET_PROJECTS: 'SET_PROJECTS',
  SET_CURRENT_PROJECT: 'SET_CURRENT_PROJECT',
  SET_WORK_PACKAGES: 'SET_WORK_PACKAGES',
  SET_PURCHASE_ORDERS: 'SET_PURCHASE_ORDERS',
  SET_ADVANCES: 'SET_ADVANCES',
  SET_INVOICES: 'SET_INVOICES',
  SET_RISKS: 'SET_RISKS',
  SET_VIEW_MODE: 'SET_VIEW_MODE',
  SET_REPORTING_DATE: 'SET_REPORTING_DATE',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  ADD_PROJECT: 'ADD_PROJECT',
  UPDATE_PROJECT: 'UPDATE_PROJECT',
  DELETE_PROJECT: 'DELETE_PROJECT',
  ADD_WORK_PACKAGE: 'ADD_WORK_PACKAGE',
  UPDATE_WORK_PACKAGE: 'UPDATE_WORK_PACKAGE',
  DELETE_WORK_PACKAGE: 'DELETE_WORK_PACKAGE',
  ADD_PURCHASE_ORDER: 'ADD_PURCHASE_ORDER',
  UPDATE_PURCHASE_ORDER: 'UPDATE_PURCHASE_ORDER',
  DELETE_PURCHASE_ORDER: 'DELETE_PURCHASE_ORDER',
  ADD_ADVANCE: 'ADD_ADVANCE',
  UPDATE_ADVANCE: 'UPDATE_ADVANCE',
  DELETE_ADVANCE: 'DELETE_ADVANCE',
  ADD_INVOICE: 'ADD_INVOICE',
  UPDATE_INVOICE: 'UPDATE_INVOICE',
  DELETE_INVOICE: 'DELETE_INVOICE',
  ADD_RISK: 'ADD_RISK',
  UPDATE_RISK: 'UPDATE_RISK',
  DELETE_RISK: 'DELETE_RISK'
};

// Reducer
function projectReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_PROJECTS:
      return Object.assign({}, state, { projects: action.payload });
    
    case ACTIONS.SET_CURRENT_PROJECT:
      return Object.assign({}, state, { currentProjectId: action.payload });
    
    case ACTIONS.SET_WORK_PACKAGES:
      return Object.assign({}, state, { workPackages: action.payload });
    
    case ACTIONS.SET_PURCHASE_ORDERS:
      return Object.assign({}, state, { purchaseOrders: action.payload });
    
    case ACTIONS.SET_ADVANCES:
      return Object.assign({}, state, { advances: action.payload });
    
    case ACTIONS.SET_INVOICES:
      return Object.assign({}, state, { invoices: action.payload });
    
    case ACTIONS.SET_RISKS:
      return Object.assign({}, state, { risks: action.payload });
    
    case ACTIONS.SET_VIEW_MODE:
      return Object.assign({}, state, { viewMode: action.payload });
    
    case ACTIONS.SET_REPORTING_DATE:
      return Object.assign({}, state, { reportingDate: action.payload });
    
    case ACTIONS.SET_LOADING:
      return Object.assign({}, state, { isLoading: action.payload });
    
    case ACTIONS.SET_ERROR:
      return Object.assign({}, state, { error: action.payload });
    
    case ACTIONS.ADD_PROJECT:
      return Object.assign({}, state, { 
        projects: state.projects.slice().concat([action.payload]) 
      });
    
    case ACTIONS.UPDATE_PROJECT:
      return Object.assign({}, state, {
        projects: state.projects.map(project =>
          project.id === action.payload.id ? action.payload : project
        )
      });
    
    case ACTIONS.DELETE_PROJECT:
      return Object.assign({}, state, {
        projects: state.projects.filter(project => project.id !== action.payload)
      });
    
    case ACTIONS.ADD_WORK_PACKAGE:
      return Object.assign({}, state, {
        workPackages: state.workPackages.slice().concat([action.payload])
      });
    
    case ACTIONS.UPDATE_WORK_PACKAGE:
      return Object.assign({}, state, {
        workPackages: state.workPackages.map(wp =>
          wp.id === action.payload.id ? action.payload : wp
        )
      });
    
    case ACTIONS.DELETE_WORK_PACKAGE:
      return Object.assign({}, state, {
        workPackages: state.workPackages.filter(wp => wp.id !== action.payload)
      });
    
    case ACTIONS.ADD_PURCHASE_ORDER:
      return Object.assign({}, state, {
        purchaseOrders: state.purchaseOrders.slice().concat([action.payload])
      });
    
    case ACTIONS.UPDATE_PURCHASE_ORDER:
      return Object.assign({}, state, {
        purchaseOrders: state.purchaseOrders.map(po =>
          po.id === action.payload.id ? action.payload : po
        )
      });
    
    case ACTIONS.DELETE_PURCHASE_ORDER:
      return Object.assign({}, state, {
        purchaseOrders: state.purchaseOrders.filter(po => po.id !== action.payload)
      });
    
    case ACTIONS.ADD_ADVANCE:
      return Object.assign({}, state, {
        advances: state.advances.slice().concat([action.payload])
      });
    
    case ACTIONS.UPDATE_ADVANCE:
      return Object.assign({}, state, {
        advances: state.advances.map(adv =>
          adv.id === action.payload.id ? action.payload : adv
        )
      });
    
    case ACTIONS.DELETE_ADVANCE:
      return Object.assign({}, state, {
        advances: state.advances.filter(adv => adv.id !== action.payload)
      });
    
    case ACTIONS.ADD_INVOICE:
      return Object.assign({}, state, {
        invoices: state.invoices.slice().concat([action.payload])
      });
    
    case ACTIONS.UPDATE_INVOICE:
      return Object.assign({}, state, {
        invoices: state.invoices.map(inv =>
          inv.id === action.payload.id ? action.payload : inv
        )
      });
    
    case ACTIONS.DELETE_INVOICE:
      return Object.assign({}, state, {
        invoices: state.invoices.filter(inv => inv.id !== action.payload)
      });
    
    case ACTIONS.ADD_RISK:
      return Object.assign({}, state, {
        risks: state.risks.slice().concat([action.payload])
      });
    
    case ACTIONS.UPDATE_RISK:
      return Object.assign({}, state, {
        risks: state.risks.map(risk =>
          risk.id === action.payload.id ? action.payload : risk
        )
      });
    
    case ACTIONS.DELETE_RISK:
      return Object.assign({}, state, {
        risks: state.risks.filter(risk => risk.id !== action.payload)
      });
    
    default:
      return state;
  }
}

// Crear contexto
const ProjectContext = createContext();

// Hook personalizado para usar el contexto
export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext debe ser usado dentro de un ProjectProvider');
  }
  return context;
}

// Provider del contexto
export function ProjectProvider({ children }) {
  const [state, dispatch] = useReducer(projectReducer, initialState);

  // Carga de datos eliminada para evitar condición de carrera con App.js
  // Los datos se cargan únicamente desde App.js para evitar conflictos
  // y pérdida de datos por sobrescritura concurrente
  // 
  // NOTA: ProjectContext ahora solo maneja el estado local del contexto,
  // la carga inicial de datos se hace desde App.js usando FilePersistenceService

  // Guardado duplicado eliminado para evitar sobrescritura con App.js
  // El guardado se maneja únicamente desde App.js con throttling
  // y FilePersistenceService para evitar pérdida de datos

  // Funciones de ayuda
  const getCurrentProject = () => {
    return state.projects.find(p => p.id === state.currentProjectId) || state.projects[0];
  };

  const getWorkPackagesByProject = (projectId) => {
    return state.workPackages.filter(wp => wp.projectId === projectId);
  };

  const getPurchaseOrdersByWorkPackage = (workPackageId) => {
    return state.purchaseOrders.filter(po => po.workPackageId === workPackageId);
  };

  const getInvoicesByPurchaseOrder = (purchaseOrderId) => {
    return state.invoices.filter(inv => inv.purchaseOrderId === purchaseOrderId);
  };

  const getAdvancesByPurchaseOrder = (purchaseOrderId) => {
    return state.advances.filter(adv => adv.purchaseOrderId === purchaseOrderId);
  };

  const getRisksByProject = (projectId) => {
    return state.risks.filter(risk => risk.projectId === projectId);
  };

  // Valor del contexto
  const value = {
    ...state,
    dispatch,
    getCurrentProject,
    getWorkPackagesByProject,
    getPurchaseOrdersByWorkPackage,
    getInvoicesByPurchaseOrder,
    getAdvancesByPurchaseOrder,
    getRisksByProject,
    ACTIONS
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export default ProjectContext;
