/**
 * @fileoverview FinancialContext - Gestión centralizada del estado financiero
 *
 * Este contexto proporciona gestión completa de datos financieros por proyecto:
 * - Órdenes de compra (Purchase Orders)
 * - Anticipos (Advances)
 * - Facturas (Invoices)
 * - Contratos (Contracts)
 * - Recursos globales compartidos entre proyectos
 * - Asignaciones de recursos por proyecto
 *
 * Características:
 * - Datos organizados por projectId para acceso eficiente
 * - Funciones helper para proyecto actual
 * - Operaciones CRUD para cada tipo de dato financiero
 * - Integración automática con ProjectsContext
 *
 * @module contexts/FinancialContext
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useProjects } from './ProjectsContext';

const FinancialContext = createContext(null);

/**
 * Hook para acceder al contexto financiero
 *
 * Proporciona acceso al estado global de datos financieros y funciones de gestión.
 * Debe usarse dentro de un FinancialProvider.
 *
 * @returns {Object} Contexto financiero
 * @returns {Object} return.purchaseOrdersByProject - Órdenes de compra indexadas por projectId
 * @returns {Object} return.advancesByProject - Anticipos indexados por projectId
 * @returns {Object} return.invoicesByProject - Facturas indexadas por projectId
 * @returns {Object} return.contractsByProject - Contratos indexados por projectId
 * @returns {Array} return.globalResources - Recursos globales compartidos
 * @returns {Object} return.resourceAssignmentsByProject - Asignaciones indexadas por projectId
 * @returns {Function} return.getCurrentProjectPurchaseOrders - Obtiene órdenes del proyecto actual
 * @returns {Function} return.getCurrentProjectAdvances - Obtiene anticipos del proyecto actual
 * @returns {Function} return.getCurrentProjectInvoices - Obtiene facturas del proyecto actual
 * @returns {Function} return.getCurrentProjectContracts - Obtiene contratos del proyecto actual
 * @returns {Function} return.getCurrentProjectResourceAssignments - Obtiene asignaciones del proyecto actual
 * @returns {Function} return.updateCurrentProjectPurchaseOrders - Actualiza órdenes del proyecto actual
 * @returns {Function} return.updateCurrentProjectAdvances - Actualiza anticipos del proyecto actual
 * @returns {Function} return.updateCurrentProjectInvoices - Actualiza facturas del proyecto actual
 * @returns {Function} return.updateCurrentProjectContracts - Actualiza contratos del proyecto actual
 * @returns {Function} return.updateCurrentProjectResourceAssignments - Actualiza asignaciones del proyecto actual
 * @returns {Function} return.addPurchaseOrder - Agrega orden de compra al proyecto actual
 * @returns {Function} return.addAdvance - Agrega anticipo al proyecto actual
 * @returns {Function} return.addInvoice - Agrega factura al proyecto actual
 * @returns {Function} return.addContract - Agrega contrato al proyecto actual
 * @returns {Function} return.addResourceAssignment - Agrega asignación de recurso al proyecto actual
 *
 * @throws {Error} Si se usa fuera de FinancialProvider
 *
 * @example
 * const {
 *   getCurrentProjectInvoices,
 *   addInvoice,
 *   globalResources
 * } = useFinancial();
 *
 * // Obtener facturas del proyecto actual
 * const invoices = getCurrentProjectInvoices();
 *
 * // Agregar nueva factura
 * addInvoice({
 *   id: 'inv-123',
 *   amount: 50000,
 *   date: new Date(),
 *   status: 'pending'
 * });
 */
export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial debe usarse dentro de FinancialProvider');
  }
  return context;
};

/**
 * Provider de contexto para gestión financiera
 *
 * Envuelve la aplicación o parte de ella para proporcionar acceso global
 * al estado financiero y funciones de gestión.
 *
 * Debe estar envuelto por ProjectsProvider para funcionar correctamente.
 *
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Componentes hijos que tendrán acceso al contexto
 *
 * @example
 * <ProjectsProvider>
 *   <FinancialProvider>
 *     <App />
 *   </FinancialProvider>
 * </ProjectsProvider>
 */
export const FinancialProvider = ({ children }) => {
  // ===== ESTADO =====
  const [purchaseOrdersByProject, setPurchaseOrdersByProject] = useState({});
  const [advancesByProject, setAdvancesByProject] = useState({});
  const [invoicesByProject, setInvoicesByProject] = useState({});
  const [contractsByProject, setContractsByProject] = useState({});
  const [globalResources, setGlobalResources] = useState([]);
  const [resourceAssignmentsByProject, setResourceAssignmentsByProject] = useState({});

  // Obtener currentProjectId del contexto de proyectos
  const { currentProjectId } = useProjects();

  // ===== FUNCIONES HELPERS PARA PROYECTO ACTUAL =====

  /**
   * Obtener órdenes de compra del proyecto actual
   */
  const getCurrentProjectPurchaseOrders = useCallback(() => {
    return purchaseOrdersByProject[currentProjectId] || [];
  }, [purchaseOrdersByProject, currentProjectId]);

  /**
   * Obtener anticipos del proyecto actual
   */
  const getCurrentProjectAdvances = useCallback(() => {
    return advancesByProject[currentProjectId] || [];
  }, [advancesByProject, currentProjectId]);

  /**
   * Obtener facturas del proyecto actual
   */
  const getCurrentProjectInvoices = useCallback(() => {
    return invoicesByProject[currentProjectId] || [];
  }, [invoicesByProject, currentProjectId]);

  /**
   * Obtener contratos del proyecto actual
   */
  const getCurrentProjectContracts = useCallback(() => {
    return contractsByProject[currentProjectId] || [];
  }, [contractsByProject, currentProjectId]);

  /**
   * Obtener asignaciones de recursos del proyecto actual
   */
  const getCurrentProjectResourceAssignments = useCallback(() => {
    return resourceAssignmentsByProject[currentProjectId] || [];
  }, [resourceAssignmentsByProject, currentProjectId]);

  // ===== FUNCIONES DE ACTUALIZACIÓN PARA PROYECTO ACTUAL =====

  /**
   * Actualizar órdenes de compra del proyecto actual
   */
  const updateCurrentProjectPurchaseOrders = useCallback((newOrders) => {
    if (!currentProjectId) return;

    setPurchaseOrdersByProject(prev => ({
      ...prev,
      [currentProjectId]: newOrders
    }));
  }, [currentProjectId]);

  /**
   * Actualizar anticipos del proyecto actual
   */
  const updateCurrentProjectAdvances = useCallback((newAdvances) => {
    if (!currentProjectId) return;

    setAdvancesByProject(prev => ({
      ...prev,
      [currentProjectId]: newAdvances
    }));
  }, [currentProjectId]);

  /**
   * Actualizar facturas del proyecto actual
   */
  const updateCurrentProjectInvoices = useCallback((newInvoices) => {
    if (!currentProjectId) return;

    setInvoicesByProject(prev => ({
      ...prev,
      [currentProjectId]: newInvoices
    }));
  }, [currentProjectId]);

  /**
   * Actualizar contratos del proyecto actual
   */
  const updateCurrentProjectContracts = useCallback((newContracts) => {
    if (!currentProjectId) return;

    setContractsByProject(prev => ({
      ...prev,
      [currentProjectId]: newContracts
    }));
  }, [currentProjectId]);

  /**
   * Actualizar asignaciones de recursos del proyecto actual
   */
  const updateCurrentProjectResourceAssignments = useCallback((newAssignments) => {
    if (!currentProjectId) return;

    setResourceAssignmentsByProject(prev => ({
      ...prev,
      [currentProjectId]: newAssignments
    }));
  }, [currentProjectId]);

  // ===== FUNCIONES DE AGREGACIÓN =====

  /**
   * Agregar una orden de compra al proyecto actual
   */
  const addPurchaseOrder = useCallback((order) => {
    updateCurrentProjectPurchaseOrders([
      ...getCurrentProjectPurchaseOrders(),
      order
    ]);
  }, [getCurrentProjectPurchaseOrders, updateCurrentProjectPurchaseOrders]);

  /**
   * Agregar un anticipo al proyecto actual
   */
  const addAdvance = useCallback((advance) => {
    updateCurrentProjectAdvances([
      ...getCurrentProjectAdvances(),
      advance
    ]);
  }, [getCurrentProjectAdvances, updateCurrentProjectAdvances]);

  /**
   * Agregar una factura al proyecto actual
   */
  const addInvoice = useCallback((invoice) => {
    updateCurrentProjectInvoices([
      ...getCurrentProjectInvoices(),
      invoice
    ]);
  }, [getCurrentProjectInvoices, updateCurrentProjectInvoices]);

  /**
   * Agregar un contrato al proyecto actual
   */
  const addContract = useCallback((contract) => {
    updateCurrentProjectContracts([
      ...getCurrentProjectContracts(),
      contract
    ]);
  }, [getCurrentProjectContracts, updateCurrentProjectContracts]);

  /**
   * Agregar un recurso global
   */
  const addGlobalResource = useCallback((resource) => {
    setGlobalResources(prev => [...prev, resource]);
  }, []);

  /**
   * Agregar una asignación de recurso al proyecto actual
   */
  const addResourceAssignment = useCallback((assignment) => {
    updateCurrentProjectResourceAssignments([
      ...getCurrentProjectResourceAssignments(),
      assignment
    ]);
  }, [getCurrentProjectResourceAssignments, updateCurrentProjectResourceAssignments]);

  // ===== VALOR DEL CONTEXTO =====
  const value = {
    // Estado completo (por proyecto)
    purchaseOrdersByProject,
    setPurchaseOrdersByProject,
    advancesByProject,
    setAdvancesByProject,
    invoicesByProject,
    setInvoicesByProject,
    contractsByProject,
    setContractsByProject,
    globalResources,
    setGlobalResources,
    resourceAssignmentsByProject,
    setResourceAssignmentsByProject,

    // Helpers para proyecto actual (getters)
    getCurrentProjectPurchaseOrders,
    getCurrentProjectAdvances,
    getCurrentProjectInvoices,
    getCurrentProjectContracts,
    getCurrentProjectResourceAssignments,

    // Helpers para proyecto actual (setters)
    updateCurrentProjectPurchaseOrders,
    updateCurrentProjectAdvances,
    updateCurrentProjectInvoices,
    updateCurrentProjectContracts,
    updateCurrentProjectResourceAssignments,

    // Funciones de agregación
    addPurchaseOrder,
    addAdvance,
    addInvoice,
    addContract,
    addGlobalResource,
    addResourceAssignment,
  };

  return (
    <FinancialContext.Provider value={value}>
      {children}
    </FinancialContext.Provider>
  );
};

export default FinancialContext;
