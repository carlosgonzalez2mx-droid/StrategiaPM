import React from 'react';
import { formatCurrency } from '../../utils/formatters';

const FinancialIndicators = ({ totalPurchaseOrders, totalAdvances, totalInvoices, totalReserves }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-emerald-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="text-3xl mr-3">💳</span>
        Indicadores Financieros Consolidados
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-lg border border-emerald-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">📋</span>
            <span className="text-sm font-medium text-emerald-600">Órdenes de Compra</span>
          </div>
          <div className="text-3xl font-bold text-emerald-800">
            {formatCurrency(totalPurchaseOrders)}
          </div>
          <div className="text-sm text-emerald-600 mt-1">
            Total en OC aprobadas
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-lg border border-amber-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">💸</span>
            <span className="text-sm font-medium text-amber-600">Anticipos</span>
          </div>
          <div className="text-3xl font-bold text-amber-800">
            {formatCurrency(totalAdvances)}
          </div>
          <div className="text-sm text-amber-600 mt-1">
            Anticipos solicitados
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-6 rounded-lg border border-cyan-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🧾</span>
            <span className="text-sm font-medium text-cyan-600">Facturas</span>
          </div>
          <div className="text-3xl font-bold text-cyan-800">
            {formatCurrency(totalInvoices)}
          </div>
          <div className="text-sm text-cyan-600 mt-1">
            Facturas ingresadas
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🛡️</span>
            <span className="text-sm font-medium text-purple-600">Reservas</span>
          </div>
          <div className="text-3xl font-bold text-purple-800">
            {formatCurrency(totalReserves)}
          </div>
          <div className="text-sm text-purple-600 mt-1">
            Contingencia + Gestión
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialIndicators;
