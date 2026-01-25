
import { GoogleGenAI, Type } from "@google/genai";
import { SectorData, AnalystRating, RawCompanyFromAI } from "../types";
import { cleanJsonResponse, withRetry, createGenAIInstance, computeFinancialRatios } from "../utils";
import { BASE_COMPANIES_DATA } from "../constants";

export const FALLBACK_COMPANIES = BASE_COMPANIES_DATA.map(c => ({
    ticker: c.ticker,
    price: 0,
    change: 0,
    netDebt: c.netDebt,
    sharesOutstanding: c.sharesOutstanding,
    dividendPerShare2024: c.dividendPerShare2024,
    dividendPerShare2025: c.dividendPerShare2025,
    dividendPerShare2026: c.dividendPerShare2026,
    revenue2024: c.revenue2024,
    revenue2025: c.revenue2025,
    revenue2026: c.revenue2026,
    ebitda2024: c.ebitda2024,
    ebitda2025: c.ebitda2025,
    ebitda2026: c.ebitda2026,
    ebit2024: c.ebit2024,
    ebit2025: c.ebit2025,
    ebit2026: c.ebit2026,
    netIncome2024: c.netIncome2024,
    netIncome2025: c.netIncome2025,
    netIncome2026: c.netIncome2026,
    capex2024: c.capex2024,
    capex2025: c.capex2025,
    capex2026: c.capex2026,
    fcf2024: c.fcf2024,
    fcf2025: c.fcf2025,
    fcf2026: c.fcf2026,
}));

const FALLBACK_QUOTES: { ticker: string; price: number; change: number }[] = [];

export async function fetchOOHQuotes(tickers: string[]): Promise<{ ticker: string; price: number; change: number }[]> {
  return withRetry(async () => {
    const ai = createGenAIInstance();
    const prompt = `En tant qu'API de données financières, récupère le dernier cours de clôture ('price') et la variation en pourcentage par rapport à la veille ('change') pour les tickers suivants : ${tickers.join(", ")}.

**Règles impératives :**
- La réponse DOIT être un objet JSON valide, strictement conforme au schéma fourni.
- Le prix doit être un nombre dans la monnaie locale du titre.
- Si un ticker est invalide ou introuvable, ne l'inclus pas dans la réponse.
- N'inclus aucun texte en dehors de l'objet JSON.`;

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
              change: { type: Type.NUMBER, description: "Variation en pourcentage, ex: -1.25" },
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

    console.log('IA raw response for quotes:', response.text);
    const rawData = JSON.parse(cleanJsonResponse(response.text));
    console.log('Parsed quotes data:', rawData);

    return rawData.quotes || [];
  }).catch(e => {
    console.error("fetchOOHQuotes a échoué après plusieurs tentatives:", e);
    return [];
  });
}

export async function fetchOOHRatings(tickers: string[]): Promise<{ ticker: string; rating: AnalystRating }[]> {
    return withRetry(async () => {
        const ai = createGenAIInstance();
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
        const ai = createGenAIInstance();
        const prompt = `Pour chaque ticker suivant : ${tickers.join(', ')}, trouve l'objectif de cours consensus des analystes (analyst consensus target price). Cherche des sources fiables comme Bloomberg, Reuters, FactSet ou des rapports d'analystes. Fournis la valeur numérique dans la monnaie locale du titre. Si aucun consensus clair n'est disponible, renvoie null pour targetPrice.`;
        // @FIX: Removed non-standard `nullable: true` and made `targetPrice` optional by removing it from `required` array.
        const schema = {
            type: Type.OBJECT,
            properties: {
                targets: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            ticker: { type: Type.STRING },
                            targetPrice: { type: Type.NUMBER },
                        },
                        required: ["ticker"],
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
        // @FIX: Handle optional targetPrice to align with return type.
        if (rawData.targets && Array.isArray(rawData.targets)) {
            return rawData.targets.map((t: { ticker: string; targetPrice?: number }) => ({
                ticker: t.ticker,
                targetPrice: t.targetPrice ?? null,
            }));
        }
        return [];
    }).catch(e => {
        console.warn("fetchOOHTargetPrices a échoué, les objectifs de cours ne seront pas mis à jour.", e);
        return [];
    });
}

export async function fetchRealTimeOOHData(tickers: string[]): Promise<{ lastUpdated: string; companies: RawCompanyFromAI[] }> {
  return withRetry(async () => {
    const ai = createGenAIInstance();
    const today = new Date().toISOString().split('T')[0];
    
    const prompt = `En tant qu'analyste financier expert du secteur OOH, recherche les données financières fondamentales les plus récentes sur Internet pour les tickers suivants : ${tickers.join(", ")}. Ne pas inclure les cours de bourse ('price') ni la variation ('change'), car ils sont gérés par un autre service.

**Instruction critique :** Pour tous les chiffres, privilégie les données **hors IFRS 16 (pre-IFRS 16)**.
- **Point d'ancrage pour JCDecaux (DEC.PA) :** l'EBITDA 2024 hors IFRS 16 est d'environ 764,5 M €.
- **Données à fournir :** Inclus le **nombre d'actions en circulation (sharesOutstanding) en millions** et les **dividendes par action estimés (dividendPerShare) pour 2024, 2025, et 2026** dans la monnaie locale.

Fournis les chiffres clés demandés par le schéma JSON.`;

    // NOTE: Le rendement du dividende (yield), le prix (price) et la variation (change)
    // ne sont pas demandés à l'IA pour simplifier la requête et améliorer la fiabilité.
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
              capex2025: { type: Type.STRING },
              capex2026: { type: Type.STRING },
              fcf2024: { type: Type.STRING },
              fcf2025: { type: Type.STRING },
              fcf2026: { type: Type.STRING },
            },
            required: [
              "ticker", "netDebt", "sharesOutstanding",
              "revenue2024", "revenue2025", "revenue2026",
              "ebitda2024", "ebitda2025", "ebitda2026",
              "ebit2024", "ebit2025", "ebit2026",
              "netIncome2024", "netIncome2025", "netIncome2026",
              "capex2024", "capex2025", "capex2026"
            ]
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
    const ai = createGenAIInstance();
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
