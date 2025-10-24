/**
 * @fileoverview ConfigContext - Gestión centralizada de configuración y estado UI
 *
 * Este contexto proporciona gestión completa de:
 * - Modos de vista de la aplicación (dashboard, portfolio, project, schedule, etc.)
 * - Configuración de Supabase (activación, inicialización, modal auth)
 * - Estado global de carga de datos
 *
 * Es un contexto liviano y de alto nivel que contiene configuración global
 * de UI y aplicación que necesita ser accesible desde cualquier componente.
 *
 * @module contexts/ConfigContext
 */

import React, { createContext, useContext, useState } from 'react';

const ConfigContext = createContext(null);

/**
 * Hook para acceder al contexto de configuración
 *
 * Proporciona acceso al estado global de configuración y UI.
 * Debe usarse dentro de un ConfigProvider.
 *
 * @returns {Object} Contexto de configuración
 * @returns {string} return.portfolioViewMode - Modo vista portfolio ('portfolio', 'project', 'schedule')
 * @returns {Function} return.setPortfolioViewMode - Setter para modo vista portfolio
 * @returns {string} return.viewMode - Modo vista principal (ej: 'dashboard', 'financial', etc.)
 * @returns {Function} return.setViewMode - Setter para modo vista principal
 * @returns {boolean} return.useSupabase - Si Supabase está activado
 * @returns {Function} return.setUseSupabase - Activa/desactiva Supabase
 * @returns {boolean} return.supabaseInitialized - Si Supabase se inicializó correctamente
 * @returns {Function} return.setSupabaseInitialized - Marca Supabase como inicializado
 * @returns {boolean} return.showAuthModal - Si debe mostrarse el modal de autenticación
 * @returns {Function} return.setShowAuthModal - Muestra/oculta modal de autenticación
 * @returns {boolean} return.dataLoaded - Si los datos iniciales han sido cargados
 * @returns {Function} return.setDataLoaded - Marca datos como cargados
 *
 * @throws {Error} Si se usa fuera de ConfigProvider
 *
 * @example
 * const {
 *   viewMode,
 *   setViewMode,
 *   useSupabase,
 *   dataLoaded
 * } = useConfig();
 *
 * // Cambiar vista
 * setViewMode('financial');
 *
 * // Verificar si Supabase está activo
 * if (useSupabase) {
 *   // Usar funcionalidad cloud
 * }
 *
 * // Mostrar loader hasta que datos estén cargados
 * if (!dataLoaded) return <Loader />;
 */
export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig debe usarse dentro de ConfigProvider');
  }
  return context;
};

/**
 * Provider de contexto para configuración y estado UI
 *
 * Envuelve la aplicación para proporcionar acceso global a configuración
 * de UI y estados de aplicación.
 *
 * Este es uno de los contextos de más alto nivel y debe envolver
 * otros contextos de dominio (Projects, Financial, Tasks).
 *
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Componentes hijos que tendrán acceso al contexto
 *
 * @example
 * <ConfigProvider>
 *   <ProjectsProvider>
 *     <FinancialProvider>
 *       <TasksProvider>
 *         <App />
 *       </TasksProvider>
 *     </FinancialProvider>
 *   </ProjectsProvider>
 * </ConfigProvider>
 */
export const ConfigProvider = ({ children }) => {
  // ===== ESTADO DE VISTAS =====
  const [portfolioViewMode, setPortfolioViewMode] = useState('portfolio'); // 'portfolio', 'project', 'schedule'
  const [viewMode, setViewMode] = useState('dashboard');

  // ===== CONFIGURACIÓN DE SUPABASE =====
  const [useSupabase, setUseSupabase] = useState(false);
  const [supabaseInitialized, setSupabaseInitialized] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // ===== ESTADO DE CARGA =====
  const [dataLoaded, setDataLoaded] = useState(false);

  // ===== VALOR DEL CONTEXTO =====
  const value = {
    // Estado de vistas
    portfolioViewMode,
    setPortfolioViewMode,
    viewMode,
    setViewMode,

    // Configuración de Supabase
    useSupabase,
    setUseSupabase,
    supabaseInitialized,
    setSupabaseInitialized,
    showAuthModal,
    setShowAuthModal,

    // Estado de carga
    dataLoaded,
    setDataLoaded,
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

export default ConfigContext;
