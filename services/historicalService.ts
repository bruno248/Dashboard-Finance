
import { GoogleGenAI, Type } from "@google/genai";
import { HistoricalPricesPayload, PriceSeries, PricePoint } from "../types";
import { cleanJsonResponse, withRetry } from "../utils";

const STORAGE_KEY = 'ooh_terminal_history_master_v1';

const getStoredHistory = (): Record<string, PricePoint[]> => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return {};
  try { return JSON.parse(saved); } catch (e) { return {}; }
};

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
  // FIX: Refactor to fix variable scope in catch block.
  // The cache logic is moved outside the withRetry call to ensure `series` is available in the catch block as a fallback.
  const master = getStoredHistory();
  const series: PriceSeries[] = [];
  const tickersToFetch: string[] = [];
  const thresholds = { "1M": 10, "3M": 20, "6M": 40, "1Y": 80 };
  const requiredPoints = thresholds[period];

  tickers.forEach(ticker => {
    const existing = master[ticker] || [];
    if (existing.length >= requiredPoints) {
      series.push({ ticker, name: ticker, currency: "EUR", points: existing.slice(-requiredPoints) });
    } else {
      tickersToFetch.push(ticker);
    }
  });

  if (tickersToFetch.length === 0) {
    return { period, series };
  }
  
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Get historical daily stock prices for the following tickers: ${tickersToFetch.join(", ")}. The period is the last ${period}. Provide about ${requiredPoints} data points for each.`,
      config: { 
        tools: [{ googleSearch: {} }], 
        responseMimeType: "application/json",
        responseSchema: historySchema,
        temperature: 0.2,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 2048 },
      }
    });

    const fetchedData = JSON.parse(cleanJsonResponse(response.text)) as Pick<HistoricalPricesPayload, 'series'>;
    
    if (fetchedData.series && Array.isArray(fetchedData.series)) {
      const finalSeries = [...series]; // Start with cached data
      fetchedData.series.forEach(newS => {
        const pointMap = new Map<string, number>();
        (master[newS.ticker] || []).forEach(p => pointMap.set(p.date, p.price));
        newS.points.forEach(p => pointMap.set(p.date, p.price));
        const merged = Array.from(pointMap.entries()).map(([date, price]) => ({ date, price })).sort((a, b) => a.date.localeCompare(b.date));
        master[newS.ticker] = merged;
        finalSeries.push({ ...newS, points: merged.slice(-requiredPoints) });
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(master));
      return { period, series: finalSeries };
    }
    
    throw new Error("Invalid structure in AI response");
  }).catch(error => {
    console.error("Failed to fetch historical prices:", error);
    return { period, series: series }; // Return already found series from cache on failure
  });
};
