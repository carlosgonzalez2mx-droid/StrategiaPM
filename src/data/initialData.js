/**
 * Datos Iniciales del Sistema - VERSIÓN LIMPIA
 * Sistema listo para datos reales del usuario
 */

export const initialProjects = [
  // Proyectos reales del usuario
  {
    id: 'demo-001',
    name: 'Linea de produccion de salsas',
    description: 'Compra, instalación y puesta en marcha de una llenadora y taponadora de frascos para salsas.',
    status: 'active',
    startDate: '2025-09-01',
    endDate: '2026-07-10',
    budget: 470000,
    manager: 'Carlos Gonzalez',
    sponsor: 'Sergio Mejia',
    priority: 'high',
    category: 'production',
    progress: 0,
    health: 'green',
    createdAt: '2025-09-06T00:30:46.914Z',
    updatedAt: '2025-09-06T01:01:46.736Z',
    contingencyReserve: 10000,
    managementReserve: 5000,
    objective: '1.- Reducción de MOD por automatización de llenado y taponado\n2.- Incrementar velocidad de llenado de salsas al 109%',
    businessCase: 'Ahorro anual $245k USD\nMejora en costo: -8%',
    kickoffDate: '',
    stakeholders: [],
    irr: 35.1
  },
  {
    id: 'proj-002',
    name: 'Sopladora de botella de vinagre',
    description: 'Compra, instalación y puesta en marcha de una linea de producción completa para envasado de vinagre, incluye soplado, etiquetado, embotellado, tapado, codificado y adición de nitrogeno',
    status: 'active',
    startDate: '2025-09-01',
    endDate: '2026-08-21',
    budget: 661000,
    manager: 'Carlos Gonzalez',
    sponsor: 'Sergio Mejia',
    priority: 'high',
    category: 'production',
    progress: 0,
    health: 'green',
    createdAt: '2025-09-06T00:58:15.594Z',
    updatedAt: '2025-09-06T00:58:15.594Z',
    contingencyReserve: 10000,
    managementReserve: 5000,
    objective: '1.- Proceso de formado (soplado) de botella en SM\n2.- Automatizar proceso de llenado y cerrado',
    businessCase: 'Ahorro anual de $427k USD\nMejora en costo: -16.9%',
    irr: 35,
    roi: 0,
    kickoffDate: '',
    stakeholders: []
  }
];

export const initialRisks = [
  // Sin riesgos iniciales - el usuario los agregará
];

export const initialWorkPackages = [
  // Sin paquetes de trabajo iniciales - el usuario los creará
];

export const initialPurchaseOrders = [
  // Sin órdenes de compra iniciales - el usuario las creará
];

export const initialAdvances = [
  // Sin anticipos iniciales - el usuario los creará
];

export const initialInvoices = [
  // Sin facturas iniciales - el usuario las creará
];

export const initialContracts = [
  // Sin contratos iniciales - el usuario los creará
];

export const initialGlobalResources = [
  // Sin recursos globales iniciales - el usuario los creará
];

export const initialTasks = [
  // Sin tareas iniciales - el usuario las creará
];

export const initialAuditLogs = [
  // Sin logs de auditoría iniciales - se generarán automáticamente
];

// Configuración inicial del sistema
export const initialSystemConfig = {
  currentProjectId: 'demo-001', // Proyecto de demostración por defecto
  reportingDate: new Date().toISOString().split('T')[0],
  viewMode: 'overview',
  activeSection: 'portfolio'
};