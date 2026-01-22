
import { GoogleGenAI } from "@google/genai";
import { NewsItem } from "../types";
import { cleanJsonResponse, withRetry } from "../utils";

const FALLBACK_NEWS: NewsItem[] = [
  { id: 101, source: "Reuters", tag: "Digital", title: "JCDecaux accélère son déploiement programmatique en Europe du Nord", time: "2h ago" },
  { id: 103, source: "Financial Times", tag: "Earnings", title: "Secteur OOH : Les revenus publicitaires digitaux (DOOH) dépassent les attentes au Q4", time: "6h ago" }
];

export const fetchOOHNews = async (): Promise<NewsItem[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Récupère 5 news OOH récentes (JCDecaux, Lamar, Ströer) en JSON format: { \"news\": [...] }",
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
    });
    const parsed = JSON.parse(cleanJsonResponse(response.text));
    return parsed.news || FALLBACK_NEWS;
  }).catch(() => FALLBACK_NEWS);
};

export const summarizeNewsItem = async (title: string, source: string): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyse cette news OOH : "${title}" (${source}). Résumé court + 3 points clés en français.`,
    });
    return response.text || "Résumé indisponible.";
  }).catch(() => "Le service de résumé est temporairement indisponible.");
};
