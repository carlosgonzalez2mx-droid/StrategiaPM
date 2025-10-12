export const formatCurrency = (amount, decimals = 0) => {
  const valueInK = amount / 1000;
  // Agregar separadores de miles a la parte entera
  const parts = valueInK.toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${parts.join('.')}K`;
};

export const formatDate = (date, locale = 'es-ES') => {
  return date ? new Date(date).toLocaleDateString(locale) : 'N/A';
};

export const formatPercentage = (value) => {
  return `${Math.round(value || 0)}%`;
};
