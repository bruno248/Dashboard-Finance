
import { GoogleGenAI, Type } from "@google/genai";
import { DocumentItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const FALLBACK_DOCS = {
  "DEC.PA": [{ id: "d1", type: "Report", title: "Rapport Annuel 2023", date: "2024-03-15", url: "https://www.jcdecaux.com" }],
  "LAMR": [{ id: "d2", type: "PPT", title: "Investor Presentation Q3 2024", date: "2024-11-05", url: "https://www.lamar.com" }],
  "SAX.DE": [{ id: "d3", type: "Report", title: "Annual Report 2023", date: "2024-04-10", url: "https://www.stroeer.com" }]
};

export interface DocumentFetchResult {
  [ticker: string]: DocumentItem[];
}

function cleanJsonResponse(text: string): string {
  if (!text) return "{}";
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) return "{}";
  cleaned = cleaned.substring(firstBrace);
  return cleaned;
}

export const fetchOOHDocuments = async (): Promise<DocumentFetchResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Trouve les derniers rapports financiers (Annual Reports, Presentations) pour JCDecaux, Lamar, Ströer. Retourne un JSON avec 'documentsByTicker': [ { 'ticker': 'string', 'docs': [...] } ]",
      config: { 
        tools: [{ googleSearch: {} }], 
        responseMimeType: "application/json" 
      }
    });

    if (!response.text) throw new Error("Empty response");

    const cleaned = cleanJsonResponse(response.text);
    const parsed = JSON.parse(cleaned);
    const result: DocumentFetchResult = {};
    
    if (parsed.documentsByTicker && Array.isArray(parsed.documentsByTicker)) {
      parsed.documentsByTicker.forEach((item: any) => {
        if (item.ticker && Array.isArray(item.docs)) {
          result[item.ticker.toUpperCase()] = item.docs;
        }
      });
      return Object.keys(result).length > 0 ? result : FALLBACK_DOCS as any;
    }
    return FALLBACK_DOCS as any;
  } catch (error) {
    console.warn("fetchOOHDocuments: API quota exceeded or error. Returning fallback data.");
    return FALLBACK_DOCS as any;
  }
};
