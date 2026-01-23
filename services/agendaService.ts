
import { GoogleGenAI, Type } from "@google/genai";
import { EventItem } from "../types";
import { cleanJsonResponse, withRetry } from "../utils";

const FALLBACK_AGENDA: EventItem[] = [
  { id: "e1", title: "JCDecaux Full Year 2024 Results", date: "2025-03-06", type: "Earnings" },
  { id: "e2", title: "Lamar Advertising Q4 & FY 2024 Results", date: "2025-02-21", type: "Earnings" },
  { id: "e3", title: "Ströer SE & Co. KGaA Annual Report 2024", date: "2025-03-27", type: "Earnings" },
  { id: "e4", title: "Outfront Media Q4 2024 Earnings Call", date: "2025-02-25", type: "Earnings" },
  { id: "e5", title: "Clear Channel Outdoor Q4 2024 Results", date: "2025-02-27", type: "Earnings" },
  { id: "e6", title: "JCDecaux Q1 2025 Revenue", date: "2025-05-15", type: "Earnings" }
];

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
                },
                required: ["id", "title", "date", "type"]
            },
        },
    },
    required: ["events"]
};


export const fetchOOHAgenda = async (): Promise<EventItem[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: "Trouve les prochaines dates de publication de résultats financiers ('earnings') pour les entreprises du secteur OOH (Out-of-Home media) pour 2025.",
      config: { 
        tools: [{ googleSearch: {} }], 
        responseMimeType: "application/json",
        responseSchema: agendaSchema,
        temperature: 0.2,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 1024 },
      }
    });
    
    const cleaned = cleanJsonResponse(response.text);
    const parsed = JSON.parse(cleaned);
    return (parsed.events && Array.isArray(parsed.events) && parsed.events.length > 0) 
      ? parsed.events 
      : FALLBACK_AGENDA;
  }).catch((error) => {
    console.warn("fetchOOHAgenda: API error or quota exceeded. Returning fallback data.", error);
    return FALLBACK_AGENDA;
  });
};
