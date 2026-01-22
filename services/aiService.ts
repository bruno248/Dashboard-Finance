
import { GoogleGenAI, Type } from "@google/genai";
import { SectorData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const FALLBACK_COMPANIES = [
  { 
    ticker: "DEC.PA", price: 18.45, change: 1.2, marketCap: "3950 M", netDebt: "950 M", dividendYield: "2.4%", dividendYield2025: "2.8%", dividendYield2026: "3.2%",
    revenue2024: "3450 M", revenue2025: "3650 M", revenue2026: "3850 M",
    ebitda2024: "1850 M", ebitda2025: "1980 M", ebitda2026: "2100 M",
    ebit2024: "1100 M", ebit2025: "1200 M", ebit2026: "1300 M",
    netIncome2024: "350 M", netIncome2025: "410 M", netIncome2026: "480 M",
    capex2024: "250 M", capex2025: "260 M", capex2026: "270 M",
    fcf2024: "400 M", fcf2025: "450 M", fcf2026: "500 M"
  },
  { 
    ticker: "LAMR", price: 128.50, change: -0.5, marketCap: "13100 M", netDebt: "3200 M", dividendYield: "4.1%", dividendYield2025: "4.3%", dividendYield2026: "4.5%",
    revenue2024: "2100 M", revenue2025: "2250 M", revenue2026: "2400 M",
    ebitda2024: "950 M", ebitda2025: "1020 M", ebitda2026: "1100 M",
    ebit2024: "780 M", ebit2025: "840 M", ebit2026: "910 M",
    netIncome2024: "450 M", netIncome2025: "490 M", netIncome2026: "530 M",
    capex2024: "150 M", capex2025: "155 M", capex2026: "160 M",
    fcf2024: "600 M", fcf2025: "650 M", fcf2026: "700 M"
  },
  { ticker: "SAX.DE", price: 54.20, change: 2.1, marketCap: "3100 M", netDebt: "650 M", dividendYield: "3.2%", revenue2024: "1900 M", ebitda2024: "580 M", ebitda2025: "630 M", ebitda2026: "680 M", ebit2024: "400 M", ebit2025: "440 M", ebit2026: "480 M", fcf2024: "200 M", fcf2025: "220 M", fcf2026: "250 M" },
  { ticker: "OUT", price: 17.80, change: -1.1, marketCap: "2950 M", netDebt: "2800 M", dividendYield: "6.8%", revenue2024: "1800 M", ebitda2024: "440 M", ebitda2025: "470 M", ebitda2026: "500 M", ebit2024: "200 M", fcf2024: "150 M" },
  { ticker: "CCO", price: 1.45, change: -3.2, marketCap: "700 M", netDebt: "5400 M", ebitda2024: "520 M", ebitda2025: "540 M", ebitda2026: "570 M", ebit2024: "150 M", revenue2024: "2500 M", fcf2024: "50 M" },
  { ticker: "4071.SR", price: 185.00, change: 0.8, marketCap: "9250 M", netDebt: "150 M", dividendYield: "2.8%", ebitda2024: "420 M", ebitda2025: "490 M", ebitda2026: "560 M", ebit2024: "350 M", revenue2024: "1150 M" }
];

function cleanJsonResponse(text: string): string {
  if (!text) return "{}";
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) return "{}";
  cleaned = cleaned.substring(firstBrace);
  return cleaned;
}

export async function fetchRealTimeOOHData(tickers: string[]): Promise<{ lastUpdated: string; companies: any[] }> {
  try {
    const tickerList = tickers.join(", ");
    const today = new Date().toISOString().split('T')[0];
    
    const prompt = `Extraction de données financières exhaustives (2024, 2025E, 2026E) pour les tickers OOH suivants : ${tickerList}.
    Récupère via Google Search : Price, Change, MarketCap, NetDebt, 
    Revenue (24/25/26), EBITDA (24/25/26), EBIT (24/25/26), NetIncome (24/25/26), Capex (24/25/26), FCF (24/25/26), Dividend Yield (24/25/26).
    
    RETOURNE EXCLUSIVEMENT CE JSON :
    {
      "lastUpdated": "${today}",
      "companies": [{ 
        "ticker": "string", "price": number, "change": number, "marketCap": "string", "netDebt": "string", 
        "revenue2024": "string", "revenue2025": "string", "revenue2026": "string",
        "ebitda2024": "string", "ebitda2025": "string", "ebitda2026": "string",
        "ebit2024": "string", "ebit2025": "string", "ebit2026": "string",
        "netIncome2024": "string", "netIncome2025": "string", "netIncome2026": "string",
        "capex2024": "string", "capex2025": "string", "capex2026": "string",
        "fcf2024": "string", "fcf2025": "string", "fcf2026": "string",
        "dividendYield": "string", "dividendYield2025": "string", "dividendYield2026": "string"
      }]
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      }
    });

    const rawData = JSON.parse(cleanJsonResponse(response.text || "{}"));
    return {
      lastUpdated: rawData.lastUpdated || new Date().toLocaleString('fr-FR'),
      companies: rawData.companies || FALLBACK_COMPANIES
    };
  } catch (e) {
    console.warn("AI Sync Quota/Error - Using Fallback Data");
    return { 
      lastUpdated: `Stale Data (${new Date().toLocaleTimeString()})`, 
      companies: FALLBACK_COMPANIES 
    };
  }
}

export async function queryCompanyAI(prompt: string, context: SectorData): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Tu es un analyste Buy-side expert en OOH. Contexte sectoriel : ${JSON.stringify(context.companies.map(c => ({ t: c.ticker, r25: c.revenue2025, eb25: c.ebitda2025, ebit25: c.ebit2025, per25: c.perForward })))}. Question : ${prompt}.`,
    });
    return response.text || "Analyse indisponible.";
  } catch (e) {
    return "L'IA est actuellement saturée (quota dépassé).";
  }
}
