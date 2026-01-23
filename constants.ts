
import { Company, AnalystRating, NewsItem, EventItem, DocumentItem } from './types';

const defaultValues = {
  price: 0,
  change: 0,
  currency: 'USD',
  marketCap: '--',
  ev: '--',
  ebitda: '--',
  netDebt: '--',
  sharesOutstanding: 0,
  dividendYield: '--',
  dividendYield2025: '--',
  dividendYield2026: '--',
  dividendPerShare2024: '--',
  dividendPerShare2025: '--',
  dividendPerShare2026: '--',
  revenue2024: '--', revenue2025: '--', revenue2026: '--',
  ebitda2024: '--', ebitda2025: '--', ebitda2026: '--',
  ebit2024: '--', ebit2025: '--', ebit2026: '--',
  capex2024: '--', capex2025: '--', capex2026: '--',
  netIncome2024: '--', netIncome2025: '--', netIncome2026: '--',
  fcf2024: '--', fcf2025: '--', fcf2026: '--',
  revenueGrowth2024: 0, revenueGrowth2025: 0, revenueGrowth2026: 0,
  evEbitda: 0, evEbitdaForward: 0, evEbitdaNext: 0,
  evEbit: 0, evEbitForward: 0, evEbitNext: 0,
  evSales: 0, evSalesForward: 0, evSalesNext: 0,
  per: 0, perForward: 0, perNext: 0,
  evEbitdaCapex: 0, evEbitdaCapexForward: 0, evEbitdaCapexNext: 0,
  ebitdaMargin: 0,
  revenueGrowth: 0,
  capexSales: 0,
  targetPrice: null,
  sparkline: [100, 102, 98, 105, 110, 108, 115],
  volatility: 20,
  nextEarnings: 'TBD',
  earningsProgress: 0
};

export const COMPANIES: Company[] = [
  { ...defaultValues, id: 'jcdecaux', name: 'JCDecaux SE', ticker: 'DEC.PA', currency: 'EUR', rating: AnalystRating.BUY, description: 'Leader mondial de la communication extérieure.', sharesOutstanding: 212, dividendPerShare2024: '0.70', dividendPerShare2025: '0.80', dividendPerShare2026: '0.90' },
  { ...defaultValues, id: 'outfront', name: 'Outfront Media Inc.', ticker: 'OUT', currency: 'USD', rating: AnalystRating.HOLD, description: 'Affichage grand format et publicité dans les transports aux USA.', sharesOutstanding: 167, dividendPerShare2024: '1.22', dividendPerShare2025: '1.25' },
  { ...defaultValues, id: 'stroeer', name: 'Ströer SE & Co. KGaA', ticker: 'SAX.DE', currency: 'EUR', rating: AnalystRating.BUY, description: 'Spécialiste de l\'OOH et du digital media en Allemagne.', sharesOutstanding: 57, dividendPerShare2024: '1.85', dividendPerShare2025: '1.95', dividendPerShare2026: '2.10' },
  { ...defaultValues, id: 'clearchannel', name: 'Clear Channel Outdoor', ticker: 'CCO', currency: 'USD', rating: AnalystRating.SELL, description: 'Acteur global en phase de restructuration géographique.', sharesOutstanding: 485, dividendPerShare2024: '0.00' },
  { ...defaultValues, id: 'arabian', name: 'Arabian Contracting Services', ticker: '4071.SR', currency: 'SAR', rating: AnalystRating.STRONG_BUY, description: 'Leader de l\'affichage en Arabie Saoudite.', sharesOutstanding: 50, dividendPerShare2024: '5.50', dividendPerShare2025: '6.00' },
  { ...defaultValues, id: 'lamar', name: 'Lamar Advertising Company', ticker: 'LAMR', currency: 'USD', rating: AnalystRating.HOLD, description: 'REIT spécialisé dans les billboards aux USA.', sharesOutstanding: 102, dividendPerShare2024: '5.20', dividendPerShare2025: '5.40', dividendPerShare2026: '5.60' }
];

export const NEWS: NewsItem[] = [
  { id: 1, source: 'Système', tag: 'Market', title: 'Initialisation du terminal financier...', time: 'Live' }
];

export const EVENTS: EventItem[] = [];
export const DOCUMENTS: DocumentItem[] = [];
