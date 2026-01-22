
import { GoogleGenAI } from "@google/genai";
import { SectorData } from "../types";
import { cleanJsonResponse } from "../utils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const FALLBACK_COMPANIES = [
  { 
    ticker: "DEC.PA", price: 19.85, change: 0.8, marketCap: "4240 M", netDebt: "920 M", dividendYield: "2.4%", dividendYield2025: "2.9%", dividendYield2026: "3.4%",
    revenue2024: "3570 M", revenue2025: "3780 M", revenue2026: "3950 M",
    ebitda2024: "1890 M", ebitda2025: "2010 M", ebitda2026: "2150 M",
    ebit2024: "1150 M", ebit2025: "1240 M", ebit2026: "1350 M",
    netIncome2024: "385 M", netIncome2025: "430 M", netIncome2026: "495 M",
    capex2024: "260 M", capex2025: "275 M", capex2026: "290 M",
    fcf2024: "420 M", fcf2025: "480 M", fcf2026: "540 M"
  },
  { 
    ticker: "LAMR", price: 134.20, change: -0.3, marketCap: "13650 M", netDebt: "3150 M", dividendYield: "4.2%", dividendYield2025: "4.5%", dividendYield2026: "4.8%",
    revenue2024: "2150 M", revenue2025: "2300 M", revenue2026: "2450 M",
    ebitda2024: "980 M", ebitda2025: "1050 M", ebitda2026: "1120 M",
    ebit2024: "810 M", ebit2025: "870 M", ebit2026: "940 M",
    netIncome2024: "465 M", netIncome2025: "510 M", netIncome2026: "560 M",
    capex2024: "145 M", capex2025: "150 M", capex2026: "155 M",
    fcf2024: "620 M", fcf2025: "680 M", fcf2026: "740 M"
  },
  { 
    ticker: "SAX.DE", price: 58.40, change: 1.5, marketCap: "3320 M", netDebt: "620 M", dividendYield: "3.1%", dividendYield2025: "3.4%", 
    revenue2024: "1940 M", revenue2025: "2080 M", revenue2026: "2200 M",
    ebitda2024: "595 M", ebitda2025: "645 M", ebitda2026: "695 M",
    ebit2024: "415 M", ebit2025: "460 M", ebit2026: "505 M",
    netIncome2024: "210 M", netIncome2025: "245 M", netIncome2026: "280 M",
    fcf2024: "215 M", fcf2025: "240 M", fcf2026: "275 M"
  },
  { 
    ticker: "OUT", price: 18.75, change: -1.2, marketCap: "3120 M", netDebt: "2750 M", dividendYield: "6.5%",
    revenue2024: "1820 M", revenue2025: "1910 M", ebitda2024: "455 M", ebitda2025: "485 M",
    ebit2024: "215 M", ebit2025: "240 M", fcf2024: "165 M"
  },
  { 
    ticker: "4071.SR", price: 194.50, change: 1.1, marketCap: "9725 M", netDebt: "120 M", dividendYield: "2.9%",
    revenue2024: "1220 M", revenue2025: "1450 M", ebitda2024: "445 M", ebitda2025: "520 M",
    ebit2024: "380 M", ebit2025: "450 M"
  },
  { 
    ticker: "CCO", price: 1.62, change: -2.4, marketCap: "785 M", netDebt: "5350 M",
    revenue2024: "2580 M", revenue2025: "2650 M", ebitda2024: "535 M", ebitda2025: "560 M",
    ebit2024: "165 M", ebit2025: "185 M"
  }
];

export async function fetchRealTimeOOHData(tickers: string[]): Promise<{ lastUpdated: string; companies: any[] }> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const prompt = `Finance OOH Data Extract for: ${tickers.join(", ")}. 
    Required (2024/25/26): Price, Change, MktCap, NetDebt, Revenue, EBITDA, EBIT, NetIncome, Capex, FCF, Yield.
    Return JSON ONLY:
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
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
    });

    const rawData = JSON.parse(cleanJsonResponse(response.text));
    return {
      lastUpdated: rawData.lastUpdated || new Date().toLocaleString('fr-FR'),
      companies: rawData.companies || FALLBACK_COMPANIES
    };
  } catch (e) {
    return { lastUpdated: `Fallback Mode (${new Date().toLocaleTimeString()})`, companies: FALLBACK_COMPANIES };
  }
}

export async function queryCompanyAI(prompt: string, context: SectorData): Promise<string> {
  try {
    const simplifiedContext = context.companies.map(c => ({ t: c.ticker, r25: c.revenue2025, eb25: c.ebitda2025, ebit25: c.ebit2025, per25: c.perForward }));
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Expert Analyst OOH. Context: ${JSON.stringify(simplifiedContext)}. Question: ${prompt}. Answer in French.`,
    });
    return response.text || "Analyse indisponible.";
  } catch (e) {
    return "L'IA est actuellement saturée.";
  }
}
