
import { GoogleGenAI } from "@google/genai";
import { HistoricalPricesPayload, PriceSeries, PricePoint } from "../types";
import { cleanJsonResponse } from "../utils";

const STORAGE_KEY = 'ooh_terminal_history_master_v1';

const getStoredHistory = (): Record<string, PricePoint[]> => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return {};
  try { return JSON.parse(saved); } catch (e) { return {}; }
};

export const fetchHistoricalPrices = async (period: "1M" | "3M" | "6M" | "1Y", tickers: string[]): Promise<HistoricalPricesPayload> => {
  const master = getStoredHistory();
  const series: PriceSeries[] = [];
  const tickersToFetch: string[] = [];
  const thresholds = { "1M": 10, "3M": 30, "6M": 60, "1Y": 120 };
  const requiredPoints = thresholds[period];

  tickers.forEach(ticker => {
    const existing = master[ticker] || [];
    if (existing.length >= requiredPoints) {
      series.push({ ticker, name: ticker, currency: "EUR", points: existing.slice(-requiredPoints) });
    } else tickersToFetch.push(ticker);
  });

  if (tickersToFetch.length === 0) return { period, series };

  try {
    // Move initialization inside the function call to ensure the latest API key is used
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Historical stock prices for: ${tickersToFetch.join(", ")}. Period: ${period}. JSON format.`,
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
    });
    const fetchedData = JSON.parse(cleanJsonResponse(response.text)) as HistoricalPricesPayload;
    if (fetchedData.series && Array.isArray(fetchedData.series)) {
      fetchedData.series.forEach(newS => {
        const pointMap = new Map<string, number>();
        (master[newS.ticker] || []).forEach(p => pointMap.set(p.date, p.price));
        newS.points.forEach(p => pointMap.set(p.date, p.price));
        const merged = Array.from(pointMap.entries()).map(([date, price]) => ({ date, price })).sort((a, b) => a.date.localeCompare(b.date));
        master[newS.ticker] = merged;
        series.push({ ...newS, points: merged.slice(-requiredPoints) });
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(master));
      return { period, series };
    }
    throw new Error("Invalid structure");
  } catch (error) {
    return { period, series };
  }
};
