
/**
 * Utilitaires financiers centralisés pour le Terminal OOH
 */

export const parseFinancialValue = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val || typeof val !== 'string' || val === '--') return 0;
  
  // Nettoyage radical des chaînes
  let clean = val.replace(/[^-0-9,.]/g, '').replace(',', '.');
  
  if (clean.length > 15 && !clean.includes('e')) {
    clean = clean.substring(0, 15);
  }

  const upperVal = val.toUpperCase();
  let multiplier = 1;
  if (upperVal.includes('MD') || upperVal.includes('B')) {
    multiplier = 1000;
  } else if (upperVal.includes('M')) {
    multiplier = 1;
  } else if (upperVal.includes('K')) {
    multiplier = 0.001;
  }

  const numeric = parseFloat(clean);
  return isNaN(numeric) ? 0 : numeric * multiplier;
};

export const parsePercent = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val || typeof val !== 'string') return 0;
  const clean = val.replace('%', '').trim();
  return parseFloat(clean) || 0;
};

export const calculateEV = (mktCap: number, netDebt: number): number => {
  return (isNaN(mktCap) ? 0 : mktCap) + (isNaN(netDebt) ? 0 : netDebt);
};

export const formatMultiple = (val: number | undefined | null): string => {
  if (val === undefined || val === null || val === 0 || isNaN(val)) return '--';
  return `${val.toFixed(1)}x`;
};

export const formatCurrencyShort = (val: number | string | undefined): string => {
  if (val === undefined || val === null || val === '--' || val === '') return '--';
  
  if (typeof val === 'string' && (val.includes('B') || val.includes('M')) && val.length < 10) {
    return val;
  }

  const num = typeof val === 'string' ? parseFinancialValue(val) : val;
  if (num === 0 || isNaN(num)) return '--';

  if (Math.abs(num) >= 1000) {
    return `${(num / 1000).toFixed(2)} B`;
  }
  return `${num.toFixed(1)} M`;
};
