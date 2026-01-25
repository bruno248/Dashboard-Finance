
import { GoogleGenAI, Type } from "@google/genai";
import { DocumentItem } from "../types";
import { cleanJsonResponse, createGenAIInstance, withRetry } from "../utils";

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
  
  return withRetry(async () => {
    const ai = createGenAIInstance();
    // Prompt renforcé avec un exemple de structure explicite
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Pour chaque ticker (${tickers.join(", ")}), trouve 2-4 rapports financiers récents.

**RÈGLES DE FORMATAGE IMPÉRATIVES :**
1.  **Structure JSON stricte :** La réponse DOIT être un objet JSON unique contenant une seule clé principale : \`"documentsByTicker"\`.
2.  La valeur de \`"documentsByTicker"\` DOIT être un tableau (array) d'objets.
3.  Chaque objet dans le tableau DOIT contenir deux clés : \`"ticker"\` (string) et \`"docs"\` (un tableau de documents).
4.  **Exemple de structure à respecter impérativement :**
    \`\`\`json
    {
      "documentsByTicker": [
        {
          "ticker": "DEC.PA",
          "docs": [
            { "id": "dec_q3_2024", "type": "Report", "title": "Q3 2024 Revenue Report", "date": "2024-10-26", "url": "..." }
          ]
        },
        {
          "ticker": "OUT",
          "docs": [
            { "id": "out_q3_2024", "type": "PPT", "title": "Q3 2024 Earnings Presentation", "date": "2024-11-01" }
          ]
        }
      ]
    }
    \`\`\`
5.  **Échappement des guillemets :** N'oublie pas d'échapper les guillemets (") dans les titres avec un backslash (\\).
6.  **Ne renvoie AUCUN texte en dehors de cet objet JSON.**`,
      config: { 
        tools: [{ googleSearch: {} }], 
        responseMimeType: "application/json",
        responseSchema: docSchema,
        temperature: 0.2,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 1024 },
      }
    });

    const rawResponseText = response.text;
    try {
      const parsed = JSON.parse(cleanJsonResponse(rawResponseText));
      const result: DocumentFetchResult = {};
      
      // La validation existante est déjà correcte, elle attend la structure que nous avons imposée
      if (parsed.documentsByTicker && Array.isArray(parsed.documentsByTicker)) {
        parsed.documentsByTicker.forEach((item: { ticker: string, docs: DocumentItem[] }) => {
          if (item.ticker && Array.isArray(item.docs)) {
            const normalizedTicker = item.ticker.toUpperCase().replace(/_/g, '.');
            result[normalizedTicker] = item.docs;
          }
        });
        return result;
      }
      
      console.warn("fetchOOHDocuments - JSON valide mais structure inattendue. RAW:", rawResponseText);
      return FALLBACK_DOCS;

    } catch (parsingError) {
      console.error("fetchOOHDocuments - JSON PARSING FAILED:", parsingError, "RAW:", rawResponseText);
      return FALLBACK_DOCS;
    }
  }).catch((apiError) => {
    console.error("fetchOOHDocuments - API CALL FAILED after retries:", apiError);
    return FALLBACK_DOCS;
  });
};
