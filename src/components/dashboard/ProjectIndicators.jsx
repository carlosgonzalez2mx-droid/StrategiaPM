import React from 'react';
import { getStatusIcon, getStatusLabel, getStatusBadgeClasses } from '../../utils/statusHelpers';
import { formatCurrency, formatDate, formatPercentage } from '../../utils/formatters';

const ProjectIndicators = ({ activeProjects }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="text-3xl mr-3">📊</span>
        Indicadores por Proyecto
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Proyecto</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Estatus</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Presupuesto</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Inicio</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Fin</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Progreso</th>
            </tr>
          </thead>
          <tbody>
            {activeProjects.map((project) => (
              <tr key={project.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getStatusIcon(project.status)}</span>
                    <span className="font-medium text-gray-800">{project.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={getStatusBadgeClasses(project.status)}>
                    {getStatusLabel(project.status)}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {formatCurrency(project.budget || 0)}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {formatDate(project.startDate)}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {formatDate(project.endDate)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, Math.max(0, (project.progress || 0)))}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">
                      {formatPercentage(project.progress)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectIndicators;
