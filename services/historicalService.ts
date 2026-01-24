
import { GoogleGenAI, Type } from "@google/genai";
import { HistoricalPricesPayload, PriceSeries, PricePoint } from "../types";
import { cleanJsonResponse, withRetry } from "../utils";

const historySchema = {
    type: Type.OBJECT,
    properties: {
        series: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    ticker: { type: Type.STRING },
                    name: { type: Type.STRING },
                    currency: { type: Type.STRING },
                    points: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                date: { type: Type.STRING, description: "Date in 'YYYY-MM-DD' format" },
                                price: { type: Type.NUMBER, description: "Closing price for the date" },
                            },
                            required: ["date", "price"]
                        },
                    },
                },
                required: ["ticker", "name", "currency", "points"]
            },
        },
    },
    required: ["series"]
};

export const fetchHistoricalPrices = async (period: "1M" | "3M" | "6M" | "1Y", tickers: string[]): Promise<HistoricalPricesPayload> => {
  if (tickers.length === 0) {
    return { period, series: [] };
  }
  
  const pointsCount = { "1M": 4, "3M": 5, "6M": 5, "1Y": 6 };
  const numPoints = pointsCount[period];

  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Pour les tickers suivants : ${tickers.join(", ")}, fournis ${numPoints} points de données clés de l'historique des cours sur la période passée de ${period}. 
      Par exemple, pour '1Y', donne le cours d'aujourd'hui, d'il y a ~1 mois, ~3 mois, ~6 mois, ~9 mois, et ~12 mois. 
      Inclus toujours le point le plus récent et le plus ancien de la période.`,
      config: { 
        tools: [{ googleSearch: {} }], 
        responseMimeType: "application/json",
        responseSchema: historySchema,
        temperature: 0.2,
        maxOutputTokens: 2048, 
        thinkingConfig: { thinkingBudget: 512 },
      }
    });

    const fetchedData = JSON.parse(cleanJsonResponse(response.text)) as Pick<HistoricalPricesPayload, 'series'>;
    
    if (fetchedData.series && Array.isArray(fetchedData.series)) {
      // S'assurer que les points sont triés par date pour chaque série
      fetchedData.series.forEach(s => {
        if (s.points && Array.isArray(s.points)) {
          s.points.sort((a, b) => a.date.localeCompare(b.date));
        }
      });
      return { period, series: fetchedData.series };
    }
    
    throw new Error("Invalid structure in AI response for historical prices");
  }).catch(error => {
    console.error("Failed to fetch historical prices:", error);
    return { period, series: [] }; // Retourner un tableau vide en cas d'échec
  });
};
