/**
 * Formatea cantidades monetarias en formato de miles (K) con separadores
 *
 * Convierte cantidades a miles y agrega separadores de miles para mejor lectura.
 * Por ejemplo: 1500000 → $1,500K
 *
 * @param {number} amount - Cantidad a formatear (en unidades completas)
 * @param {number} [decimals=0] - Número de decimales a mostrar (default: 0)
 * @returns {string} Cantidad formateada con símbolo $ y sufijo K
 *
 * @example
 * formatCurrency(1500000);     // "$1,500K"
 * formatCurrency(1500000, 1);  // "$1,500.0K"
 * formatCurrency(123456000);   // "$123,456K"
 * formatCurrency(2750, 2);     // "$2.75K"
 */
export const formatCurrency = (amount, decimals = 0) => {
  const valueInK = amount / 1000;
  // Agregar separadores de miles a la parte entera
  const parts = valueInK.toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${parts.join('.')}K`;
};

/**
 * Formatea fechas en formato local legible
 *
 * Convierte fechas (Date, string ISO, timestamp) a formato local.
 * Retorna 'N/A' si la fecha es null/undefined.
 *
 * @param {Date|string|number|null|undefined} date - Fecha a formatear
 * @param {string} [locale='es-ES'] - Código de locale (default: 'es-ES')
 * @returns {string} Fecha formateada o 'N/A'
 *
 * @example
 * formatDate(new Date('2025-01-15'));           // "15/1/2025" (es-ES)
 * formatDate('2025-01-15', 'en-US');            // "1/15/2025"
 * formatDate('2025-01-15', 'es-MX');            // "15/1/2025"
 * formatDate(null);                             // "N/A"
 */
export const formatDate = (date, locale = 'es-ES') => {
  return date ? new Date(date).toLocaleDateString(locale) : 'N/A';
};

/**
 * Formatea valores numéricos como porcentajes redondeados
 *
 * Redondea el valor al entero más cercano y agrega el símbolo %.
 * Maneja valores null/undefined como 0.
 *
 * @param {number|null|undefined} value - Valor a formatear (0-100)
 * @returns {string} Porcentaje formateado con símbolo %
 *
 * @example
 * formatPercentage(75);        // "75%"
 * formatPercentage(75.4);      // "75%"
 * formatPercentage(75.6);      // "76%"
 * formatPercentage(-25);       // "-25%"
 * formatPercentage(null);      // "0%"
 */
export const formatPercentage = (value) => {
  return `${Math.round(value || 0)}%`;
};
