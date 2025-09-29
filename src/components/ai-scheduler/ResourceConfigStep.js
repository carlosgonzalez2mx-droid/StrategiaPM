/**
 * ResourceConfigStep - Paso 2 del wizard: Configuración de Recursos
 * StrategiaPM - MVP Implementation
 */

import React, { useState, useEffect } from 'react';

const ResourceConfigStep = ({ wizardData, onUpdate }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [newMember, setNewMember] = useState({ name: '', role: '', experience: 'intermediate' });

  // Opciones predefinidas
  const experienceLevels = [
    { value: 'junior', label: 'Junior (0-2 años)', description: 'Recién iniciado, necesita supervisión' },
    { value: 'intermediate', label: 'Intermedio (2-5 años)', description: 'Experiencia moderada, trabajo independiente' },
    { value: 'senior', label: 'Senior (5-10 años)', description: 'Experiencia sólida, puede liderar' },
    { value: 'expert', label: 'Experto (10+ años)', description: 'Experiencia avanzada, mentoría' }
  ];

  const teamRoles = [
    { value: 'project_manager', label: 'Project Manager', icon: '👨‍💼' },
    { value: 'team_lead', label: 'Team Lead', icon: '👨‍💻' },
    { value: 'buyer', label: 'Comprador(a)', icon: '🛒' },
    { value: 'developer', label: 'Desarrollador', icon: '💻' },
    { value: 'designer', label: 'Diseñador', icon: '🎨' },
    { value: 'qa_tester', label: 'QA/Tester', icon: '🔍' },
    { value: 'devops', label: 'DevOps', icon: '⚙️' },
    { value: 'analyst', label: 'Analista', icon: '📊' },
    { value: 'engineer', label: 'Ingeniero', icon: '🔧' },
    { value: 'technician', label: 'Técnico', icon: '🛠️' },
    { value: 'specialist', label: 'Especialista', icon: '🎯' },
    { value: 'other', label: 'Otro', icon: '👤' }
  ];

  const riskTolerances = [
    { value: 'low', label: 'Bajo', description: 'Prefiero estimaciones conservadoras con más tiempo' },
    { value: 'medium', label: 'Medio', description: 'Equilibrio entre tiempo y riesgo' },
    { value: 'high', label: 'Alto', description: 'Estimaciones agresivas, menos tiempo' }
  ];

  // Efecto para calcular experiencia promedio del equipo
  useEffect(() => {
    if (teamMembers.length > 0) {
      const experienceScores = {
        'junior': 1,
        'intermediate': 2,
        'senior': 3,
        'expert': 4
      };

      const totalScore = teamMembers.reduce((sum, member) => 
        sum + (experienceScores[member.experience] || 2), 0
      );
      
      const averageScore = totalScore / teamMembers.length;
      let teamExperience = 'intermediate';
      
      if (averageScore <= 1.5) teamExperience = 'junior';
      else if (averageScore >= 3.5) teamExperience = 'expert';
      else if (averageScore >= 2.5) teamExperience = 'senior';

      onUpdate({ 
        teamSize: teamMembers.length,
        teamExperience: teamExperience,
        teamMembers: teamMembers
      });
    } else {
      onUpdate({ 
        teamSize: wizardData.teamSize || 1,
        teamExperience: wizardData.teamExperience || 'intermediate',
        teamMembers: []
      });
    }
  }, [teamMembers]); // CORRECCIÓN: Remover onUpdate para evitar bucle infinito

  // Agregar miembro al equipo
  const addTeamMember = () => {
    if (newMember.name.trim() && newMember.role) {
      const member = {
        id: Date.now(),
        name: newMember.name.trim(),
        role: newMember.role,
        experience: newMember.experience
      };
      
      setTeamMembers(prev => [...prev, member]);
      setNewMember({ name: '', role: '', experience: 'intermediate' });
    }
  };

  // Remover miembro del equipo
  const removeTeamMember = (memberId) => {
    setTeamMembers(prev => prev.filter(member => member.id !== memberId));
  };

  // Obtener icono del rol
  const getRoleIcon = (roleValue) => {
    const role = teamRoles.find(r => r.value === roleValue);
    return role ? role.icon : '👤';
  };

  // Obtener etiqueta del rol
  const getRoleLabel = (roleValue) => {
    const role = teamRoles.find(r => r.value === roleValue);
    return role ? role.label : roleValue;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          👥 Configuración de Recursos
        </h3>
        <p className="text-gray-600">
          Define el equipo y recursos disponibles para optimizar el cronograma
        </p>
      </div>

      {/* Tamaño del Equipo */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-xl mr-2">👥</span>
          Tamaño del Equipo
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((size) => (
            <button
              key={size}
              onClick={() => onUpdate({ teamSize: size })}
              className={`p-4 rounded-lg border-2 transition-all text-center ${
                wizardData.teamSize === size
                  ? 'border-blue-500 bg-blue-100 text-blue-800'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
              }`}
            >
              <div className="text-2xl font-bold">{size}</div>
              <div className="text-sm text-gray-600">
                {size === 1 ? 'persona' : 'personas'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Composición del Equipo */}
      <div className="bg-green-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-xl mr-2">👨‍👩‍👧‍👦</span>
          Composición del Equipo
        </h4>
        
        {/* Agregar miembro */}
        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <h5 className="font-semibold text-gray-700 mb-3">Agregar Miembro del Equipo</h5>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={newMember.name}
                onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ej: María García"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol
              </label>
              <select
                value={newMember.role}
                onChange={(e) => setNewMember(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Seleccionar rol</option>
                {teamRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.icon} {role.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Experiencia
              </label>
              <select
                value={newMember.experience}
                onChange={(e) => setNewMember(prev => ({ ...prev, experience: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {experienceLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <button
            onClick={addTeamMember}
            disabled={!newMember.name.trim() || !newMember.role}
            className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            + Agregar Miembro
          </button>
        </div>

        {/* Lista de miembros */}
        {teamMembers.length > 0 && (
          <div className="space-y-2">
            <h5 className="font-semibold text-gray-700">Miembros del Equipo ({teamMembers.length})</h5>
            {teamMembers.map((member) => (
              <div key={member.id} className="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xl mr-3">{getRoleIcon(member.role)}</span>
                  <div>
                    <div className="font-semibold">{member.name}</div>
                    <div className="text-sm text-gray-600">
                      {getRoleLabel(member.role)} • {experienceLevels.find(e => e.value === member.experience)?.label}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeTeamMember(member.id)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Experiencia del Equipo */}
      <div className="bg-yellow-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-xl mr-2">🎓</span>
          Nivel de Experiencia del Equipo
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {experienceLevels.map((level) => (
            <button
              key={level.value}
              onClick={() => onUpdate({ teamExperience: level.value })}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                wizardData.teamExperience === level.value
                  ? 'border-yellow-500 bg-yellow-100 text-yellow-800'
                  : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-25'
              }`}
            >
              <div className="font-semibold">{level.label}</div>
              <div className="text-sm text-gray-600 mt-1">{level.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Disponibilidad del Equipo */}
      <div className="bg-purple-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-xl mr-2">⏰</span>
          Disponibilidad del Equipo
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { value: 25, label: '25%', description: 'Tiempo parcial' },
            { value: 50, label: '50%', description: 'Medio tiempo' },
            { value: 75, label: '75%', description: 'Tiempo completo' },
            { value: 100, label: '100%', description: 'Dedicación total' }
          ].map((availability) => (
            <button
              key={availability.value}
              onClick={() => onUpdate({ teamAvailability: availability.value })}
              className={`p-4 rounded-lg border-2 transition-all text-center ${
                wizardData.teamAvailability === availability.value
                  ? 'border-purple-500 bg-purple-100 text-purple-800'
                  : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
              }`}
            >
              <div className="text-2xl font-bold">{availability.label}</div>
              <div className="text-sm text-gray-600">{availability.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tolerancia al Riesgo */}
      <div className="bg-red-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-xl mr-2">⚠️</span>
          Tolerancia al Riesgo
        </h4>
        
        <div className="space-y-3">
          {riskTolerances.map((risk) => (
            <button
              key={risk.value}
              onClick={() => onUpdate({ riskTolerance: risk.value })}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                wizardData.riskTolerance === risk.value
                  ? 'border-red-500 bg-red-100 text-red-800'
                  : 'border-gray-200 hover:border-red-300 hover:bg-red-25'
              }`}
            >
              <div className="font-semibold">{risk.label}</div>
              <div className="text-sm text-gray-600 mt-1">{risk.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Presupuesto */}
      <div className="bg-indigo-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <span className="text-xl mr-2">💰</span>
          Presupuesto del Proyecto
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Presupuesto Total (USD)
            </label>
            <input
              type="number"
              value={wizardData.budget || ''}
              onChange={(e) => onUpdate({ budget: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Ej: 50000"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Presupuesto por Mes (USD)
            </label>
            <input
              type="number"
              value={wizardData.monthlyBudget || ''}
              onChange={(e) => onUpdate({ monthlyBudget: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Ej: 10000"
            />
          </div>
        </div>
      </div>

      {/* Resumen de Configuración */}
      <div className="bg-gray-100 rounded-lg p-4">
        <h5 className="font-semibold text-gray-800 mb-2">Resumen de Configuración:</h5>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• Equipo: {wizardData.teamSize || 1} personas</div>
          <div>• Experiencia: {experienceLevels.find(e => e.value === wizardData.teamExperience)?.label}</div>
          {wizardData.teamAvailability && <div>• Disponibilidad: {wizardData.teamAvailability}%</div>}
          {wizardData.riskTolerance && <div>• Riesgo: {riskTolerances.find(r => r.value === wizardData.riskTolerance)?.label}</div>}
          {wizardData.budget && <div>• Presupuesto: ${wizardData.budget.toLocaleString()}</div>}
          {teamMembers.length > 0 && <div>• Miembros definidos: {teamMembers.length}</div>}
        </div>
      </div>
    </div>
  );
};

export default ResourceConfigStep;
