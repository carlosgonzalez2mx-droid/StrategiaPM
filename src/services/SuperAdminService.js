// src/services/SuperAdminService.js
import supabaseService from './SupabaseService';

class SuperAdminService {
  
  async isSuperAdmin() {
    try {
      const user = supabaseService.getCurrentUser();
      if (!user) return false;

      const { data: superAdminData } = await supabaseService.supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (superAdminData) return true;

      const { data: roleData } = await supabaseService.supabase
        .from('user_organization_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .single();

      return roleData !== null;
    } catch (error) {
      console.error('Error verificando super-admin:', error);
      return false;
    }
  }

  async listAllOrganizations() {
    try {
      const { data, error } = await supabaseService.supabase
        .from('organizations')
        .select(`
          *,
          members_count:organization_members(count),
          projects_count:projects(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Formatear los datos
      const formatted = data?.map(org => ({
        ...org,
        member_count: org.members_count?.[0]?.count || 0,
        project_count: org.projects_count?.[0]?.count || 0
      }));

      return { data: formatted, error: null };
    } catch (error) {
      console.error('Error listando organizaciones:', error);
      return { data: null, error };
    }
  }

  async getOrganizationDetails(orgId) {
    try {
      const { data, error } = await supabaseService.supabase
        .from('organizations')
        .select(`
          *,
          members:organization_members(
            id,
            user_email,
            user_id,
            role,
            status,
            invited_at,
            accepted_at,
            created_at
          ),
          projects:projects(
            id,
            name,
            status,
            progress,
            manager,
            start_date,
            end_date,
            budget
          )
        `)
        .eq('id', orgId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error obteniendo detalles:', error);
      return { data: null, error };
    }
  }

  async getOrganizationMetrics(orgId) {
    try {
      const [projects, tasks, members, risks] = await Promise.all([
        supabaseService.supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId),
        supabaseService.supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true }),
        supabaseService.supabase
          .from('organization_members')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('status', 'active'),
        supabaseService.supabase
          .from('risks')
          .select('id', { count: 'exact', head: true })
      ]);

      return {
        projectsCount: projects.count || 0,
        tasksCount: tasks.count || 0,
        activeMembersCount: members.count || 0,
        risksCount: risks.count || 0
      };
    } catch (error) {
      console.error('Error obteniendo métricas:', error);
      return {
        projectsCount: 0,
        tasksCount: 0,
        activeMembersCount: 0,
        risksCount: 0
      };
    }
  }

  async getGlobalStats() {
    try {
      // Intentar usar función RPC si existe
      const { data, error } = await supabaseService.supabase
        .rpc('get_super_admin_stats');

      if (error && error.code !== '42883') { // 42883 = función no existe
        throw error;
      }
      
      if (data) return data;

      // Fallback: calcular manualmente
      const [orgs, projects, tasks, members] = await Promise.all([
        supabaseService.supabase.from('organizations').select('*'),
        supabaseService.supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabaseService.supabase.from('tasks').select('id', { count: 'exact', head: true }),
        supabaseService.supabase.from('organization_members').select('id', { count: 'exact', head: true })
      ]);

      return {
        total_organizations: orgs.data?.length || 0,
        total_projects: projects.count || 0,
        total_tasks: tasks.count || 0,
        active_members: members.count || 0,
        organizations_by_status: orgs.data || []
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas globales:', error);
      return {
        total_organizations: 0,
        total_projects: 0,
        total_tasks: 0,
        active_members: 0,
        organizations_by_status: []
      };
    }
  }

  async updateOrganization(orgId, updates) {
    try {
      const { data, error } = await supabaseService.supabase
        .from('organizations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', orgId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error actualizando organización:', error);
      return { data: null, error };
    }
  }

  async deleteOrganization(orgId) {
    try {
      // Advertencia: Esto eliminará todos los datos relacionados
      const { error } = await supabaseService.supabase
        .from('organizations')
        .delete()
        .eq('id', orgId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Error eliminando organización:', error);
      return { error };
    }
  }
}

const superAdminService = new SuperAdminService();

export default superAdminService;

