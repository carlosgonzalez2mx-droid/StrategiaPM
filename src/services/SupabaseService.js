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
        
        // DIAGNÓSTICO: Verificar si el método existe
        console.log('🔍 ¿Método detectUserOrganization existe?', typeof this.detectUserOrganization);
        
        try {
          // USAR DETECCIÓN AUTOMÁTICA
          console.log('🚀 Iniciando detección de organización...');
          await this.detectUserOrganization();
          console.log('✅ Detección de organización completada. OrganizationId:', this.organizationId);
        } catch (error) {
          console.error('❌ Error en detección de organización:', error);
          this.organizationId = null;
        }
      } else {
        console.log('⚠️ No hay usuario autenticado');
        this.organizationId = null;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error inicializando SupabaseService:', error);
      return false;
    }
  }

  // Detectar organización del usuario automáticamente
  async detectUserOrganization() {
    if (!this.currentUser) {
      console.log('❌ No hay usuario para detectar organización');
      return;
    }

    try {
      console.log('🔍 Detectando organización para:', this.currentUser.email);

      // Buscar memberships activos del usuario por email
      const { data: memberships, error } = await this.supabase
        .from('organization_members')
        .select('organization_id, role, status, organizations(id, name, owner_id)')
        .eq('user_email', this.currentUser.email)
        .eq('status', 'active')
        .order('created_at', { ascending: false }); // Más reciente primero

      if (error) {
        console.error('❌ Error buscando memberships:', error);
        return;
      }

      if (!memberships || memberships.length === 0) {
        console.log('❌ No se encontraron memberships activos para:', this.currentUser.email);
        this.organizationId = null;
        return;
      }

      console.log('✅ Memberships encontrados:', memberships.length);

      // PRIORIDAD: Buscar donde es owner primero
      const ownerMembership = memberships.find(m => 
        m.organizations && m.organizations.owner_id === this.currentUser.id
      );

      if (ownerMembership) {
        this.organizationId = ownerMembership.organization_id;
        console.log('✅ Organización detectada como OWNER:', {
          id: this.organizationId,
          name: ownerMembership.organizations.name
        });
        return;
      }

      // Si no es owner, usar la primera organización activa
      const firstMembership = memberships[0];
      this.organizationId = firstMembership.organization_id;
      console.log('✅ Organización detectada como MIEMBRO:', {
        id: this.organizationId,
        name: firstMembership.organizations?.name || 'Sin nombre',
        role: firstMembership.role
      });

    } catch (error) {
      console.error('❌ Error en detectUserOrganization:', error);
      this.organizationId = null;
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
      
      // DETECCIÓN AUTOMÁTICA: Usar organización del usuario
      this.organizationId = organization.id;
      console.log('✅ Organización detectada automáticamente:', this.organizationId);
      return organization.id;
    } catch (error) {
      console.error('❌ Error cargando organización:', error);
      return null;
    }
  }

  // NUEVA: Activar invitaciones pendientes automáticamente
  async activatePendingInvitations(userEmail, userId) {
    try {
      console.log('🔍 Buscando invitaciones pendientes para:', userEmail);
      
      // Buscar invitaciones pendientes para este email
      const { data: pendingInvites, error: searchError } = await this.supabase
        .from('organization_members')
        .select('*, organizations(id, name)')
        .eq('user_email', userEmail)
        .eq('status', 'pending');

      if (searchError) {
        console.error('❌ Error buscando invitaciones:', searchError);
        return;
      }

      if (pendingInvites && pendingInvites.length > 0) {
        console.log(`✅ Encontradas ${pendingInvites.length} invitaciones pendientes`);
        
        let primaryOrganization = null;
        
        // Activar todas las invitaciones pendientes
        for (const invite of pendingInvites) {
          console.log('🔄 Activando invitación para organización:', invite.organizations?.name);
          
          const { error: updateError } = await this.supabase
            .from('organization_members')
            .update({
              user_id: userId,
              status: 'active',
              accepted_at: new Date().toISOString()
            })
            .eq('id', invite.id);

          if (updateError) {
            console.error('❌ Error activando invitación:', updateError);
          } else {
            console.log('✅ Invitación activada exitosamente');
            // Usar la primera organización como primaria
            if (!primaryOrganization) {
              primaryOrganization = invite.organization_id;
            }
          }
        }
        
        // Configurar la organización primaria (USAR LA DE LA INVITACIÓN)
        if (primaryOrganization) {
          this.organizationId = primaryOrganization;
          console.log('🏢 Organización primaria configurada:', primaryOrganization);
          
          // Mostrar mensaje de bienvenida
          const orgName = pendingInvites[0].organizations?.name || 'la organización';
          console.log(`🎉 ¡Bienvenido a ${orgName}! Has sido agregado automáticamente.`);
          
          // FORZAR DETECCIÓN AUTOMÁTICA DESPUÉS DE ACTIVAR
          await this.detectUserOrganization();
        }
        
        return {
          activated: pendingInvites.length,
          primaryOrganization: primaryOrganization,
          organizations: pendingInvites.map(inv => ({
            id: inv.organization_id,
            name: inv.organizations?.name,
            role: inv.role
          }))
        };
      } else {
        console.log('ℹ️ No se encontraron invitaciones pendientes para este usuario');
        return { activated: 0 };
      }
      
    } catch (error) {
      console.error('❌ Error activando invitaciones pendientes:', error);
      return { activated: 0, error: error.message };
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
          // DETECCIÓN AUTOMÁTICA: Usar organización creada
          this.organizationId = orgData.id;
        }
      }

      this.currentUser = data.user;
      
      // ACTIVAR INVITACIONES PENDIENTES AUTOMÁTICAMENTE
      const invitationResult = await this.activatePendingInvitations(email, data.user.id);
      
      return { 
        success: true, 
        user: data.user,
        invitationActivation: invitationResult
      };
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
      
      // TAMBIÉN VERIFICAR INVITACIONES PENDIENTES EN LOGIN
      // (Por si el usuario ya tenía cuenta antes de ser invitado)
      const invitationResult = await this.activatePendingInvitations(email, data.user.id);
      
      await this.loadOrganization();
      
      return { 
        success: true, 
        user: data.user,
        invitationActivation: invitationResult
      };
    } catch (error) {
      console.error('❌ Error en signIn:', error);
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      console.log('🚪 Iniciando logout completo...');
      
      // 1. LOGOUT DE SUPABASE AUTH
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        console.error('❌ Error en Supabase signOut:', error);
        throw error;
      }
      console.log('✅ Supabase auth signOut exitoso');

      // 2. LIMPIAR TODAS LAS PROPIEDADES DEL SERVICIO
      this.currentUser = null;
      this.organizationId = null;
      this.isInitialized = false;
      
      console.log('✅ Propiedades del servicio limpiadas');

      // 3. LIMPIAR COMPLETAMENTE EL LOCALSTORAGE
      const keysToRemove = [
        'currentProjectId',
        'useSupabase', 
        'portfolioData',
        'supabase.auth.token',
        'sb-localhost-auth-token',
        'sb-auth-token'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Eliminado localStorage: ${key}`);
      });

      // 4. LIMPIAR SESSIONSTORAGE TAMBIÉN
      const sessionKeysToRemove = [
        'supabase.auth.token',
        'sb-localhost-auth-token', 
        'sb-auth-token'
      ];
      
      sessionKeysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        console.log(`🗑️ Eliminado sessionStorage: ${key}`);
      });

      // 5. VERIFICAR QUE NO HAY USUARIO ACTUAL
      const currentUser = await this.supabase.auth.getUser();
      if (currentUser.data.user) {
        console.warn('⚠️ Aún hay usuario después del logout, forzando limpieza...');
        // Forzar logout adicional si es necesario
        await this.supabase.auth.signOut({ scope: 'global' });
      }

      console.log('✅ Logout completo terminado exitosamente');
      return { success: true };
    } catch (error) {
      console.error('❌ Error en signOut completo:', error);
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
        console.log('🏢 EJECUTANDO DETECCIÓN AUTOMÁTICA DE ORGANIZACIÓN...');
        
        // USAR EL MÉTODO DE DETECCIÓN AUTOMÁTICA
        const detectedOrgId = await this.detectUserOrganization();
        
        if (detectedOrgId) {
          this.organizationId = detectedOrgId;
          console.log('✅ Organización detectada automáticamente:', this.organizationId);
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

          // DETECCIÓN AUTOMÁTICA: Usar organización creada
          this.organizationId = newOrg.id;
          console.log('✅ Organización creada automáticamente:', this.organizationId);
        }
      }

      // Cargar proyectos de la organización del usuario
      const { data: projects, error: projectsError } = await this.supabase
        .from('projects')
        .select('*')
        .eq('organization_id', this.organizationId);

      if (projectsError) {
        console.error('❌ Error cargando proyectos:', projectsError);
        return null;
      }

      console.log(`✅ Proyectos encontrados: ${projects?.length || 0}`);

      // Convertir nombres de columnas de snake_case a camelCase para compatibilidad con el frontend
      const convertedProjects = (projects || []).map(project => ({
        ...project,
        // Convertir campos de snake_case a camelCase
        startDate: project.start_date || project.startDate,
        endDate: project.end_date || project.endDate,
        businessCase: project.business_case || project.businessCase,
        kickoffDate: project.kickoff_date || project.kickoffDate,
        contingencyReserve: project.contingency_reserve || project.contingencyReserve,
        managementReserve: project.management_reserve || project.managementReserve,
        createdAt: project.created_at || project.createdAt,
        updatedAt: project.updated_at || project.updatedAt,
        // Mantener también los nombres originales para compatibilidad hacia atrás
        start_date: project.start_date,
        end_date: project.end_date,
        business_case: project.business_case,
        kickoff_date: project.kickoff_date,
        contingency_reserve: project.contingency_reserve,
        management_reserve: project.management_reserve,
        created_at: project.created_at,
        updated_at: project.updated_at
      }));

      console.log(`✅ Proyectos convertidos: ${convertedProjects?.length || 0}`);

      // Si no hay proyectos, crear uno de demostración
      if (!convertedProjects || convertedProjects.length === 0) {
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
        
        convertedProjects = [newProject];
        console.log('✅ Proyecto de demostración creado');
      }

      // Cargar tareas por proyecto
      const tasksByProject = {};
      for (const project of convertedProjects) {
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
      for (const project of convertedProjects) {
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
      for (const project of convertedProjects) {
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
      for (const project of convertedProjects) {
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
      for (const project of convertedProjects) {
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
      for (const project of convertedProjects) {
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
      for (const project of convertedProjects) {
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
      for (const project of convertedProjects) {
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
      for (const project of convertedProjects) {
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
        projects: convertedProjects || [],
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
        currentProjectId: convertedProjects && convertedProjects.length > 0 ? convertedProjects[0].id : null,
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
            // Validar fechas antes de enviar - CORREGIDO: usar ambos nombres para compatibilidad
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

  // NUEVA: Detección automática mejorada de organización
  async detectUserOrganization() {
    console.log('🚨 MÉTODO detectUserOrganization INICIADO');
    
    if (!this.currentUser) {
      console.log('❌ No hay usuario autenticado');
      return null;
    }

    try {
      console.log('🔍 Detectando organización automáticamente para:', this.currentUser.email);
      console.log('🔍 Current user ID (Supabase):', this.currentUser.id);
      console.log('🔍 Objeto currentUser completo:', this.currentUser);
      
      // 1. Buscar organización como owner (prioridad)
      // Buscar ESPECÍFICAMENTE donde user_id NO sea null y coincida con owner_id
      const { data: userMemberships, error: membershipError } = await this.supabase
        .from('organization_members')
        .select('user_id, organization_id, role, organizations!inner(id, name, owner_id)')
        .eq('user_email', this.currentUser.email)
        .not('user_id', 'is', null)
        .order('created_at', { ascending: false });

      if (membershipError) {
        console.log('❌ Error en query de memberships:', membershipError);
      }

      console.log('✅ Memberships encontrados:', userMemberships?.length || 0);
      if (userMemberships && userMemberships.length > 0) {
        console.log('📊 Detalle de memberships:', userMemberships.map(m => ({
          user_id: m.user_id,
          org_id: m.organization_id,
          org_name: m.organizations?.name,
          org_owner_id: m.organizations?.owner_id,
          role: m.role,
          is_owner: m.user_id === m.organizations?.owner_id
        })));
      }

      let ownedOrg = null;
      if (userMemberships && userMemberships.length > 0) {
        // PRIORIDAD INTELIGENTE: Buscar donde eres OWNER primero
        const ownerMemberships = userMemberships.filter(membership => 
          membership.organizations && 
          membership.user_id === membership.organizations.owner_id
        );
        
        if (ownerMemberships.length > 0) {
          // Si eres owner de múltiples organizaciones, usar la MÁS ANTIGUA (primera creada)
          const oldestOwnerMembership = ownerMemberships.reduce((oldest, current) => {
            const oldestDate = new Date(oldest.organizations.created_at || oldest.created_at);
            const currentDate = new Date(current.organizations.created_at || current.created_at);
            return currentDate < oldestDate ? current : oldest;
          });
          
          ownedOrg = oldestOwnerMembership.organizations;
          console.log('✅ Encontrada organización como OWNER (más antigua):', oldestOwnerMembership.user_id, '-', ownedOrg.name);
        } else {
          // Si no eres owner, buscar como miembro (usar la más reciente)
          const memberMembership = userMemberships[0]; // Ya ordenado por created_at DESC
          if (memberMembership.organizations) {
            ownedOrg = memberMembership.organizations;
            console.log('✅ Encontrada organización como MIEMBRO:', memberMembership.organization_id, '-', ownedOrg.name);
          }
        }
      }

      // Si no encontró por custom user_id, buscar por UUID de Supabase
      if (!ownedOrg) {
        console.log('🔍 Buscando organización por UUID de Supabase:', this.currentUser.id);
        const { data: uuidOrg, error: ownerError } = await this.supabase
          .from('organizations')
          .select('id, name')
          .eq('owner_id', this.currentUser.id)
          .maybeSingle();
        
        if (ownerError) {
          console.log('⚠️ Error buscando por UUID:', ownerError);
        }
        
        if (uuidOrg) {
          console.log('✅ Encontrada organización por UUID:', uuidOrg.id, '-', uuidOrg.name);
        } else {
          console.log('❌ No se encontró organización por UUID');
        }
        
        ownedOrg = uuidOrg;
      }

      if (ownedOrg) {
        this.organizationId = ownedOrg.id;
        console.log('✅ Organización detectada como owner:', this.organizationId, '-', ownedOrg.name);
        return ownedOrg.id;
      }

      // 2. Buscar como miembro activo (si no es owner)
      let membership = null;
      if (!ownedOrg && userMemberships && userMemberships.length > 0) {
        // Si no es owner, tomar la primera organización donde es miembro
        const membershipRecord = userMemberships[0];
        if (membershipRecord.organizations) {
          membership = {
            organization_id: membershipRecord.organization_id,
            organizations: membershipRecord.organizations
          };
          console.log('✅ Encontrada organización como MIEMBRO:', membershipRecord.organization_id);
        }
      }

      if (membership && membership.organizations) {
        this.organizationId = membership.organization_id;
        console.log('✅ Organización detectada como miembro:', this.organizationId, '-', membership.organizations.name);
        return membership.organization_id;
      }

      // 3. Crear organización automáticamente si no existe
      console.log('🏢 Creando organización automática para usuario...');
      const userName = this.currentUser.email?.split('@')[0] || 'Usuario';
      const { data: newOrg, error: createError } = await this.supabase
        .from('organizations')
        .insert({
          name: `${userName}'s Organization`,
          owner_id: this.currentUser.id
        })
        .select('id, name')
        .single();

      if (createError) {
        console.error('❌ Error creando organización:', createError);
        return null;
      }

      this.organizationId = newOrg.id;
      console.log('✅ Organización creada automáticamente:', this.organizationId, '-', newOrg.name);
      return newOrg.id;

    } catch (error) {
      console.error('❌ Error en detección automática de organización:', error);
      return null;
    }
  }

  // Función para limpiar duplicados en Supabase
  async cleanDuplicatesInSupabase() {
    if (!this.currentUser || !this.organizationId) {
      console.warn('⚠️ No hay usuario autenticado o organización');
      return false;
    }

    try {
      console.log('🧹 Iniciando limpieza de duplicados en Supabase...');

      // Obtener proyectos de la organización
      const { data: projects, error: projectsError } = await this.supabase
        .from('projects')
        .select('id, name')
        .eq('organization_id', this.organizationId);

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

  // ========== SUPABASE STORAGE FUNCTIONS ==========

  // Inicializar buckets de Storage si no existen
  async initializeStorage() {
    try {
      console.log('🗂️ Inicializando Supabase Storage...');
      
      // Crear bucket para archivos de proyectos si no existe
      const { data: buckets, error: listError } = await this.supabase.storage.listBuckets();
      
      if (listError) {
        console.error('❌ Error listando buckets:', listError);
        return false;
      }

      const projectFilesBucket = buckets.find(bucket => bucket.name === 'project-files');
      
      if (!projectFilesBucket) {
        console.log('📁 Creando bucket project-files...');
        const { data, error: createError } = await this.supabase.storage.createBucket('project-files', {
          public: false,
          allowedMimeTypes: [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          ],
          fileSizeLimit: 10485760 // 10MB
        });

        if (createError) {
          console.error('❌ Error creando bucket:', createError);
          return false;
        }
        
        console.log('✅ Bucket project-files creado');
      } else {
        console.log('✅ Bucket project-files ya existe');
      }

      return true;
    } catch (error) {
      console.error('❌ Error inicializando Storage:', error);
      return false;
    }
  }

  // Subir archivo a Supabase Storage
  async uploadFileToStorage(file, projectId, category, metadata = {}) {
    try {
      if (!this.currentUser || !this.organizationId) {
        console.warn('⚠️ No se puede subir archivo: usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const fileExtension = file.name.split('.').pop();
      const fileName = `${timestamp}-${randomId}.${fileExtension}`;
      
      // Ruta en el bucket: organizationId/projectId/category/filename
      const filePath = `${this.organizationId}/${projectId}/${category}/${fileName}`;

      console.log(`📤 Subiendo archivo a Storage: ${filePath}`);

      // Subir archivo
      const { data, error } = await this.supabase.storage
        .from('project-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (error) {
        console.error('❌ Error subiendo archivo:', error);
        return { success: false, error };
      }

      // Obtener URL pública del archivo
      const { data: publicData } = this.supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      const fileRecord = {
        id: `file-${timestamp}-${randomId}`,
        projectId,
        category,
        fileName: file.name,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadDate: new Date().toISOString(),
        uploadedBy: this.currentUser.id,
        uploadedByEmail: this.currentUser.email,
        organizationId: this.organizationId,
        storagePath: filePath,
        publicUrl: publicData.publicUrl,
        metadata: {
          ...metadata,
          storageProvider: 'supabase',
          bucket: 'project-files'
        }
      };

      console.log('✅ Archivo subido exitosamente a Storage:', fileRecord.fileName);
      return { success: true, file: fileRecord };

    } catch (error) {
      console.error('❌ Error inesperado subiendo archivo:', error);
      return { success: false, error };
    }
  }

  // Descargar archivo de Supabase Storage
  async downloadFileFromStorage(filePath) {
    try {
      if (!this.currentUser) {
        console.warn('⚠️ No se puede descargar archivo: usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      console.log(`📥 Descargando archivo de Storage: ${filePath}`);

      const { data, error } = await this.supabase.storage
        .from('project-files')
        .download(filePath);

      if (error) {
        console.error('❌ Error descargando archivo:', error);
        return { success: false, error };
      }

      console.log('✅ Archivo descargado exitosamente');
      return { success: true, data };

    } catch (error) {
      console.error('❌ Error inesperado descargando archivo:', error);
      return { success: false, error };
    }
  }

  // Eliminar archivo de Supabase Storage
  async deleteFileFromStorage(filePath) {
    try {
      if (!this.currentUser) {
        console.warn('⚠️ No se puede eliminar archivo: usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      console.log(`🗑️ Eliminando archivo de Storage: ${filePath}`);

      const { error } = await this.supabase.storage
        .from('project-files')
        .remove([filePath]);

      if (error) {
        console.error('❌ Error eliminando archivo:', error);
        return { success: false, error };
      }

      console.log('✅ Archivo eliminado exitosamente de Storage');
      return { success: true };

    } catch (error) {
      console.error('❌ Error inesperado eliminando archivo:', error);
      return { success: false, error };
    }
  }

  // Listar archivos de un proyecto en Storage
  async listProjectFiles(projectId, category = null) {
    try {
      if (!this.currentUser || !this.organizationId) {
        console.warn('⚠️ No se pueden listar archivos: usuario no autenticado');
        return { success: false, error: 'No autenticado', files: [] };
      }

      const searchPath = category 
        ? `${this.organizationId}/${projectId}/${category}`
        : `${this.organizationId}/${projectId}`;

      console.log(`📋 Listando archivos en Storage: ${searchPath}`);

      const { data, error } = await this.supabase.storage
        .from('project-files')
        .list(searchPath, {
          limit: 100,
          offset: 0
        });

      if (error) {
        console.error('❌ Error listando archivos:', error);
        return { success: false, error, files: [] };
      }

      // Convertir archivos de Storage a formato esperado
      const files = (data || []).map(file => {
        const filePath = `${searchPath}/${file.name}`;
        const { data: publicData } = this.supabase.storage
          .from('project-files')
          .getPublicUrl(filePath);

        return {
          id: `file-${file.name.split('.')[0]}`,
          projectId,
          fileName: file.name,
          fileSize: file.metadata?.size || 0,
          uploadDate: file.created_at,
          storagePath: filePath,
          publicUrl: publicData.publicUrl,
          metadata: {
            storageProvider: 'supabase',
            bucket: 'project-files',
            ...file.metadata
          }
        };
      });

      console.log(`✅ ${files.length} archivos encontrados en Storage`);
      return { success: true, files };

    } catch (error) {
      console.error('❌ Error inesperado listando archivos:', error);
      return { success: false, error, files: [] };
    }
  }

  // Obtener URL firmada para acceso temporal
  async getSignedUrl(filePath, expiresIn = 3600) {
    try {
      if (!this.currentUser) {
        console.warn('⚠️ No se puede obtener URL firmada: usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      const { data, error } = await this.supabase.storage
        .from('project-files')
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        console.error('❌ Error obteniendo URL firmada:', error);
        return { success: false, error };
      }

      console.log('✅ URL firmada obtenida exitosamente');
      return { success: true, signedUrl: data.signedUrl };

    } catch (error) {
      console.error('❌ Error inesperado obteniendo URL firmada:', error);
      return { success: false, error };
    }
  }

  // ========== BACKUP DE BASE DE DATOS ==========

  // Crear backup completo de la base de datos
  async createDatabaseBackup() {
    try {
      console.log('🔄 Iniciando backup de base de datos...');
      
      // Obtener fecha actual para el nombre del archivo
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timestamp = now.toISOString().replace(/[:.]/g, '-'); // Para timestamp único
      
      // Definir tablas a respaldar
      const tables = [
        'organizations',
        'users', 
        'projects',
        'risks',
        'tasks',
        'purchase_orders',
        'advances',
        'invoices',
        'contracts',
        'resources',
        'resource_assignments'
      ];
      
      const backupData = {
        metadata: {
          timestamp: now.toISOString(),
          version: '1.0',
          source: 'supabase',
          tables: tables,
          organizationId: this.organizationId
        },
        data: {}
      };
      
      // Consultar cada tabla
      for (const tableName of tables) {
        try {
          console.log(`📊 Respaldo tabla: ${tableName}`);
          
          let query = this.supabase.from(tableName).select('*');
          
          // Aplicar filtros RLS si es necesario
          if (tableName !== 'organizations' && this.organizationId) {
            query = query.eq('organization_id', this.organizationId);
          }
          
          const { data, error } = await query;
          
          if (error) {
            console.warn(`⚠️ Error consultando tabla ${tableName}:`, error);
            backupData.data[tableName] = [];
          } else {
            backupData.data[tableName] = data || [];
            console.log(`✅ Tabla ${tableName}: ${data?.length || 0} registros`);
          }
        } catch (tableError) {
          console.error(`❌ Error procesando tabla ${tableName}:`, tableError);
          backupData.data[tableName] = [];
        }
      }
      
      // Crear nombre del archivo con prefijo DatabaseSt
      const fileName = `DatabaseSt_${dateStr}.json`;
      
      // Convertir a JSON
      const jsonData = JSON.stringify(backupData, null, 2);
      
      // Crear blob y descargar
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      
      // Crear elemento de descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log(`✅ Backup completado: ${fileName}`);
      
      return {
        success: true,
        fileName,
        recordCount: Object.values(backupData.data).reduce((total, tableData) => total + tableData.length, 0),
        tables: tables.length
      };
      
    } catch (error) {
      console.error('❌ Error creando backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Crear backup silencioso (sin descarga automática)
  async createSilentBackup() {
    try {
      console.log('🔄 Creando backup silencioso...');
      
      const backupData = await this._generateBackupData();
      
      if (!backupData.success) {
        return backupData;
      }
      
      // Guardar en localStorage con timestamp
      const backupKey = `strategiapm_backup_${new Date().toISOString().split('T')[0]}`;
      const backupInfo = {
        ...backupData.data,
        _backupInfo: {
          timestamp: new Date().toISOString(),
          recordCount: backupData.recordCount,
          tables: backupData.tables.length,
          version: '1.0'
        }
      };
      
      try {
        localStorage.setItem(backupKey, JSON.stringify(backupInfo));
        console.log(`✅ Backup silencioso guardado: ${backupData.recordCount} registros`);
        
        return {
          success: true,
          recordCount: backupData.recordCount,
          tables: backupData.tables.length,
          stored: true
        };
      } catch (storageError) {
        console.warn('⚠️ Error guardando en localStorage:', storageError);
        return {
          success: true,
          recordCount: backupData.recordCount,
          tables: backupData.tables.length,
          stored: false,
          warning: 'Backup creado pero no guardado localmente'
        };
      }
      
    } catch (error) {
      console.error('❌ Error creando backup silencioso:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Función privada para generar datos de backup
  async _generateBackupData() {
    try {
      // Obtener datos de todas las tablas críticas
      const tables = [
        'organizations',
        'users', 
        'projects',
        'risks',
        'tasks',
        'purchase_orders',
        'advances',
        'invoices',
        'contracts',
        'resources',
        'resource_assignments'
      ];
      
      const backupData = {
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          source: 'supabase',
          tables: tables.length
        },
        data: {}
      };
      
      let totalRecords = 0;
      
      // Obtener datos de cada tabla
      for (const tableName of tables) {
        try {
          let query = this.supabase.from(tableName).select('*');
          
          // Aplicar filtros RLS si es necesario
          if (tableName !== 'organizations' && this.organizationId) {
            query = query.eq('organization_id', this.organizationId);
          }
          
          const { data, error } = await query;
          
          if (error) {
            console.warn(`⚠️ Error obteniendo datos de ${tableName}:`, error);
            backupData.data[tableName] = [];
          } else {
            backupData.data[tableName] = data || [];
            totalRecords += (data || []).length;
            console.log(`✅ ${tableName}: ${(data || []).length} registros`);
          }
        } catch (tableError) {
          console.warn(`⚠️ Error procesando tabla ${tableName}:`, tableError);
          backupData.data[tableName] = [];
        }
      }
      
      return {
        success: true,
        data: backupData,
        recordCount: totalRecords,
        tables
      };
      
    } catch (error) {
      console.error('❌ Error generando datos de backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener estadísticas de backup
  async getBackupStats() {
    try {
      const tables = [
        'organizations',
        'users', 
        'projects',
        'risks',
        'tasks',
        'purchase_orders',
        'advances',
        'invoices',
        'contracts',
        'resources',
        'resource_assignments'
      ];
      
      const stats = {};
      let totalRecords = 0;
      
      for (const tableName of tables) {
        try {
          let query = this.supabase.from(tableName).select('*', { count: 'exact', head: true });
          
          if (tableName !== 'organizations' && this.organizationId) {
            query = query.eq('organization_id', this.organizationId);
          }
          
          const { count, error } = await query;
          
          if (error) {
            console.warn(`⚠️ Error contando tabla ${tableName}:`, error);
            stats[tableName] = 0;
          } else {
            stats[tableName] = count || 0;
            totalRecords += count || 0;
          }
        } catch (tableError) {
          console.error(`❌ Error contando tabla ${tableName}:`, tableError);
          stats[tableName] = 0;
        }
      }
      
      return {
        success: true,
        stats,
        totalRecords,
        tablesCount: tables.length
      };
      
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ========== RESTAURACIÓN DE BACKUP ==========

  // Validar archivo de backup
  validateBackupFile(backupData) {
    try {
      // Verificar estructura básica
      if (!backupData || typeof backupData !== 'object') {
        return { valid: false, error: 'Archivo no válido: estructura incorrecta' };
      }

      // Verificar metadata
      if (!backupData.metadata) {
        return { valid: false, error: 'Archivo no válido: falta metadata' };
      }

      const { metadata } = backupData;
      
      // Verificar campos requeridos en metadata
      if (!metadata.timestamp || !metadata.version || !metadata.source) {
        return { valid: false, error: 'Archivo no válido: metadata incompleta' };
      }

      // Verificar que sea de Supabase
      if (metadata.source !== 'supabase') {
        return { valid: false, error: 'Archivo no válido: no es un backup de Supabase' };
      }

      // Verificar que tenga datos
      if (!backupData.data || typeof backupData.data !== 'object') {
        return { valid: false, error: 'Archivo no válido: no contiene datos' };
      }

      // Verificar tablas esperadas
      const expectedTables = [
        'organizations', 'users', 'projects', 'risks', 'tasks',
        'purchase_orders', 'advances', 'invoices', 'contracts',
        'resources', 'resource_assignments'
      ];

      const availableTables = Object.keys(backupData.data);
      const missingTables = expectedTables.filter(table => !availableTables.includes(table));

      if (missingTables.length > 0) {
        console.warn(`⚠️ Tablas faltantes en backup: ${missingTables.join(', ')}`);
      }

      // Calcular estadísticas
      const stats = {};
      let totalRecords = 0;

      availableTables.forEach(table => {
        const records = Array.isArray(backupData.data[table]) ? backupData.data[table].length : 0;
        stats[table] = records;
        totalRecords += records;
      });

      return {
        valid: true,
        stats,
        totalRecords,
        tablesCount: availableTables.length,
        timestamp: metadata.timestamp,
        version: metadata.version
      };

    } catch (error) {
      return { valid: false, error: `Error validando archivo: ${error.message}` };
    }
  }

  // Restaurar datos desde archivo de backup
  async restoreFromBackup(backupData, options = {}) {
    try {
      console.log('🔄 Iniciando restauración de backup...');
      
      // Validar archivo
      const validation = this.validateBackupFile(backupData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      console.log(`✅ Archivo válido: ${validation.totalRecords} registros en ${validation.tablesCount} tablas`);

      const results = {
        success: true,
        processed: 0,
        errors: [],
        details: {}
      };

      // Orden de restauración (respetar dependencias)
      const restoreOrder = [
        'organizations',
        'users',
        'projects',
        'resources',
        'risks',
        'tasks',
        'resource_assignments',
        'purchase_orders',
        'advances',
        'invoices',
        'contracts'
      ];

      // Procesar cada tabla en orden
      for (const tableName of restoreOrder) {
        if (!backupData.data[tableName]) {
          console.log(`⏭️ Saltando tabla ${tableName}: no presente en backup`);
          continue;
        }

        const tableData = backupData.data[tableName];
        if (!Array.isArray(tableData) || tableData.length === 0) {
          console.log(`⏭️ Saltando tabla ${tableName}: sin datos`);
          results.details[tableName] = { processed: 0, errors: 0 };
          continue;
        }

        console.log(`📊 Restaurando tabla ${tableName}: ${tableData.length} registros`);

        try {
          // Limpiar tabla si se especifica
          if (options.clearExisting) {
            console.log(`🗑️ Limpiando tabla ${tableName}...`);
            const { error: deleteError } = await this.supabase
              .from(tableName)
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000'); // Condición que siempre es verdadera
            
            if (deleteError) {
              console.warn(`⚠️ Error limpiando tabla ${tableName}:`, deleteError);
            }
          }

          // Insertar datos en lotes
          const batchSize = 100;
          let processed = 0;
          let errors = 0;

          for (let i = 0; i < tableData.length; i += batchSize) {
            const batch = tableData.slice(i, i + batchSize);
            
            const { data, error } = await this.supabase
              .from(tableName)
              .insert(batch);

            if (error) {
              console.error(`❌ Error insertando lote en ${tableName}:`, error);
              errors += batch.length;
              results.errors.push({
                table: tableName,
                batch: Math.floor(i / batchSize) + 1,
                error: error.message,
                records: batch.length
              });
            } else {
              processed += batch.length;
              results.processed += batch.length;
            }

            // Pequeña pausa entre lotes para no sobrecargar
            if (i + batchSize < tableData.length) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }

          results.details[tableName] = { processed, errors };
          console.log(`✅ Tabla ${tableName}: ${processed} procesados, ${errors} errores`);

        } catch (tableError) {
          console.error(`❌ Error procesando tabla ${tableName}:`, tableError);
          results.errors.push({
            table: tableName,
            error: tableError.message
          });
          results.details[tableName] = { processed: 0, errors: tableData.length };
        }
      }

      console.log(`✅ Restauración completada: ${results.processed} registros procesados`);
      
      return results;

    } catch (error) {
      console.error('❌ Error en restauración:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener preview de datos del backup
  getBackupPreview(backupData) {
    try {
      const validation = this.validateBackupFile(backupData);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const preview = {};
      const tables = Object.keys(backupData.data);

      tables.forEach(tableName => {
        const data = backupData.data[tableName];
        if (Array.isArray(data) && data.length > 0) {
          preview[tableName] = {
            count: data.length,
            sample: data.slice(0, 3), // Primeros 3 registros como muestra
            fields: Object.keys(data[0] || {})
          };
        }
      });

      return {
        success: true,
        preview,
        totalRecords: validation.totalRecords,
        timestamp: validation.timestamp,
        version: validation.version
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Crear instancia singleton
const supabaseService = new SupabaseService();

export default supabaseService;
