/**
 * MachineryConfigStep - Paso específico para configuración de compra de maquinaria
 * StrategiaPM - MVP Implementation
 */

import React, { useState, useEffect } from 'react';

const MachineryConfigStep = ({ wizardData, onUpdate }) => {
  const [machineryData, setMachineryData] = useState({
    deliveryTime: wizardData.deliveryTime || '',
    deliveryTimeUnit: wizardData.deliveryTimeUnit || 'weeks',
    requiresInfrastructure: wizardData.requiresInfrastructure || false,
    isForeignEquipment: wizardData.isForeignEquipment || false,
    numberOfAdvancePayments: wizardData.numberOfAdvancePayments || 2,
    advancePayments: wizardData.advancePayments || [
      { percentage: 30, description: 'Anticipo inicial', timing: 'order' },
      { percentage: 70, description: 'Pago final', timing: 'delivery' }
    ]
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    onUpdate(machineryData);
  }, [machineryData, onUpdate]);

  const handleInputChange = (field, value) => {
    setMachineryData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpiar error si se corrige
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleAdvancePaymentChange = (index, field, value) => {
    const newAdvancePayments = [...machineryData.advancePayments];
    newAdvancePayments[index] = {
      ...newAdvancePayments[index],
      [field]: value
    };
    
    handleInputChange('advancePayments', newAdvancePayments);
  };

  const handleNumberOfAdvancePaymentsChange = (number) => {
    handleInputChange('numberOfAdvancePayments', number);
    
    // Generar anticipos por defecto basados en el número seleccionado
    const defaultPayments = generateDefaultPayments(number);
    handleInputChange('advancePayments', defaultPayments);
  };

  const generateDefaultPayments = (number) => {
    switch (number) {
      case 1:
        return [{ percentage: 100, description: 'Pago completo', timing: 'delivery' }];
      case 2:
        return [
          { percentage: 30, description: 'Anticipo inicial', timing: 'order' },
          { percentage: 70, description: 'Pago final', timing: 'delivery' }
        ];
      case 3:
        return [
          { percentage: 30, description: 'Anticipo inicial', timing: 'order' },
          { percentage: 50, description: 'Pago pre-embarque', timing: 'shipping' },
          { percentage: 20, description: 'Pago final', timing: 'delivery' }
        ];
      default:
        return [
          { percentage: 30, description: 'Anticipo inicial', timing: 'order' },
          { percentage: 70, description: 'Pago final', timing: 'delivery' }
        ];
    }
  };

  const addAdvancePayment = () => {
    const newAdvancePayments = [...machineryData.advancePayments, {
      percentage: '',
      description: '',
      timing: 'order'
    }];
    handleInputChange('advancePayments', newAdvancePayments);
  };

  const removeAdvancePayment = (index) => {
    if (machineryData.advancePayments.length > 1) {
      const newAdvancePayments = machineryData.advancePayments.filter((_, i) => i !== index);
      handleInputChange('advancePayments', newAdvancePayments);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!machineryData.deliveryTime || machineryData.deliveryTime <= 0) {
      newErrors.deliveryTime = 'El tiempo de entrega es requerido';
    }
    
    if (!machineryData.numberOfAdvancePayments || machineryData.numberOfAdvancePayments < 1) {
      newErrors.numberOfAdvancePayments = 'Debe seleccionar al menos 1 anticipo';
    }
    
    const totalPercentage = machineryData.advancePayments.reduce((sum, payment) => 
      sum + (parseFloat(payment.percentage) || 0), 0
    );
    
    if (Math.abs(totalPercentage - 100) > 0.01) {
      newErrors.advancePayments = 'Los anticipos deben sumar 100%';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    // Validar automáticamente cuando cambien los datos
    validateForm();
  }, [machineryData]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          Configuración Específica de Maquinaria
        </h3>
        <p className="text-gray-600">
          Configura los detalles específicos para la compra e instalación de equipos
        </p>
      </div>

      {/* Tiempo de entrega */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-lg font-medium text-gray-800 mb-4">
          📦 Tiempo de Entrega de Equipos
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiempo de entrega
            </label>
            <input
              type="number"
              min="1"
              value={machineryData.deliveryTime}
              onChange={(e) => handleInputChange('deliveryTime', parseInt(e.target.value) || '')}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.deliveryTime ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ej: 12"
            />
            {errors.deliveryTime && (
              <p className="text-red-500 text-sm mt-1">{errors.deliveryTime}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unidad de tiempo
            </label>
            <select
              value={machineryData.deliveryTimeUnit}
              onChange={(e) => handleInputChange('deliveryTimeUnit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="days">Días</option>
              <option value="weeks">Semanas</option>
              <option value="months">Meses</option>
            </select>
          </div>
        </div>
        
        <p className="text-sm text-gray-500 mt-2">
          Este tiempo será utilizado para ajustar la duración de las actividades de compra y entrega.
        </p>
      </div>

      {/* Requisitos especiales */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-lg font-medium text-gray-800 mb-4">
          🔧 Requisitos Especiales
        </h4>
        
        <div className="space-y-4">
          {/* Modificación de infraestructura */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h5 className="font-medium text-gray-800">
                ¿Requiere modificación de infraestructura?
              </h5>
              <p className="text-sm text-gray-600">
                Preparación del sitio, instalaciones eléctricas, cimentaciones, etc.
              </p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={machineryData.requiresInfrastructure}
                onChange={(e) => handleInputChange('requiresInfrastructure', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Sí</span>
            </label>
          </div>

          {/* Equipo extranjero */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h5 className="font-medium text-gray-800">
                ¿El equipo viene del extranjero?
              </h5>
              <p className="text-sm text-gray-600">
                Incluirá procesos de importación, aduanas y documentación
              </p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={machineryData.isForeignEquipment}
                onChange={(e) => handleInputChange('isForeignEquipment', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Sí</span>
            </label>
          </div>
        </div>
      </div>

      {/* Anticipos */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-lg font-medium text-gray-800 mb-4">
          💰 Estructura de Anticipos
        </h4>
        
        {/* Selección del número de anticipos */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            ¿Cuántos anticipos tendrá este proyecto?
          </label>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => handleNumberOfAdvancePaymentsChange(number)}
                className={`p-4 border-2 rounded-lg text-center transition-colors ${
                  machineryData.numberOfAdvancePayments === number
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-blue-300 text-gray-700'
                }`}
              >
                <div className="font-semibold text-lg">{number}</div>
                <div className="text-sm">
                  {number === 1 ? 'Pago único' : 
                   number === 2 ? 'Dos anticipos' : 
                   'Tres anticipos'}
                </div>
              </button>
            ))}
          </div>
          {errors.numberOfAdvancePayments && (
            <p className="text-red-500 text-sm mt-2">{errors.numberOfAdvancePayments}</p>
          )}
        </div>

        {/* Configuración de cada anticipo */}
        <div className="space-y-4">
          {machineryData.advancePayments.map((payment, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Porcentaje (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={payment.percentage}
                  onChange={(e) => handleAdvancePaymentChange(index, 'percentage', parseFloat(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="30"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  value={payment.description}
                  onChange={(e) => handleAdvancePaymentChange(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Anticipo inicial"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Momento del pago
                </label>
                <select
                  value={payment.timing}
                  onChange={(e) => handleAdvancePaymentChange(index, 'timing', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="order">Al realizar la orden de compra</option>
                  <option value="production">Durante la fabricación</option>
                  <option value="shipping">Antes de liberar para envío</option>
                  <option value="delivery">Al entregar equipo funcionando</option>
                  <option value="installation">Al completar la instalación</option>
                  <option value="performance">Al finalizar pruebas de performance</option>
                </select>
              </div>
            </div>
          ))}
          
          {errors.advancePayments && (
            <p className="text-red-500 text-sm">{errors.advancePayments}</p>
          )}
          
          <div className="text-sm text-gray-500 text-center">
            Total: {machineryData.advancePayments.reduce((sum, payment) => 
              sum + (parseFloat(payment.percentage) || 0), 0
            ).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default MachineryConfigStep;
