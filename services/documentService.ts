
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
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Trouve les derniers rapports financiers (annuels, trimestriels, présentations investisseurs) pour les sociétés OOH suivantes : ${tickers.join(", ")}. Pour chaque société, renvoie une liste de 2 à 4 documents pertinents.
      
**Stratégie & Priorités :**
1.  **Priorité au contenu :** L'objectif est de lister les documents existants. Trouve le **titre exact** et la **date de publication ('YYYY-MM-DD')**.
2.  **URL optionnelle :** Si tu ne trouves pas un lien direct (URL) vers le document (ex: un PDF), ce n'est pas grave. OMETS simplement le champ 'url', mais inclus quand même l'entrée du document avec son titre et sa date.

**RÈGLES IMPÉRATIVES DE FORMATAGE JSON :**
- **Format JSON strict** : La réponse doit être un objet JSON qui respecte le schéma.
- **Échappement OBLIGATOIRE des guillemets** : C'est la cause d'erreur la plus fréquente. Les guillemets (") dans les titres DOIVENT être échappés avec un backslash (\\).
    - **Exemple correct :** \`{"title": "Rapport Annuel \\"Vision 2025\\""}\`
    - **Exemple INCORRECT :** \`{"title": "Rapport Annuel "Vision 2025""}\`
- La réponse doit être structurée en groupant les documents par ticker dans le tableau 'documentsByTicker'.`,
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
      
      if (parsed.documentsByTicker && Array.isArray(parsed.documentsByTicker)) {
        parsed.documentsByTicker.forEach((item: { ticker: string, docs: DocumentItem[] }) => {
          if (item.ticker && Array.isArray(item.docs)) {
            const normalizedTicker = item.ticker.toUpperCase().replace(/_/g, '.');
            result[normalizedTicker] = item.docs;
          }
        });
        if (Object.keys(result).length > 0) return result;
      }
      
      console.warn("fetchOOHDocuments - JSON is valid but has unexpected structure. RAW:", rawResponseText);
      return FALLBACK_DOCS;

    } catch (parsingError) {
      console.error("fetchOOHDocuments - JSON PARSING FAILED:", parsingError, "RAW:", rawResponseText);
      return FALLBACK_DOCS; // Ne pas relancer sur une erreur de parsing
    }
  }).catch((apiError) => {
    console.error("fetchOOHDocuments - API CALL FAILED after retries:", apiError);
    return FALLBACK_DOCS;
  });
};
