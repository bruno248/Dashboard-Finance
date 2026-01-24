
import { Company, AnalystRating, NewsItem, EventItem, DocumentItem } from './types';

export const BASE_COMPANIES_DATA = [
  { 
    id: 'jcdecaux', name: 'JCDecaux SE', ticker: 'DEC.PA', currency: 'EUR', description: 'Leader mondial de la communication extérieure.', 
    netDebt: "920 M", sharesOutstanding: 212, dividendPerShare2024: "0.70", dividendPerShare2025: "0.80", dividendPerShare2026: "0.90",
    revenue2024: "3570 M", revenue2025: "3750 M", revenue2026: "3940 M",
    ebitda2024: "765 M", ebitda2025: "810 M", ebitda2026: "860 M",
    ebit2024: "285 M", ebit2025: "320 M", ebit2026: "360 M",
    netIncome2024: "180 M", netIncome2025: "210 M", netIncome2026: "250 M",
    capex2024: "350 M", capex2025: "360 M", capex2026: "370 M",
    fcf2024: "200 M", fcf2025: "240 M", fcf2026: "280 M"
  },
  { 
    id: 'outfront', name: 'Outfront Media Inc.', ticker: 'OUT', currency: 'USD', description: 'Affichage grand format et publicité dans les transports aux USA.', 
    netDebt: "2500 M", sharesOutstanding: 167, dividendPerShare2024: "1.22", dividendPerShare2025: "1.25", dividendPerShare2026: "1.28",
    revenue2024: "1850 M", revenue2025: "1950 M", revenue2026: "2050 M",
    ebitda2024: "450 M", ebitda2025: "480 M", ebitda2026: "510 M",
    ebit2024: "250 M", ebit2025: "270 M", ebit2026: "290 M",
    netIncome2024: "100 M", netIncome2025: "120 M", netIncome2026: "140 M",
    capex2024: "100 M", capex2025: "100 M", capex2026: "100 M",
    fcf2024: "200 M", fcf2025: "220 M", fcf2026: "240 M"
  },
  { 
    id: 'stroeer', name: 'Ströer SE & Co. KGaA', ticker: 'SAX.DE', currency: 'EUR', description: 'Spécialiste de l\'OOH et du digital media en Allemagne.', 
    netDebt: "1450 M", sharesOutstanding: 57, dividendPerShare2024: "1.85", dividendPerShare2025: "1.95", dividendPerShare2026: "2.10",
    revenue2024: "1820 M", revenue2025: "1910 M", revenue2026: "2000 M",
    ebitda2024: "540 M", ebitda2025: "570 M", ebitda2026: "600 M",
    ebit2024: "320 M", ebit2025: "350 M", ebit2026: "380 M",
    netIncome2024: "180 M", netIncome2025: "200 M", netIncome2026: "220 M",
    capex2024: "100 M", capex2025: "105 M", capex2026: "110 M",
    fcf2024: "310 M", fcf2025: "340 M", fcf2026: "370 M"
  },
  { 
    id: 'clearchannel', name: 'Clear Channel Outdoor', ticker: 'CCO', currency: 'USD', description: 'Acteur global en phase de restructuration géographique.', 
    netDebt: "5100 M", sharesOutstanding: 485, dividendPerShare2024: "0.00", dividendPerShare2025: "0.00", dividendPerShare2026: "0.00",
    revenue2024: "2200 M", revenue2025: "2250 M", revenue2026: "2300 M",
    ebitda2024: "550 M", ebitda2025: "580 M", ebitda2026: "610 M",
    ebit2024: "150 M", ebit2025: "170 M", ebit2026: "190 M",
    netIncome2024: "-50 M", netIncome2025: "-20 M", netIncome2026: "10 M",
    capex2024: "150 M", capex2025: "150 M", capex2026: "150 M",
    fcf2024: "50 M", fcf2025: "70 M", fcf2026: "90 M"
  },
  { 
    id: 'arabian', name: 'Arabian Contracting Services', ticker: '4071.SR', currency: 'SAR', description: 'Leader de l\'affichage en Arabie Saoudite.', 
    netDebt: "0 M", sharesOutstanding: 50, dividendPerShare2024: "5.50", dividendPerShare2025: "6.00", dividendPerShare2026: "6.50",
    revenue2024: "1100 M", revenue2025: "1300 M", revenue2026: "1500 M",
    ebitda2024: "450 M", ebitda2025: "550 M", ebitda2026: "650 M",
    ebit2024: "430 M", ebit2025: "530 M", ebit2026: "630 M",
    netIncome2024: "400 M", netIncome2025: "500 M", netIncome2026: "600 M",
    capex2024: "80 M", capex2025: "90 M", capex2026: "100 M",
    fcf2024: "350 M", fcf2025: "440 M", fcf2026: "530 M"
  },
  { 
    id: 'lamar', name: 'Lamar Advertising Company', ticker: 'LAMR', currency: 'USD', description: 'REIT spécialisé dans les billboards aux USA.', 
    netDebt: "3150 M", sharesOutstanding: 102, dividendPerShare2024: "5.20", dividendPerShare2025: "5.40", dividendPerShare2026: "5.60",
    revenue2024: "2150 M", revenue2025: "2300 M", revenue2026: "2450 M",
    ebitda2024: "980 M", ebitda2025: "1050 M", ebitda2026: "1120 M",
    ebit2024: "810 M", ebit2025: "870 M", ebit2026: "940 M",
    netIncome2024: "465 M", netIncome2025: "510 M", netIncome2026: "560 M",
    capex2024: "145 M", capex2025: "150 M", capex2026: "155 M",
    fcf2024: "620 M", fcf2025: "680 M", fcf2026: "740 M"
  }
];

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
  ebitdaMargin2024: 0, ebitdaMargin2025: 0, ebitdaMargin2026: 0,
  ebitMargin2024: 0, ebitMargin2025: 0, ebitMargin2026: 0,
  capexRevenue2024: 0, capexRevenue2025: 0, capexRevenue2026: 0,
  fcfRevenue2024: 0, fcfRevenue2025: 0, fcfRevenue2026: 0,
  revenueGrowth: 0,
  rating: AnalystRating.NA,
  targetPrice: null,
  sparkline: [100, 102, 98, 105, 110, 108, 115],
  volatility: 20,
  nextEarnings: 'TBD',
  earningsProgress: 0
};

export const COMPANIES: Company[] = BASE_COMPANIES_DATA.map(company => ({
  ...defaultValues,
  ...company,
}));

export const NEWS: NewsItem[] = [
  { id: 1, source: 'Système', tag: 'Market', title: 'Initialisation du terminal financier...', time: 'Live' }
];

export const EVENTS: EventItem[] = [];
export const DOCUMENTS: DocumentItem[] = [];
