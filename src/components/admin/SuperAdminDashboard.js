// src/components/admin/SuperAdminDashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  FolderKanban, 
  CheckSquare,
  ArrowLeft,
  Activity
} from 'lucide-react';
import SuperAdminService from '../../services/SuperAdminService';
import OrganizationsList from './OrganizationsList';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await SuperAdminService.getGlobalStats();
      setStats(data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-gradient-to-r ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  🔧 Panel de Super-Admin
                </h1>
                <p className="text-gray-600 mt-1">
                  Gestión global de StrategiaPM
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-600 font-medium">Sistema Operativo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Organizaciones Totales"
            value={stats?.total_organizations || 0}
            icon={Building2}
            color="from-blue-600 to-cyan-600"
          />
          <StatCard
            title="Proyectos Totales"
            value={stats?.total_projects || 0}
            icon={FolderKanban}
            color="from-purple-600 to-indigo-600"
          />
          <StatCard
            title="Tareas Totales"
            value={stats?.total_tasks || 0}
            icon={CheckSquare}
            color="from-green-600 to-emerald-600"
          />
          <StatCard
            title="Miembros Activos"
            value={stats?.active_members || 0}
            icon={Users}
            color="from-orange-600 to-red-600"
          />
        </div>

        {/* Organizations List */}
        <OrganizationsList 
          organizations={stats?.organizations_by_status || []} 
          onRefresh={loadStats} 
        />
      </div>
    </div>
  );
};

export default SuperAdminDashboard;

