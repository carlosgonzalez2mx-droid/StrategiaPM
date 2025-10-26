/**
 * @fileoverview ProjectsContext - Gestión centralizada del estado de proyectos
 *
 * Este contexto proporciona gestión completa de proyectos incluyendo:
 * - Lista global de proyectos
 * - Proyecto actual seleccionado con persistencia en localStorage
 * - Operaciones CRUD sobre proyectos
 * - Funciones de filtrado y búsqueda
 * - Lógica de selección automática con respaldos inteligentes
 *
 * @module contexts/ProjectsContext
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ProjectsContext = createContext(null);

/**
 * Hook para acceder al contexto de proyectos
 *
 * Proporciona acceso al estado global de proyectos y funciones de gestión.
 * Debe usarse dentro de un ProjectsProvider.
 *
 * @returns {Object} Contexto de proyectos
 * @returns {Array<Object>} return.projects - Lista de todos los proyectos
 * @returns {string|null} return.currentProjectId - ID del proyecto actual seleccionado
 * @returns {Function} return.setProjects - Setter para lista de proyectos
 * @returns {Function} return.setCurrentProjectId - Setter para proyecto actual
 * @returns {Function} return.getCurrentProject - Obtiene el proyecto actual completo
 * @returns {Function} return.getActiveProjects - Filtra proyectos con status='active'
 * @returns {Function} return.getProjectsByStatus - Filtra proyectos por status
 * @returns {Function} return.updateProject - Actualiza un proyecto específico
 * @returns {Function} return.addProject - Agrega un nuevo proyecto
 * @returns {Function} return.removeProject - Elimina un proyecto
 *
 * @throws {Error} Si se usa fuera de ProjectsProvider
 *
 * @example
 * const {
 *   projects,
 *   currentProjectId,
 *   getCurrentProject,
 *   updateProject
 * } = useProjects();
 *
 * // Obtener proyecto actual
 * const project = getCurrentProject();
 *
 * // Actualizar proyecto
 * updateProject(projectId, { name: 'Nuevo nombre' });
 */
export const useProjects = () => {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error('useProjects debe usarse dentro de ProjectsProvider');
  }
  return context;
};

/**
 * Provider de contexto para gestión de proyectos
 *
 * Envuelve la aplicación o parte de ella para proporcionar acceso global
 * al estado de proyectos y funciones de gestión.
 *
 * Características:
 * - Persistencia automática del proyecto seleccionado en localStorage
 * - Selección inteligente de proyecto inicial (último usado → primer activo → primero disponible)
 * - Corrección automática si el proyecto seleccionado no existe
 * - Funciones helper memoizadas para optimización
 *
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Componentes hijos que tendrán acceso al contexto
 *
 * @example
 * <ProjectsProvider>
 *   <App />
 * </ProjectsProvider>
 */
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
   * Obtiene el objeto completo del proyecto actualmente seleccionado
   *
   * @returns {Object|null} Objeto de proyecto o null si no hay proyecto seleccionado
   *
   * @example
   * const project = getCurrentProject();
   * if (project) {
   *   console.log(project.name, project.status);
   * }
   */
  const getCurrentProject = useCallback(() => {
    if (!currentProjectId) return null;
    return projects.find(p => p.id === currentProjectId) || null;
  }, [projects, currentProjectId]);

  /**
   * Obtiene todos los proyectos con status 'active'
   *
   * @returns {Array<Object>} Array de proyectos activos
   *
   * @example
   * const activeProjects = getActiveProjects();
   * console.log(`${activeProjects.length} proyectos activos`);
   */
  const getActiveProjects = useCallback(() => {
    return projects.filter(p => p.status === 'active');
  }, [projects]);

  /**
   * Filtra proyectos por status específico
   *
   * @param {string} status - Status a filtrar ('active', 'archived', 'completed', etc.)
   * @returns {Array<Object>} Array de proyectos con el status especificado
   *
   * @example
   * const archivedProjects = getProjectsByStatus('archived');
   * const completedProjects = getProjectsByStatus('completed');
   */
  const getProjectsByStatus = useCallback((status) => {
    return projects.filter(p => p.status === status);
  }, [projects]);

  /**
   * Actualiza propiedades de un proyecto específico
   *
   * Hace merge de las propiedades existentes con las nuevas.
   * No modifica propiedades no especificadas en updates.
   *
   * @param {string} projectId - ID del proyecto a actualizar
   * @param {Object} updates - Objeto con propiedades a actualizar
   *
   * @example
   * // Actualizar nombre y presupuesto
   * updateProject('project-123', {
   *   name: 'Nuevo nombre',
   *   budget: 150000
   * });
   */
  const updateProject = useCallback((projectId, updates) => {
    setProjects(prev =>
      prev.map(p => p.id === projectId ? { ...p, ...updates } : p)
    );
  }, []);

  /**
   * Agrega un nuevo proyecto a la lista
   *
   * @param {Object} newProject - Objeto de proyecto completo con todas las propiedades
   *
   * @example
   * addProject({
   *   id: 'project-456',
   *   name: 'Proyecto Nuevo',
   *   status: 'active',
   *   budget: 100000,
   *   startDate: new Date()
   * });
   */
  const addProject = useCallback((newProject) => {
    setProjects(prev => [...prev, newProject]);
  }, []);

  /**
   * Elimina un proyecto de la lista
   *
   * Si el proyecto eliminado era el actual, selecciona automáticamente
   * el primer proyecto restante o null si no quedan proyectos.
   *
   * @param {string} projectId - ID del proyecto a eliminar
   *
   * @example
   * removeProject('project-123');
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
