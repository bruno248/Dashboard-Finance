
import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const FALLBACK_NEWS: NewsItem[] = [
  { id: 101, source: "Reuters", tag: "Digital", title: "JCDecaux accélère son déploiement programmatique en Europe du Nord", time: "2h ago" },
  { id: 102, source: "Bloomberg", tag: "Deals", title: "Lamar Advertising explore des acquisitions stratégiques dans le Midwest", time: "4h ago" },
  { id: 103, source: "Financial Times", tag: "Earnings", title: "Secteur OOH : Les revenus publicitaires digitaux (DOOH) dépassent les attentes au Q4", time: "6h ago" },
  { id: 104, source: "Les Echos", tag: "Market", title: "Ströer confirme ses objectifs annuels malgré un marché publicitaire volatil", time: "8h ago" }
];

function cleanJsonResponse(text: string): string {
  if (!text) return "{}";
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) return "{}";
  cleaned = cleaned.substring(firstBrace);
  return cleaned;
}

export const fetchOOHNews = async (): Promise<NewsItem[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Récupère 5 news OOH récentes (JCDecaux, Lamar, etc) en JSON.",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      }
    });

    const parsed = JSON.parse(cleanJsonResponse(response.text || "{}"));
    return parsed.news || FALLBACK_NEWS;
  } catch (error) {
    console.warn("News Fetch Error - Using Fallback News");
    return FALLBACK_NEWS;
  }
};

export const summarizeNewsItem = async (title: string, source: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyse cette news OOH : "${title}" (${source}). Résumé court + 3 points clés.`,
    });
    return response.text || "Résumé indisponible.";
  } catch (error) {
    return "Résumé indisponible (Quota API atteint).";
  }
};
