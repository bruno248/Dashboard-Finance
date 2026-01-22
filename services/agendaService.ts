
import { GoogleGenAI } from "@google/genai";
import { EventItem } from "../types";
import { cleanJsonResponse } from "../utils";

const FALLBACK_AGENDA: EventItem[] = [
  { id: "e1", title: "JCDecaux Full Year 2024 Results", date: "2025-03-06", type: "Earnings" },
  { id: "e2", title: "Lamar Advertising Q4 & FY 2024 Results", date: "2025-02-21", type: "Earnings" },
  { id: "e3", title: "Ströer SE & Co. KGaA Annual Report 2024", date: "2025-03-27", type: "Earnings" },
  { id: "e4", title: "Outfront Media Q4 2024 Earnings Call", date: "2025-02-25", type: "Earnings" },
  { id: "e5", title: "Clear Channel Outdoor Q4 2024 Results", date: "2025-02-27", type: "Earnings" },
  { id: "e6", title: "JCDecaux Q1 2025 Revenue", date: "2025-05-15", type: "Earnings" }
];

export const fetchOOHAgenda = async (): Promise<EventItem[]> => {
  try {
    // Move initialization inside the function call to ensure the latest API key is used
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Prochaines dates earnings OOH 2025 en JSON. Format: { \"events\": [ { \"id\": \"string\", \"title\": \"string\", \"date\": \"YYYY-MM-DD\", \"type\": \"string\" } ] }",
      config: { 
        tools: [{ googleSearch: {} }], 
        responseMimeType: "application/json" 
      }
    });
    
    if (!response.text) throw new Error("Empty response");
    
    const cleaned = cleanJsonResponse(response.text);
    const parsed = JSON.parse(cleaned);
    return (parsed.events && Array.isArray(parsed.events) && parsed.events.length > 0) 
      ? parsed.events 
      : FALLBACK_AGENDA;
  } catch (error) {
    console.warn("fetchOOHAgenda: API quota exceeded or error. Returning fallback data.");
    return FALLBACK_AGENDA;
  }
};
