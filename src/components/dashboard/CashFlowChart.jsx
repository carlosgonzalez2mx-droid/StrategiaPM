import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

const CashFlowChart = ({ totalPurchaseOrders, totalAdvances, totalInvoices }) => {
  const chartData = useMemo(() => {
    const porPagar = totalPurchaseOrders - (totalAdvances + totalInvoices);
    
    return [
      { name: 'Anticipos', value: totalAdvances, color: '#3B82F6' },
      { name: 'Facturación', value: totalInvoices, color: '#9CA3AF' },
      { name: 'Por pagar', value: Math.max(0, porPagar), color: '#1E3A8A' }
    ];
  }, [totalPurchaseOrders, totalAdvances, totalInvoices]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800">{payload[0].name}</p>
          <p className="text-lg font-bold" style={{ color: payload[0].payload.color }}>
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="black"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="font-bold text-sm"
      >
        {formatCurrency(value)}
      </text>
    );
  };

  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex justify-center items-center space-x-6 mt-4">
        {payload.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center space-x-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium text-gray-700">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-cyan-500">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="text-3xl mr-3">💵</span>
        Flujo de Caja $M MXN
      </h2>
      
      <div className="w-full" style={{ height: '400px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={120}
              innerRadius={70}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Resumen numérico debajo de la gráfica */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4">
          {chartData.map((item, index) => (
            <div key={index} className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-medium text-gray-600">{item.name}</span>
              </div>
              <div className="text-xl font-bold" style={{ color: item.color }}>
                {formatCurrency(item.value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CashFlowChart;
