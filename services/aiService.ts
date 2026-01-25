
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

export async function fetchOOHQuotes(tickers: string[]): Promise<{ ticker: string; price: number; change: number }[] | null> {
  console.log("QUOTES REQUEST TICKERS", tickers);
  return withRetry(async () => {
    const ai = createGenAIInstance();
    const prompt = `Récupère le dernier cours ('price') et la variation journalière ('change' en %) pour les tickers suivants du secteur de la communication extérieure (OOH) : ${tickers.join(", ")}. (Note: CCO est Clear Channel Outdoor). Renvoie uniquement le JSON.`;

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

    console.log("QUOTES RAW RESPONSE", response.text);
    const rawData = JSON.parse(cleanJsonResponse(response.text));
    console.log("QUOTES PARSED", rawData);

    return rawData.quotes || [];
  }).catch(e => {
    console.error("fetchOOHQuotes a échoué après plusieurs tentatives:", e);
    return null;
  });
}

export async function fetchOOHRatings(tickers: string[]): Promise<{ ticker: string; rating: AnalystRating }[]> {
    return withRetry(async () => {
        const ai = createGenAIInstance();
        const ratingEnumValues = Object.values(AnalystRating).join("', '");
        const prompt = `Pour les tickers suivants du secteur de la communication extérieure (OOH) : ${tickers.join(', ')}, trouve le consensus de recommandation des analystes. (Note: CCO est Clear Channel Outdoor). Mappe le résultat à l'une de ces valeurs exactes : '${ratingEnumValues}'. Si le consensus n'est pas clair, ne renvoie rien pour ce ticker.`;
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
        const prompt = `Donne-moi l'objectif de cours ("targetPrice") pour les tickers du secteur OOH (communication extérieure) suivants : ${tickers.join(', ')}. Note: CCO est Clear Channel Outdoor, une société de médias, pas Cameco, une société minière. Si un objectif n'est pas disponible, renvoie null. Sors uniquement le JSON.`;
        
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
                maxOutputTokens: 2048,
                thinkingConfig: { thinkingBudget: 512 },
            },
        });
        
        try {
            const rawData = JSON.parse(cleanJsonResponse(response.text));
            if (rawData.targets && Array.isArray(rawData.targets)) {
                return rawData.targets.map((t: { ticker: string; targetPrice?: number }) => ({
                    ticker: t.ticker,
                    targetPrice: t.targetPrice ?? null,
                }));
            }
            return [];
        } catch (parsingError) {
            console.error("fetchOOHTargetPrices - JSON PARSING FAILED:", parsingError, "RAW:", response.text);
            return [];
        }
    }).catch(e => {
        console.warn("fetchOOHTargetPrices a échoué après plusieurs tentatives:", e);
        return [];
    });
}

export async function fetchRealTimeOOHData(tickers: string[]): Promise<{ lastUpdated: string; companies: RawCompanyFromAI[] }> {
  return withRetry(async () => {
    const ai = createGenAIInstance();
    const today = new Date().toISOString().split('T')[0];
    
    const prompt = `Trouve les données financières fondamentales pour les tickers OOH suivants : ${tickers.join(", ")}.
- Pour le ticker CCO, assure-toi de chercher "Clear Channel Outdoor Holdings", pas Cameco Corp.
- Pour tous les chiffres, privilégie les données **hors IFRS 16**.
- Pour JCDecaux (DEC.PA), l'EBITDA 2024 hors IFRS 16 est d'environ 764,5 M €.
- Inclus **sharesOutstanding (en millions)** et **dividendPerShare** pour 2024, 2025, 2026.
- Fournis les chiffres clés demandés par le schéma JSON.`;

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

    if (prompt.toLowerCase().includes("sensibilité")) {
      console.log("AI sensitivity raw response:", response.text);
    }

    return response.text || "Analyse indisponible pour le moment.";
  }).catch(() => "L'IA est actuellement saturée ou la réponse est vide. Réessayez plus tard.");
}

export async function queryMeetingQA(prompt: string, context: SectorData): Promise<string> {
  return withRetry(async () => {
    const ai = createGenAIInstance();
    const simplifiedContext = context.companies.map(c => ({ t: c.ticker, r25: c.revenue2025, eb25: c.ebitda2025, per25: c.perForward, yield25: c.dividendYield2025 }));
    
    const fullPrompt = `En tant qu'analyste financier expert du secteur OOH, prépare une session de Q&A.
    
    Contexte de la réunion : "${prompt}"
    Données sectorielles de base : ${JSON.stringify(simplifiedContext)}
    
    **Instructions strictes :**
    1.  Génère une liste de 5 à 7 questions probables d'investisseurs.
    2.  Pour chaque question, fournis une réponse synthétique et chiffrée.
    3.  **Le format de sortie est IMPÉRATIF et ne doit contenir aucun autre texte :**
        - Chaque question doit commencer par \`Q:\`
        - Chaque réponse doit commencer par \`R:\`
        - Chaque bloc Q/R doit être séparé par un saut de ligne.
    
    **Exemple de format à suivre :**
    Q: Quelle est votre vision sur la croissance du DOOH ?
    R: Nous anticipons une croissance de 10-12% en 2025, tirée par...
    Q: Comment gérez-vous l'inflation des coûts ?
    R: Nous avons sécurisé 80% de nos contrats d'énergie et nous passons...
    
    **Ne renvoie RIEN d'autre que les blocs Q:/R:. Pas d'introduction, pas de conclusion.**`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: fullPrompt,
       config: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 1024 },
      }
    });

    return response.text || "Analyse Q&A indisponible.";
  }).catch(() => "Le service Q&A est actuellement indisponible.");
}
