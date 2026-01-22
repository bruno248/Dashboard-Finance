
import { GoogleGenAI, Type } from "@google/genai";
import { EventItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const FALLBACK_AGENDA: EventItem[] = [
  { id: "e1", title: "JCDecaux Q4 2024 Revenue", date: "2025-01-30", type: "Earnings" },
  { id: "e2", title: "Lamar Advertising Q4 Results", date: "2025-02-20", type: "Earnings" },
  { id: "e3", title: "Ströer SE Annual Results", date: "2025-03-12", type: "Earnings" }
];

function cleanJsonResponse(text: string): string {
  if (!text) return "{}";
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) return "{}";
  cleaned = cleaned.substring(firstBrace);
  return cleaned;
}

export const fetchOOHAgenda = async (): Promise<EventItem[]> => {
  try {
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
