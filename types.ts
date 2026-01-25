
export enum AnalystRating {
  BUY = 'Acheter',
  STRONG_BUY = 'Renforcer',
  HOLD = 'Conserver',
  SELL = 'Vendre',
  NA = 'N/D'
}

export type PricePoint = {
  date: string;  // "YYYY-MM-DD"
  price: number;
};

export type PriceSeries = {
  ticker: string;
  name: string;
  currency: string;
  points: PricePoint[];
};

export type HistoricalPricesPayload = {
  period: "1M" | "3M" | "6M" | "1Y";
  series: PriceSeries[];
};

// Type pour les données brutes de l'IA
export interface RawCompanyFromAI {
  ticker: string;
  price?: number;
  change?: number;
  netDebt: string;
  sharesOutstanding: number;
  dividendPerShare2024?: string;
  dividendPerShare2025?: string;
  dividendPerShare2026?: string;
  revenue2024?: string;
  revenue2025?: string;
  revenue2026?: string;
  ebitda2024?: string;
  ebitda2025?: string;
  ebitda2026?: string;
  ebit2024?: string;
  ebit2025?: string;
  ebit2026?: string;
  netIncome2024?: string;
  netIncome2025?: string;
  netIncome2026?: string;
  capex2024?: string;
  capex2025?: string;
  capex2026?: string;
  fcf2024?: string;
  fcf2025?: string;
  fcf2026?: string;
}

export interface Company {
  id: string;
  name: string;
  ticker: string;
  currency: string;
  price: number;
  change: number;
  marketCap: string;
  ev: string; 
  ebitda: string;
  netDebt: string;
  dividendYield: string;
  dividendYieldNumeric?: number;
  dividendYield2025?: string;
  dividendYield2025Numeric?: number;
  dividendYield2026?: string;
  dividendYield2026Numeric?: number;
  sharesOutstanding: number; // in millions
  dividendPerShare2024?: string;
  dividendPerShare2025?: string;
  dividendPerShare2026?: string;
  
  // Historical & Estimates (Aggregates)
  revenue2024: string;
  revenue2025: string;
  revenue2026: string;
  ebitda2024: string;
  ebitda2025: string;
  ebitda2026: string;
  ebit2024: string;
  ebit2025: string;
  ebit2026: string;
  capex2024: string;
  capex2025: string;
  capex2026: string;
  netIncome2024: string;
  netIncome2025: string;
  netIncome2026: string;
  fcf2024?: string;
  fcf2025?: string;
  fcf2026?: string;
  
  // Multiples
  evEbitda: number; 
  evEbitdaForward: number; 
  evEbitdaNext: number; 
  evEbit: number;
  evEbitForward: number;
  evEbitNext: number;
  evSales: number;
  evSalesForward: number;
  evSalesNext: number;
  per: number;
  perForward: number;
  perNext: number;
  evEbitdaCapex: number; 
  evEbitdaCapexForward: number; 
  evEbitdaCapexNext: number; 
  
  // Analysis Ratios
  ebitdaMargin2024: number; 
  ebitdaMargin2025: number;
  ebitdaMargin2026: number;
  ebitMargin2024: number;
  ebitMargin2025: number;
  ebitMargin2026: number;
  capexRevenue2024: number;
  capexRevenue2025: number;
  capexRevenue2026: number;
  fcfRevenue2024: number;
  fcfRevenue2025: number;
  fcfRevenue2026: number;

  revenueGrowth: number; 
  revenueGrowth2024: number;
  revenueGrowth2025: number;
  revenueGrowth2026: number;

  rating: AnalystRating;
  targetPrice: number | null;
  description: string;
  sparkline: number[];
  volatility: number;
  nextEarnings: string;
  earningsProgress: number;
}

export type NewsTag = 'Market' | 'Corporate' | 'Earnings' | 'Deals' | 'Digital' | 'Regulation';

export interface NewsItem {
  id: string | number;
  source: string;
  title: string;
  time: string;
  date?: string;
  tag: NewsTag;
  url?: string;
  ticker?: string;
  region?: string;
}

export interface EventItem {
  id: string | number;
  title: string;
  date: string; 
  type?: string;
  ticker?: string;
}

export interface DocumentItem {
  id: string | number;
  type: 'PDF' | 'PPT' | 'ESG' | 'Report';
  title: string;
  date: string;
  url?: string;
}

export interface SectorData {
  companies: Partial<Company>[];
  news: NewsItem[];
  highlights?: NewsItem[];
  events: EventItem[];
  documents: DocumentItem[]; 
  companyDocuments?: { [ticker: string]: DocumentItem[] }; 
  analysis: string;
  marketOpportunities: string[];
  marketRisks: string[];
  lastUpdated: string;
  priceHistory?: { [ticker: string]: number[] };
  sentiment?: {
    label: string;
    description: string;
    keyTakeaways: string[];
    lastUpdated: string;
  };
  aiStatus?: {
    lastSuccess: number | null;
    lastError: number | null;
  };
  timestamps: Record<string, number>;
}