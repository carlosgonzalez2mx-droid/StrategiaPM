import React, { useState, useEffect } from 'react';
import { CCB_MEMBERS } from '../../utils/changeAuthority';
import { getFunctionalRoleLabel } from '../../constants/unifiedRoles';

const CCBPanel = ({ change, currentUserPermissions, onUpdateVotes }) => {
  // Obtener el rol funcional del usuario actual
  const userFunctionalRole = currentUserPermissions?.functionalRole;
  
  console.log('👤 Rol funcional del usuario en CCB:', userFunctionalRole);

  const [votes, setVotes] = useState(
    change.ccbVotes || CCB_MEMBERS.map(m => ({ ...m, vote: null, comments: '', votedAt: null }))
  );

  useEffect(() => {
    if (change.ccbVotes) {
      setVotes(change.ccbVotes);
    }
  }, [change.ccbVotes]);

  // Verificar si el usuario actual puede votar como este rol
  const canVoteAsRole = (roleKey) => {
    if (!userFunctionalRole) return false;
    
    // Mapeo de roles funcionales a keys de CCB
    const roleMapping = {
      'executive': 'executive',
      'sponsor': 'sponsor',
      'project_manager': 'pm',
      'finance_manager': 'finance',
      'quality_manager': 'quality',
      'technical_lead': 'tech'
    };
    
    const mappedRole = roleMapping[userFunctionalRole];
    return mappedRole === roleKey;
  };

  const handleVote = (memberId, voteType) => {
    const updatedVotes = votes.map(v => 
      v.id === memberId 
        ? { ...v, vote: voteType, votedAt: new Date().toISOString() }
        : v
    );
    setVotes(updatedVotes);
    onUpdateVotes(updatedVotes);
  };

  const handleCommentChange = (memberId, comments) => {
    const updatedVotes = votes.map(v => 
      v.id === memberId ? { ...v, comments } : v
    );
    setVotes(updatedVotes);
  };

  // Definir miembros CCB (objeto para el dashboard)
  const ccbMembers = {
    pm: { name: 'Project Manager', icon: '📊', required: true },
    tech: { name: 'Technical Lead', icon: '🔧', required: true },
    finance: { name: 'Finance Manager', icon: '💰', required: false },
    quality: { name: 'Quality Manager', icon: '⭐', required: false },
    sponsor: { name: 'Sponsor', icon: '🎯', required: true }
  };

  // Calcular resultados de votación en tiempo real
  const calculateVotingResults = () => {
    if (!votes || votes.length === 0) {
      return {
        totalMembers: Object.keys(ccbMembers).length,
        votedCount: 0,
        approveCount: 0,
        rejectCount: 0,
        abstainCount: 0,
        quorumPercentage: 0,
        approvePercentage: 0,
        rejectPercentage: 0,
        abstainPercentage: 0,
        hasQuorum: false,
        hasMajority: false,
        result: 'pending'
      };
    }

    const totalMembers = votes.length;
    const votedMembers = votes.filter(v => v.vote).length;
    const approveCount = votes.filter(v => v.vote === 'approve').length;
    const rejectCount = votes.filter(v => v.vote === 'reject').length;
    const abstainCount = votes.filter(v => v.vote === 'abstain').length;

    const quorumPercentage = (votedMembers / totalMembers) * 100;
    
    // CORRECCIÓN: Calcular sobre TOTAL de miembros, no solo los que votaron
    const approvePercentage = (approveCount / totalMembers) * 100;
    const rejectPercentage = (rejectCount / totalMembers) * 100;
    const abstainPercentage = (abstainCount / totalMembers) * 100;

    const hasQuorum = quorumPercentage >= 60;
    
    // CRÍTICO: Solo puede haber mayoría SI hay quorum
    // Y la mayoría debe ser > 50% del TOTAL, no de los votantes
    const hasMajority = hasQuorum && approvePercentage > 50;

    let result = 'pending';
    if (votedMembers === totalMembers) {
      // Solo cuando TODOS votaron, determinar resultado final
      result = hasQuorum && hasMajority ? 'approved' : 'rejected';
    }

    return {
      totalMembers,
      votedCount: votedMembers,
      approveCount,
      rejectCount,
      abstainCount,
      quorumPercentage,
      approvePercentage,
      rejectPercentage,
      abstainPercentage,
      hasQuorum,
      hasMajority,
      result
    };
  };

  const votingResults = calculateVotingResults();

  const approvalCount = votes.filter(v => v.vote === 'approve').length;
  const rejectionCount = votes.filter(v => v.vote === 'reject').length;
  const requiredApprovals = votes.filter(v => v.required).length;

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800 flex items-center">
          <span className="text-2xl mr-2">🏛️</span>
          Comité de Control de Cambios (CCB)
        </h3>
        
        {/* Indicador del rol del usuario */}
        {userFunctionalRole && (
          <div className="bg-blue-100 border border-blue-300 rounded-lg px-4 py-2">
            <div className="text-xs text-gray-600">Tu rol en CCB:</div>
            <div className="font-semibold text-blue-800">
              {getFunctionalRoleLabel(userFunctionalRole)}
            </div>
          </div>
        )}
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Votación para aprobar o rechazar el cambio
      </p>
      
      {/* Dashboard de Votación en Tiempo Real */}
      <div className="mb-6 bg-white rounded-xl p-6 border-2 border-indigo-300 shadow-lg">
        <h4 className="font-bold text-gray-800 mb-4 text-lg">📊 Resultados en Tiempo Real</h4>
        
        {/* Contadores de votos */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-3xl font-bold text-green-700">{votingResults.approveCount}</div>
            <div className="text-sm text-gray-600">✅ Aprobar</div>
            <div className="text-xs text-gray-500">
              {votingResults.approvePercentage.toFixed(1)}% del total
            </div>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-3xl font-bold text-red-700">{votingResults.rejectCount}</div>
            <div className="text-sm text-gray-600">❌ Rechazar</div>
            <div className="text-xs text-gray-500">
              {votingResults.rejectPercentage.toFixed(1)}% del total
            </div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-3xl font-bold text-gray-700">{votingResults.abstainCount}</div>
            <div className="text-sm text-gray-600">⚪ Abstención</div>
            <div className="text-xs text-gray-500">
              {votingResults.abstainPercentage.toFixed(1)}% del total
            </div>
          </div>
        </div>

        {/* Barra de Participación (Quorum) */}
        <div className="space-y-4 mb-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-700 font-medium">
                📊 Participación (Mínimo: 60% para quorum)
              </span>
              <span className={`font-bold ${votingResults.hasQuorum ? 'text-green-600' : 'text-red-600'}`}>
                {votingResults.votedCount}/{votingResults.totalMembers} miembros
                ({votingResults.quorumPercentage.toFixed(1)}%)
                {votingResults.hasQuorum ? ' ✓' : ' ✗'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 relative">
              <div 
                className={`h-4 rounded-full transition-all ${votingResults.hasQuorum ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${votingResults.quorumPercentage}%` }}
              />
              {/* Línea de quorum */}
              <div className="absolute top-0 left-[60%] w-0.5 h-4 bg-gray-600"></div>
              <div className="absolute top-4 left-[60%] transform -translate-x-1/2 text-xs text-gray-600">
                60%
              </div>
            </div>
          </div>

          {/* Barra de Aprobación (Mayoría) */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-700 font-medium">
                ✅ Aprobación (Mínimo: &gt;50% del total para aprobar)
              </span>
              <span className={`font-bold ${votingResults.hasMajority ? 'text-green-600' : 'text-gray-600'}`}>
                {votingResults.approveCount}/{votingResults.totalMembers} aprueban
                ({votingResults.approvePercentage.toFixed(1)}%)
                {votingResults.hasMajority ? ' ✓' : ''}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 relative">
              <div 
                className={`h-4 rounded-full transition-all ${
                  votingResults.hasMajority ? 'bg-green-500' : 
                  votingResults.hasQuorum ? 'bg-yellow-500' : 'bg-gray-400'
                }`}
                style={{ width: `${votingResults.approvePercentage}%` }}
              />
              {/* Línea de mayoría */}
              <div className="absolute top-0 left-[50%] w-0.5 h-4 bg-gray-600"></div>
              <div className="absolute top-4 left-[50%] transform -translate-x-1/2 text-xs text-gray-600">
                50%
              </div>
            </div>
          </div>
        </div>

        {/* Explicación del estado actual */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600 text-lg">ℹ️</span>
            <div className="flex-1">
              <h5 className="font-semibold text-blue-800 text-sm mb-1">
                Estado Actual
              </h5>
              <div className="text-xs text-blue-700 space-y-1">
                {!votingResults.hasQuorum && (
                  <p className="font-medium">
                    ⚠️ Aún no hay quorum. Se requiere que al menos {Math.ceil(votingResults.totalMembers * 0.6)} de {votingResults.totalMembers} miembros voten.
                    Faltan {Math.ceil(votingResults.totalMembers * 0.6) - votingResults.votedCount} votos.
                  </p>
                )}
                {votingResults.hasQuorum && !votingResults.hasMajority && (
                  <p className="font-medium">
                    ✓ Hay quorum, pero NO hay mayoría. Se requiere que más de {Math.floor(votingResults.totalMembers / 2)} miembros aprueben.
                    {votingResults.votedCount < votingResults.totalMembers && 
                      ` Faltan ${votingResults.totalMembers - votingResults.votedCount} votos por emitir.`
                    }
                  </p>
                )}
                {votingResults.hasMajority && (
                  <p className="font-medium text-green-700">
                    ✓ Hay quorum Y mayoría. El cambio será aprobado.
                    {votingResults.votedCount < votingResults.totalMembers && 
                      ` (Faltan ${votingResults.totalMembers - votingResults.votedCount} votos, pero ya se alcanzó mayoría)`
                    }
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Resultado final (solo si todos votaron) */}
        {votingResults.result !== 'pending' && (
          <div className={`p-4 rounded-lg text-center font-bold text-lg ${
            votingResults.result === 'approved' 
              ? 'bg-green-100 text-green-800 border-2 border-green-300' 
              : 'bg-red-100 text-red-800 border-2 border-red-300'
          }`}>
            {votingResults.result === 'approved' 
              ? '✅ CAMBIO APROBADO POR CCB' 
              : '❌ CAMBIO RECHAZADO POR CCB'
            }
            <div className="text-sm font-normal mt-2">
              Votación completa: {votingResults.approveCount} a favor, {votingResults.rejectCount} en contra, {votingResults.abstainCount} abstenciones
            </div>
          </div>
        )}

        {/* Advertencia si falta quorum */}
        {votingResults.votedCount > 0 && !votingResults.hasQuorum && (
          <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-center">
            <p className="text-yellow-800 font-medium text-sm">
              ⚠️ Sin quorum, la votación NO es válida. Todos los miembros CCB deben participar.
            </p>
          </div>
        )}
      </div>

      {/* Nota informativa sobre reglas */}
      <div className="mb-6 bg-gray-50 border border-gray-300 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <span className="text-gray-600 text-lg">📐</span>
          <div className="flex-1">
            <h5 className="font-semibold text-gray-800 text-sm mb-2">
              Reglas de Votación CCB
            </h5>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>• <strong>Quorum:</strong> Mínimo 60% de miembros deben votar (≥{Math.ceil(votingResults.totalMembers * 0.6)} de {votingResults.totalMembers})</li>
              <li>• <strong>Mayoría:</strong> Más del 50% del TOTAL de miembros deben aprobar (&gt;{Math.floor(votingResults.totalMembers / 2)} de {votingResults.totalMembers})</li>
              <li>• <strong>Resultado:</strong> Solo es válido si hay quorum Y mayoría</li>
              <li>• <strong>Importante:</strong> Los porcentajes se calculan sobre el total de miembros, no sobre los que ya votaron</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="space-y-3 mb-6">
        {votes.map(member => {
          const userCanVote = canVoteAsRole(member.id);
          
          return (
          <div key={member.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-gray-800">{member.name}</div>
                <div className="text-sm text-gray-500">
                  {member.role} {member.required && <span className="text-red-500">*</span>}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleVote(member.id, 'approve')}
                  disabled={!userCanVote}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    !userCanVote 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : member.vote === 'approve' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-green-50'
                  }`}
                  title={!userCanVote ? 'No tienes este rol para votar' : 'Aprobar'}
                >
                  ✅ Aprobar
                </button>
                <button
                  onClick={() => handleVote(member.id, 'reject')}
                  disabled={!userCanVote}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    !userCanVote 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : member.vote === 'reject' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-red-50'
                  }`}
                  title={!userCanVote ? 'No tienes este rol para votar' : 'Rechazar'}
                >
                  ❌ Rechazar
                </button>
              </div>
            </div>
            
            {member.vote && (
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Comentarios opcionales..."
                  value={member.comments || ''}
                  onChange={(e) => handleCommentChange(member.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Votado: {new Date(member.votedAt).toLocaleString()}
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>
      
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{approvalCount}</div>
            <div className="text-xs text-gray-600">A favor</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{rejectionCount}</div>
            <div className="text-xs text-gray-600">En contra</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{requiredApprovals}</div>
            <div className="text-xs text-gray-600">Requeridos</div>
          </div>
        </div>
        
        {approvalCount >= requiredApprovals && (
          <div className="mt-3 text-center text-sm font-medium text-green-600">
            ✅ Se alcanzó el quórum de aprobación
          </div>
        )}
      </div>
      
      {/* Nota informativa */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
        <div className="flex items-start space-x-2">
          <span className="text-yellow-600 text-lg">ℹ️</span>
          <div>
            <h4 className="font-semibold text-yellow-800 text-sm mb-1">
              Restricción de Votación
            </h4>
            <p className="text-xs text-yellow-700">
              Solo puedes votar con tu rol funcional asignado. Los demás roles están deshabilitados para ti.
              Si necesitas cambiar tu voto, contacta a un administrador.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CCBPanel;
