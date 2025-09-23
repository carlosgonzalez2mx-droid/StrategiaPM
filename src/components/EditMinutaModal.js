import React, { useState, useEffect } from 'react';

const EditMinutaModal = ({ isOpen, onClose, minuta, hitos, onUpdate }) => {
  const [editedMinuta, setEditedMinuta] = useState({
    id: '',
    tarea: '',
    responsable: '',
    fecha: '',
    hitoId: '',
    estatus: 'Pendiente'
  });

  // Cargar datos de la minuta cuando el modal se abre
  useEffect(() => {
    if (isOpen && minuta) {
      setEditedMinuta({
        id: minuta.id,
        tarea: minuta.tarea || '',
        responsable: minuta.responsable || '',
        fecha: minuta.fecha || '',
        hitoId: minuta.hitoId || '',
        estatus: minuta.estatus || 'Pendiente'
      });
    }
  }, [isOpen, minuta]);

  const handleInputChange = (field, value) => {
    setEditedMinuta(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    // Validar campos requeridos
    if (!editedMinuta.tarea.trim()) {
      alert('La tarea es requerida');
      return;
    }

    if (!editedMinuta.responsable.trim()) {
      alert('El responsable es requerido');
      return;
    }

    if (!editedMinuta.fecha) {
      alert('La fecha es requerida');
      return;
    }

    if (!editedMinuta.hitoId) {
      alert('El hito relacionado es requerido');
      return;
    }

    // Llamar a la función de actualización
    onUpdate(editedMinuta);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">✏️ Editar Minuta</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Campo Tarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tarea *
            </label>
            <textarea
              value={editedMinuta.tarea}
              onChange={(e) => handleInputChange('tarea', e.target.value)}
              placeholder="Descripción de la tarea..."
              maxLength={70}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="text-xs text-gray-500 mt-1">
              {editedMinuta.tarea.length}/70 caracteres
            </div>
          </div>

          {/* Campo Responsable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Responsable *
            </label>
            <input
              type="text"
              value={editedMinuta.responsable}
              onChange={(e) => handleInputChange('responsable', e.target.value)}
              placeholder="Nombre del responsable"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Campo Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha *
            </label>
            <input
              type="date"
              value={editedMinuta.fecha}
              onChange={(e) => handleInputChange('fecha', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Campo Hito */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hito relacionado *
            </label>
            <select
              value={editedMinuta.hitoId}
              onChange={(e) => handleInputChange('hitoId', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar hito...</option>
              {hitos.map((hito) => (
                <option key={hito.id} value={hito.id}>
                  {hito.wbsCode} - {hito.name}
                </option>
              ))}
            </select>
          </div>

          {/* Campo Estatus */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estatus
            </label>
            <select
              value={editedMinuta.estatus}
              onChange={(e) => handleInputChange('estatus', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Pendiente">Pendiente</option>
              <option value="En Proceso">En Proceso</option>
              <option value="Completado">Completado</option>
            </select>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            💾 Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMinutaModal;