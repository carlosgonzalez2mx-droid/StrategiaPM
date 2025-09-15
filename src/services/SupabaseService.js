import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const SUPABASE_URL = 'https://ogqpsrsssrrytrqoyyph.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncXBzcnNzc3JyeXRycW95eXBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Nzc5NjAsImV4cCI6MjA3MzM1Mzk2MH0.EqXjG1iefYMZ84Tw-4po98gBV7uRuPoz0idQgJ03pzg';

class SupabaseService {
  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.currentUser = null;
    this.organizationId = null;
    this.isSaving = false; // Flag para prevenir guardados simultáneos
  }

  // Inicializar el servicio
  async initialize() {
    try {
      console.log('🚀 Inicializando SupabaseService...');
      
      // Verificar si hay un usuario autenticado
      const { data: { user } } = await this.supabase.auth.getUser();
      this.currentUser = user;
      
      if (user) {
        console.log('✅ Usuario autenticado:', user.email);
        await this.loadOrganization();
      } else {
        console.log('⚠️ No hay usuario autenticado');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error inicializando SupabaseService:', error);
      return false;
    }
  }

  // Cargar organización del usuario
  async loadOrganization() {
    if (!this.currentUser) return null;
    
    try {
      const { data: organization, error } = await this.supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', this.currentUser.id)
        .single();
      
      if (error) {
        console.error('❌ Error cargando organización:', error);
        return null;
      }
      
      this.organizationId = organization.id;
      console.log('✅ Organización cargada:', this.organizationId);
      return organization.id;
    } catch (error) {
      console.error('❌ Error cargando organización:', error);
      return null;
    }
  }

  // Autenticación
  async signUp(email, password, name) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            role: 'user'
          }
        }
      });

      if (error) throw error;

      // Crear usuario en la tabla users
      if (data.user) {
        const { error: userError } = await this.supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            name: name,
            role: 'user'
          });

        if (userError) {
          console.warn('⚠️ Error creando usuario en tabla users:', userError);
        }

        // Crear organización para el usuario
        const { data: orgData, error: orgError } = await this.supabase
          .from('organizations')
          .insert({
            name: `${name}'s Organization`,
            owner_id: data.user.id
          })
          .select('id')
          .single();

        if (orgError) {
          console.warn('⚠️ Error creando organización:', orgError);
        } else {
          this.organizationId = orgData.id;
        }
      }

      this.currentUser = data.user;
      return { success: true, user: data.user };
    } catch (error) {
      console.error('❌ Error en signUp:', error);
      return { success: false, error: error.message };
    }
  }

  async signIn(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      this.currentUser = data.user;
      await this.loadOrganization();
      
      return { success: true, user: data.user };
    } catch (error) {
      console.error('❌ Error en signIn:', error);
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;

      this.currentUser = null;
      this.organizationId = null;
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error en signOut:', error);
      return { success: false, error: error.message };
    }
  }

  // Cargar datos del portafolio
  async loadPortfolioData() {
    if (!this.currentUser) {
      console.warn('⚠️ No hay usuario autenticado');
      return null;
    }

    try {
      console.log('📊 Cargando datos del portafolio desde Supabase...');

      // Verificar si existe organización, si no, crearla
      if (!this.organizationId) {
        console.log('🏢 Buscando o creando organización...');
        const { data: existingOrg, error: orgError } = await this.supabase
          .from('organizations')
          .select('id')
          .eq('owner_id', this.currentUser.id)
          .single();

        if (orgError && orgError.code !== 'PGRST116') {
          console.error('❌ Error buscando organización:', orgError);
          return null;
        }

        if (existingOrg) {
          this.organizationId = existingOrg.id;
          console.log('✅ Organización encontrada:', this.organizationId);
        } else {
          console.log('🏢 Creando organización para el usuario...');
          const { data: newOrg, error: createOrgError } = await this.supabase
            .from('organizations')
            .insert({
              name: `${this.currentUser.email.split('@')[0]}'s Organization`,
              owner_id: this.currentUser.id
            })
            .select('id')
            .single();

          if (createOrgError) {
            console.error('❌ Error creando organización:', createOrgError);
            return null;
          }

          this.organizationId = newOrg.id;
          console.log('✅ Organización creada:', this.organizationId);
        }
      }

      // Cargar proyectos (TODOS los proyectos, no solo los de la organización)
      const { data: projects, error: projectsError } = await this.supabase
        .from('projects')
        .select('*');

      if (projectsError) {
        console.error('❌ Error cargando proyectos:', projectsError);
        return null;
      }

      console.log(`✅ Proyectos encontrados: ${projects?.length || 0}`);

      // Si no hay proyectos, crear uno de demostración
      if (!projects || projects.length === 0) {
        console.log('📝 Creando proyecto de demostración...');
        
        // Generar UUID válido
        const generateUUID = () => {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };

        const demoProject = {
          id: generateUUID(),
          name: 'Proyecto de Demostración',
          description: 'Proyecto de ejemplo para familiarizarse con el sistema',
          status: 'active',
          priority: 'medium',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          budget: 100000,
          manager: this.currentUser.email,
          sponsor: 'Sistema',
          organization_id: this.organizationId,
          owner_id: this.currentUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: newProject, error: createProjectError } = await this.supabase
          .from('projects')
          .insert(demoProject)
          .select('*')
          .single();
        
        if (createProjectError) {
          console.error('❌ Error creando proyecto de demostración:', createProjectError);
          return null;
        }
        
        projects = [newProject];
        console.log('✅ Proyecto de demostración creado');
      }

      // Cargar tareas por proyecto
      const tasksByProject = {};
      for (const project of projects) {
        const { data: tasks, error: tasksError } = await this.supabase
          .from('tasks')
          .select('*')
          .eq('project_id', project.id);

        if (tasksError) {
          console.warn(`⚠️ Error cargando tareas para proyecto ${project.id}:`, tasksError);
          tasksByProject[project.id] = [];
        } else {
          // Convertir nombres de columnas de snake_case a camelCase SIN DUPLICAR
          const convertedTasks = (tasks || []).map(task => {
            // Crear objeto limpio sin duplicar campos
            const cleanTask = {
              id: task.id,
              name: task.name,
              description: task.description,
              duration: task.duration,
              progress: task.progress,
              priority: task.priority,
              cost: task.cost,
              predecessors: task.predecessors,
              successors: task.successors,
              resources: task.resources,
              status: task.status,
              project_id: task.project_id,
              owner_id: task.owner_id,
              created_at: task.created_at,
              updated_at: task.updated_at,
              // Convertir campos snake_case a camelCase
              wbsCode: task.wbs_code,
              startDate: task.start_date,
              endDate: task.end_date,
              assignedTo: task.assigned_to,
              isMilestone: task.is_milestone,
              originalDuration: task.original_duration
            };
            
            // Remover campos undefined/null
            Object.keys(cleanTask).forEach(key => {
              if (cleanTask[key] === undefined || cleanTask[key] === null) {
                delete cleanTask[key];
              }
            });
            
            return cleanTask;
          });
          
          tasksByProject[project.id] = convertedTasks;
          console.log(`✅ Tareas cargadas para proyecto ${project.id}: ${convertedTasks.length}`);
        }
      }

      // Cargar riesgos por proyecto
      const risksByProject = {};
      for (const project of projects) {
        const { data: risks, error: risksError } = await this.supabase
          .from('risks')
          .select('*')
          .eq('project_id', project.id);

        if (risksError) {
          console.warn(`⚠️ Error cargando riesgos para proyecto ${project.id}:`, risksError);
          risksByProject[project.id] = [];
        } else {
          risksByProject[project.id] = risks || [];
        }
      }

      // Cargar recursos globales
      const { data: globalResources, error: resourcesError } = await this.supabase
        .from('resources')
        .select('*')
        .eq('organization_id', this.organizationId);

      if (resourcesError) {
        console.warn('⚠️ Error cargando recursos:', resourcesError);
      }

      // Cargar alertas corporativas
      const { data: corporateAlerts, error: alertsError } = await this.supabase
        .from('corporate_alerts')
        .select('*')
        .eq('organization_id', this.organizationId);

      if (alertsError) {
        console.warn('⚠️ Error cargando alertas:', alertsError);
      }

      // Cargar órdenes de compra por proyecto
      const purchaseOrdersByProject = {};
      for (const project of projects) {
        const { data: purchaseOrders, error: poError } = await this.supabase
          .from('purchase_orders')
          .select('*')
          .eq('project_id', project.id);
        
        if (poError) {
          console.warn(`⚠️ Error cargando órdenes de compra para proyecto ${project.id}:`, poError);
          purchaseOrdersByProject[project.id] = [];
        } else {
          purchaseOrdersByProject[project.id] = purchaseOrders || [];
        }
      }

      // Cargar anticipos por proyecto
      const advancesByProject = {};
      for (const project of projects) {
        const { data: advances, error: advancesError } = await this.supabase
          .from('advances')
          .select('*')
          .eq('project_id', project.id);
        
        if (advancesError) {
          console.warn(`⚠️ Error cargando anticipos para proyecto ${project.id}:`, advancesError);
          advancesByProject[project.id] = [];
        } else {
          advancesByProject[project.id] = advances || [];
        }
      }

      // Cargar facturas por proyecto
      const invoicesByProject = {};
      for (const project of projects) {
        const { data: invoices, error: invoicesError } = await this.supabase
          .from('invoices')
          .select('*')
          .eq('project_id', project.id);
        
        if (invoicesError) {
          console.warn(`⚠️ Error cargando facturas para proyecto ${project.id}:`, invoicesError);
          invoicesByProject[project.id] = [];
        } else {
          invoicesByProject[project.id] = invoices || [];
        }
      }

      // Cargar contratos por proyecto
      const contractsByProject = {};
      for (const project of projects) {
        const { data: contracts, error: contractsError } = await this.supabase
          .from('contracts')
          .select('*')
          .eq('project_id', project.id);
        
        if (contractsError) {
          console.warn(`⚠️ Error cargando contratos para proyecto ${project.id}:`, contractsError);
          contractsByProject[project.id] = [];
        } else {
          contractsByProject[project.id] = contracts || [];
        }
      }

      // Cargar asignaciones de recursos por proyecto
      const resourceAssignmentsByProject = {};
      for (const project of projects) {
        const { data: assignments, error: assignmentsError } = await this.supabase
          .from('resource_assignments')
          .select('*')
          .eq('project_id', project.id);
        
        if (assignmentsError) {
          console.warn(`⚠️ Error cargando asignaciones para proyecto ${project.id}:`, assignmentsError);
          resourceAssignmentsByProject[project.id] = [];
        } else {
          resourceAssignmentsByProject[project.id] = assignments || [];
        }
      }

      // Cargar logs de auditoría por proyecto
      const auditLogsByProject = {};
      for (const project of projects) {
        const { data: auditLogs, error: auditError } = await this.supabase
          .from('audit_logs')
          .select('*')
          .eq('project_id', project.id);
        
        if (auditError) {
          console.warn(`⚠️ Error cargando logs de auditoría para proyecto ${project.id}:`, auditError);
          auditLogsByProject[project.id] = [];
        } else {
          auditLogsByProject[project.id] = auditLogs || [];
        }
      }

      // Cargar configuraciones de proyectos (con manejo de errores mejorado)
      const includeWeekendsByProject = {};
      for (const project of projects) {
        try {
          const { data: config, error: configError } = await this.supabase
            .from('project_configurations')
            .select('*')
            .eq('project_id', project.id)
            .single();
          
          if (configError) {
            if (configError.code === 'PGRST116') {
              // No hay configuración para este proyecto, usar valores por defecto
              includeWeekendsByProject[project.id] = false;
            } else {
              console.warn(`⚠️ Error cargando configuración para proyecto ${project.id}:`, configError);
              includeWeekendsByProject[project.id] = false;
            }
          } else {
            includeWeekendsByProject[project.id] = config ? config.include_weekends : false;
          }
        } catch (error) {
          console.warn(`⚠️ Error general cargando configuración para proyecto ${project.id}:`, error);
          includeWeekendsByProject[project.id] = false;
        }
      }

      const portfolioData = {
        projects: projects || [],
        tasksByProject: tasksByProject,
        risksByProject: risksByProject,
        globalResources: globalResources || [],
        corporateAlerts: corporateAlerts || [],
        purchaseOrdersByProject: purchaseOrdersByProject,
        advancesByProject: advancesByProject,
        invoicesByProject: invoicesByProject,
        contractsByProject: contractsByProject,
        resourceAssignmentsByProject: resourceAssignmentsByProject,
        auditLogsByProject: auditLogsByProject,
        includeWeekendsByProject: includeWeekendsByProject,
        currentProjectId: projects && projects.length > 0 ? projects[0].id : null,
        version: '1.0.0',
        lastUpdated: new Date().toISOString()
      };

      console.log('✅ Datos del portafolio cargados:', portfolioData);
      return portfolioData;

    } catch (error) {
      console.error('❌ Error cargando datos del portafolio:', error);
      return null;
    }
  }

  // Eliminar proyecto de Supabase
  async deleteProject(projectId) {
    if (!this.currentUser || !this.organizationId) {
      console.warn('⚠️ No hay usuario autenticado o organización');
      return false;
    }

    try {
      console.log(`🗑️ Eliminando proyecto ${projectId} de Supabase...`);

      // Eliminar tareas del proyecto
      const { error: tasksError } = await this.supabase
        .from('tasks')
        .delete()
        .eq('project_id', projectId);

      if (tasksError) {
        console.warn('⚠️ Error eliminando tareas del proyecto:', tasksError);
      }

      // Eliminar configuraciones del proyecto
      const { error: configError } = await this.supabase
        .from('project_configurations')
        .delete()
        .eq('project_id', projectId);

      if (configError) {
        console.warn('⚠️ Error eliminando configuración del proyecto:', configError);
      }

      // Eliminar logs de auditoría del proyecto
      const { error: auditError } = await this.supabase
        .from('audit_logs')
        .delete()
        .eq('project_id', projectId);

      if (auditError) {
        console.warn('⚠️ Error eliminando logs de auditoría del proyecto:', auditError);
      }

      // Eliminar el proyecto
      const { error: projectError } = await this.supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (projectError) {
        console.error('❌ Error eliminando proyecto:', projectError);
        return false;
      }

      console.log(`✅ Proyecto ${projectId} eliminado de Supabase`);
      return true;

    } catch (error) {
      console.error('❌ Error eliminando proyecto:', error);
      return false;
    }
  }

  // Guardar datos del portafolio
  async savePortfolioData(data) {
    if (!this.currentUser || !this.organizationId) {
      console.warn('⚠️ No hay usuario autenticado o organización');
      return false;
    }

    // PREVENIR GUARDADOS SIMULTÁNEOS
    if (this.isSaving) {
      console.warn('⚠️ savePortfolioData - GUARDADO EN PROGRESO, OMITIENDO');
      return false;
    }

    this.isSaving = true;
    console.log('💾 Guardando datos del portafolio en Supabase...');

    try {

      // Guardar/actualizar proyectos
      if (data.projects && data.projects.length > 0) {
        const projectsToUpsert = data.projects.map(project => {
          // Función para validar y corregir fechas
          const validateDate = (dateString) => {
            if (!dateString) return null;
            
            try {
              // Intentar parsear la fecha
              const date = new Date(dateString);
              
              // Verificar si la fecha es válida
              if (isNaN(date.getTime())) {
                console.warn(`⚠️ Fecha inválida detectada: ${dateString}`);
                return null;
              }
              
              // Verificar si la fecha está en un rango razonable (1900-2100)
              const year = date.getFullYear();
              if (year < 1900 || year > 2100) {
                console.warn(`⚠️ Año fuera de rango: ${year} en fecha ${dateString}`);
                return null;
              }
              
              // Retornar en formato ISO
              return date.toISOString().split('T')[0];
            } catch (error) {
              console.warn(`⚠️ Error procesando fecha ${dateString}:`, error);
              return null;
            }
          };

          return {
            id: project.id,
            name: project.name,
            description: project.description,
            status: project.status,
            priority: project.priority,
            budget: project.budget,
            manager: project.manager,
            sponsor: project.sponsor || '',
            objective: project.objective || '',
            business_case: project.businessCase || project.business_case || '',
            irr: project.irr || 0,
            roi: project.roi || 0,
            contingency_reserve: project.contingencyReserve || project.contingency_reserve || 0,
            management_reserve: project.managementReserve || project.management_reserve || 0,
            kickoff_date: validateDate(project.kickoffDate || project.kickoff_date),
            stakeholders: project.stakeholders || [],
            team: project.team || [],
            progress: project.progress || 0,
            version: project.version || '1.0.0',
            organization_id: this.organizationId,
            owner_id: this.currentUser.id,
            updated_at: new Date().toISOString(),
            // Validar fechas antes de enviar
            start_date: validateDate(project.startDate || project.start_date),
            end_date: validateDate(project.endDate || project.end_date),
            created_at: validateDate(project.createdAt || project.created_at) || new Date().toISOString()
          };
        });

        const { error: projectsError } = await this.supabase
          .from('projects')
          .upsert(projectsToUpsert, { onConflict: 'id' });

        if (projectsError) throw projectsError;
        console.log('✅ Proyectos guardados');
      }

      // Guardar/actualizar tareas
      for (const projectId in data.tasksByProject) {
        const tasks = data.tasksByProject[projectId];
        if (tasks && tasks.length > 0) {
          // Validar que no haya tareas duplicadas por ID
          const taskIds = new Set();
          const uniqueTasks = [];
          let duplicatesFound = 0;
          
          for (const task of tasks) {
            if (taskIds.has(task.id)) {
              console.warn(`⚠️ Tarea duplicada detectada en Supabase: ${task.id} - ${task.name}`);
              duplicatesFound++;
            } else {
              taskIds.add(task.id);
              uniqueTasks.push(task);
            }
          }
          
          if (duplicatesFound > 0) {
            console.warn(`⚠️ Se encontraron ${duplicatesFound} tareas duplicadas en Supabase, eliminando duplicados...`);
          }
          
          const tasksToProcess = uniqueTasks;
          const tasksToUpsert = tasksToProcess.map(task => {
            // Generar UUID válido si el ID no es un UUID
            const generateUUID = () => {
              return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
              });
            };
            
            // Verificar si el ID es un UUID válido
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            const taskId = uuidRegex.test(task.id) ? task.id : generateUUID();
            
            // Log si se generó un nuevo UUID
            if (taskId !== task.id) {
              console.log(`🔄 Generando nuevo UUID para tarea "${task.name}": ${task.id} → ${taskId}`);
            }
            
            // Función para validar fechas de tareas
            const validateTaskDate = (dateString) => {
              if (!dateString) return null;
              
              try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) {
                  console.warn(`⚠️ Fecha inválida en tarea: ${dateString}`);
                  return null;
                }
                return date.toISOString().split('T')[0];
              } catch (error) {
                console.warn(`⚠️ Error procesando fecha de tarea ${dateString}:`, error);
                return null;
              }
            };

            // Crear objeto limpio solo con campos válidos para Supabase
            const cleanTask = {
              id: taskId,
              name: task.name,
              description: task.description,
              duration: task.duration,
              progress: task.progress || 0,
              priority: task.priority,
              cost: task.cost || 0,
              predecessors: task.predecessors || [],
              successors: task.successors || [],
              resources: task.resources || [],
              status: task.status || 'pending',
              project_id: projectId,
              owner_id: this.currentUser.id,
              // Convertir nombres de columnas de camelCase a snake_case
              wbs_code: task.wbsCode || task.wbs_code,
              start_date: validateTaskDate(task.startDate || task.start_date),
              end_date: validateTaskDate(task.endDate || task.end_date),
              assigned_to: task.assignedTo || task.assigned_to,
              is_milestone: task.isMilestone || task.is_milestone || false,
              original_duration: task.originalDuration || task.original_duration
            };
            
            // Remover campos undefined o null
            Object.keys(cleanTask).forEach(key => {
              if (cleanTask[key] === undefined || cleanTask[key] === null) {
                delete cleanTask[key];
              }
            });
            
            return cleanTask;
          });

          console.log(`📋 Enviando ${tasksToUpsert.length} tareas a Supabase para proyecto ${projectId}`);
          console.log(`📋 Primera tarea de ejemplo:`, tasksToUpsert[0]);
          
          // VERIFICAR DUPLICADOS ANTES DE ENVIAR
          const taskIdsToVerify = new Set();
          const duplicateIds = [];
          tasksToUpsert.forEach(task => {
            if (taskIdsToVerify.has(task.id)) {
              duplicateIds.push(task.id);
            } else {
              taskIdsToVerify.add(task.id);
            }
          });
          
          if (duplicateIds.length > 0) {
            console.error(`🚨 DUPLICADOS DETECTADOS ANTES DE ENVIAR A SUPABASE:`, duplicateIds);
            console.error(`🚨 Total duplicados: ${duplicateIds.length} de ${tasksToUpsert.length} tareas`);
          }
          
          // PRIMERO: Eliminar todas las tareas existentes del proyecto
          console.log(`🗑️ Eliminando tareas existentes para proyecto ${projectId}...`);
          const { error: deleteError } = await this.supabase
            .from('tasks')
            .delete()
            .eq('project_id', projectId);

          if (deleteError) {
            console.warn(`⚠️ Error eliminando tareas existentes para proyecto ${projectId}:`, deleteError);
          } else {
            console.log(`✅ Tareas existentes eliminadas para proyecto ${projectId}`);
          }

          // SEGUNDO: Insertar las nuevas tareas (no upsert)
          console.log(`📝 Insertando ${tasksToUpsert.length} tareas nuevas para proyecto ${projectId}...`);
          const { error: tasksError } = await this.supabase
            .from('tasks')
            .insert(tasksToUpsert);

          if (tasksError) {
            console.error(`❌ Error guardando tareas para proyecto ${projectId}:`, tasksError);
            console.error(`❌ Detalles del error:`, {
              code: tasksError.code,
              message: tasksError.message,
              details: tasksError.details,
              hint: tasksError.hint
            });
          } else {
            console.log(`✅ Tareas guardadas para proyecto ${projectId}: ${tasksToUpsert.length} (originales: ${tasks.length})`);
            
            // VERIFICAR SI SUPABASE DUPLICÓ LAS TAREAS
            try {
              // Esperar un momento para que se complete la transacción
              await new Promise(resolve => setTimeout(resolve, 500));
              
              const { data: savedTasks, error: verifyError } = await this.supabase
                .from('tasks')
                .select('id, name, created_at')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });
              
              if (!verifyError && savedTasks) {
                const savedCount = savedTasks.length;
                const expectedCount = tasksToUpsert.length;
                
                if (savedCount !== expectedCount) {
                  console.error(`🚨 DUPLICACIÓN DETECTADA EN SUPABASE!`);
                  console.error(`🚨 Esperadas: ${expectedCount}, Guardadas: ${savedCount}`);
                  console.error(`🚨 Diferencia: ${savedCount - expectedCount} tareas duplicadas`);
                  
                  // Detectar duplicados por ID
                  const taskIds = new Set();
                  const duplicates = [];
                  savedTasks.forEach(task => {
                    if (taskIds.has(task.id)) {
                      duplicates.push(task);
                    } else {
                      taskIds.add(task.id);
                    }
                  });
                  
                  if (duplicates.length > 0) {
                    console.error(`🚨 TAREAS DUPLICADAS POR ID:`, duplicates.slice(0, 5));
                  }
                  
                  // Detectar duplicados por nombre
                  const nameCounts = {};
                  savedTasks.forEach(task => {
                    nameCounts[task.name] = (nameCounts[task.name] || 0) + 1;
                  });
                  
                  const duplicateNames = Object.entries(nameCounts)
                    .filter(([name, count]) => count > 1)
                    .slice(0, 5);
                  
                  if (duplicateNames.length > 0) {
                    console.error(`🚨 TAREAS DUPLICADAS POR NOMBRE:`, duplicateNames);
                  }
                  
                } else {
                  console.log(`✅ Verificación exitosa: ${savedCount} tareas en Supabase`);
                }
              } else {
                console.warn(`⚠️ Error verificando tareas guardadas:`, verifyError);
              }
            } catch (verifyError) {
              console.warn(`⚠️ Error verificando tareas guardadas:`, verifyError);
            }
          }
        }
      }

      // Guardar/actualizar riesgos
      for (const projectId in data.risksByProject) {
        const risks = data.risksByProject[projectId];
        if (risks && risks.length > 0) {
          const risksToUpsert = risks.map(risk => ({
            ...risk,
            project_id: projectId,
            owner_id: this.currentUser.id,
            updated_at: new Date().toISOString()
          }));

          const { error: risksError } = await this.supabase
            .from('risks')
            .upsert(risksToUpsert, { onConflict: 'id' });

          if (risksError) {
            console.warn(`⚠️ Error guardando riesgos para proyecto ${projectId}:`, risksError);
          }
        }
      }

      // Guardar/actualizar recursos globales
      if (data.globalResources && data.globalResources.length > 0) {
        const resourcesToUpsert = data.globalResources.map(resource => ({
          ...resource,
          organization_id: this.organizationId,
          owner_id: this.currentUser.id,
          updated_at: new Date().toISOString()
        }));

        const { error: resourcesError } = await this.supabase
          .from('resources')
          .upsert(resourcesToUpsert, { onConflict: 'id' });

        if (resourcesError) {
          console.warn('⚠️ Error guardando recursos:', resourcesError);
        }
      }

      // Guardar/actualizar alertas corporativas
      if (data.corporateAlerts && data.corporateAlerts.length > 0) {
        const alertsToUpsert = data.corporateAlerts.map(alert => ({
          ...alert,
          organization_id: this.organizationId,
          owner_id: this.currentUser.id,
          updated_at: new Date().toISOString()
        }));

        const { error: alertsError } = await this.supabase
          .from('corporate_alerts')
          .upsert(alertsToUpsert, { onConflict: 'id' });

        if (alertsError) {
          console.warn('⚠️ Error guardando alertas:', alertsError);
        }
      }

      // Guardar/actualizar órdenes de compra
      for (const projectId in data.purchaseOrdersByProject) {
        const purchaseOrders = data.purchaseOrdersByProject[projectId];
        if (purchaseOrders && purchaseOrders.length > 0) {
          const poToUpsert = purchaseOrders.map(po => {
            // Limpiar strings vacíos para columnas de fecha
            const cleanedPo = { ...po };
            
            // Convertir strings vacíos a null para columnas de fecha
            const dateFields = ['requestDate', 'approvalDate', 'expectedDate'];
            dateFields.forEach(field => {
              if (cleanedPo[field] === '' || cleanedPo[field] === null || cleanedPo[field] === undefined) {
                cleanedPo[field] = null;
              }
            });
            
            return {
              ...cleanedPo,
              project_id: projectId,
              owner_id: this.currentUser.id,
              updated_at: new Date().toISOString()
            };
          });

          const { error: poError } = await this.supabase
            .from('purchase_orders')
            .upsert(poToUpsert, { onConflict: 'id' });

          if (poError) {
            console.warn(`⚠️ Error guardando órdenes de compra para proyecto ${projectId}:`, poError);
          }
        }
      }

      // Guardar/actualizar anticipos
      for (const projectId in data.advancesByProject) {
        const advances = data.advancesByProject[projectId];
        if (advances && advances.length > 0) {
          const advancesToUpsert = advances.map(advance => ({
            ...advance,
            project_id: projectId,
            owner_id: this.currentUser.id,
            updated_at: new Date().toISOString()
          }));

          const { error: advancesError } = await this.supabase
            .from('advances')
            .upsert(advancesToUpsert, { onConflict: 'id' });

          if (advancesError) {
            console.warn(`⚠️ Error guardando anticipos para proyecto ${projectId}:`, advancesError);
          }
        }
      }

      // Guardar/actualizar facturas
      for (const projectId in data.invoicesByProject) {
        const invoices = data.invoicesByProject[projectId];
        if (invoices && invoices.length > 0) {
          const invoicesToUpsert = invoices.map(invoice => ({
            ...invoice,
            project_id: projectId,
            owner_id: this.currentUser.id,
            updated_at: new Date().toISOString()
          }));

          const { error: invoicesError } = await this.supabase
            .from('invoices')
            .upsert(invoicesToUpsert, { onConflict: 'id' });

          if (invoicesError) {
            console.warn(`⚠️ Error guardando facturas para proyecto ${projectId}:`, invoicesError);
          }
        }
      }

      // Guardar/actualizar contratos
      for (const projectId in data.contractsByProject) {
        const contracts = data.contractsByProject[projectId];
        if (contracts && contracts.length > 0) {
          const contractsToUpsert = contracts.map(contract => ({
            ...contract,
            project_id: projectId,
            owner_id: this.currentUser.id,
            updated_at: new Date().toISOString()
          }));

          const { error: contractsError } = await this.supabase
            .from('contracts')
            .upsert(contractsToUpsert, { onConflict: 'id' });

          if (contractsError) {
            console.warn(`⚠️ Error guardando contratos para proyecto ${projectId}:`, contractsError);
          }
        }
      }

      // Guardar/actualizar asignaciones de recursos
      for (const projectId in data.resourceAssignmentsByProject) {
        const assignments = data.resourceAssignmentsByProject[projectId];
        if (assignments && assignments.length > 0) {
          const assignmentsToUpsert = assignments.map(assignment => ({
            ...assignment,
            project_id: projectId,
            owner_id: this.currentUser.id,
            updated_at: new Date().toISOString()
          }));

          const { error: assignmentsError } = await this.supabase
            .from('resource_assignments')
            .upsert(assignmentsToUpsert, { onConflict: 'id' });

          if (assignmentsError) {
            console.warn(`⚠️ Error guardando asignaciones para proyecto ${projectId}:`, assignmentsError);
          }
        }
      }

      // Guardar/actualizar logs de auditoría
      for (const projectId in data.auditLogsByProject) {
        const auditLogs = data.auditLogsByProject[projectId];
        if (auditLogs && auditLogs.length > 0) {
          const auditLogsToUpsert = auditLogs.map(log => ({
            ...log,
            project_id: projectId,
            user_id: this.currentUser.id,
            timestamp: log.timestamp || new Date().toISOString()
          }));

          const { error: auditError } = await this.supabase
            .from('audit_logs')
            .upsert(auditLogsToUpsert, { onConflict: 'id' });

          if (auditError) {
            console.warn(`⚠️ Error guardando logs de auditoría para proyecto ${projectId}:`, auditError);
          }
        }
      }

      // Guardar/actualizar configuraciones de proyectos
      for (const projectId in data.includeWeekendsByProject) {
        const includeWeekends = data.includeWeekendsByProject[projectId];
        
        // Verificar si el projectId es un UUID válido
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(projectId)) {
          console.log(`⚠️ Saltando configuración para proyecto con ID inválido: ${projectId}`);
          continue;
        }
        
        const configToUpsert = {
          project_id: projectId,
          include_weekends: includeWeekends,
          owner_id: this.currentUser.id
        };

        // Primero intentar insertar, si falla por duplicado, actualizar
        const { error: insertError } = await this.supabase
          .from('project_configurations')
          .insert(configToUpsert);
        
        let configError = null;
        if (insertError && insertError.code === '23505') {
          // Si es error de duplicado, actualizar
          const { error: updateError } = await this.supabase
            .from('project_configurations')
            .update(configToUpsert)
            .eq('project_id', projectId);
          configError = updateError;
        } else {
          configError = insertError;
        }

        if (configError) {
          console.warn(`⚠️ Error guardando configuración para proyecto ${projectId}:`, configError);
          console.warn(`⚠️ Detalles del error de configuración:`, {
            code: configError.code,
            message: configError.message,
            details: configError.details,
            hint: configError.hint
          });
        } else {
          console.log(`✅ Configuración guardada para proyecto ${projectId}`);
        }
      }

      console.log('✅ Datos del portafolio guardados en Supabase');
      return true;

    } catch (error) {
      console.error('❌ Error guardando datos del portafolio:', error);
      return false;
    } finally {
      // Liberar flag de guardado
      this.isSaving = false;
      console.log('🔓 Flag de guardado liberado');
    }
  }

  // Obtener usuario actual
  getCurrentUser() {
    return this.currentUser;
  }

  // Verificar si está autenticado
  isAuthenticated() {
    return !!this.currentUser;
  }

  // Obtener organización actual
  getCurrentOrganization() {
    return this.organizationId;
  }

  // Función para limpiar duplicados en Supabase
  async cleanDuplicatesInSupabase() {
    if (!this.currentUser || !this.organizationId) {
      console.warn('⚠️ No hay usuario autenticado o organización');
      return false;
    }

    try {
      console.log('🧹 Iniciando limpieza de duplicados en Supabase...');

      // Obtener todos los proyectos
      const { data: projects, error: projectsError } = await this.supabase
        .from('projects')
        .select('id, name');

      if (projectsError) {
        console.error('❌ Error obteniendo proyectos:', projectsError);
        return false;
      }

      let totalCleaned = 0;
      let totalErrors = 0;

      for (const project of projects) {
        console.log(`🧹 Limpiando duplicados para proyecto: ${project.name} (${project.id})`);

        // Obtener todas las tareas del proyecto
        const { data: tasks, error: tasksError } = await this.supabase
          .from('tasks')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: true });

        if (tasksError) {
          console.warn(`⚠️ Error obteniendo tareas para proyecto ${project.id}:`, tasksError);
          totalErrors++;
          continue;
        }

        if (!tasks || tasks.length === 0) {
          console.log(`✅ No hay tareas en proyecto ${project.id}`);
          continue;
        }

        // Agrupar por ID y mantener solo la primera ocurrencia
        const taskMap = new Map();
        const duplicatesToDelete = [];

        tasks.forEach(task => {
          if (taskMap.has(task.id)) {
            duplicatesToDelete.push(task.id);
          } else {
            taskMap.set(task.id, task);
          }
        });

        if (duplicatesToDelete.length === 0) {
          console.log(`✅ No hay duplicados en proyecto ${project.id}`);
          continue;
        }

        console.log(`🗑️ Eliminando ${duplicatesToDelete.length} duplicados del proyecto ${project.id}`);

        // Eliminar duplicados
        for (const duplicateId of duplicatesToDelete) {
          const { error: deleteError } = await this.supabase
            .from('tasks')
            .delete()
            .eq('id', duplicateId);

          if (deleteError) {
            console.warn(`⚠️ Error eliminando duplicado ${duplicateId}:`, deleteError);
            totalErrors++;
          } else {
            totalCleaned++;
          }
        }

        console.log(`✅ Limpieza completada para proyecto ${project.id}: ${duplicatesToDelete.length} duplicados eliminados`);
      }

      console.log(`🎉 Limpieza de duplicados completada:`);
      console.log(`• Duplicados eliminados: ${totalCleaned}`);
      console.log(`• Errores: ${totalErrors}`);

      return true;

    } catch (error) {
      console.error('❌ Error en limpieza de duplicados:', error);
      return false;
    }
  }

  // Función para eliminar un riesgo específico de Supabase
  async deleteRisk(riskId) {
    try {
      if (!this.supabase || !this.currentUser) {
        console.warn('⚠️ No se puede eliminar riesgo: Supabase no inicializado o usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      const { error } = await this.supabase
        .from('risks')
        .delete()
        .eq('id', riskId)
        .eq('owner_id', this.currentUser.id);

      if (error) {
        console.error('❌ Error eliminando riesgo de Supabase:', error);
        return { success: false, error };
      }

      console.log('✅ Riesgo eliminado de Supabase:', riskId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error inesperado eliminando riesgo:', error);
      return { success: false, error };
    }
  }

  // Función para eliminar un anticipo específico de Supabase
  async deleteAdvance(advanceId) {
    try {
      if (!this.supabase || !this.currentUser) {
        console.warn('⚠️ No se puede eliminar anticipo: Supabase no inicializado o usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      const { error } = await this.supabase
        .from('advances')
        .delete()
        .eq('id', advanceId)
        .eq('owner_id', this.currentUser.id);

      if (error) {
        console.error('❌ Error eliminando anticipo de Supabase:', error);
        return { success: false, error };
      }

      console.log('✅ Anticipo eliminado de Supabase:', advanceId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error inesperado eliminando anticipo:', error);
      return { success: false, error };
    }
  }

  // Función para eliminar una factura específica de Supabase
  async deleteInvoice(invoiceId) {
    try {
      if (!this.supabase || !this.currentUser) {
        console.warn('⚠️ No se puede eliminar factura: Supabase no inicializado o usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      const { error } = await this.supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('owner_id', this.currentUser.id);

      if (error) {
        console.error('❌ Error eliminando factura de Supabase:', error);
        return { success: false, error };
      }

      console.log('✅ Factura eliminada de Supabase:', invoiceId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error inesperado eliminando factura:', error);
      return { success: false, error };
    }
  }

  // Función para eliminar una orden de compra específica de Supabase
  async deletePurchaseOrder(poId) {
    try {
      if (!this.supabase || !this.currentUser) {
        console.warn('⚠️ No se puede eliminar orden de compra: Supabase no inicializado o usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      const { error } = await this.supabase
        .from('purchase_orders')
        .delete()
        .eq('id', poId)
        .eq('owner_id', this.currentUser.id);

      if (error) {
        console.error('❌ Error eliminando orden de compra de Supabase:', error);
        return { success: false, error };
      }

      console.log('✅ Orden de compra eliminada de Supabase:', poId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error inesperado eliminando orden de compra:', error);
      return { success: false, error };
    }
  }
}

// Crear instancia singleton
const supabaseService = new SupabaseService();

export default supabaseService;
