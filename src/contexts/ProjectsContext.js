/**
 * ProjectsContext - Gestión del estado de proyectos
 *
 * Este contexto maneja:
 * - Lista de proyectos
 * - Proyecto actual seleccionado
 * - Funciones helpers para trabajar con proyectos
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ProjectsContext = createContext(null);

export const useProjects = () => {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error('useProjects debe usarse dentro de ProjectsProvider');
  }
  return context;
};

export const ProjectsProvider = ({ children }) => {
  // ===== ESTADO =====
  const [projects, setProjects] = useState([]);

  /**
   * Función para obtener el proyecto inicial con lógica de respaldo
   *
   * Prioridad:
   * 1. Último proyecto seleccionado (localStorage)
   * 2. Primer proyecto activo
   * 3. Primer proyecto disponible
   * 4. null si no hay proyectos
   */
  const getInitialProjectId = useCallback(() => {
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

    // 4. NO HAY PROYECTOS - retornar null
    return null;
  }, [projects]);

  const [currentProjectId, setCurrentProjectId] = useState(null);

  // ===== EFECTOS =====

  /**
   * Inicializar currentProjectId cuando se cargan los proyectos
   */
  useEffect(() => {
    if (projects.length > 0 && !currentProjectId) {
      const initialId = getInitialProjectId();
      if (initialId) {
        setCurrentProjectId(initialId);
      }
    }
  }, [projects, currentProjectId, getInitialProjectId]);

  /**
   * Corregir currentProjectId si no coincide con ningún proyecto existente
   */
  useEffect(() => {
    if (projects && projects.length > 0 && currentProjectId) {
      const projectExists = projects.find(p => p.id === currentProjectId);
      if (!projectExists) {
        // Buscar el primer proyecto activo disponible
        const activeProject = projects.find(p => p.status === 'active');
        const fallbackProjectId = activeProject ? activeProject.id : projects[0].id;

        console.log('🔧 CORRIGIENDO currentProjectId:', {
          currentProjectId,
          availableProjects: projects.map(p => ({ id: p.id, name: p.name, status: p.status })),
          fallbackTo: fallbackProjectId,
          reason: 'Proyecto no encontrado, usando primer proyecto disponible'
        });
        setCurrentProjectId(fallbackProjectId);
      }
    }
  }, [projects, currentProjectId]);

  /**
   * Guardar último proyecto seleccionado en localStorage
   */
  useEffect(() => {
    if (currentProjectId) {
      localStorage.setItem('lastSelectedProjectId', currentProjectId);
    }
  }, [currentProjectId]);

  // ===== FUNCIONES HELPERS =====

  /**
   * Obtener proyecto actual
   */
  const getCurrentProject = useCallback(() => {
    if (!currentProjectId) return null;
    return projects.find(p => p.id === currentProjectId) || null;
  }, [projects, currentProjectId]);

  /**
   * Obtener proyectos activos
   */
  const getActiveProjects = useCallback(() => {
    return projects.filter(p => p.status === 'active');
  }, [projects]);

  /**
   * Obtener proyectos por estado
   */
  const getProjectsByStatus = useCallback((status) => {
    return projects.filter(p => p.status === status);
  }, [projects]);

  /**
   * Actualizar un proyecto
   */
  const updateProject = useCallback((projectId, updates) => {
    setProjects(prev =>
      prev.map(p => p.id === projectId ? { ...p, ...updates } : p)
    );
  }, []);

  /**
   * Agregar un proyecto
   */
  const addProject = useCallback((newProject) => {
    setProjects(prev => [...prev, newProject]);
  }, []);

  /**
   * Eliminar un proyecto
   */
  const removeProject = useCallback((projectId) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));

    // Si era el proyecto actual, cambiar al siguiente disponible
    if (projectId === currentProjectId) {
      const remainingProjects = projects.filter(p => p.id !== projectId);
      if (remainingProjects.length > 0) {
        setCurrentProjectId(remainingProjects[0].id);
      } else {
        setCurrentProjectId(null);
      }
    }
  }, [currentProjectId, projects]);

  // ===== VALOR DEL CONTEXTO =====
  const value = {
    // Estado
    projects,
    currentProjectId,

    // Setters
    setProjects,
    setCurrentProjectId,

    // Helpers
    getCurrentProject,
    getActiveProjects,
    getProjectsByStatus,
    updateProject,
    addProject,
    removeProject,
  };

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
};

export default ProjectsContext;
