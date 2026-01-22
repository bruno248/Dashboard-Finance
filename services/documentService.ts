
import { GoogleGenAI } from "@google/genai";
import { DocumentItem } from "../types";
import { cleanJsonResponse } from "../utils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const FALLBACK_DOCS = {
  "DEC.PA": [{ id: "d1", type: "Report", title: "Rapport Annuel 2023", date: "2024-03-15", url: "https://www.jcdecaux.com" }]
};

export interface DocumentFetchResult { [ticker: string]: DocumentItem[]; }

export const fetchOOHDocuments = async (): Promise<DocumentFetchResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Find latest financial reports for JCDecaux, Lamar, Ströer. JSON: { 'documentsByTicker': [ { 'ticker': 'string', 'docs': [...] } ] }",
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
    });
    const parsed = JSON.parse(cleanJsonResponse(response.text));
    const result: DocumentFetchResult = {};
    if (parsed.documentsByTicker && Array.isArray(parsed.documentsByTicker)) {
      parsed.documentsByTicker.forEach((item: any) => {
        if (item.ticker && Array.isArray(item.docs)) result[item.ticker.toUpperCase()] = item.docs;
      });
      return Object.keys(result).length > 0 ? result : FALLBACK_DOCS as any;
    }
    return FALLBACK_DOCS as any;
  } catch (error) {
    return FALLBACK_DOCS as any;
  }
};
