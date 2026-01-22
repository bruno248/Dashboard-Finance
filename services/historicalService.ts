
import { GoogleGenAI, Type } from "@google/genai";
import { HistoricalPricesPayload, PriceSeries, PricePoint } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const STORAGE_KEY = 'ooh_terminal_history_master_v1';

// Structure du cache local : { "DEC.PA": [ {date, price}, ... ] }
type MasterHistory = Record<string, PricePoint[]>;

const getStoredHistory = (): MasterHistory => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return {};
  try {
    return JSON.parse(saved);
  } catch (e) {
    return {};
  }
};

const saveHistory = (data: MasterHistory) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const fetchHistoricalPrices = async (
  period: "1M" | "3M" | "6M" | "1Y",
  tickers: string[]
): Promise<HistoricalPricesPayload> => {
  const master = getStoredHistory();
  const series: PriceSeries[] = [];
  const tickersToFetch: string[] = [];

  // 1. Déterminer le nombre de points nécessaires
  const thresholds = { "1M": 10, "3M": 30, "6M": 60, "1Y": 120 };
  const requiredPoints = thresholds[period];

  // 2. Vérifier ce qu'on a déjà en stock
  tickers.forEach(ticker => {
    const existing = master[ticker] || [];
    // Si on a assez de points et que le dernier point est récent (aujourd'hui ou hier)
    if (existing.length >= requiredPoints) {
      series.push({
        ticker,
        name: ticker, // Fallback name
        currency: "EUR", // Fallback currency
        points: existing.slice(-requiredPoints)
      });
    } else {
      tickersToFetch.push(ticker);
    }
  });

  // 3. Si tout est en cache, on retourne immédiatement
  if (tickersToFetch.length === 0) {
    return { period, series };
  }

  // 4. Sinon, on appelle l'IA pour compléter
  try {
    const prompt = `Historique boursier (clôture quotidienne) pour : ${tickersToFetch.join(", ")}. Période : ${period}. Retourne un JSON avec les points de données par ticker.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const fetchedData = JSON.parse(cleaned) as HistoricalPricesPayload;

    if (fetchedData.series && Array.isArray(fetchedData.series)) {
      fetchedData.series.forEach(newS => {
        const existingPoints = master[newS.ticker] || [];
        
        // Fusion intelligente : on utilise un Map par date pour éviter les doublons
        const pointMap = new Map<string, number>();
        existingPoints.forEach(p => pointMap.set(p.date, p.price));
        newS.points.forEach(p => pointMap.set(p.date, p.price));

        // On trie par date et on remet dans le master
        const mergedPoints = Array.from(pointMap.entries())
          .map(([date, price]) => ({ date, price }))
          .sort((a, b) => a.date.localeCompare(b.date));
        
        master[newS.ticker] = mergedPoints;
        
        series.push({
          ...newS,
          points: mergedPoints.slice(-requiredPoints)
        });
      });

      saveHistory(master);
      return { period, series };
    }
    throw new Error("Invalid structure from AI");

  } catch (error) {
    console.warn("fetchHistoricalPrices failed, using existing cache or partial data");
    // En cas d'erreur, on retourne ce qu'on a déjà réussi à accumuler
    return { period, series };
  }
};
