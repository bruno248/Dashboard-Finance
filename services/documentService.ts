
import { GoogleGenAI, Type } from "@google/genai";
import { DocumentItem } from "../types";
import { cleanJsonResponse, createGenAIInstance } from "../utils";

const FALLBACK_DOCS: DocumentFetchResult = {};

export interface DocumentFetchResult { [ticker: string]: DocumentItem[]; }

const docSchema = {
  type: Type.OBJECT,
  properties: {
    documentsByTicker: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ticker: { type: Type.STRING },
          docs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "A unique ID for the document" },
                type: { type: Type.STRING, description: "Type of document, e.g., 'Report', 'PPT', 'ESG'" },
                title: { type: Type.STRING },
                date: { type: Type.STRING, description: "Publication date in 'YYYY-MM-DD' format" },
                url: { type: Type.STRING, description: "Direct link to the document if available" },
              },
              required: ["id", "type", "title", "date"]
            },
          },
        },
        required: ["ticker", "docs"]
      },
    },
  },
  required: ["documentsByTicker"]
};

export const fetchOOHDocuments = async (tickers: string[]): Promise<DocumentFetchResult> => {
  if (!tickers || tickers.length === 0) {
    return FALLBACK_DOCS;
  }
  try {
    const ai = createGenAIInstance();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Trouve les derniers rapports financiers (annuels, trimestriels, présentations investisseurs) pour les sociétés OOH suivantes : ${tickers.join(", ")}. Pour chaque société, renvoie une liste de 2 à 4 documents pertinents. Structure la réponse en suivant scrupuleusement le schéma JSON fourni, en groupant les documents par ticker dans le tableau 'documentsByTicker'.`,
      config: { 
        tools: [{ googleSearch: {} }], 
        responseMimeType: "application/json",
        responseSchema: docSchema,
        temperature: 0.2,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 1024 },
      }
    });
    const parsed = JSON.parse(cleanJsonResponse(response.text));
    const result: DocumentFetchResult = {};
    
    if (parsed.documentsByTicker && Array.isArray(parsed.documentsByTicker)) {
      parsed.documentsByTicker.forEach((item: { ticker: string, docs: DocumentItem[] }) => {
        if (item.ticker && Array.isArray(item.docs)) {
          // Normalise la clé pour garantir la cohérence (ex: DEC_PA -> DEC.PA)
          const normalizedTicker = item.ticker.toUpperCase().replace(/_/g, '.');
          result[normalizedTicker] = item.docs;
        }
      });
      if (Object.keys(result).length > 0) return result;
    }
    
    return FALLBACK_DOCS;
  } catch (error) {
    console.error("fetchOOHDocuments failed, returning fallback.", error);
    return FALLBACK_DOCS;
  }
};
