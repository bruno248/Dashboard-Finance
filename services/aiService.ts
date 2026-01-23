
import { GoogleGenAI, Type } from "@google/genai";
import { SectorData, AnalystRating } from "../types";
import { cleanJsonResponse, withRetry } from "../utils";

export const FALLBACK_COMPANIES = [
  { 
    ticker: "DEC.PA", price: 0, change: 0, netDebt: "920 M", sharesOutstanding: 212, dividendYield: "3.5%", dividendPerShare2024: "0.70", dividendPerShare2025: "0.80", dividendPerShare2026: "0.90",
    revenue2024: "3570 M", revenue2025: "3750 M", revenue2026: "3940 M",
    ebitda2024: "765 M", ebitda2025: "810 M", ebitda2026: "860 M",
    ebit2024: "285 M", ebit2025: "320 M", ebit2026: "360 M",
    netIncome2024: "180 M", netIncome2025: "210 M", netIncome2026: "250 M",
    capex2024: "350 M", capex2025: "360 M", capex2026: "370 M",
    fcf2024: "200 M", fcf2025: "240 M", fcf2026: "280 M"
  },
  { 
    ticker: "LAMR", price: 0, change: 0, netDebt: "3150 M", sharesOutstanding: 102, dividendYield: "3.9%", dividendPerShare2024: "5.20", dividendPerShare2025: "5.40", dividendPerShare2026: "5.60",
    revenue2024: "2150 M", revenue2025: "2300 M", revenue2026: "2450 M",
    ebitda2024: "980 M", ebitda2025: "1050 M", ebitda2026: "1120 M",
    ebit2024: "810 M", ebit2025: "870 M", ebit2026: "940 M",
    netIncome2024: "465 M", netIncome2025: "510 M", netIncome2026: "560 M",
    capex2024: "145 M", capex2025: "150 M", capex2026: "155 M",
    fcf2024: "620 M", fcf2025: "680 M", fcf2026: "740 M"
  },
  { 
    ticker: "SAX.DE", price: 0, change: 0, netDebt: "1450 M", sharesOutstanding: 57, dividendYield: "3.2%", dividendPerShare2024: "1.85", dividendPerShare2025: "1.95", dividendPerShare2026: "2.10",
    revenue2024: "1820 M", revenue2025: "1910 M", revenue2026: "2000 M",
    ebitda2024: "540 M", ebitda2025: "570 M", ebitda2026: "600 M",
    ebit2024: "320 M", ebit2025: "350 M", ebit2026: "380 M",
    netIncome2024: "180 M", netIncome2025: "200 M", netIncome2026: "220 M",
    capex2024: "100 M", capex2025: "105 M", capex2026: "110 M",
    fcf2024: "310 M", fcf2025: "340 M", fcf2026: "370 M"
  },
  { 
    ticker: "OUT", price: 0, change: 0, netDebt: "2500 M", sharesOutstanding: 167, dividendYield: "6.5%", dividendPerShare2024: "1.22", dividendPerShare2025: "1.25", dividendPerShare2026: "1.28",
    revenue2024: "1850 M", revenue2025: "1950 M", revenue2026: "2050 M",
    ebitda2024: "450 M", ebitda2025: "480 M", ebitda2026: "510 M",
    ebit2024: "250 M", ebit2025: "270 M", ebit2026: "290 M",
    netIncome2024: "100 M", netIncome2025: "120 M", netIncome2026: "140 M",
    capex2024: "100 M", capex2025: "100 M", capex2026: "100 M",
    fcf2024: "200 M", fcf2025: "220 M", fcf2026: "240 M"
  },
  {
    ticker: "CCO", price: 0, change: 0, netDebt: "5100 M", sharesOutstanding: 485, dividendYield: "0.0%", dividendPerShare2024: "0.00", dividendPerShare2025: "0.00", dividendPerShare2026: "0.00",
    revenue2024: "2200 M", revenue2025: "2250 M", revenue2026: "2300 M",
    ebitda2024: "550 M", ebitda2025: "580 M", ebitda2026: "610 M",
    ebit2024: "150 M", ebit2025: "170 M", ebit2026: "190 M",
    netIncome2024: "-50 M", netIncome2025: "-20 M", netIncome2026: "10 M",
    capex2024: "150 M", capex2025: "150 M", capex2026: "150 M",
    fcf2024: "50 M", fcf2025: "70 M", fcf2026: "90 M"
  },
  {
    ticker: "4071.SR", price: 0, change: 0, netDebt: "0 M", sharesOutstanding: 50, dividendYield: "2.8%", dividendPerShare2024: "5.50", dividendPerShare2025: "6.00", dividendPerShare2026: "6.50",
    revenue2024: "1100 M", revenue2025: "1300 M", revenue2026: "1500 M",
    ebitda2024: "450 M", ebitda2025: "550 M", ebitda2026: "650 M",
    ebit2024: "430 M", ebit2025: "530 M", ebit2026: "630 M",
    netIncome2024: "400 M", netIncome2025: "500 M", netIncome2026: "600 M",
    capex2024: "80 M", capex2025: "90 M", capex2026: "100 M",
    fcf2024: "350 M", fcf2025: "440 M", fcf2026: "530 M"
  }
];

const FALLBACK_QUOTES = [
  { ticker: "DEC.PA", price: 19.85, change: 0.8 },
  { ticker: "LAMR", price: 134.20, change: -0.3 },
  { ticker: "SAX.DE", price: 58.40, change: 1.5 },
  { ticker: "OUT", price: 18.75, change: -1.2 },
  { ticker: "4071.SR", price: 194.50, change: 1.1 },
  { ticker: "CCO", price: 1.62, change: -2.4 }
];

export async function fetchOOHQuotes(tickers: string[]): Promise<{ ticker: string; price: number; change: number }[]> {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Get the latest stock price and percentage change for these tickers: ${tickers.join(", ")}.`;
    const schema = {
      type: Type.OBJECT,
      properties: {
        quotes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              ticker: { type: Type.STRING },
              price: { type: Type.NUMBER },
              change: { type: Type.NUMBER },
            },
            required: ["ticker", "price", "change"],
          },
        },
      },
      required: ["quotes"],
    };
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
      },
    });
    const rawData = JSON.parse(cleanJsonResponse(response.text));
    return rawData.quotes || FALLBACK_QUOTES.filter(q => tickers.includes(q.ticker));
  }).catch(e => {
    console.error("fetchOOHQuotes failed:", e);
    return FALLBACK_QUOTES.filter(q => tickers.includes(q.ticker));
  });
}

export async function fetchOOHRatings(tickers: string[]): Promise<{ ticker: string; rating: AnalystRating }[]> {
    return withRetry(async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const ratingEnumValues = Object.values(AnalystRating).join("', '");
        const prompt = `Pour les tickers suivants : ${tickers.join(', ')}, trouve le consensus de recommandation des analystes (analyst rating consensus). Mappe le résultat à l'une de ces valeurs exactes : '${ratingEnumValues}'. Si le consensus n'est pas clair, ne renvoie rien pour ce ticker.`;
        const schema = {
            type: Type.OBJECT,
            properties: {
                ratings: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            ticker: { type: Type.STRING },
                            rating: { type: Type.STRING, enum: Object.values(AnalystRating) },
                        },
                        required: ["ticker", "rating"],
                    },
                },
            },
            required: ["ratings"],
        };

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.3,
            },
        });

        const rawData = JSON.parse(cleanJsonResponse(response.text));
        return rawData.ratings || [];
    }).catch(e => {
        console.warn("fetchOOHRatings a échoué, les ratings ne seront pas mis à jour.", e);
        return [];
    });
}

export async function fetchOOHTargetPrices(tickers: string[]): Promise<{ ticker: string; targetPrice: number | null }[]> {
    return withRetry(async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Pour chaque ticker suivant : ${tickers.join(', ')}, trouve l'objectif de cours consensus des analystes (analyst consensus target price). Cherche des sources fiables comme Bloomberg, Reuters, FactSet ou des rapports d'analystes. Fournis la valeur numérique dans la monnaie locale du titre. Si aucun consensus clair n'est disponible, renvoie null pour targetPrice.`;
        const schema = {
            type: Type.OBJECT,
            properties: {
                targets: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            ticker: { type: Type.STRING },
                            targetPrice: { type: Type.NUMBER, nullable: true },
                        },
                        required: ["ticker", "targetPrice"],
                    },
                },
            },
            required: ["targets"],
        };

        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.2,
                maxOutputTokens: 1200,
            },
        });
        const rawData = JSON.parse(cleanJsonResponse(response.text));
        return rawData.targets || [];
    }).catch(e => {
        console.warn("fetchOOHTargetPrices a échoué, les objectifs de cours ne seront pas mis à jour.", e);
        return [];
    });
}

export async function fetchRealTimeOOHData(tickers: string[]): Promise<{ lastUpdated: string; companies: any[] }> {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const today = new Date().toISOString().split('T')[0];
    
    const prompt = `En tant qu'analyste financier expert du secteur OOH, recherche les données les plus récentes sur Internet pour les tickers suivants : ${tickers.join(", ")}.

**Instruction critique :** Pour tous les chiffres, privilégie les données **hors IFRS 16 (pre-IFRS 16)**.
- **Point d'ancrage pour JCDecaux (DEC.PA) :** l'EBITDA 2024 hors IFRS 16 est d'environ 764,5 M €.
- **Données à fournir :** Inclus le **nombre d'actions en circulation (sharesOutstanding) en millions** et les **dividendes par action estimés (dividendPerShare) pour 2024, 2025, et 2026** dans la monnaie locale.

Fournis les chiffres clés demandés par le schéma JSON.`;

    // NOTE: Le rendement du dividende (yield) n'est pas demandé à l'IA,
    // il est calculé localement dans l'application pour plus de précision.
    const schema = {
      type: Type.OBJECT,
      properties: {
        lastUpdated: { type: Type.STRING, description: `Date du jour: ${today}` },
        companies: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              ticker: { type: Type.STRING },
              price: { type: Type.NUMBER },
              change: { type: Type.NUMBER },
              netDebt: { type: Type.STRING },
              sharesOutstanding: { type: Type.NUMBER, description: "Number of shares in millions" },
              dividendPerShare2024: { type: Type.STRING },
              dividendPerShare2025: { type: Type.STRING },
              dividendPerShare2026: { type: Type.STRING },
              revenue2024: { type: Type.STRING },
              revenue2025: { type: Type.STRING },
              revenue2026: { type: Type.STRING },
              ebitda2024: { type: Type.STRING },
              ebitda2025: { type: Type.STRING },
              ebitda2026: { type: Type.STRING },
              ebit2024: { type: Type.STRING },
              ebit2025: { type: Type.STRING },
              ebit2026: { type: Type.STRING },
              netIncome2024: { type: Type.STRING },
              netIncome2025: { type: Type.STRING },
              netIncome2026: { type: Type.STRING },
              capex2024: { type: Type.STRING },
              fcf2024: { type: Type.STRING },
            },
            required: ["ticker", "price", "change", "netDebt", "sharesOutstanding"]
          },
        },
      },
      required: ["lastUpdated", "companies"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: { 
        tools: [{ googleSearch: {} }], 
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 1024 },
      }
    });

    const rawData = JSON.parse(cleanJsonResponse(response.text));
    return {
      lastUpdated: rawData.lastUpdated || today,
      companies: rawData.companies && rawData.companies.length > 0 ? rawData.companies : FALLBACK_COMPANIES
    };
  }).catch(e => {
    console.error("fetchRealTimeOOHData permanent error:", e);
    // NOTE: En mode secours, les données de marché (prix, variation) sont neutres (0).
    // L'UI affiche "Données de secours" pour informer l'utilisateur.
    return { 
      lastUpdated: `Données de secours (${new Date().toLocaleTimeString()})`, 
      companies: FALLBACK_COMPANIES 
    };
  });
}

export async function queryCompanyAI(prompt: string, context: SectorData): Promise<string> {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const simplifiedContext = context.companies.map(c => ({ 
      t: c.ticker, r25: c.revenue2025, eb25: c.ebitda2025, ebit25: c.ebit2025, per25: c.perForward 
    }));
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Tu es un Analyste OOH Senior. Analyse les données suivantes pour répondre : ${JSON.stringify(simplifiedContext)}. 
      Question de l'utilisateur : ${prompt}. 
      Réponds en français avec précision et professionnalisme.`,
       config: {
        temperature: 0.2,
        maxOutputTokens: 800,
        thinkingConfig: { thinkingBudget: 400 },
      }
    });

    return response.text || "Analyse indisponible pour le moment.";
  }).catch(() => "L'IA est actuellement saturée ou la réponse est vide. Réessayez plus tard.");
}
