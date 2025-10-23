/**
 * ConfigContext - Gestión del estado de configuración y UI
 *
 * Este contexto maneja:
 * - Modo de vista (dashboard, portfolio, project, schedule, etc.)
 * - Configuración de Supabase (useSupabase, supabaseInitialized)
 * - Estado de autenticación modal (showAuthModal)
 * - Estado de carga de datos (dataLoaded)
 */

import React, { createContext, useContext, useState } from 'react';

const ConfigContext = createContext(null);

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig debe usarse dentro de ConfigProvider');
  }
  return context;
};

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
