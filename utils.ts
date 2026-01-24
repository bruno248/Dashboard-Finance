
/**
 * Utilitaires financiers et techniques centralisés pour le Terminal OOH
 */
import { GoogleGenAI } from "@google/genai";
import { Company } from "./types";

// Helper centralisé pour la création de l'instance GenAI
export const createGenAIInstance = () => {
  // En contexte AI Studio, process.env.API_KEY est injecté dynamiquement
  // après que l'utilisateur a sélectionné sa clé via l'UI.
  // Cette approche reste donc valide et centralisée.
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const formatAge = (timestamp?: number): string => {
  if (!timestamp) return 'jamais';
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);

  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
};

export const parseFinancialValue = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val || typeof val !== 'string' || val === '--') return 0;
  
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
  const num = typeof val === 'string' ? parseFinancialValue(val) : val;
  if (num === 0 || isNaN(num)) return '--';
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(2)} B`;
  return `${num.toFixed(1)} M`;
};

/**
 * Fonction centralisée pour calculer tous les ratios financiers.
 * PREND DES DONNÉES BRUTES (y compris le prix) et retourne les ratios calculés.
 */
export const computeFinancialRatios = (companyData: Partial<Company>): Partial<Company> => {
  const price = companyData.price || 0;
  const mktCap = price * (companyData.sharesOutstanding || 0);
  const netDebt = parseFinancialValue(companyData.netDebt);
  const ev = calculateEV(mktCap, netDebt);

  const getV = (val: any) => parseFinancialValue(val);
  const r24 = getV(companyData.revenue2024), r25 = getV(companyData.revenue2025), r26 = getV(companyData.revenue2026);
  const eb24 = getV(companyData.ebitda2024), eb25 = getV(companyData.ebitda2025), eb26 = getV(companyData.ebitda2026);
  const ebit24 = getV(companyData.ebit2024), ebit25 = getV(companyData.ebit2025), ebit26 = getV(companyData.ebit2026);
  const inc24 = getV(companyData.netIncome2024), inc25 = getV(companyData.netIncome2025), inc26 = getV(companyData.netIncome2026);
  const cap24 = getV(companyData.capex2024), cap25 = getV(companyData.capex2025), cap26 = getV(companyData.capex2026);
  const fcf24 = getV(companyData.fcf2024), fcf25 = getV(companyData.fcf2025), fcf26 = getV(companyData.fcf2026);
  const dps24 = getV(companyData.dividendPerShare2024), dps25 = getV(companyData.dividendPerShare2025), dps26 = getV(companyData.dividendPerShare2026);

  const div = (n: number, d: number) => (d !== 0 ? n / d : 0);
  const yield24 = div(dps24, price) * 100, yield25 = div(dps25, price) * 100, yield26 = div(dps26, price) * 100;
  
  // Les multiples ne sont valides que si le prix est disponible.
  const canCalculateMultiples = price > 0;

  return {
    marketCap: `${mktCap.toFixed(0)} M`,
    ev: `${ev.toFixed(0)} M`,
    
    dividendYield: yield24 > 0 ? `${yield24.toFixed(1)}%` : '--',
    dividendYieldNumeric: yield24,
    dividendYield2025: yield25 > 0 ? `${yield25.toFixed(1)}%` : '--',
    dividendYield2025Numeric: yield25,
    dividendYield2026: yield26 > 0 ? `${yield26.toFixed(1)}%` : '--',
    dividendYield2026Numeric: yield26,

    ebitdaMargin2024: div(eb24, r24) * 100,
    ebitdaMargin2025: div(eb25, r25) * 100,
    ebitdaMargin2026: div(eb26, r26) * 100,
    ebitMargin2024: div(ebit24, r24) * 100,
    ebitMargin2025: div(ebit25, r25) * 100,
    ebitMargin2026: div(ebit26, r26) * 100,
    capexRevenue2024: div(cap24, r24) * 100,
    capexRevenue2025: div(cap25, r25) * 100,
    capexRevenue2026: div(cap26, r26) * 100,
    fcfRevenue2024: div(fcf24, r24) * 100,
    fcfRevenue2025: div(fcf25, r25) * 100,
    fcfRevenue2026: div(fcf26, r26) * 100,

    evEbitda: canCalculateMultiples ? div(ev, eb24) : 0,
    evEbitdaForward: canCalculateMultiples ? div(ev, eb25) : 0,
    evEbitdaNext: canCalculateMultiples ? div(ev, eb26) : 0,
    evEbit: canCalculateMultiples ? div(ev, ebit24) : 0,
    evEbitForward: canCalculateMultiples ? div(ev, ebit25) : 0,
    evEbitNext: canCalculateMultiples ? div(ev, ebit26) : 0,
    evSales: canCalculateMultiples ? div(ev, r24) : 0,
    evSalesForward: canCalculateMultiples ? div(ev, r25) : 0,
    evSalesNext: canCalculateMultiples ? div(ev, r26) : 0,
    per: canCalculateMultiples ? div(mktCap, inc24) : 0,
    perForward: canCalculateMultiples ? div(mktCap, inc25) : 0,
    perNext: canCalculateMultiples ? div(mktCap, inc26) : 0,
    evEbitdaCapex: canCalculateMultiples ? div(ev, (eb24 - cap24)) : 0,
    evEbitdaCapexForward: canCalculateMultiples ? div(ev, (eb25 - cap25)) : 0,
    evEbitdaCapexNext: canCalculateMultiples ? div(ev, (eb26 - cap26)) : 0,
  };
};


/**
 * Nettoie les réponses JSON de l'IA qui peuvent contenir du Markdown
 */
export function cleanJsonResponse(text: string | undefined): string {
  if (!text) return "{}";
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  
  let start = -1;
  if (firstBrace !== -1 && firstBracket !== -1) start = Math.min(firstBrace, firstBracket);
  else start = firstBrace !== -1 ? firstBrace : firstBracket;

  if (start === -1) return "{}";
  return cleaned.substring(start);
}

/**
 * Gère les retries avec backoff exponentiel pour les erreurs 429 et 503
 */
export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Deeply inspect error object for status and message
    const errorCode = error?.code || error?.error?.code;
    const errorMessage = String(error?.message || error?.error?.message || '').toLowerCase();
    const errorStatus = String(error?.status || error?.error?.status || '').toLowerCase();

    const isRetryable = 
      (errorCode === 429 || errorStatus === 'resource_exhausted' || errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) || // Rate limit
      (errorCode === 503 || errorStatus === 'unavailable' || errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('try again')); // Service unavailable

    if (retries > 0 && isRetryable) {
      console.warn(`API temporairement indisponible (code: ${errorCode || 'N/A'}, status: ${errorStatus || 'N/A'}). Nouvel essai dans ${delay}ms... (${retries} restants)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}
