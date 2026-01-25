
import { GoogleGenAI, Type } from "@google/genai";
import { EventItem } from "../types";
import { cleanJsonResponse, withRetry, createGenAIInstance } from "../utils";
import { BASE_COMPANIES_DATA } from "../constants";

const FALLBACK_AGENDA: EventItem[] = [];

const agendaSchema = {
    type: Type.OBJECT,
    properties: {
        events: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    date: { type: Type.STRING, description: "Date in 'YYYY-MM-DD' format" },
                    type: { type: Type.STRING, description: "e.g., 'Earnings', 'Shareholder Meeting'" },
                    ticker: { type: Type.STRING, description: "Ticker of the company if the event is specific to one" },
                },
                required: ["id", "title", "date", "type"]
            },
        },
    },
    required: ["events"]
};


export const fetchOOHAgenda = async (): Promise<EventItem[]> => {
  const companyList = BASE_COMPANIES_DATA.map(c => `${c.name} (${c.ticker})`).join(', ');

  const apiCall = async () => {
    const ai = createGenAIInstance();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Trouve jusqu'à 15 des prochains événements financiers (publications de résultats, journées investisseurs, assemblées générales) pour les entreprises du secteur OOH suivantes : ${companyList}, attendus dans les 12 prochains mois. Pour chaque événement, si possible, identifie et inclus le ticker de l'entreprise concernée.

**Règles de formatage impératives :**
- **Format JSON strict** : La réponse doit être un objet JSON qui respecte le schéma. Toutes les clés et les valeurs de type chaîne de caractères doivent être entourées de guillemets doubles ("").
- **Échappement OBLIGATOIRE des guillemets** : C'est la cause d'erreur la plus fréquente. Les guillemets (") dans les titres ou toute autre valeur de chaîne DOIVENT être échappés avec un backslash (\\).
    - **Exemple correct :** \`{"title": "Journée investisseurs \\"Vision 2025\\""}\`
    - **Exemple INCORRECT :** \`{"title": "Journée investisseurs "Vision 2025""}\`
- **Date précise** : Assure-toi que chaque événement a une date précise au format 'YYYY-MM-DD'.
- **Cas vide** : Si aucun événement n'est trouvé, renvoyer \`{"events": []}\` est obligatoire.
- **Ne pas inventer** : N'invente pas d'événements si aucune information n'est disponible.`,
      config: { 
        tools: [{ googleSearch: {} }], 
        responseMimeType: "application/json",
        responseSchema: agendaSchema,
        temperature: 0.2,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 1024 },
      }
    });
    return response;
  };

  try {
    const response = await withRetry(apiCall);
    
    console.log('IA response for calendar:', response.text);
    const rawResponseText = response.text;

    try {
      const cleaned = cleanJsonResponse(rawResponseText);
      const parsed = JSON.parse(cleaned);
      
      if (parsed.events && Array.isArray(parsed.events)) {
        return parsed.events;
      }
      
      console.warn("fetchOOHAgenda - Valid JSON but missing 'events' array. RAW:", rawResponseText);
      return FALLBACK_AGENDA;

    } catch (parsingError) {
      console.error("fetchOOHAgenda - JSON PARSING FAILED:", parsingError, "RAW:", rawResponseText);
      return FALLBACK_AGENDA;
    }
  } catch (apiError) {
    console.error("fetchOOHAgenda: API FAILED after retries:", apiError);
    return FALLBACK_AGENDA;
  }
};