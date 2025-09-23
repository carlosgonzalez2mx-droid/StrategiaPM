import React, { useState, useEffect } from 'react';

const MinutaModal = ({ isOpen, onClose, hitos, onSave }) => {
  const [minutaTasks, setMinutaTasks] = useState([
    { id: 1, tarea: '', responsable: '', fecha: '', hitoId: '' },
    { id: 2, tarea: '', responsable: '', fecha: '', hitoId: '' },
    { id: 3, tarea: '', responsable: '', fecha: '', hitoId: '' },
    { id: 4, tarea: '', responsable: '', fecha: '', hitoId: '' },
    { id: 5, tarea: '', responsable: '', fecha: '', hitoId: '' },
    { id: 6, tarea: '', responsable: '', fecha: '', hitoId: '' }
  ]);

  // Resetear formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setMinutaTasks([
        { id: 1, tarea: '', responsable: '', fecha: '', hitoId: '' },
        { id: 2, tarea: '', responsable: '', fecha: '', hitoId: '' },
        { id: 3, tarea: '', responsable: '', fecha: '', hitoId: '' },
        { id: 4, tarea: '', responsable: '', fecha: '', hitoId: '' },
        { id: 5, tarea: '', responsable: '', fecha: '', hitoId: '' },
        { id: 6, tarea: '', responsable: '', fecha: '', hitoId: '' }
      ]);
    }
  }, [isOpen]);

  const handleInputChange = (id, field, value) => {
    setMinutaTasks(prev =>
      prev.map(task =>
        task.id === id ? { ...task, [field]: value } : task
      )
    );
  };

  const handleSave = () => {
    // Filtrar tareas que tienen al menos la descripción de la tarea
    const tareasValidas = minutaTasks.filter(task => task.tarea.trim() !== '');

    if (tareasValidas.length === 0) {
      alert('Debe agregar al menos una tarea para guardar la minuta.');
      return;
    }

    // Validar que las tareas válidas tengan todos los campos requeridos
    const tareasIncompletas = tareasValidas.filter(task =>
      !task.responsable.trim() || !task.fecha || !task.hitoId
    );

    if (tareasIncompletas.length > 0) {
      alert('Todas las tareas deben tener: Responsable, Fecha y Hito relacionado.');
      return;
    }

    // Agregar metadata a las tareas
    const tareasConMetadata = tareasValidas.map(task => ({
      ...task,
      id: crypto.randomUUID(), // Generar UUID válido para Supabase
      fechaCreacion: new Date().toISOString(),
      estatus: 'Pendiente' // Estado inicial
    }));

    onSave(tareasConMetadata);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">📋 Nueva Minuta</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-600 text-sm">
            Complete las tareas derivadas de la reunión. Los campos marcados son obligatorios.
          </p>
        </div>

        {/* Tabla de tareas */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-blue-50">
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                  #
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                  Tarea *
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                  Responsable *
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                  Fecha *
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                  Hito relacionado *
                </th>
              </tr>
            </thead>
            <tbody>
              {minutaTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3 text-center font-medium text-gray-600">
                    {task.id}
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <textarea
                      value={task.tarea}
                      onChange={(e) => handleInputChange(task.id, 'tarea', e.target.value)}
                      placeholder="Descripción de la tarea..."
                      maxLength={70}
                      rows={2}
                      className="w-full p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {task.tarea.length}/70 caracteres
                    </div>
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="text"
                      value={task.responsable}
                      onChange={(e) => handleInputChange(task.id, 'responsable', e.target.value)}
                      placeholder="Nombre del responsable"
                      className="w-full p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="date"
                      value={task.fecha}
                      onChange={(e) => handleInputChange(task.id, 'fecha', e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <select
                      value={task.hitoId}
                      onChange={(e) => handleInputChange(task.id, 'hitoId', e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Seleccionar hito...</option>
                      {hitos.map((hito) => (
                        <option key={hito.id} value={hito.id}>
                          {hito.wbsCode} - {hito.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            💾 Guardar Minuta
          </button>
        </div>
      </div>
    </div>
  );
};

export default MinutaModal;