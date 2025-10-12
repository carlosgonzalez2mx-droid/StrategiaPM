import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';

const PortfolioOverview = ({ activeProjects, projects, totalBudget, earliestStart, latestEnd }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="text-3xl mr-3">🏢</span>
        Vista General del Portfolio
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">📊</span>
            <span className="text-sm font-medium text-blue-600">Proyectos Activos</span>
          </div>
          <div className="text-3xl font-bold text-blue-800">
            {activeProjects.length}
          </div>
          <div className="text-sm text-blue-600 mt-1">
            de {projects?.length || 0} total
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">💰</span>
            <span className="text-sm font-medium text-green-600">Presupuesto Total</span>
          </div>
          <div className="text-3xl font-bold text-green-800">
            {formatCurrency(totalBudget)}
          </div>
          <div className="text-sm text-green-600 mt-1">
            Presupuesto asignado
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">📅</span>
            <span className="text-sm font-medium text-purple-600">Inicio Más Temprano</span>
          </div>
          <div className="text-xl font-bold text-purple-800">
            {formatDate(earliestStart)}
          </div>
          <div className="text-sm text-purple-600 mt-1">
            Fecha de inicio del portfolio
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🏁</span>
            <span className="text-sm font-medium text-orange-600">Fin Más Tardío</span>
          </div>
          <div className="text-xl font-bold text-orange-800">
            {formatDate(latestEnd)}
          </div>
          <div className="text-sm text-orange-600 mt-1">
            Fecha de fin del portfolio
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioOverview;
