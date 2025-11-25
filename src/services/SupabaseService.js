import { createClient } from '@supabase/supabase-js';
import { supabaseLogger } from '../utils/logger';

// Configuración de Supabase desde variables de entorno
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Validar que las variables de entorno estén configuradas
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '❌ Missing Supabase configuration. ' +
    'Please ensure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set in your .env file. ' +
    'See .env.example for reference.'
  );
}

class SupabaseService {
  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.currentUser = null;
    this.organizationId = null;
    this.isSaving = false; // Flag para prevenir guardados simultáneos
  }

  // Generar ID determinístico basado en proyecto + identificador único
  generateDeterministicId(projectId, uniqueIdentifier) {
    // Si ya es un UUID válido, devolverlo tal cual
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(uniqueIdentifier)) {
      return uniqueIdentifier;
    }

    // Crear un ID determinístico basado en proyecto + identificador
    const baseString = `${projectId}-${uniqueIdentifier}`;
    let hash = 0;

    for (let i = 0; i < baseString.length; i++) {
      const char = baseString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Convertir a formato UUID-like
    const hashHex = Math.abs(hash).toString(16).padStart(32, '0');

    return [
      hashHex.substring(0, 8),
      hashHex.substring(8, 12),
      '4' + hashHex.substring(13, 16),
      '8' + hashHex.substring(17, 20),
      hashHex.substring(20, 32)
    ].join('-');
  }

  // Inicializar el servicio
  async initialize() {
    try {
      supabaseLogger.init(' Inicializando SupabaseService...');

      // Verificar si hay un usuario autenticado
      const { data: { user } } = await this.supabase.auth.getUser();
      this.currentUser = user;

      if (user) {
        supabaseLogger.success(' Usuario autenticado:', user.email);

        try {
          // USAR DETECCIÓN AUTOMÁTICA
          supabaseLogger.init(' Iniciando detección de organización...');
          const orgData = await this.detectUserOrganization();
          if (orgData && orgData.id) {
            this.organizationId = orgData.id;
            supabaseLogger.success(' Detección de organización completada. OrganizationId:', this.organizationId);
          } else {
            supabaseLogger.warning(' No se pudo detectar organización automáticamente');
            this.organizationId = null;
          }
        } catch (error) {
          supabaseLogger.error(' Error en detección de organización:', error);
          this.organizationId = null;
        }
      } else {
        supabaseLogger.warning(' No hay usuario autenticado');
        this.organizationId = null;
      }

      return true;
    } catch (error) {
      supabaseLogger.error(' Error inicializando SupabaseService:', error);
      return false;
    }
  }

  // Detectar organización del usuario automáticamente
  async detectUserOrganization(userEmail) {
    const emailToUse = userEmail || this.currentUser?.email;

    if (!emailToUse) {
      supabaseLogger.data('❌ No hay usuario para detectar organización');
      return null;
    }

    try {
      supabaseLogger.loading(' Detectando organización para:', emailToUse);

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
            created_at,
            subscription_plan,
            subscription_status,
            subscription_start_date,
            subscription_end_date,
            trial_ends_at,
            max_projects,
            max_users
          )
        `)
        .eq('user_email', emailToUse)
        .eq('status', 'active')
        .single();

      if (error) {
        supabaseLogger.error(' Error buscando membresía:', error);
        supabaseLogger.error('Código de error:', error.code);
        supabaseLogger.error('Mensaje:', error.message);
        return null;
      }

      if (!membership || !membership.organizations) {
        supabaseLogger.warning('⚠️ No se encontró organización activa para el usuario');
        return null;
      }

      const orgData = {
        id: membership.organizations.id,
        name: membership.organizations.name,
        role: membership.role,
        owner_id: membership.organizations.owner_id,
        created_at: membership.organizations.created_at,
        membership_id: membership.id,
        // Campos de suscripción
        subscriptionPlan: membership.organizations.subscription_plan || 'free',
        subscriptionStatus: membership.organizations.subscription_status || 'active',
        subscriptionStartDate: membership.organizations.subscription_start_date,
        subscriptionEndDate: membership.organizations.subscription_end_date,
        trialEndsAt: membership.organizations.trial_ends_at,
        maxProjects: membership.organizations.max_projects,
        maxUsers: membership.organizations.max_users,
        // Mantener snake_case para compatibilidad
        subscription_plan: membership.organizations.subscription_plan,
        subscription_status: membership.organizations.subscription_status,
        subscription_start_date: membership.organizations.subscription_start_date,
        subscription_end_date: membership.organizations.subscription_end_date,
        trial_ends_at: membership.organizations.trial_ends_at,
        max_projects: membership.organizations.max_projects,
        max_users: membership.organizations.max_users
      };

      supabaseLogger.success(' Organización detectada:', orgData.name);
      supabaseLogger.data(' Rol del usuario:', orgData.role);
      supabaseLogger.data(' Organization ID:', orgData.id);

      // Guardar en la instancia
      this.organizationId = orgData.id;

      return orgData;

    } catch (error) {
      supabaseLogger.error(' Error inesperado detectando organización:', error);
      return null;
    }
  }

  // NUEVA: Forzar recarga de organización y limpiar caché
  async forceReloadOrganization() {
    supabaseLogger.update(' Forzando recarga de organización...');

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
          supabaseLogger.data(`🗑️ Limpiando localStorage: ${key}`);
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
          supabaseLogger.data(`🗑️ Limpiando sessionStorage: ${key}`);
          sessionStorage.removeItem(key);
        }
      });

      // Forzar nueva detección de organización
      const newOrgId = await this.detectUserOrganization();

      supabaseLogger.success(' Recarga de organización completada:', newOrgId);
      return newOrgId;

    } catch (error) {
      supabaseLogger.error(' Error en forceReloadOrganization:', error);
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
        supabaseLogger.error(' Error cargando organización:', error);
        return null;
      }

      // DETECCIÓN AUTOMÁTICA: Usar organización del usuario
      this.organizationId = organization.id;
      supabaseLogger.success(' Organización detectada automáticamente:', this.organizationId);
      return organization.id;
    } catch (error) {
      supabaseLogger.error(' Error cargando organización:', error);
      return null;
    }
  }

  // NUEVA: Activar invitaciones pendientes automáticamente
  async activatePendingInvitations(userEmail, userId) {
    try {
      supabaseLogger.loading(' Buscando invitaciones pendientes para:', userEmail);

      // Buscar invitaciones pendientes para este email
      const { data: pendingInvites, error: searchError } = await this.supabase
        .from('organization_members')
        .select('*, organizations(id, name)')
        .eq('user_email', userEmail)
        .eq('status', 'pending');

      if (searchError) {
        supabaseLogger.error(' Error buscando invitaciones:', searchError);
        return;
      }

      if (pendingInvites && pendingInvites.length > 0) {
        supabaseLogger.data(`✅ Encontradas ${pendingInvites.length} invitaciones pendientes`);

        let primaryOrganization = null;

        // Activar todas las invitaciones pendientes
        for (const invite of pendingInvites) {
          supabaseLogger.update(' Activando invitación para organización:', invite.organizations?.name);

          const { error: updateError } = await this.supabase
            .from('organization_members')
            .update({
              user_id: userId,
              status: 'active',
              accepted_at: new Date().toISOString()
            })
            .eq('id', invite.id);

          if (updateError) {
            supabaseLogger.error(' Error activando invitación:', updateError);
          } else {
            supabaseLogger.success(' Invitación activada exitosamente');
            // Usar la primera organización como primaria
            if (!primaryOrganization) {
              primaryOrganization = invite.organization_id;
            }
          }
        }

        // Configurar la organización primaria (USAR LA DE LA INVITACIÓN)
        if (primaryOrganization) {
          this.organizationId = primaryOrganization;
          supabaseLogger.data(' Organización primaria configurada:', primaryOrganization);

          // Mostrar mensaje de bienvenida
          const orgName = pendingInvites[0].organizations?.name || 'la organización';
          supabaseLogger.data(`🎉 ¡Bienvenido a ${orgName}! Has sido agregado automáticamente.`);

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
        supabaseLogger.data(' No se encontraron invitaciones pendientes para este usuario');
        return { activated: 0 };
      }

    } catch (error) {
      supabaseLogger.error(' Error activando invitaciones pendientes:', error);
      return { activated: 0, error: error.message };
    }
  }

  // Autenticación mejorada con manejo robusto de errores
  async signUp(email, password, name) {
    let authUser = null;
    let userCreated = false;
    let organizationCreated = false;

    try {
      supabaseLogger.init(' Iniciando registro de usuario:', email);

      // PASO 1: Crear usuario en auth.users
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            role: 'user'
          },
          emailRedirectTo: undefined,
          shouldCreateUser: true
        }
      });

      if (error) {
        supabaseLogger.error(' Error en auth.signUp:', error);
        throw error;
      }

      if (!data.user) {
        throw new Error('No se pudo crear el usuario en auth.users');
      }

      authUser = data.user;
      supabaseLogger.success(' Usuario creado en auth.users:', authUser.id);

      // PASO 2: Crear usuario en tabla users DIRECTAMENTE (sin esperar trigger)
      supabaseLogger.data(' Creando usuario en tabla users...');

      try {
        // Crear usuario directamente sin esperar al trigger
        const { data: insertedUser, error: insertError } = await this.supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            name: name,
            role: 'user'
          })
          .select()
          .single();

        if (insertError) {
          // Si es error de duplicado (23505), está bien, significa que ya existe
          if (insertError.code === '23505') {
            supabaseLogger.data(' Usuario ya existe en tabla users (posiblemente creado por trigger)');
            userCreated = true;
          } else {
            // Cualquier otro error es crítico
            supabaseLogger.error(' Error crítico creando usuario:', insertError);
            throw insertError;
          }
        } else {
          supabaseLogger.success(' Usuario creado en tabla users:', insertedUser.email);
          userCreated = true;
        }

      } catch (userError) {
        supabaseLogger.error(' Error verificando/creando usuario en tabla users:', userError);

        // ROLLBACK: Eliminar usuario de auth.users si falla completamente
        try {
          supabaseLogger.update(' Iniciando rollback - eliminando usuario de auth.users...');
          await this.supabase.auth.admin.deleteUser(authUser.id);
          supabaseLogger.success(' Rollback completado');
        } catch (rollbackError) {
          supabaseLogger.error(' Error en rollback:', rollbackError);
        }

        throw new Error(`Error creando usuario en tabla users: ${userError.message}`);
      }

      // PASO 3: Verificar invitaciones pendientes ANTES de crear organización
      supabaseLogger.loading(' Verificando invitaciones pendientes antes de crear organización...');
      const { data: pendingInvites } = await this.supabase
        .from('organization_members')
        .select('id')
        .eq('user_email', email)
        .eq('status', 'pending');

      const hasPendingInvitations = pendingInvites && pendingInvites.length > 0;

      if (hasPendingInvitations) {
        supabaseLogger.data(`✅ Usuario tiene ${pendingInvites.length} invitación(es) pendiente(s) - NO se creará organización propia`);
      }

      // PASO 4: Crear organización SOLO si NO hay invitaciones pendientes
      if (!hasPendingInvitations) {
        try {
          supabaseLogger.data(' Creando organización con plan FREE para nuevo usuario...');

          // Calcular fecha de fin de trial (14 días desde ahora)
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 14);

          const { data: orgData, error: orgError } = await this.supabase
            .from('organizations')
            .insert({
              name: `${name}'s Organization`,
              owner_id: authUser.id,
              subscription_plan: 'free',
              subscription_status: 'active',
              subscription_start_date: new Date().toISOString(),
              trial_ends_at: trialEndsAt.toISOString(),
              max_projects: 1,
              max_users: 3
            })
            .select('id')
            .single();

          if (orgError) {
            supabaseLogger.warning('⚠️ Error creando organización:', orgError);
            // No es crítico, el usuario puede ser invitado a una organización existente
          } else {
            supabaseLogger.success(' Organización creada con plan FREE:', orgData.id);
            this.organizationId = orgData.id;
            organizationCreated = true;

            // PASO 4.1: Crear membresía del owner en su nueva organización
            try {
              supabaseLogger.data(' Creando membresía del owner en la organización...');
              const { data: memberData, error: memberError } = await this.supabase
                .from('organization_members')
                .insert({
                  organization_id: orgData.id,
                  user_id: authUser.id,
                  user_email: email,
                  role: 'owner',
                  status: 'active'
                })
                .select()
                .single();

              if (memberError) {
                supabaseLogger.error(' Error creando membresía:', memberError);
              } else {
                supabaseLogger.success(' Membresía creada exitosamente:', memberData.id);
              }
            } catch (memberError) {
              supabaseLogger.error(' Error no crítico creando membresía:', memberError);
            }
          }
        } catch (orgError) {
          supabaseLogger.warning('⚠️ Error no crítico creando organización:', orgError);
        }
      } else {
        supabaseLogger.data(' Omitiendo creación de organización - usuario será agregado a organización(es) existente(s)');
      }

      // PASO 5: Configurar usuario actual
      this.currentUser = authUser;

      // PASO 6: Activar invitaciones pendientes (si existen)
      const invitationResult = await this.activatePendingInvitations(email, authUser.id);

      supabaseLogger.success(' Registro completado exitosamente');
      supabaseLogger.data(' Resumen:', {
        authUser: !!authUser,
        userCreated,
        organizationCreated,
        invitationsActivated: invitationResult.activated
      });

      return {
        success: true,
        user: authUser,
        invitationActivation: invitationResult,
        details: {
          userCreated,
          organizationCreated,
          organizationId: this.organizationId
        }
      };

    } catch (error) {
      supabaseLogger.error(' Error en signUp:', error);

      // Si el usuario fue creado en auth.users pero falló en users, intentar limpiar
      if (authUser && !userCreated) {
        supabaseLogger.data(' Limpiando usuario huérfano de auth.users...');
        try {
          await this.supabase.auth.admin.deleteUser(authUser.id);
        } catch (cleanupError) {
          supabaseLogger.error(' Error limpiando usuario huérfano:', cleanupError);
        }
      }

      return {
        success: false,
        error: error.message,
        details: {
          authUser: !!authUser,
          userCreated,
          organizationCreated
        }
      };
    }
  }

  async signIn(email, password) {
    try {
      supabaseLogger.init(' Iniciando login de usuario:', email);

      // PASO 1: Autenticar en auth.users
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        supabaseLogger.error(' Error en auth.signIn:', error);
        throw error;
      }

      if (!data.user) {
        throw new Error('No se pudo autenticar el usuario');
      }

      supabaseLogger.success(' Usuario autenticado en auth.users:', data.user.id);
      this.currentUser = data.user;

      // PASO 2: Verificar/crear usuario en tabla users (SINCRONIZACIÓN AUTOMÁTICA)
      try {
        const { data: existingUser, error: userError } = await this.supabase
          .from('users')
          .select('id, email, name, role')
          .eq('id', data.user.id)
          .single();

        if (userError) {
          if (userError.code === 'PGRST116') {
            // Usuario no existe en tabla users, crearlo
            supabaseLogger.warning(' Usuario no existe en tabla users, creando...');

            const { error: createError } = await this.supabase
              .from('users')
              .insert({
                id: data.user.id,
                email: data.user.email,
                name: data.user.user_metadata?.name || data.user.email.split('@')[0],
                role: data.user.user_metadata?.role || 'user'
              });

            if (createError) {
              supabaseLogger.error(' Error creando usuario en tabla users:', createError);
              throw new Error(`Error sincronizando usuario: ${createError.message}`);
            }

            supabaseLogger.success(' Usuario sincronizado en tabla users');
          } else {
            throw userError;
          }
        } else {
          supabaseLogger.success(' Usuario existe en tabla users');

          // Verificar si necesita actualización
          const needsUpdate =
            existingUser.email !== data.user.email ||
            existingUser.name !== (data.user.user_metadata?.name || data.user.email.split('@')[0]);

          if (needsUpdate) {
            supabaseLogger.update(' Actualizando datos del usuario en tabla users...');
            const { error: updateError } = await this.supabase
              .from('users')
              .update({
                email: data.user.email,
                name: data.user.user_metadata?.name || data.user.email.split('@')[0],
                updated_at: new Date().toISOString()
              })
              .eq('id', data.user.id);

            if (updateError) {
              supabaseLogger.warning('⚠️ Error actualizando usuario:', updateError);
            } else {
              supabaseLogger.success(' Usuario actualizado en tabla users');
            }
          }
        }
      } catch (syncError) {
        supabaseLogger.error(' Error crítico en sincronización de usuario:', syncError);
        // No fallar el login por problemas de sincronización, pero logear el error
        supabaseLogger.warning('⚠️ Continuando con login a pesar del error de sincronización');
      }

      // PASO 3: Activar invitaciones pendientes
      const invitationResult = await this.activatePendingInvitations(email, data.user.id);

      // PASO 4: Cargar organización
      await this.loadOrganization();

      supabaseLogger.success(' Login completado exitosamente');
      supabaseLogger.data(' Resumen:', {
        userAuthenticated: !!data.user,
        invitationsActivated: invitationResult.activated,
        organizationId: this.organizationId
      });

      return {
        success: true,
        user: data.user,
        invitationActivation: invitationResult,
        details: {
          organizationId: this.organizationId,
          synchronized: true
        }
      };
    } catch (error) {
      supabaseLogger.error(' Error en signIn:', error);
      return {
        success: false,
        error: error.message,
        details: {
          userAuthenticated: false,
          synchronized: false
        }
      };
    }
  }

  async signOut() {
    try {
      supabaseLogger.data(' Iniciando logout completo...');

      // 1. LOGOUT DE SUPABASE AUTH
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        supabaseLogger.error(' Error en Supabase signOut:', error);
        throw error;
      }
      supabaseLogger.success(' Supabase auth signOut exitoso');

      // 2. LIMPIAR TODAS LAS PROPIEDADES DEL SERVICIO
      this.currentUser = null;
      this.organizationId = null;
      this.isInitialized = false;

      supabaseLogger.success(' Propiedades del servicio limpiadas');

      // 3. LIMPIAR COMPLETAMENTE EL LOCALSTORAGE
      const keysToRemove = [
        'currentProjectId',
        'useSupabase',
        'portfolioData',
        'mi-dashboard-portfolio',  // Datos del FilePersistenceService
        'supabase.auth.token',
        'sb-localhost-auth-token',
        'sb-auth-token'
      ];

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        supabaseLogger.data(`🗑️ Eliminado localStorage: ${key}`);
      });

      // 4. LIMPIAR SESSIONSTORAGE TAMBIÉN
      const sessionKeysToRemove = [
        'supabase.auth.token',
        'sb-localhost-auth-token',
        'sb-auth-token'
      ];

      sessionKeysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        supabaseLogger.data(`🗑️ Eliminado sessionStorage: ${key}`);
      });

      // 4.1. LIMPIAR INDEXEDDB (datos persistentes de proyectos)
      try {
        supabaseLogger.delete(' Limpiando IndexedDB...');

        // Eliminar base de datos principal de FilePersistenceService
        const deleteMainDB = indexedDB.deleteDatabase('MiDashboardDB');
        deleteMainDB.onsuccess = () => {
          supabaseLogger.success(' IndexedDB "MiDashboardDB" eliminada');
        };
        deleteMainDB.onerror = () => {
          supabaseLogger.warning('⚠️ No se pudo eliminar IndexedDB "MiDashboardDB"');
        };

        // También limpiar otras posibles DBs relacionadas
        const deleteLocalforage = indexedDB.deleteDatabase('localforage');
        deleteLocalforage.onsuccess = () => {
          supabaseLogger.success(' IndexedDB "localforage" eliminada');
        };

      } catch (idbError) {
        supabaseLogger.warning('⚠️ Error limpiando IndexedDB:', idbError);
        // No es crítico, continuar con el logout
      }

      // 5. VERIFICAR QUE NO HAY USUARIO ACTUAL
      const currentUser = await this.supabase.auth.getUser();
      if (currentUser.data.user) {
        supabaseLogger.warning('⚠️ Aún hay usuario después del logout, forzando limpieza...');
        // Forzar logout adicional si es necesario
        await this.supabase.auth.signOut({ scope: 'global' });
      }

      supabaseLogger.success(' Logout completo terminado exitosamente');
      return { success: true };
    } catch (error) {
      supabaseLogger.error(' Error en signOut completo:', error);
      return { success: false, error: error.message };
    }
  }

  // Cargar datos del portafolio - VERSIÓN OPTIMIZADA
  async loadPortfolioData() {
    try {
      supabaseLogger.data(' Cargando datos del portafolio desde Supabase (versión optimizada)...');

      // Obtener usuario autenticado
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();

      if (userError || !user?.email) {
        supabaseLogger.error(' Error obteniendo usuario:', userError);
        return null;
      }

      supabaseLogger.data(' EJECUTANDO DETECCIÓN AUTOMÁTICA DE ORGANIZACIÓN...');
      const organization = await this.detectUserOrganization(user.email);

      if (!organization) {
        supabaseLogger.error(' No se pudo detectar organización para el usuario:', user.email);
        supabaseLogger.error('💡 El usuario debe tener una membresía activa en una organización');
        return null;
      }

      const orgId = organization.id;
      supabaseLogger.success(' Organización detectada:', organization.name);

      // ============================================
      // PASO 1: QUERIES PARALELAS PRINCIPALES
      // ============================================

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

      if (projectsResult.error) {
        supabaseLogger.error(' Error cargando proyectos:', projectsResult.error);
      }

      const projects = projectsResult.data || [];
      const globalResources = resourcesResult.data || [];
      const corporateAlerts = alertsResult.data || [];

      supabaseLogger.data(`✅ Proyectos cargados: ${projects.length}`);

      // Convertir nombres de columnas de snake_case a camelCase
      const convertedProjects = projects.map(project => ({
        ...project,
        startDate: project.start_date || project.startDate,
        endDate: project.end_date || project.endDate,
        businessCase: project.business_case || project.businessCase,
        kickoffDate: project.kickoff_date || project.kickoffDate,
        contingencyReserve: project.contingency_reserve || project.contingencyReserve,
        managementReserve: project.management_reserve || project.managementReserve,
        plannedValue: project.planned_value || project.plannedValue || 0,
        period: project.period || 3,
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
        planned_value: project.planned_value,
        created_at: project.created_at,
        updated_at: project.updated_at,
        organization_id: project.organization_id,
        owner_id: project.owner_id
      }));

      // Si no hay proyectos, retornar estructura básica
      if (convertedProjects.length === 0) {
        supabaseLogger.warning(' No hay proyectos en la organización');

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
          .in('project_id', projectIds)
          .order('wbs_code', { ascending: true, nullsFirst: false }),  // ✅ FIX: Ordenar por wbs_code

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

      // 🔍 DEBUG: Verificar orden de tareas desde Supabase
      if (tasksResult.data && tasksResult.data.length > 0) {
        supabaseLogger.loading(' DEBUG - Primeras 10 tareas desde Supabase (después de .order()):');
        tasksResult.data.slice(0, 10).forEach((t, i) => {
          supabaseLogger.data(`  ${i + 1}. wbs_code="${t.wbs_code}" (tipo: ${typeof t.wbs_code}) - ${t.name}`);
        });
      }

      // ============================================
      // PASO 3: AGRUPAR DATOS POR PROYECTO
      // ============================================

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
          businessValue: task.business_value,  // ✅ FIX: Mapear business_value desde Supabase
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


      // ✅ FIX ADICIONAL: Ordenar manualmente cada proyecto por wbsCode numérico
      // Esto asegura el orden correcto incluso si wbs_code es VARCHAR en Supabase
      Object.keys(tasksByProject).forEach(projectId => {
        tasksByProject[projectId].sort((a, b) => {
          const aNum = parseInt(a.wbsCode) || 0;
          const bNum = parseInt(b.wbsCode) || 0;
          return aNum - bNum;
        });

        supabaseLogger.data(`✅ Tareas ordenadas para proyecto ${projectId}:`,
          tasksByProject[projectId].slice(0, 5).map(t => `${t.wbsCode}: ${t.name}`)
        );
      });


      // ============================================
      // LOGS DE RENDIMIENTO
      // ============================================
      supabaseLogger.data(' Estadísticas de carga optimizada:');
      supabaseLogger.data(`  - Proyectos: ${convertedProjects.length}`);
      supabaseLogger.data(`  - Tasks totales: ${tasksResult.data?.length || 0}`);
      supabaseLogger.data(`  - Risks totales: ${risksResult.data?.length || 0}`);
      supabaseLogger.data(`  - Purchase Orders: ${purchaseOrdersResult.data?.length || 0}`);
      supabaseLogger.data(`  - Minutas: ${minuteTasksResult.data?.length || 0}`);
      supabaseLogger.data(`  - Queries ejecutadas: 13 (vs ${4 + (convertedProjects.length * 9)} antes)`);
      supabaseLogger.data(`  - Mejora: ~${Math.round(((4 + (convertedProjects.length * 9) - 13) / (4 + (convertedProjects.length * 9))) * 100)}% menos queries`);

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

      supabaseLogger.success(' Datos del portafolio cargados y optimizados');
      return portfolioData;

    } catch (error) {
      supabaseLogger.error(' Error cargando datos del portafolio:', error);
      return null;
    }
  }

  // Eliminar proyecto de Supabase
  async deleteProject(projectId) {
    if (!this.currentUser || !this.organizationId) {
      supabaseLogger.warning('⚠️ No hay usuario autenticado o organización');
      return false;
    }

    try {
      supabaseLogger.data(`🗑️ Eliminando proyecto ${projectId} de Supabase...`);

      // Eliminar tareas del proyecto
      const { error: tasksError } = await this.supabase
        .from('tasks')
        .delete()
        .eq('project_id', projectId);

      if (tasksError) {
        supabaseLogger.warning('⚠️ Error eliminando tareas del proyecto:', tasksError);
      }

      // Eliminar configuraciones del proyecto
      const { error: configError } = await this.supabase
        .from('project_configurations')
        .delete()
        .eq('project_id', projectId);

      if (configError) {
        supabaseLogger.warning('⚠️ Error eliminando configuración del proyecto:', configError);
      }

      // NOTA: Los logs de auditoría se manejan en localStorage
      // No se eliminan de tabla 'audit_logs' porque no existe con estructura correcta
      supabaseLogger.data('📋 Los logs de auditoría se mantienen en localStorage');

      // Eliminar el proyecto
      const { error: projectError } = await this.supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (projectError) {
        supabaseLogger.error(' Error eliminando proyecto:', projectError);
        return false;
      }

      supabaseLogger.data(`✅ Proyecto ${projectId} eliminado de Supabase`);
      return true;

    } catch (error) {
      supabaseLogger.error(' Error eliminando proyecto:', error);
      return false;
    }
  }

  // Guardar datos del portafolio
  async savePortfolioData(data) {
    if (!this.currentUser || !this.organizationId) {
      supabaseLogger.warning('⚠️ No hay usuario autenticado o organización');
      return false;
    }

    // PREVENIR GUARDADOS SIMULTÁNEOS
    if (this.isSaving) {
      supabaseLogger.warning('⚠️ savePortfolioData - GUARDADO EN PROGRESO, OMITIENDO');
      return false;
    }

    this.isSaving = true;
    supabaseLogger.save(' Guardando datos del portafolio en Supabase...');

    // Disparar evento de inicio de sincronización
    const syncStartEvent = new CustomEvent('supabaseSyncing', {
      detail: {
        timestamp: new Date().toISOString(),
        message: 'Iniciando sincronización con Supabase'
      }
    });
    window.dispatchEvent(syncStartEvent);

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
                supabaseLogger.warning(`⚠️ Fecha inválida detectada: ${dateString}`);
                return null;
              }

              // Verificar si la fecha está en un rango razonable (1900-2100)
              const year = date.getFullYear();
              if (year < 1900 || year > 2100) {
                supabaseLogger.warning(`⚠️ Año fuera de rango: ${year} en fecha ${dateString}`);
                return null;
              }

              // Retornar en formato ISO
              return date.toISOString().split('T')[0];
            } catch (error) {
              supabaseLogger.warning(`⚠️ Error procesando fecha ${dateString}:`, error);
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
            period: project.period || 3,
            planned_value: project.plannedValue || project.planned_value || 0,
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
        supabaseLogger.success(' Proyectos guardados');
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
              supabaseLogger.warning(`⚠️ Tarea duplicada detectada en Supabase: ${task.id} - ${task.name}`);
              duplicatesFound++;
            } else {
              taskIds.add(task.id);
              uniqueTasks.push(task);
            }
          }

          if (duplicatesFound > 0) {
            supabaseLogger.warning(`⚠️ Se encontraron ${duplicatesFound} tareas duplicadas en Supabase, eliminando duplicados...`);
          }

          const tasksToProcess = uniqueTasks;
          const tasksToUpsert = tasksToProcess.map(task => {
            // Generar UUID válido si el ID no es un UUID
            const generateUUID = () => {
              return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
              });
            };

            // Verificar si el ID es un UUID válido
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            const taskId = uuidRegex.test(task.id)
              ? task.id
              : this.generateDeterministicId(projectId, task.wbsCode || task.id || generateUUID());

            // Log si se generó un nuevo UUID
            if (taskId !== task.id) {
              supabaseLogger.data(`🔄 Generando nuevo UUID para tarea "${task.name}": ${task.id} → ${taskId}`);
            }

            // Función para validar fechas de tareas
            const validateTaskDate = (dateString) => {
              if (!dateString) return null;

              try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) {
                  supabaseLogger.warning(`⚠️ Fecha inválida en tarea: ${dateString}`);
                  return null;
                }
                return date.toISOString().split('T')[0];
              } catch (error) {
                supabaseLogger.warning(`⚠️ Error procesando fecha de tarea ${dateString}:`, error);
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

          supabaseLogger.data(`📋 Enviando ${tasksToUpsert.length} tareas a Supabase para proyecto ${projectId}`);
          supabaseLogger.data(`📋 Primera tarea de ejemplo:`, tasksToUpsert[0]);

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
            supabaseLogger.error(`🚨 DUPLICADOS DETECTADOS ANTES DE ENVIAR A SUPABASE:`, duplicateIds);
            supabaseLogger.error(`🚨 Total duplicados: ${duplicateIds.length} de ${tasksToUpsert.length} tareas`);
          }

          // UPSERT: Actualiza si existe, inserta si es nuevo
          supabaseLogger.data(`📝 Guardando ${tasksToUpsert.length} tareas con UPSERT para proyecto ${projectId}...`);

          // Primero, obtener las tareas existentes para preservar datos no modificados
          const { data: existingTasks, error: fetchError } = await this.supabase
            .from('tasks')
            .select('id')
            .eq('project_id', projectId);

          if (fetchError) {
            supabaseLogger.warning('⚠️ No se pudieron verificar tareas existentes:', fetchError);
          }

          // Marcar tareas para eliminación (las que ya no están en el array nuevo)
          const newTaskIds = new Set(tasksToUpsert.map(t => t.id));
          const existingTaskIds = new Set((existingTasks || []).map(t => t.id));
          const tasksToDelete = Array.from(existingTaskIds).filter(id => !newTaskIds.has(id));

          // Eliminar tareas que ya no existen
          if (tasksToDelete.length > 0) {
            supabaseLogger.data(`🗑️ Eliminando ${tasksToDelete.length} tareas que ya no están en el cronograma`);
            const { error: deleteError } = await this.supabase
              .from('tasks')
              .delete()
              .in('id', tasksToDelete);

            if (deleteError) {
              supabaseLogger.error(' Error eliminando tareas obsoletas:', deleteError);
            }
          }

          // UPSERT las tareas actuales
          const { data: upsertedTasks, error: tasksError } = await this.supabase
            .from('tasks')
            .upsert(tasksToUpsert, {
              onConflict: 'id',
              ignoreDuplicates: false
            })
            .select('id, name');

          if (tasksError) {
            supabaseLogger.error(`❌ Error en UPSERT de tareas para proyecto ${projectId}:`, tasksError);
            supabaseLogger.error(`❌ Detalles del error:`, {
              code: tasksError.code,
              message: tasksError.message,
              details: tasksError.details,
              hint: tasksError.hint
            });
          } else {
            supabaseLogger.data(`✅ UPSERT exitoso: ${upsertedTasks?.length || 0} tareas actualizadas/creadas`);

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
                  supabaseLogger.error(`🚨 DUPLICACIÓN DETECTADA EN SUPABASE!`);
                  supabaseLogger.error(`🚨 Esperadas: ${expectedCount}, Guardadas: ${savedCount}`);
                  supabaseLogger.error(`🚨 Diferencia: ${savedCount - expectedCount} tareas duplicadas`);

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
                    supabaseLogger.error(`🚨 TAREAS DUPLICADAS POR ID:`, duplicates.slice(0, 5));
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
                    supabaseLogger.error(`🚨 TAREAS DUPLICADAS POR NOMBRE:`, duplicateNames);
                  }

                } else {
                  supabaseLogger.data(`✅ Verificación exitosa: ${savedCount} tareas en Supabase`);
                }
              } else {
                supabaseLogger.warning(`⚠️ Error verificando tareas guardadas:`, verifyError);
              }
            } catch (verifyError) {
              supabaseLogger.warning(`⚠️ Error verificando tareas guardadas:`, verifyError);
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
            supabaseLogger.warning(`⚠️ Error guardando riesgos para proyecto ${projectId}:`, risksError);
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
          supabaseLogger.warning('⚠️ Error guardando recursos:', resourcesError);
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
          supabaseLogger.warning('⚠️ Error guardando alertas:', alertsError);
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
            supabaseLogger.warning(`⚠️ Error guardando órdenes de compra para proyecto ${projectId}:`, poError);
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
            supabaseLogger.warning(`⚠️ Error guardando anticipos para proyecto ${projectId}:`, advancesError);
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
            supabaseLogger.warning(`⚠️ Error guardando facturas para proyecto ${projectId}:`, invoicesError);
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
            supabaseLogger.warning(`⚠️ Error guardando contratos para proyecto ${projectId}:`, contractsError);
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
            supabaseLogger.warning(`⚠️ Error guardando asignaciones para proyecto ${projectId}:`, assignmentsError);
          }
        }
      }

      // NOTA: Los logs de auditoría se guardan en localStorage solamente
      // La tabla 'audit_logs' en Supabase no tiene la estructura correcta
      // Los logs se manejan a través de useAuditLog hook y localStorage
      if (data.auditLogsByProject) {
        supabaseLogger.data(`📋 Audit logs detectados pero no se guardan en Supabase (se usan localStorage)`);
      }

      // Guardar/actualizar minutas por proyecto
      if (data.minutasByProject) {
        for (const projectId in data.minutasByProject) {
          const minutas = data.minutasByProject[projectId];
          if (minutas && minutas.length > 0) {
            supabaseLogger.data(`📋 Guardando minutas para proyecto ${projectId}: ${minutas.length} minutas`);

            try {
              // Usar upsert para manejar duplicados sin eliminar minutas existentes
              const result = await this.saveMinutas(projectId, minutas);
              if (!result.success) {
                supabaseLogger.warning(`⚠️ Error guardando minutas para proyecto ${projectId}:`, result.error);
                supabaseLogger.warning(`⚠️ Continuando con el guardado de otros datos...`);
                // NO lanzar error - continuar con el resto del guardado
              } else {
                supabaseLogger.data(`✅ Minutas guardadas exitosamente para proyecto ${projectId}`);
              }
            } catch (minutasError) {
              supabaseLogger.error(`❌ Error inesperado guardando minutas para proyecto ${projectId}:`, minutasError);
              supabaseLogger.warning(`⚠️ Continuando con el guardado de otros datos...`);
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
          supabaseLogger.data(`⚠️ Saltando configuración para proyecto con ID inválido: ${projectId}`);
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
          supabaseLogger.warning(`⚠️ Error guardando configuración para proyecto ${projectId}:`, configError);
          supabaseLogger.warning(`⚠️ Detalles del error de configuración:`, {
            code: configError.code,
            message: configError.message,
            details: configError.details,
            hint: configError.hint
          });
        } else {
          supabaseLogger.data(`✅ Configuración guardada para proyecto ${projectId}`);
        }
      }

      supabaseLogger.success(' Datos del portafolio guardados en Supabase');

      // Disparar evento de guardado exitoso
      const saveSuccessEvent = new CustomEvent('supabaseDataSaved', {
        detail: {
          timestamp: new Date().toISOString(),
          message: 'Datos guardados exitosamente en Supabase',
          dataSize: JSON.stringify(data).length,
          path: 'Supabase Cloud'
        }
      });
      window.dispatchEvent(saveSuccessEvent);

      return true;

    } catch (error) {
      supabaseLogger.error(' Error guardando datos del portafolio:', error);

      // Disparar evento de error
      const errorEvent = new CustomEvent('supabaseError', {
        detail: {
          timestamp: new Date().toISOString(),
          message: `Error guardando en Supabase: ${error.message}`,
          error: error
        }
      });
      window.dispatchEvent(errorEvent);

      return false;
    } finally {
      // Liberar flag de guardado
      this.isSaving = false;
      supabaseLogger.data('🔓 Flag de guardado liberado');

      // Disparar evento de fin de sincronización
      const syncEndEvent = new CustomEvent('supabaseSynced', {
        detail: {
          timestamp: new Date().toISOString(),
          message: 'Sincronización con Supabase completada'
        }
      });
      window.dispatchEvent(syncEndEvent);
    }
  }

  // Obtener usuario actual
  getCurrentUser() {
    return this.currentUser;
  }

  // Función de sincronización automática de usuarios
  async syncUserToPublicTable(userId = null) {
    try {
      const targetUserId = userId || this.currentUser?.id;

      if (!targetUserId) {
        supabaseLogger.warning('⚠️ No hay usuario para sincronizar');
        return { success: false, error: 'No hay usuario para sincronizar' };
      }

      supabaseLogger.update(' Sincronizando usuario:', targetUserId);

      // Obtener datos del usuario de auth.users
      const { data: authUser, error: authError } = await this.supabase.auth.admin.getUserById(targetUserId);

      if (authError || !authUser.user) {
        supabaseLogger.error(' Error obteniendo usuario de auth.users:', authError);
        return { success: false, error: 'Usuario no encontrado en auth.users' };
      }

      const user = authUser.user;

      // Verificar si ya existe en public.users
      const { data: existingUser, error: checkError } = await this.supabase
        .from('users')
        .select('id')
        .eq('id', targetUserId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        supabaseLogger.error(' Error verificando usuario existente:', checkError);
        return { success: false, error: checkError.message };
      }

      if (existingUser) {
        // Usuario existe, actualizar si es necesario
        supabaseLogger.data(' Usuario existe, verificando actualizaciones...');

        const { error: updateError } = await this.supabase
          .from('users')
          .update({
            email: user.email,
            name: user.user_metadata?.name || user.email.split('@')[0],
            role: user.user_metadata?.role || 'user',
            updated_at: new Date().toISOString()
          })
          .eq('id', targetUserId);

        if (updateError) {
          supabaseLogger.error(' Error actualizando usuario:', updateError);
          return { success: false, error: updateError.message };
        }

        supabaseLogger.success(' Usuario actualizado en public.users');
        return { success: true, action: 'updated' };
      } else {
        // Usuario no existe, crearlo
        supabaseLogger.data(' Usuario no existe, creando...');

        const { error: createError } = await this.supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email.split('@')[0],
            role: user.user_metadata?.role || 'user'
          });

        if (createError) {
          supabaseLogger.error(' Error creando usuario:', createError);
          return { success: false, error: createError.message };
        }

        supabaseLogger.success(' Usuario creado en public.users');
        return { success: true, action: 'created' };
      }

    } catch (error) {
      supabaseLogger.error(' Error en syncUserToPublicTable:', error);
      return { success: false, error: error.message };
    }
  }

  // Función de health check para verificar sincronización
  async checkUserSyncHealth() {
    try {
      if (!this.currentUser?.id) {
        return {
          status: 'no_user',
          message: 'No hay usuario autenticado',
          healthy: false
        };
      }

      // Verificar si el usuario existe en public.users
      const { data: publicUser, error } = await this.supabase
        .from('users')
        .select('id, email, name, role, updated_at')
        .eq('id', this.currentUser.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            status: 'missing_in_public',
            message: 'Usuario no existe en tabla public.users',
            healthy: false,
            needsSync: true
          };
        } else {
          return {
            status: 'error',
            message: `Error verificando usuario: ${error.message}`,
            healthy: false
          };
        }
      }

      // Verificar si los datos están sincronizados
      const isEmailSynced = publicUser.email === this.currentUser.email;
      const isNameSynced = publicUser.name === (this.currentUser.user_metadata?.name || this.currentUser.email.split('@')[0]);

      if (!isEmailSynced || !isNameSynced) {
        return {
          status: 'out_of_sync',
          message: 'Datos del usuario desactualizados',
          healthy: false,
          needsSync: true,
          details: {
            emailSynced: isEmailSynced,
            nameSynced: isNameSynced
          }
        };
      }

      return {
        status: 'healthy',
        message: 'Usuario correctamente sincronizado',
        healthy: true,
        user: publicUser
      };

    } catch (error) {
      supabaseLogger.error(' Error en checkUserSyncHealth:', error);
      return {
        status: 'error',
        message: `Error en health check: ${error.message}`,
        healthy: false
      };
    }
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
      supabaseLogger.warning('⚠️ No hay usuario autenticado o organización');
      return false;
    }

    try {
      supabaseLogger.data(' Iniciando limpieza de duplicados en Supabase...');

      // Obtener proyectos de la organización
      const { data: projects, error: projectsError } = await this.supabase
        .from('projects')
        .select('id, name')
        .eq('organization_id', this.organizationId);

      if (projectsError) {
        supabaseLogger.error(' Error obteniendo proyectos:', projectsError);
        return false;
      }

      let totalCleaned = 0;
      let totalErrors = 0;

      for (const project of projects) {
        supabaseLogger.data(`🧹 Limpiando duplicados para proyecto: ${project.name} (${project.id})`);

        // Obtener todas las tareas del proyecto
        const { data: tasks, error: tasksError } = await this.supabase
          .from('tasks')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: true });

        if (tasksError) {
          supabaseLogger.warning(`⚠️ Error obteniendo tareas para proyecto ${project.id}:`, tasksError);
          totalErrors++;
          continue;
        }

        if (!tasks || tasks.length === 0) {
          supabaseLogger.data(`✅ No hay tareas en proyecto ${project.id}`);
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
          supabaseLogger.data(`✅ No hay duplicados en proyecto ${project.id}`);
          continue;
        }

        supabaseLogger.data(`🗑️ Eliminando ${duplicatesToDelete.length} duplicados del proyecto ${project.id}`);

        // Eliminar duplicados
        for (const duplicateId of duplicatesToDelete) {
          const { error: deleteError } = await this.supabase
            .from('tasks')
            .delete()
            .eq('id', duplicateId);

          if (deleteError) {
            supabaseLogger.warning(`⚠️ Error eliminando duplicado ${duplicateId}:`, deleteError);
            totalErrors++;
          } else {
            totalCleaned++;
          }
        }

        supabaseLogger.data(`✅ Limpieza completada para proyecto ${project.id}: ${duplicatesToDelete.length} duplicados eliminados`);
      }

      supabaseLogger.data(`🎉 Limpieza de duplicados completada:`);
      supabaseLogger.data(`• Duplicados eliminados: ${totalCleaned}`);
      supabaseLogger.data(`• Errores: ${totalErrors}`);

      return true;

    } catch (error) {
      supabaseLogger.error(' Error en limpieza de duplicados:', error);
      return false;
    }
  }

  // Función para eliminar un riesgo específico de Supabase
  async deleteRisk(riskId) {
    try {
      if (!this.supabase || !this.currentUser) {
        supabaseLogger.warning('⚠️ No se puede eliminar riesgo: Supabase no inicializado o usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      const { error } = await this.supabase
        .from('risks')
        .delete()
        .eq('id', riskId)
        .eq('owner_id', this.currentUser.id);

      if (error) {
        supabaseLogger.error(' Error eliminando riesgo de Supabase:', error);
        return { success: false, error };
      }

      supabaseLogger.success(' Riesgo eliminado de Supabase:', riskId);
      return { success: true };
    } catch (error) {
      supabaseLogger.error(' Error inesperado eliminando riesgo:', error);
      return { success: false, error };
    }
  }

  // Función para eliminar un anticipo específico de Supabase
  async deleteAdvance(advanceId) {
    try {
      if (!this.supabase || !this.currentUser) {
        supabaseLogger.warning('⚠️ No se puede eliminar anticipo: Supabase no inicializado o usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      const { error } = await this.supabase
        .from('advances')
        .delete()
        .eq('id', advanceId)
        .eq('owner_id', this.currentUser.id);

      if (error) {
        supabaseLogger.error(' Error eliminando anticipo de Supabase:', error);
        return { success: false, error };
      }

      supabaseLogger.success(' Anticipo eliminado de Supabase:', advanceId);
      return { success: true };
    } catch (error) {
      supabaseLogger.error(' Error inesperado eliminando anticipo:', error);
      return { success: false, error };
    }
  }

  // Función para eliminar una factura específica de Supabase
  async deleteInvoice(invoiceId) {
    try {
      if (!this.supabase || !this.currentUser) {
        supabaseLogger.warning('⚠️ No se puede eliminar factura: Supabase no inicializado o usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      const { error } = await this.supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
        .eq('owner_id', this.currentUser.id);

      if (error) {
        supabaseLogger.error(' Error eliminando factura de Supabase:', error);
        return { success: false, error };
      }

      supabaseLogger.success(' Factura eliminada de Supabase:', invoiceId);
      return { success: true };
    } catch (error) {
      supabaseLogger.error(' Error inesperado eliminando factura:', error);
      return { success: false, error };
    }
  }

  // Función para eliminar una orden de compra específica de Supabase
  async deletePurchaseOrder(poId) {
    try {
      if (!this.supabase || !this.currentUser) {
        supabaseLogger.warning('⚠️ No se puede eliminar orden de compra: Supabase no inicializado o usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      const { error } = await this.supabase
        .from('purchase_orders')
        .delete()
        .eq('id', poId)
        .eq('owner_id', this.currentUser.id);

      if (error) {
        supabaseLogger.error(' Error eliminando orden de compra de Supabase:', error);
        return { success: false, error };
      }

      supabaseLogger.success(' Orden de compra eliminada de Supabase:', poId);
      return { success: true };
    } catch (error) {
      supabaseLogger.error(' Error inesperado eliminando orden de compra:', error);
      return { success: false, error };
    }
  }

  // ========== SUPABASE STORAGE FUNCTIONS ==========

  // Verificar que el bucket project-files existe (sin intentar crearlo)
  async initializeStorage() {
    try {
      supabaseLogger.data('🗂️ Verificando Supabase Storage...');

      // Solo verificar si el bucket project-files existe
      const { data: buckets, error: listError } = await this.supabase.storage.listBuckets();

      if (listError) {
        supabaseLogger.error(' Error listando buckets:', listError);
        return false;
      }

      const projectFilesBucket = buckets.find(bucket => bucket.name === 'project-files');

      if (!projectFilesBucket) {
        supabaseLogger.data('❌ Bucket project-files no encontrado');
        supabaseLogger.update(' SOLUCIÓN: Crea el bucket manualmente en Supabase Dashboard → Storage → New bucket');
        supabaseLogger.update(' Nombre: project-files, Público: Sí, Límite: 50MB');
        return false;
      } else {
        supabaseLogger.success(' Bucket project-files encontrado y disponible');
        supabaseLogger.data(`   - Público: ${projectFilesBucket.public ? 'Sí' : 'No'}`);
        supabaseLogger.data(`   - Límite de archivo: ${projectFilesBucket.file_size_limit ? (projectFilesBucket.file_size_limit / 1024 / 1024).toFixed(0) + 'MB' : 'Sin límite'}`);
      }

      return true;
    } catch (error) {
      supabaseLogger.error(' Error verificando Storage:', error);
      return false;
    }
  }

  // Subir archivo a Supabase Storage
  async uploadFileToStorage(file, projectId, category, metadata = {}) {
    try {
      if (!this.currentUser || !this.organizationId) {
        supabaseLogger.warning('⚠️ No se puede subir archivo: usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      // Sanitizar el nombre del archivo (remover caracteres especiales pero mantener el nombre original)
      const sanitizeFileName = (name) => {
        // Separar nombre y extensión
        const parts = name.split('.');
        const extension = parts.pop();
        const baseName = parts.join('.');

        // Limpiar el nombre base: remover caracteres especiales, mantener espacios, guiones y guiones bajos
        const cleanName = baseName
          .normalize('NFD') // Normalizar caracteres acentuados
          .replace(/[\u0300-\u036f]/g, '') // Remover acentos
          .replace(/[^\w\s.-]/g, '') // Mantener solo letras, números, espacios, puntos, guiones
          .replace(/\s+/g, '-') // Reemplazar espacios por guiones
          .substring(0, 100); // Limitar longitud

        return `${cleanName}.${extension}`;
      };

      // Usar el nombre original sanitizado + timestamp para evitar colisiones
      const timestamp = Date.now();
      const sanitizedName = sanitizeFileName(file.name);
      const fileName = `${timestamp}-${sanitizedName}`;

      // Ruta en el bucket: organizationId/projectId/category/filename
      const filePath = `${this.organizationId}/${projectId}/${category}/${fileName}`;

      supabaseLogger.data(`📤 Subiendo archivo a Storage: ${filePath}`);

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
        supabaseLogger.error(' Error subiendo archivo:', error);
        return { success: false, error };
      }

      // Obtener URL pública del archivo
      const { data: publicData } = this.supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      const fileRecord = {
        id: `file-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
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
        description: metadata.description || '', // Agregar descripción al nivel superior
        metadata: {
          ...metadata,
          storageProvider: 'supabase',
          bucket: 'project-files'
        }
      };

      supabaseLogger.success(' Archivo subido exitosamente a Storage:', fileRecord.fileName);
      return { success: true, file: fileRecord };

    } catch (error) {
      supabaseLogger.error(' Error inesperado subiendo archivo:', error);
      return { success: false, error };
    }
  }

  // Descargar archivo de Supabase Storage
  async downloadFileFromStorage(filePath) {
    try {
      if (!this.currentUser) {
        supabaseLogger.warning('⚠️ No se puede descargar archivo: usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      supabaseLogger.data(`📥 Descargando archivo de Storage: ${filePath}`);

      const { data, error } = await this.supabase.storage
        .from('project-files')
        .download(filePath);

      if (error) {
        supabaseLogger.error(' Error descargando archivo:', error);
        return { success: false, error };
      }

      supabaseLogger.success(' Archivo descargado exitosamente');
      return { success: true, data };

    } catch (error) {
      supabaseLogger.error(' Error inesperado descargando archivo:', error);
      return { success: false, error };
    }
  }

  // Eliminar archivo de Supabase Storage
  async deleteFileFromStorage(filePath) {
    try {
      if (!this.currentUser) {
        supabaseLogger.warning('⚠️ No se puede eliminar archivo: usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      supabaseLogger.data(`🗑️ Eliminando archivo de Storage: ${filePath}`);

      const { error } = await this.supabase.storage
        .from('project-files')
        .remove([filePath]);

      if (error) {
        supabaseLogger.error(' Error eliminando archivo:', error);
        return { success: false, error };
      }

      supabaseLogger.success(' Archivo eliminado exitosamente de Storage');
      return { success: true };

    } catch (error) {
      supabaseLogger.error(' Error inesperado eliminando archivo:', error);
      return { success: false, error };
    }
  }

  // Listar archivos de un proyecto en Storage
  async listProjectFiles(projectId, category = null) {
    try {
      if (!this.currentUser || !this.organizationId) {
        supabaseLogger.warning('⚠️ No se pueden listar archivos: usuario no autenticado');
        return { success: false, error: 'No autenticado', files: [] };
      }

      // CORRECCIÓN: Buscar archivos siguiendo la estructura correcta del bucket
      // Estructura: {organizationId}/{projectId}/{category}/archivo
      let allFiles = [];
      let error = null;

      supabaseLogger.data(`📋 Buscando archivos siguiendo estructura del bucket`);
      supabaseLogger.data(`🔍 DEBUG - Parámetros de búsqueda:`, {
        organizationId: this.organizationId,
        projectId: projectId,
        category: category
      });

      // 1. Buscar SOLO en la ruta específica del proyecto actual
      const searchPath = category
        ? `${this.organizationId}/${projectId}/${category}`
        : `${this.organizationId}/${projectId}`;

      supabaseLogger.data(`📁 Buscando archivos SOLO del proyecto actual en ruta: ${searchPath}`);
      supabaseLogger.data(`🔍 DEBUG - Proyecto actual: ${projectId}, Categoría: ${category || 'todas'}`);

      const { data: projectFiles, error: projectError } = await this.supabase.storage
        .from('project-files')
        .list(searchPath, {
          limit: 100,
          offset: 0
        });

      if (projectError) {
        supabaseLogger.error(`❌ Error listando archivos en ruta ${searchPath}:`, projectError);
        error = projectError;
      } else {
        supabaseLogger.data(`🔍 DEBUG - Archivos encontrados en ruta ${searchPath}:`, projectFiles);

        // Filtrar solo archivos reales (con id no null)
        const realFiles = (projectFiles || []).filter(file => file.id !== null);
        supabaseLogger.data(`✅ Archivos reales del proyecto ${projectId} encontrados: ${realFiles.length}`);

        // Agregar la ruta de búsqueda a cada archivo
        realFiles.forEach(file => {
          file.folderPath = searchPath;
        });

        allFiles = realFiles;
      }

      // 2. Si no se encontraron archivos en la ruta específica, buscar SOLO en el proyecto actual
      if (allFiles.length === 0) {
        supabaseLogger.data(`📁 No se encontraron archivos en ruta específica, buscando SOLO en el proyecto actual...`);

        // Buscar en la carpeta del proyecto actual (sin categoría específica)
        const projectPath = `${this.organizationId}/${projectId}`;
        supabaseLogger.data(`📁 Buscando en carpeta del proyecto: ${projectPath}`);

        const { data: projectFolderContents, error: projectFolderError } = await this.supabase.storage
          .from('project-files')
          .list(projectPath, {
            limit: 100,
            offset: 0
          });

        if (projectFolderError) {
          supabaseLogger.error(`❌ Error listando contenido de proyecto ${projectId}:`, projectFolderError);
        } else {
          supabaseLogger.data(`🔍 DEBUG - Contenido de proyecto ${projectId}:`, projectFolderContents);

          // Buscar en cada categoría del proyecto
          for (const item of projectFolderContents || []) {
            if (item.id === null) { // Es una carpeta (categoría)
              supabaseLogger.data(`📁 Buscando archivos en categoría: ${item.name}`);

              const { data: filesInCategory, error: filesError } = await this.supabase.storage
                .from('project-files')
                .list(`${projectPath}/${item.name}`, {
                  limit: 100,
                  offset: 0
                });

              if (filesError) {
                supabaseLogger.error(`❌ Error listando archivos en categoría ${item.name}:`, filesError);
              } else {
                supabaseLogger.data(`🔍 DEBUG - Archivos en categoría ${item.name}:`, filesInCategory);

                // Filtrar solo archivos reales (con id no null)
                const realFilesInCategory = (filesInCategory || []).filter(file => file.id !== null);
                supabaseLogger.data(`✅ Archivos reales en categoría ${item.name}:`, realFilesInCategory.length);

                // Agregar la ruta completa a cada archivo
                realFilesInCategory.forEach(file => {
                  file.folderPath = `${projectPath}/${item.name}`;
                });

                allFiles = allFiles.concat(realFilesInCategory);
              }
            } else {
              // Es un archivo directamente en la carpeta del proyecto
              supabaseLogger.data(`📄 Archivo encontrado directamente en proyecto: ${item.name}`);
              item.folderPath = projectPath;
              allFiles.push(item);
            }
          }
        }
      }

      supabaseLogger.data(`✅ Total archivos reales encontrados: ${allFiles.length}`);
      const data = allFiles;

      if (error) {
        supabaseLogger.error(' Error listando archivos:', error);
        return { success: false, error, files: [] };
      }

      // DEBUG: Mostrar datos raw de Supabase
      supabaseLogger.loading(' DEBUG - Datos raw de Supabase:', data);

      // DEBUG: Verificar si realmente hay archivos en el bucket
      supabaseLogger.loading(' DEBUG - Verificando bucket completo...');
      const { data: bucketContents, error: allError } = await this.supabase.storage
        .from('project-files')
        .list('', {
          limit: 1000,
          offset: 0
        });

      if (allError) {
        supabaseLogger.error(' Error listando bucket completo:', allError);
      } else {
        supabaseLogger.loading(' DEBUG - Todos los archivos en el bucket:', bucketContents);
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
        supabaseLogger.data(`🔍 DEBUG - Procesando archivo ${file.name}:`, {
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
          originalName: originalFileName, // Agregar originalName también
          fileSize: fileSize,
          mimeType: file.metadata?.mimeType || 'application/octet-stream',
          uploadDate: uploadDate,
          storagePath: filePath,
          publicUrl: publicData.publicUrl,
          description: file.metadata?.description || '', // ✅ AGREGAR DESCRIPCIÓN
          relatedItemId: file.metadata?.relatedItemId || null,
          category: file.metadata?.category || 'general',
          uploadedBy: file.metadata?.uploadedBy || 'Usuario',
          metadata: {
            storageProvider: 'supabase',
            bucket: 'project-files',
            originalFile: file, // Incluir objeto original para debugging
            technicalName: file.name, // Guardar el nombre técnico para referencia
            ...file.metadata
          }
        };
      });

      supabaseLogger.data(`✅ ${files.length} archivos encontrados en Storage`);

      // DEBUG: Mostrar detalles de los archivos para diagnosticar
      supabaseLogger.loading(' DEBUG - Archivos encontrados:', files.map(f => ({
        fileName: f.fileName,
        fileSize: f.fileSize,
        uploadDate: f.uploadDate,
        storagePath: f.storagePath,
        publicUrl: f.publicUrl,
        originalFile: f.metadata?.originalFile
      })));

      return { success: true, files };

    } catch (error) {
      supabaseLogger.error(' Error inesperado listando archivos:', error);
      return { success: false, error, files: [] };
    }
  }

  // Obtener URL firmada para acceso temporal
  async getSignedUrl(filePath, expiresIn = 3600) {
    try {
      if (!this.currentUser) {
        supabaseLogger.warning('⚠️ No se puede obtener URL firmada: usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      const { data, error } = await this.supabase.storage
        .from('project-files')
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        supabaseLogger.error(' Error obteniendo URL firmada:', error);
        return { success: false, error };
      }

      supabaseLogger.success(' URL firmada obtenida exitosamente');
      return { success: true, signedUrl: data.signedUrl };

    } catch (error) {
      supabaseLogger.error(' Error inesperado obteniendo URL firmada:', error);
      return { success: false, error };
    }
  }

  // ========== BACKUP DE BASE DE DATOS ==========

  // Crear backup completo de la base de datos
  async createDatabaseBackup() {
    try {
      supabaseLogger.update(' Iniciando backup de base de datos...');

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
          supabaseLogger.data(`📊 Respaldo tabla: ${tableName}`);

          let query = this.supabase.from(tableName).select('*');

          // Aplicar filtros RLS si es necesario
          if (tableName !== 'organizations' && this.organizationId) {
            query = query.eq('organization_id', this.organizationId);
          }

          const { data, error } = await query;

          if (error) {
            supabaseLogger.warning(`⚠️ Error consultando tabla ${tableName}:`, error);
            backupData.data[tableName] = [];
          } else {
            backupData.data[tableName] = data || [];
            supabaseLogger.data(`✅ Tabla ${tableName}: ${data?.length || 0} registros`);
          }
        } catch (tableError) {
          supabaseLogger.error(`❌ Error procesando tabla ${tableName}:`, tableError);
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

      supabaseLogger.data(`✅ Backup completado: ${fileName}`);

      return {
        success: true,
        fileName,
        recordCount: Object.values(backupData.data).reduce((total, tableData) => total + tableData.length, 0),
        tables: tables.length
      };

    } catch (error) {
      supabaseLogger.error(' Error creando backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Crear backup silencioso (sin descarga automática)
  async createSilentBackup() {
    try {
      supabaseLogger.update(' Creando backup silencioso...');

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
        supabaseLogger.data(`✅ Backup silencioso guardado: ${backupData.recordCount} registros`);

        return {
          success: true,
          recordCount: backupData.recordCount,
          tables: backupData.tables.length,
          stored: true
        };
      } catch (storageError) {
        supabaseLogger.warning('⚠️ Error guardando en localStorage:', storageError);
        return {
          success: true,
          recordCount: backupData.recordCount,
          tables: backupData.tables.length,
          stored: false,
          warning: 'Backup creado pero no guardado localmente'
        };
      }

    } catch (error) {
      supabaseLogger.error(' Error creando backup silencioso:', error);
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
            supabaseLogger.warning(`⚠️ Error obteniendo datos de ${tableName}:`, error);
            backupData.data[tableName] = [];
          } else {
            backupData.data[tableName] = data || [];
            totalRecords += (data || []).length;
            supabaseLogger.data(`✅ ${tableName}: ${(data || []).length} registros`);
          }
        } catch (tableError) {
          supabaseLogger.warning(`⚠️ Error procesando tabla ${tableName}:`, tableError);
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
      supabaseLogger.error(' Error generando datos de backup:', error);
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
            supabaseLogger.warning(`⚠️ Error contando tabla ${tableName}:`, error);
            stats[tableName] = 0;
          } else {
            stats[tableName] = count || 0;
            totalRecords += count || 0;
          }
        } catch (tableError) {
          supabaseLogger.error(`❌ Error contando tabla ${tableName}:`, tableError);
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
      supabaseLogger.error(' Error obteniendo estadísticas:', error);
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
        supabaseLogger.warning('⚠️ No se pueden cargar minutas: usuario no autenticado');
        return { success: false, error: 'No autenticado', minutas: [] };
      }

      supabaseLogger.data(`📋 Cargando minutas para proyecto: ${projectId}`);

      const { data, error } = await this.supabase
        .from('minute_tasks')
        .select('*')
        .eq('project_id', projectId)
        .eq('organization_id', this.organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        supabaseLogger.error(' Error cargando minutas:', error);
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

      supabaseLogger.data(`✅ Minutas cargadas: ${minutasMapeadas.length}`);
      return { success: true, minutas: minutasMapeadas };

    } catch (error) {
      supabaseLogger.error(' Error inesperado cargando minutas:', error);
      return { success: false, error, minutas: [] };
    }
  }

  // Guardar minutas en Supabase
  async saveMinutas(projectId, minutaTasks) {
    try {
      if (!this.currentUser || !this.organizationId) {
        supabaseLogger.warning('⚠️ No se pueden guardar minutas: usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      supabaseLogger.data(`💾 Guardando ${minutaTasks.length} minutas para proyecto: ${projectId}`);

      // Función para generar UUID válido si no existe
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      // Preparar datos para insertar/actualizar
      let minutasToUpsert = minutaTasks.map(minuta => {
        // Verificar si el ID es un UUID válido
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const minutaId = uuidRegex.test(minuta.id) ? minuta.id : generateUUID();

        // Log si se generó un nuevo UUID
        if (minutaId !== minuta.id) {
          supabaseLogger.data(`🔄 Generando nuevo UUID para minuta "${minuta.tarea}": ${minuta.id} → ${minutaId}`);
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
        supabaseLogger.warning(`⚠️ DUPLICADOS DETECTADOS EN MINUTAS ANTES DE ENVIAR:`, duplicateIds);
        supabaseLogger.warning(`⚠️ Total duplicados: ${duplicateIds.length} de ${minutasToUpsert.length} minutas`);

        // Remover duplicados manteniendo solo la primera ocurrencia
        const uniqueMinutas = [];
        const processedIds = new Set();
        minutasToUpsert.forEach(minuta => {
          if (!processedIds.has(minuta.id)) {
            processedIds.add(minuta.id);
            uniqueMinutas.push(minuta);
          }
        });

        supabaseLogger.data(`🔄 Removiendo ${duplicateIds.length} minutas duplicadas, procesando ${uniqueMinutas.length} únicas`);
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
        supabaseLogger.error(' Error guardando minutas:', error);
        supabaseLogger.error(' Detalles del error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return { success: false, error };
      }

      supabaseLogger.data(`✅ Minutas guardadas/actualizadas: ${data?.length || 0}`);

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
            supabaseLogger.data(`✅ Verificación exitosa: ${savedCount} minutas en Supabase para proyecto ${projectId}`);
          } else {
            supabaseLogger.warning(`⚠️ Posible discrepancia: Esperadas ${expectedCount}, Encontradas ${savedCount} minutas`);
          }
        }
      } catch (verifyError) {
        supabaseLogger.warning(`⚠️ Error verificando minutas guardadas:`, verifyError);
      }

      return { success: true, data };

    } catch (error) {
      supabaseLogger.error(' Error inesperado guardando minutas:', error);
      return { success: false, error };
    }
  }

  // Actualizar estatus de una minuta
  async updateMinutaStatus(minutaId, newStatus) {
    try {
      if (!this.currentUser) {
        supabaseLogger.warning('⚠️ No se puede actualizar minuta: usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      supabaseLogger.data(`🔄 Actualizando estatus de minuta ${minutaId} a: ${newStatus}`);

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
        supabaseLogger.error(' Error actualizando minuta:', error);
        return { success: false, error };
      }

      supabaseLogger.data(`✅ Minuta actualizada`);
      return { success: true, data };

    } catch (error) {
      supabaseLogger.error(' Error inesperado actualizando minuta:', error);
      return { success: false, error };
    }
  }

  // Actualizar una minuta completa
  async updateMinuta(minutaId, updateData) {
    try {
      if (!this.currentUser) {
        supabaseLogger.warning('⚠️ No se puede actualizar minuta: usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      supabaseLogger.data(`🔄 Actualizando minuta ${minutaId}:`, updateData);

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
        supabaseLogger.error(' Error actualizando minuta:', error);
        return { success: false, error };
      }

      supabaseLogger.data(`✅ Minuta actualizada completamente`);


      return { success: true, data };

    } catch (error) {
      supabaseLogger.error(' Error inesperado actualizando minuta:', error);
      return { success: false, error };
    }
  }

  // Eliminar una minuta
  async deleteMinuta(minutaId) {
    try {
      if (!this.currentUser) {
        supabaseLogger.warning('⚠️ No se puede eliminar minuta: usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      supabaseLogger.data(`🗑️ Eliminando minuta: ${minutaId}`);

      const { error } = await this.supabase
        .from('minute_tasks')
        .delete()
        .eq('id', minutaId)
        .eq('user_id', this.currentUser.id);

      if (error) {
        supabaseLogger.error(' Error eliminando minuta:', error);
        return { success: false, error };
      }

      supabaseLogger.data(`✅ Minuta eliminada`);
      return { success: true };

    } catch (error) {
      supabaseLogger.error(' Error inesperado eliminando minuta:', error);
      return { success: false, error };
    }
  }

  // ========== AUDIT LOGS CON ESTRUCTURA CORRECTA ==========

  // Guardar eventos de auditoría en una estructura que funcione
  async saveAuditEvents(projectId, auditEvents) {
    try {
      if (!this.currentUser || !this.organizationId) {
        supabaseLogger.warning('⚠️ No se pueden guardar eventos de auditoría: usuario no autenticado');
        return { success: false, error: 'No autenticado' };
      }

      if (!auditEvents || auditEvents.length === 0) {
        return { success: true, data: [] };
      }

      supabaseLogger.data(`📋 Guardando ${auditEvents.length} eventos de auditoría para proyecto: ${projectId}`);

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
        supabaseLogger.error(' Error guardando eventos de auditoría:', error);
        return { success: false, error };
      }

      supabaseLogger.data(`✅ Eventos de auditoría guardados: ${data?.length || 0}`);
      return { success: true, data };

    } catch (error) {
      supabaseLogger.error(' Error inesperado guardando eventos de auditoría:', error);
      return { success: false, error };
    }
  }

  // Cargar eventos de auditoría
  async loadAuditEvents(projectId) {
    try {
      if (!this.currentUser) {
        supabaseLogger.warning('⚠️ No se pueden cargar eventos de auditoría: usuario no autenticado');
        return { success: false, error: 'No autenticado', events: [] };
      }

      supabaseLogger.data(`📋 Cargando eventos de auditoría para proyecto: ${projectId}`);

      const { data, error } = await this.supabase
        .from('project_audit_events')
        .select('*')
        .eq('project_id', projectId)
        .eq('organization_id', this.organizationId)
        .order('timestamp', { ascending: false });

      if (error) {
        supabaseLogger.error(' Error cargando eventos de auditoría:', error);
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

      supabaseLogger.data(`✅ Eventos de auditoría cargados: ${events.length}`);
      return { success: true, events };

    } catch (error) {
      supabaseLogger.error(' Error inesperado cargando eventos de auditoría:', error);
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
        supabaseLogger.warning(`⚠️ Tablas faltantes en backup: ${missingTables.join(', ')}`);
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
      supabaseLogger.update(' Iniciando restauración de backup...');

      // Validar archivo
      const validation = this.validateBackupFile(backupData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      supabaseLogger.data(`✅ Archivo válido: ${validation.totalRecords} registros en ${validation.tablesCount} tablas`);

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
          supabaseLogger.data(`⏭️ Saltando tabla ${tableName}: no presente en backup`);
          continue;
        }

        const tableData = backupData.data[tableName];
        if (!Array.isArray(tableData) || tableData.length === 0) {
          supabaseLogger.data(`⏭️ Saltando tabla ${tableName}: sin datos`);
          results.details[tableName] = { processed: 0, errors: 0 };
          continue;
        }

        supabaseLogger.data(`📊 Restaurando tabla ${tableName}: ${tableData.length} registros`);

        try {
          // Limpiar tabla si se especifica
          if (options.clearExisting) {
            supabaseLogger.data(`🗑️ Limpiando tabla ${tableName}...`);
            const { error: deleteError } = await this.supabase
              .from(tableName)
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000'); // Condición que siempre es verdadera

            if (deleteError) {
              supabaseLogger.warning(`⚠️ Error limpiando tabla ${tableName}:`, deleteError);
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
              supabaseLogger.error(`❌ Error insertando lote en ${tableName}:`, error);
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
          supabaseLogger.data(`✅ Tabla ${tableName}: ${processed} procesados, ${errors} errores`);

        } catch (tableError) {
          supabaseLogger.error(`❌ Error procesando tabla ${tableName}:`, tableError);
          results.errors.push({
            table: tableName,
            error: tableError.message
          });
          results.details[tableName] = { processed: 0, errors: tableData.length };
        }
      }

      supabaseLogger.data(`✅ Restauración completada: ${results.processed} registros procesados`);

      return results;

    } catch (error) {
      supabaseLogger.error(' Error en restauración:', error);
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
