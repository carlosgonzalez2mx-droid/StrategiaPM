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
        
        try {
          // USAR DETECCIÓN AUTOMÁTICA
          console.log('🚀 Iniciando detección de organización...');
          const orgData = await this.detectUserOrganization();
          if (orgData && orgData.id) {
            this.organizationId = orgData.id;
            console.log('✅ Detección de organización completada. OrganizationId:', this.organizationId);
          } else {
            console.log('⚠️ No se pudo detectar organización automáticamente');
            this.organizationId = null;
          }
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
  async detectUserOrganization(userEmail) {
    const emailToUse = userEmail || this.currentUser?.email;
    
    if (!emailToUse) {
      console.log('❌ No hay usuario para detectar organización');
      return null;
    }

    try {
      console.log('🔍 Detectando organización para:', emailToUse);
      
      // Query que aprovecha las políticas RLS corregidas
      const { data: membership, error } = await this.supabase
        .from('organization_members')
        .select(`
          id,
          organization_id,
          role,
          status,
          organizations (
            id,
            name,
            owner_id,
            created_at
          )
        `)
        .eq('user_email', emailToUse)
        .eq('status', 'active')
        .single();
      
      if (error) {
        console.error('❌ Error buscando membresía:', error);
        console.error('Código de error:', error.code);
        console.error('Mensaje:', error.message);
        return null;
      }
      
      if (!membership || !membership.organizations) {
        console.warn('⚠️ No se encontró organización activa para el usuario');
        return null;
      }
      
      const orgData = {
        id: membership.organizations.id,
        name: membership.organizations.name,
        role: membership.role,
        owner_id: membership.organizations.owner_id,
        membership_id: membership.id
      };
      
      console.log('✅ Organización detectada:', orgData.name);
      console.log('👤 Rol del usuario:', orgData.role);
      console.log('🆔 Organization ID:', orgData.id);
      
      // Guardar en la instancia
      this.organizationId = orgData.id;
      
      return orgData;
      
    } catch (error) {
      console.error('❌ Error inesperado detectando organización:', error);
      return null;
    }
  }

  // NUEVA: Forzar recarga de organización y limpiar caché
  async forceReloadOrganization() {
    console.log('🔄 Forzando recarga de organización...');
    
    try {
      // Limpiar caché de organización
      this.organizationId = null;
      
      // Limpiar localStorage relacionado con organización
      const keysToClean = [
        'mi-dashboard-portfolio',
        'lastSelectedProjectId',
        'portfolioData',
        'organizationData',
        'userSession'
      ];
      
      keysToClean.forEach(key => {
        if (localStorage.getItem(key)) {
          console.log(`🗑️ Limpiando localStorage: ${key}`);
          localStorage.removeItem(key);
        }
      });
      
      // Limpiar sessionStorage
      const sessionKeysToClean = [
        'currentUser',
        'userSession',
        'organizationData'
      ];
      
      sessionKeysToClean.forEach(key => {
        if (sessionStorage.getItem(key)) {
          console.log(`🗑️ Limpiando sessionStorage: ${key}`);
          sessionStorage.removeItem(key);
        }
      });
      
      // Forzar nueva detección de organización
      const newOrgId = await this.detectUserOrganization();
      
      console.log('✅ Recarga de organización completada:', newOrgId);
      return newOrgId;
      
    } catch (error) {
      console.error('❌ Error en forceReloadOrganization:', error);
      return null;
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

  // Cargar datos del portafolio - VERSIÓN OPTIMIZADA
  async loadPortfolioData() {
    try {
      console.log('📊 Cargando datos del portafolio desde Supabase (versión optimizada)...');
      console.time('⚡ Carga Total del Portafolio');
      
      // Obtener usuario autenticado
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      
      if (userError || !user?.email) {
        console.error('❌ Error obteniendo usuario:', userError);
        return null;
      }

      console.log('🏢 EJECUTANDO DETECCIÓN AUTOMÁTICA DE ORGANIZACIÓN...');
      const organization = await this.detectUserOrganization(user.email);
      
      if (!organization) {
        console.error('❌ No se pudo detectar organización para el usuario:', user.email);
        console.error('💡 El usuario debe tener una membresía activa en una organización');
        return null;
      }

      const orgId = organization.id;
      console.log('✅ Organización detectada:', organization.name);

      // ============================================
      // PASO 1: QUERIES PARALELAS PRINCIPALES
      // ============================================
      console.time('📊 Queries Principales');
      
      const [
        projectsResult,
        resourcesResult,
        alertsResult
      ] = await Promise.all([
        // Proyectos (solo campos esenciales)
        this.supabase
          .from('projects')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }),
        
        // Recursos globales
        this.supabase
          .from('resources')
          .select('*')
          .eq('organization_id', orgId),
        
        // Alertas corporativas
        this.supabase
          .from('corporate_alerts')
          .select('*')
          .eq('organization_id', orgId)
      ]);

      console.timeEnd('📊 Queries Principales');

      if (projectsResult.error) {
        console.error('❌ Error cargando proyectos:', projectsResult.error);
      }

      const projects = projectsResult.data || [];
      const globalResources = resourcesResult.data || [];
      const corporateAlerts = alertsResult.data || [];

      console.log(`✅ Proyectos cargados: ${projects.length}`);

      // Convertir nombres de columnas de snake_case a camelCase
      const convertedProjects = projects.map(project => ({
        ...project,
        startDate: project.start_date || project.startDate,
        endDate: project.end_date || project.endDate,
        businessCase: project.business_case || project.businessCase,
        kickoffDate: project.kickoff_date || project.kickoffDate,
        contingencyReserve: project.contingency_reserve || project.contingencyReserve,
        managementReserve: project.management_reserve || project.managementReserve,
        createdAt: project.created_at || project.createdAt,
        updatedAt: project.updated_at || project.updatedAt,
        organizationId: project.organization_id || project.organizationId,
        ownerId: project.owner_id || project.ownerId,
        // Mantener nombres originales para compatibilidad
        start_date: project.start_date,
        end_date: project.end_date,
        business_case: project.business_case,
        kickoff_date: project.kickoff_date,
        contingency_reserve: project.contingency_reserve,
        management_reserve: project.management_reserve,
        created_at: project.created_at,
        updated_at: project.updated_at,
        organization_id: project.organization_id,
        owner_id: project.owner_id
      }));

      // Si no hay proyectos, retornar estructura básica
      if (convertedProjects.length === 0) {
        console.log('⚠️ No hay proyectos en la organización');
        console.timeEnd('⚡ Carga Total del Portafolio');
        
        return {
          organization,
          projects: [],
          tasksByProject: {},
          risksByProject: {},
          globalResources: globalResources,
          corporateAlerts: corporateAlerts,
          purchaseOrdersByProject: {},
          advancesByProject: {},
          invoicesByProject: {},
          contractsByProject: {},
          resourceAssignmentsByProject: {},
          auditLogsByProject: {},
          minutasByProject: {},
          includeWeekendsByProject: {},
          user: { id: user.id, email: user.email },
          currentProjectId: null,
          version: '1.0.0',
          lastUpdated: new Date().toISOString()
        };
      }

      // ============================================
      // PASO 2: BATCH LOADING - 1 QUERY POR TABLA
      // ============================================
      console.time('📦 Batch Loading');
      
      const projectIds = convertedProjects.map(p => p.id);
      
      const [
        tasksResult,
        risksResult,
        purchaseOrdersResult,
        advancesResult,
        invoicesResult,
        contractsResult,
        resourceAssignmentsResult,
        minuteTasksResult,
        projectConfigsResult
      ] = await Promise.all([
        // TODAS las tasks en 1 query
        this.supabase
          .from('tasks')
          .select('*')
          .in('project_id', projectIds),
        
        // TODOS los risks en 1 query
        this.supabase
          .from('risks')
          .select('*')
          .in('project_id', projectIds),
        
        // TODAS las purchase_orders en 1 query
        this.supabase
          .from('purchase_orders')
          .select('*')
          .in('project_id', projectIds),
        
        // TODOS los advances en 1 query
        this.supabase
          .from('advances')
          .select('*')
          .in('project_id', projectIds),
        
        // TODAS las invoices en 1 query
        this.supabase
          .from('invoices')
          .select('*')
          .in('project_id', projectIds),
        
        // TODOS los contracts en 1 query
        this.supabase
          .from('contracts')
          .select('*')
          .in('project_id', projectIds),
        
        // TODOS los resource_assignments en 1 query
        this.supabase
          .from('resource_assignments')
          .select('*')
          .in('project_id', projectIds),
        
        // TODAS las minute_tasks en 1 query
        this.supabase
          .from('minute_tasks')
          .select('*')
          .in('project_id', projectIds),
        
        // TODAS las configuraciones en 1 query
        this.supabase
          .from('project_configurations')
          .select('*')
          .in('project_id', projectIds)
      ]);

      console.timeEnd('📦 Batch Loading');

      // ============================================
      // PASO 3: AGRUPAR DATOS POR PROYECTO
      // ============================================
      console.time('🔨 Procesamiento de Datos');
      
      // Inicializar objetos para cada proyecto
      const tasksByProject = {};
      const risksByProject = {};
      const purchaseOrdersByProject = {};
      const advancesByProject = {};
      const invoicesByProject = {};
      const contractsByProject = {};
      const resourceAssignmentsByProject = {};
      const minutasByProject = {};
      const includeWeekendsByProject = {};

      // Inicializar arrays vacíos para cada proyecto
      projectIds.forEach(id => {
        tasksByProject[id] = [];
        risksByProject[id] = [];
        purchaseOrdersByProject[id] = [];
        advancesByProject[id] = [];
        invoicesByProject[id] = [];
        contractsByProject[id] = [];
        resourceAssignmentsByProject[id] = [];
        minutasByProject[id] = [];
        includeWeekendsByProject[id] = false;
      });

      // Agrupar tareas y convertir formato
      (tasksResult.data || []).forEach(task => {
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
          // Convertir snake_case a camelCase
          wbsCode: task.wbs_code,
          startDate: task.start_date,
          endDate: task.end_date,
          assignedTo: task.assigned_to,
          isMilestone: task.is_milestone,
          originalDuration: task.original_duration
        };
        
        // Remover undefined/null
        Object.keys(cleanTask).forEach(key => {
          if (cleanTask[key] === undefined || cleanTask[key] === null) {
            delete cleanTask[key];
          }
        });
        
        if (tasksByProject[task.project_id]) {
          tasksByProject[task.project_id].push(cleanTask);
        }
      });

      // Agrupar riesgos
      (risksResult.data || []).forEach(risk => {
        if (risksByProject[risk.project_id]) {
          risksByProject[risk.project_id].push(risk);
        }
      });

      // Agrupar órdenes de compra
      (purchaseOrdersResult.data || []).forEach(po => {
        if (purchaseOrdersByProject[po.project_id]) {
          purchaseOrdersByProject[po.project_id].push(po);
        }
      });

      // Agrupar anticipos
      (advancesResult.data || []).forEach(adv => {
        if (advancesByProject[adv.project_id]) {
          advancesByProject[adv.project_id].push(adv);
        }
      });

      // Agrupar facturas
      (invoicesResult.data || []).forEach(inv => {
        if (invoicesByProject[inv.project_id]) {
          invoicesByProject[inv.project_id].push(inv);
        }
      });

      // Agrupar contratos
      (contractsResult.data || []).forEach(cont => {
        if (contractsByProject[cont.project_id]) {
          contractsByProject[cont.project_id].push(cont);
        }
      });

      // Agrupar asignaciones de recursos
      (resourceAssignmentsResult.data || []).forEach(ra => {
        if (resourceAssignmentsByProject[ra.project_id]) {
          resourceAssignmentsByProject[ra.project_id].push(ra);
        }
      });

      // Agrupar y convertir minutas
      (minuteTasksResult.data || []).forEach(mt => {
        const convertedMinuta = {
          id: mt.id,
          tarea: mt.task_description,
          responsable: mt.responsible_person,
          fecha: mt.due_date,
          hitoId: mt.milestone_id,
          estatus: mt.status,
          fechaCreacion: mt.created_at
        };
        
        if (minutasByProject[mt.project_id]) {
          minutasByProject[mt.project_id].push(convertedMinuta);
        }
      });

      // Procesar configuraciones
      (projectConfigsResult.data || []).forEach(config => {
        includeWeekendsByProject[config.project_id] = config.include_weekends || false;
      });

      console.timeEnd('🔨 Procesamiento de Datos');
      console.timeEnd('⚡ Carga Total del Portafolio');

      // ============================================
      // LOGS DE RENDIMIENTO
      // ============================================
      console.log('📊 Estadísticas de carga optimizada:');
      console.log(`  - Proyectos: ${convertedProjects.length}`);
      console.log(`  - Tasks totales: ${tasksResult.data?.length || 0}`);
      console.log(`  - Risks totales: ${risksResult.data?.length || 0}`);
      console.log(`  - Purchase Orders: ${purchaseOrdersResult.data?.length || 0}`);
      console.log(`  - Minutas: ${minuteTasksResult.data?.length || 0}`);
      console.log(`  - Queries ejecutadas: 13 (vs ${4 + (convertedProjects.length * 9)} antes)`);
      console.log(`  - Mejora: ~${Math.round(((4 + (convertedProjects.length * 9) - 13) / (4 + (convertedProjects.length * 9))) * 100)}% menos queries`);

      // ============================================
      // RETORNO: Estructura compatible con código existente
      // ============================================
      const portfolioData = {
        organization,
        projects: convertedProjects,
        tasksByProject: tasksByProject,
        risksByProject: risksByProject,
        globalResources: globalResources,
        corporateAlerts: corporateAlerts,
        purchaseOrdersByProject: purchaseOrdersByProject,
        user: {
          id: user.id,
          email: user.email
        },
        advancesByProject: advancesByProject,
        invoicesByProject: invoicesByProject,
        contractsByProject: contractsByProject,
        resourceAssignmentsByProject: resourceAssignmentsByProject,
        auditLogsByProject: {},  // Se carga desde localStorage
        minutasByProject: minutasByProject,
        includeWeekendsByProject: includeWeekendsByProject,
        currentProjectId: convertedProjects && convertedProjects.length > 0 ? convertedProjects[0].id : null,
        version: '1.0.0',
        lastUpdated: new Date().toISOString()
      };

      console.log('✅ Datos del portafolio cargados y optimizados');
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

      // NOTA: Los logs de auditoría se manejan en localStorage
      // No se eliminan de tabla 'audit_logs' porque no existe con estructura correcta
      console.log('📋 Los logs de auditoría se mantienen en localStorage');

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
          
          // REEMPLAZO COMPLETO: Eliminar tareas existentes y insertar nuevas
          console.log(`🗑️ Eliminando tareas existentes del proyecto ${projectId}...`);
          const { error: deleteError } = await this.supabase
            .from('tasks')
            .delete()
            .eq('project_id', projectId)
            .eq('owner_id', this.currentUser.id);

          if (deleteError) {
            console.error(`❌ Error eliminando tareas existentes para proyecto ${projectId}:`, deleteError);
            throw deleteError;
          }

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
            console.log(`✅ TAREAS REEMPLAZADAS COMPLETAMENTE para proyecto ${projectId}: ${tasksToUpsert.length} tareas nuevas (cronograma anterior eliminado)`);
            
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

      // NOTA: Los logs de auditoría se guardan en localStorage solamente
      // La tabla 'audit_logs' en Supabase no tiene la estructura correcta
      // Los logs se manejan a través de useAuditLog hook y localStorage
      if (data.auditLogsByProject) {
        console.log(`📋 Audit logs detectados pero no se guardan en Supabase (se usan localStorage)`);
      }

      // Guardar/actualizar minutas por proyecto
      if (data.minutasByProject) {
        for (const projectId in data.minutasByProject) {
          const minutas = data.minutasByProject[projectId];
          if (minutas && minutas.length > 0) {
            console.log(`📋 Guardando minutas para proyecto ${projectId}: ${minutas.length} minutas`);

            try {
              // Usar upsert para manejar duplicados sin eliminar minutas existentes
              const result = await this.saveMinutas(projectId, minutas);
              if (!result.success) {
                console.warn(`⚠️ Error guardando minutas para proyecto ${projectId}:`, result.error);
                console.warn(`⚠️ Continuando con el guardado de otros datos...`);
                // NO lanzar error - continuar con el resto del guardado
              } else {
                console.log(`✅ Minutas guardadas exitosamente para proyecto ${projectId}`);
              }
            } catch (minutasError) {
              console.error(`❌ Error inesperado guardando minutas para proyecto ${projectId}:`, minutasError);
              console.warn(`⚠️ Continuando con el guardado de otros datos...`);
              // NO lanzar error - continuar con el resto del guardado
            }
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

  // Verificar que el bucket project-files existe (sin intentar crearlo)
  async initializeStorage() {
    try {
      console.log('🗂️ Verificando Supabase Storage...');
      
      // Solo verificar si el bucket project-files existe
      const { data: buckets, error: listError } = await this.supabase.storage.listBuckets();
      
      if (listError) {
        console.error('❌ Error listando buckets:', listError);
        return false;
      }

      const projectFilesBucket = buckets.find(bucket => bucket.name === 'project-files');
      
      if (!projectFilesBucket) {
        console.log('❌ Bucket project-files no encontrado');
        console.log('🔄 SOLUCIÓN: Crea el bucket manualmente en Supabase Dashboard → Storage → New bucket');
        console.log('🔄 Nombre: project-files, Público: Sí, Límite: 50MB');
        return false;
      } else {
        console.log('✅ Bucket project-files encontrado y disponible');
        console.log(`   - Público: ${projectFilesBucket.public ? 'Sí' : 'No'}`);
        console.log(`   - Límite de archivo: ${projectFilesBucket.file_size_limit ? (projectFilesBucket.file_size_limit / 1024 / 1024).toFixed(0) + 'MB' : 'Sin límite'}`);
      }

      return true;
    } catch (error) {
      console.error('❌ Error verificando Storage:', error);
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

      // Subir archivo con metadatos que incluyan el nombre original
      const { data, error } = await this.supabase.storage
        .from('project-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
          metadata: {
            originalName: file.name,
            uploadedBy: this.currentUser.email,
            projectId: projectId,
            category: category,
            organizationId: this.organizationId,
            ...metadata
          }
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

      // CORRECCIÓN: Buscar archivos siguiendo la estructura correcta del bucket
      // Estructura: {organizationId}/{projectId}/{category}/archivo
      let allFiles = [];
      let error = null;

      console.log(`📋 Buscando archivos siguiendo estructura del bucket`);
      console.log(`🔍 DEBUG - Parámetros de búsqueda:`, {
        organizationId: this.organizationId,
        projectId: projectId,
        category: category
      });

      // 1. Buscar SOLO en la ruta específica del proyecto actual
      const searchPath = category 
        ? `${this.organizationId}/${projectId}/${category}`
        : `${this.organizationId}/${projectId}`;

      console.log(`📁 Buscando archivos SOLO del proyecto actual en ruta: ${searchPath}`);
      console.log(`🔍 DEBUG - Proyecto actual: ${projectId}, Categoría: ${category || 'todas'}`);
      
      const { data: projectFiles, error: projectError } = await this.supabase.storage
        .from('project-files')
        .list(searchPath, {
          limit: 100,
          offset: 0
        });

      if (projectError) {
        console.error(`❌ Error listando archivos en ruta ${searchPath}:`, projectError);
        error = projectError;
      } else {
        console.log(`🔍 DEBUG - Archivos encontrados en ruta ${searchPath}:`, projectFiles);
        
        // Filtrar solo archivos reales (con id no null)
        const realFiles = (projectFiles || []).filter(file => file.id !== null);
        console.log(`✅ Archivos reales del proyecto ${projectId} encontrados: ${realFiles.length}`);
        
        // Agregar la ruta de búsqueda a cada archivo
        realFiles.forEach(file => {
          file.folderPath = searchPath;
        });
        
        allFiles = realFiles;
      }

      // 2. Si no se encontraron archivos en la ruta específica, buscar SOLO en el proyecto actual
      if (allFiles.length === 0) {
        console.log(`📁 No se encontraron archivos en ruta específica, buscando SOLO en el proyecto actual...`);
        
        // Buscar en la carpeta del proyecto actual (sin categoría específica)
        const projectPath = `${this.organizationId}/${projectId}`;
        console.log(`📁 Buscando en carpeta del proyecto: ${projectPath}`);
        
        const { data: projectFolderContents, error: projectFolderError } = await this.supabase.storage
          .from('project-files')
          .list(projectPath, {
            limit: 100,
            offset: 0
          });

        if (projectFolderError) {
          console.error(`❌ Error listando contenido de proyecto ${projectId}:`, projectFolderError);
        } else {
          console.log(`🔍 DEBUG - Contenido de proyecto ${projectId}:`, projectFolderContents);
          
          // Buscar en cada categoría del proyecto
          for (const item of projectFolderContents || []) {
            if (item.id === null) { // Es una carpeta (categoría)
              console.log(`📁 Buscando archivos en categoría: ${item.name}`);
              
              const { data: filesInCategory, error: filesError } = await this.supabase.storage
                .from('project-files')
                .list(`${projectPath}/${item.name}`, {
                  limit: 100,
                  offset: 0
                });

              if (filesError) {
                console.error(`❌ Error listando archivos en categoría ${item.name}:`, filesError);
              } else {
                console.log(`🔍 DEBUG - Archivos en categoría ${item.name}:`, filesInCategory);
                
                // Filtrar solo archivos reales (con id no null)
                const realFilesInCategory = (filesInCategory || []).filter(file => file.id !== null);
                console.log(`✅ Archivos reales en categoría ${item.name}:`, realFilesInCategory.length);
                
                // Agregar la ruta completa a cada archivo
                realFilesInCategory.forEach(file => {
                  file.folderPath = `${projectPath}/${item.name}`;
                });
                
                allFiles = allFiles.concat(realFilesInCategory);
              }
            } else {
              // Es un archivo directamente en la carpeta del proyecto
              console.log(`📄 Archivo encontrado directamente en proyecto: ${item.name}`);
              item.folderPath = projectPath;
              allFiles.push(item);
            }
          }
        }
      }

      console.log(`✅ Total archivos reales encontrados: ${allFiles.length}`);
      const data = allFiles;

      if (error) {
        console.error('❌ Error listando archivos:', error);
        return { success: false, error, files: [] };
      }

      // DEBUG: Mostrar datos raw de Supabase
      console.log('🔍 DEBUG - Datos raw de Supabase:', data);
      
      // DEBUG: Verificar si realmente hay archivos en el bucket
      console.log('🔍 DEBUG - Verificando bucket completo...');
      const { data: bucketContents, error: allError } = await this.supabase.storage
        .from('project-files')
        .list('', {
          limit: 1000,
          offset: 0
        });
      
      if (allError) {
        console.error('❌ Error listando bucket completo:', allError);
      } else {
        console.log('🔍 DEBUG - Todos los archivos en el bucket:', bucketContents);
      }

      // Convertir archivos de Storage a formato esperado
      const files = (data || []).map(file => {
        // CORRECCIÓN: Usar la ruta completa del archivo (carpeta + nombre)
        const filePath = file.folderPath 
          ? `${file.folderPath}/${file.name}`
          : file.name;
          
        const { data: publicData } = this.supabase.storage
          .from('project-files')
          .getPublicUrl(filePath);

        // CORRECCIÓN: Obtener tamaño del archivo desde metadata.size (que es donde Supabase lo guarda)
        const fileSize = file.metadata?.size || 
                        file.metadata?.file_size || 
                        file.size || 
                        0;

        // CORRECCIÓN: Usar created_at directamente (que es la fecha real de Supabase)
        const uploadDate = file.created_at || 
                          file.updated_at || 
                          file.metadata?.created_at || 
                          new Date().toISOString();

        // DEBUG: Mostrar qué valores estamos obteniendo
        console.log(`🔍 DEBUG - Procesando archivo ${file.name}:`, {
          'filePath': filePath,
          'file.metadata?.size': file.metadata?.size,
          'file.metadata?.file_size': file.metadata?.file_size,
          'file.size': file.size,
          'fileSize final': fileSize,
          'file.created_at': file.created_at,
          'file.updated_at': file.updated_at,
          'file.metadata?.created_at': file.metadata?.created_at,
          'uploadDate final': uploadDate
        });

        // CORRECCIÓN: Usar el nombre original del archivo si está disponible en metadata
        const originalFileName = file.metadata?.originalName || 
                                file.metadata?.name || 
                                file.name;

        return {
          id: `file-${file.name.split('.')[0]}`,
          projectId,
          fileName: originalFileName, // Usar nombre original en lugar del nombre técnico
          fileSize: fileSize,
          uploadDate: uploadDate,
          storagePath: filePath,
          publicUrl: publicData.publicUrl,
          metadata: {
            storageProvider: 'supabase',
            bucket: 'project-files',
            originalFile: file, // Incluir objeto original para debugging
            technicalName: file.name, // Guardar el nombre técnico para referencia
            ...file.metadata
          }
        };
      });

      console.log(`✅ ${files.length} archivos encontrados en Storage`);
      
      // DEBUG: Mostrar detalles de los archivos para diagnosticar
      console.log('🔍 DEBUG - Archivos encontrados:', files.map(f => ({
        fileName: f.fileName,
        fileSize: f.fileSize,
        uploadDate: f.uploadDate,
        storagePath: f.storagePath,
        publicUrl: f.publicUrl,
        originalFile: f.metadata?.originalFile
      })));
      
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

  // ========== GESTIÓN DE MINUTAS ==========

  // Cargar minutas por proyecto
  async loadMinutasByProject(projectId) {
    try {
      if (!this.currentUser || !this.organizationId) {
        console.warn('⚠️ No se pueden cargar minutas: usuario no autenticado');
        return { success: false, error: 'No autenticado', minutas: [] };
      }

      console.log(`📋 Cargando minutas para proyecto: ${projectId}`);

      const { data, error } = await this.supabase
        .from('minute_tasks')
        .select('*')
        .eq('project_id', projectId)
        .eq('organization_id', this.organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error cargando minutas:', error);
        return { success: false, error, minutas: [] };
      }

      // Mapear datos de Supabase a formato frontend
      const minutasMapeadas = (data || []).map(minuta => ({
        id: minuta.id,
        tarea: minuta.task_description,
        responsable: minuta.responsible_person,
        fecha: minuta.due_date,
        hitoId: minuta.milestone_id,
        estatus: minuta.status,
        fechaCreacion: minuta.created_at
      }));

      console.log(`✅ Minutas cargadas: ${minutasMapeadas.length}`);
      return { success: true, minutas: minutasMapeadas };

    } catch (error) {
      console.error('❌ Error inesperado cargando minutas:', error);
      return { success: false, error, minutas: [] };
    }
  }

  // Guardar minutas en Supabase
  async saveMinutas(projectId, minutaTasks) {
    try {
      if (!this.currentUser || !this.organizationId) {
        console.warn('⚠️ No se pueden guardar minutas: usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      console.log(`💾 Guardando ${minutaTasks.length} minutas para proyecto: ${projectId}`);

      // Función para generar UUID válido si no existe
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      // Preparar datos para insertar/actualizar
      const minutasToUpsert = minutaTasks.map(minuta => {
        // Verificar si el ID es un UUID válido
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const minutaId = uuidRegex.test(minuta.id) ? minuta.id : generateUUID();
        
        // Log si se generó un nuevo UUID
        if (minutaId !== minuta.id) {
          console.log(`🔄 Generando nuevo UUID para minuta "${minuta.tarea}": ${minuta.id} → ${minutaId}`);
        }

        return {
          id: minutaId,
          project_id: projectId,
          organization_id: this.organizationId,
          user_id: this.currentUser.id,
          task_description: minuta.tarea,
          responsible_person: minuta.responsable,
          due_date: minuta.fecha,
          milestone_id: minuta.hitoId,
          status: minuta.estatus || 'Pendiente',
          created_at: minuta.fechaCreacion || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      // Verificar duplicados antes de enviar
      const minutaIds = new Set();
      const duplicateIds = [];
      minutasToUpsert.forEach(minuta => {
        if (minutaIds.has(minuta.id)) {
          duplicateIds.push(minuta.id);
        } else {
          minutaIds.add(minuta.id);
        }
      });

      if (duplicateIds.length > 0) {
        console.warn(`⚠️ DUPLICADOS DETECTADOS EN MINUTAS ANTES DE ENVIAR:`, duplicateIds);
        console.warn(`⚠️ Total duplicados: ${duplicateIds.length} de ${minutasToUpsert.length} minutas`);
        
        // Remover duplicados manteniendo solo la primera ocurrencia
        const uniqueMinutas = [];
        const processedIds = new Set();
        minutasToUpsert.forEach(minuta => {
          if (!processedIds.has(minuta.id)) {
            processedIds.add(minuta.id);
            uniqueMinutas.push(minuta);
          }
        });
        
        console.log(`🔄 Removiendo ${duplicateIds.length} minutas duplicadas, procesando ${uniqueMinutas.length} únicas`);
        minutasToUpsert = uniqueMinutas;
      }

      // Usar upsert para manejar duplicados sin eliminar minutas existentes
      const { data, error } = await this.supabase
        .from('minute_tasks')
        .upsert(minutasToUpsert, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select('*');

      if (error) {
        console.error('❌ Error guardando minutas:', error);
        console.error('❌ Detalles del error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return { success: false, error };
      }

      console.log(`✅ Minutas guardadas/actualizadas: ${data?.length || 0}`);

      // Verificar si se guardaron correctamente
      try {
        const { data: savedMinutas, error: verifyError } = await this.supabase
          .from('minute_tasks')
          .select('id, task_description, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (!verifyError && savedMinutas) {
          const savedCount = savedMinutas.length;
          const expectedCount = minutasToUpsert.length;
          
          if (savedCount >= expectedCount) {
            console.log(`✅ Verificación exitosa: ${savedCount} minutas en Supabase para proyecto ${projectId}`);
          } else {
            console.warn(`⚠️ Posible discrepancia: Esperadas ${expectedCount}, Encontradas ${savedCount} minutas`);
          }
        }
      } catch (verifyError) {
        console.warn(`⚠️ Error verificando minutas guardadas:`, verifyError);
      }

      return { success: true, data };

    } catch (error) {
      console.error('❌ Error inesperado guardando minutas:', error);
      return { success: false, error };
    }
  }

  // Actualizar estatus de una minuta
  async updateMinutaStatus(minutaId, newStatus) {
    try {
      if (!this.currentUser) {
        console.warn('⚠️ No se puede actualizar minuta: usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      console.log(`🔄 Actualizando estatus de minuta ${minutaId} a: ${newStatus}`);

      const { data, error } = await this.supabase
        .from('minute_tasks')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', minutaId)
        .eq('user_id', this.currentUser.id)
        .select('*');

      if (error) {
        console.error('❌ Error actualizando minuta:', error);
        return { success: false, error };
      }

      console.log(`✅ Minuta actualizada`);
      return { success: true, data };

    } catch (error) {
      console.error('❌ Error inesperado actualizando minuta:', error);
      return { success: false, error };
    }
  }

  // Actualizar una minuta completa
  async updateMinuta(minutaId, updateData) {
    try {
      if (!this.currentUser) {
        console.warn('⚠️ No se puede actualizar minuta: usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      console.log(`🔄 Actualizando minuta ${minutaId}:`, updateData);

      const { data, error } = await this.supabase
        .from('minute_tasks')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', minutaId)
        .eq('user_id', this.currentUser.id)
        .select('*');

      if (error) {
        console.error('❌ Error actualizando minuta:', error);
        return { success: false, error };
      }

      console.log(`✅ Minuta actualizada completamente`);


      return { success: true, data };

    } catch (error) {
      console.error('❌ Error inesperado actualizando minuta:', error);
      return { success: false, error };
    }
  }

  // Eliminar una minuta
  async deleteMinuta(minutaId) {
    try {
      if (!this.currentUser) {
        console.warn('⚠️ No se puede eliminar minuta: usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      console.log(`🗑️ Eliminando minuta: ${minutaId}`);

      const { error } = await this.supabase
        .from('minute_tasks')
        .delete()
        .eq('id', minutaId)
        .eq('user_id', this.currentUser.id);

      if (error) {
        console.error('❌ Error eliminando minuta:', error);
        return { success: false, error };
      }

      console.log(`✅ Minuta eliminada`);
      return { success: true };

    } catch (error) {
      console.error('❌ Error inesperado eliminando minuta:', error);
      return { success: false, error };
    }
  }

  // ========== AUDIT LOGS CON ESTRUCTURA CORRECTA ==========

  // Guardar eventos de auditoría en una estructura que funcione
  async saveAuditEvents(projectId, auditEvents) {
    try {
      if (!this.currentUser || !this.organizationId) {
        console.warn('⚠️ No se pueden guardar eventos de auditoría: usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      if (!auditEvents || auditEvents.length === 0) {
        return { success: true, data: [] };
      }

      console.log(`📋 Guardando ${auditEvents.length} eventos de auditoría para proyecto: ${projectId}`);

      // Preparar eventos para insertar con estructura simple
      const eventsToInsert = auditEvents.map(event => ({
        id: event.id || crypto.randomUUID(),
        project_id: projectId,
        organization_id: this.organizationId,
        user_id: this.currentUser.id,
        timestamp: event.timestamp || new Date().toISOString(),
        event_category: event.category || 'general',
        event_action: event.action || 'unknown',
        event_description: event.description || '',
        event_details: JSON.stringify(event.details || {}),
        event_severity: event.severity || 'medium',
        event_user: event.user || this.currentUser.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Usar UPSERT para evitar errores de clave duplicada
      const { data, error } = await this.supabase
        .from('project_audit_events')
        .upsert(eventsToInsert, { onConflict: 'id' })
        .select('*');

      if (error) {
        console.error('❌ Error guardando eventos de auditoría:', error);
        return { success: false, error };
      }

      console.log(`✅ Eventos de auditoría guardados: ${data?.length || 0}`);
      return { success: true, data };

    } catch (error) {
      console.error('❌ Error inesperado guardando eventos de auditoría:', error);
      return { success: false, error };
    }
  }

  // Cargar eventos de auditoría
  async loadAuditEvents(projectId) {
    try {
      if (!this.currentUser) {
        console.warn('⚠️ No se pueden cargar eventos de auditoría: usuario no autenticado');
        return { success: false, error: 'No autenticado', events: [] };
      }

      console.log(`📋 Cargando eventos de auditoría para proyecto: ${projectId}`);

      const { data, error } = await this.supabase
        .from('project_audit_events')
        .select('*')
        .eq('project_id', projectId)
        .eq('organization_id', this.organizationId)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('❌ Error cargando eventos de auditoría:', error);
        return { success: false, error, events: [] };
      }

      // Convertir de vuelta al formato esperado por useAuditLog
      const events = (data || []).map(event => ({
        id: event.id,
        timestamp: event.timestamp,
        projectId: event.project_id,
        category: event.event_category,
        action: event.event_action,
        description: event.event_description,
        details: JSON.parse(event.event_details || '{}'),
        severity: event.event_severity,
        user: event.event_user
      }));

      console.log(`✅ Eventos de auditoría cargados: ${events.length}`);
      return { success: true, events };

    } catch (error) {
      console.error('❌ Error inesperado cargando eventos de auditoría:', error);
      return { success: false, error, events: [] };
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
