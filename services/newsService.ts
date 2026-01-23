
import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem, NewsTag } from "../types";
import { cleanJsonResponse, withRetry } from "../utils";

const today = new Date().toISOString().split('T')[0];

const FALLBACK_NEWS: NewsItem[] = [];

const FALLBACK_HIGHLIGHTS: NewsItem[] = [
  { id: 201, source: "AdWeek", tag: "Deals", title: "Major Retailer Signs Exclusive DOOH Advertising Deal with Outfront Media", date: "2023-11-15", time: "10m ago"},
  { id: 202, source: "WSJ", tag: "Market", title: "OOH Advertising Bounces Back Strongly in Post-Pandemic Travel Surge", date: "2023-09-01", time: "1y ago" }
];

const simplifiedTagsDescription = "One of: Market, Corporate, Earnings, Deals, Digital, Regulation";

const newsSchema = {
  type: Type.OBJECT,
  properties: {
    news: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          source: { type: Type.STRING },
          title: { type: Type.STRING },
          time: { type: Type.STRING, description: "Relative time like '2h ago' or '1d ago'" },
          date: { type: Type.STRING, description: "Date in 'YYYY-MM-DD' format (must be known)" },
          tag: { type: Type.STRING, description: simplifiedTagsDescription },
          url: { type: Type.STRING },
        },
        required: ["id", "source", "title", "date", "tag"]
      },
    },
  },
  required: ["news"]
};

const highlightsSchema = {
  type: Type.OBJECT,
  properties: {
    highlights: {
      ...newsSchema.properties.news,
      description: "Array of major news highlights from the last 12 months."
    }
  },
  required: ["highlights"]
};


export const fetchOOHNews = async (maxCount: number = 5): Promise<NewsItem[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `
Récupère jusqu'à ${maxCount} actualités publiées dans les 3 DERNIERS JOURS 
sur le secteur de la communication extérieure (OOH), notamment sur JCDecaux, Lamar, Ströer, Clear Channel, Outfront.

Contraintes fortes :
- La date DOIT être renvoyée au format "YYYY-MM-DD" et être identifiable.
- Pour chaque news, choisis un tag parmi : ${simplifiedTagsDescription}.

Le résultat doit respecter strictement le schema JSON fourni.`,
      config: { 
        tools: [{ googleSearch: {} }], 
        responseMimeType: "application/json",
        responseSchema: newsSchema,
        temperature: 0.2,
        maxOutputTokens: maxCount === 5 ? 1200 : 2048,
        thinkingConfig: { thinkingBudget: maxCount === 5 ? 512 : 1024 },
      }
    });
    const parsed = JSON.parse(cleanJsonResponse(response.text));
    return parsed.news || FALLBACK_NEWS;
  }).catch(() => {
    // Si l'IA échoue, on ne montre simplement pas de news plutôt que des articles inventés.
    return FALLBACK_NEWS;
  });
};

export const fetchOOHHighlights = async (): Promise<NewsItem[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `
Récupère 15 à 20 actualités MARQUANTES publiées au cours des 12 DERNIERS MOIS 
sur le secteur de la communication extérieure (OOH).

Contraintes fortes :
- Ne sélectionne que des événements significatifs (M&A majeur, résultats annuels, changement de direction, innovation technologique importante).
- La date DOIT être renvoyée au format "YYYY-MM-DD" et être identifiable.
- Pour chaque news, choisis un tag parmi : ${simplifiedTagsDescription}.

Le résultat doit respecter strictement le schema JSON fourni.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: highlightsSchema,
        temperature: 0.3,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 1024 },
      }
    });
    const parsed = JSON.parse(cleanJsonResponse(response.text));
    return parsed.highlights || FALLBACK_HIGHLIGHTS;
  }).catch(() => FALLBACK_HIGHLIGHTS);
};

export const summarizeNewsItem = async (title: string, source: string): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyse cette news OOH : "${title}" (${source}). Résumé court + 3 points clés en français. Sépare les points clés avec le titre "KEY TAKEAWAYS".`,
      config: {
        temperature: 0.2,
        maxOutputTokens: 800,
        thinkingConfig: { thinkingBudget: 400 },
      }
    });
    return response.text || "Résumé indisponible.";
  }).catch(() => "Le service de résumé est temporairement indisponible.");
};
