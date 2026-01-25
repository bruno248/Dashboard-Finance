
import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem, NewsTag } from "../types";
import { cleanJsonResponse, withRetry, createGenAIInstance } from "../utils";

const today = new Date().toISOString().split('T')[0];

const FALLBACK_NEWS: NewsItem[] = [];

const FALLBACK_HIGHLIGHTS: NewsItem[] = [];

const simplifiedTagsDescription = "One of: Market, Corporate, Earnings, Deals, Digital, Regulation";

const newsSchema = {
  type: Type.OBJECT,
  properties: {
    news: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          source: { type: Type.STRING },
          title: { type: Type.STRING },
          time: { type: Type.STRING, description: "Relative time like '2h ago' or '1d ago'" },
          date: { type: Type.STRING, description: "Date in 'YYYY-MM-DD' format (must be known)" },
          tag: { type: Type.STRING, description: simplifiedTagsDescription },
          url: { type: Type.STRING },
        },
        required: ["id", "source", "title", "date", "tag"]
      },
    },
  },
  required: ["news"]
};

const highlightsSchema = {
  type: Type.OBJECT,
  properties: {
    highlights: {
      ...newsSchema.properties.news,
      description: "Array of major news highlights from the last 12 months."
    }
  },
  required: ["highlights"]
};


export const fetchOOHNews = async (maxCount: number = 5): Promise<NewsItem[]> => {
  return withRetry(async () => {
    const ai = createGenAIInstance();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
En tant qu'analyste financier, trouve jusqu'à ${maxCount} actualités pertinentes publiées au cours des 7 derniers jours sur le secteur de la communication extérieure (OOH).

**Stratégie de recherche :**
1.  **Sociétés clés** : Recherche des actualités sur JCDecaux, Lamar, Ströer, Clear Channel Outdoor (CCO), Outfront Media.
2.  **Thèmes généraux** : Élargis la recherche à des termes comme "DOOH", "digital billboards", "outdoor advertising market".
3.  **Qualité avant tout** : Ton objectif principal est de renvoyer des articles réels et vérifiables. Il est acceptable de retourner moins de ${maxCount} articles si la recherche n'est pas fructueuse. N'invente jamais de news.

**Règles de formatage JSON impératives (la requête échouera si non respectées) :**
- **Format JSON strict** : La réponse doit être un objet JSON valide qui respecte le schéma.
- **Échappement OBLIGATOIRE des guillemets** : C'est la cause d'erreur la plus fréquente. Les guillemets (") dans les titres ou toute autre valeur de chaîne DOIVENT être échappés avec un backslash (\\).
    - **Exemple correct :** \`{"title": "L'entreprise annonce un \\"partenariat stratégique\\""}\`
    - **Exemple INCORRECT :** \`{"title": "L'entreprise annonce un "partenariat stratégique""}\`
- **Cas vide** : Si aucune actualité n'est trouvée, renvoyer \`{"news": []}\`.
- **Tags valides** : Le tag doit être l'un des suivants : ${simplifiedTagsDescription}.`,
      config: { 
        tools: [{ googleSearch: {} }], 
        responseMimeType: "application/json",
        responseSchema: newsSchema,
        temperature: 0.2,
        maxOutputTokens: maxCount === 5 ? 1200 : 2048,
        thinkingConfig: { thinkingBudget: maxCount === 5 ? 512 : 1024 },
      }
    });
    
    const rawResponseText = response.text;
    console.log('IA response for news:', rawResponseText);
    try {
      const parsed = JSON.parse(cleanJsonResponse(rawResponseText));
      return parsed.news || FALLBACK_NEWS;
    } catch (parsingError) {
      console.error("fetchOOHNews - JSON PARSING FAILED:", parsingError, "RAW:", rawResponseText);
      return FALLBACK_NEWS;
    }
  }).catch((apiError) => {
    console.error("fetchOOHNews - API CALL FAILED after retries:", apiError);
    return FALLBACK_NEWS;
  });
};

export const fetchOOHHighlights = async (): Promise<NewsItem[]> => {
  return withRetry(async () => {
    const ai = createGenAIInstance();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: `
Récupère 10 à 15 actualités MARQUANTES publiées au cours des 12 DERNIERS MOIS 
sur le secteur de la communication extérieure (OOH), en particulier pour JCDecaux, Lamar, Ströer, Clear Channel Outdoor (CCO), et Outfront Media.

**Contraintes fortes :**
- Ne sélectionne que des événements significatifs (M&A majeur, résultats annuels, changement de direction, innovation technologique importante).
- La date DOIT être renvoyée au format "YYYY-MM-DD".
- Le champ 'time' (temps relatif) est optionnel ; utiliser une chaîne vide si non applicable.

**Règles de formatage JSON impératives :**
- **Format JSON strict** : La réponse doit être un objet JSON qui respecte le schéma.
- **Échappement OBLIGATOIRE des guillemets** : C'est la cause d'erreur la plus fréquente. Les guillemets (") dans les titres ou toute autre valeur de chaîne DOIVENT être échappés avec un backslash (\\).
    - **Exemple correct :** \`{"title": "L'entreprise annonce un \\"partenariat stratégique\\""}\`
    - **Exemple INCORRECT :** \`{"title": "L'entreprise annonce un "partenariat stratégique""}\`
- **Tags valides** : Le tag doit être l'un des suivants : ${simplifiedTagsDescription}.
- **Cas vide** : Si rien n'est trouvé, retourner \`{"highlights": []}\`.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: highlightsSchema,
        temperature: 0.3,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 1024 },
      }
    });

    const rawResponseText = response.text;
    try {
      const parsed = JSON.parse(cleanJsonResponse(rawResponseText));
      return parsed.highlights || FALLBACK_HIGHLIGHTS;
    } catch (parsingError) {
      console.error("fetchOOHHighlights - JSON PARSING FAILED:", parsingError, "RAW:", rawResponseText);
      return FALLBACK_HIGHLIGHTS;
    }
  }).catch((apiError) => {
    console.error("fetchOOHHighlights - API CALL FAILED after retries:", apiError);
    return FALLBACK_HIGHLIGHTS;
  });
};

export const summarizeNewsItem = async (title: string, source: string): Promise<string> => {
  return withRetry(async () => {
    const ai = createGenAIInstance();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyse cette news OOH : "${title}" (${source}). Résumé court + 3 points clés en français. Sépare les points clés avec le titre "KEY TAKEAWAYS".`,
      config: {
        temperature: 0.2,
        maxOutputTokens: 800,
        thinkingConfig: { thinkingBudget: 400 },
      }
    });
    return response.text || "Résumé indisponible.";
  }).catch(() => "Le service de résumé est temporairement indisponible.");
};

export const fetchOOHSentimentFromNews = async (news: NewsItem[]): Promise<{ label: string; description: string; keyTakeaways: string[] }> => {
  const fallback = { label: "Neutre", description: "Aucune actualité récente à analyser.", keyTakeaways: [] };
  if (!news || news.length === 0) {
    return fallback;
  }

  const MAX_TITLE_LENGTH = 180;
  const newsTitles = news.slice(0, 10).map(n => {
    const truncatedTitle = n.title.length > MAX_TITLE_LENGTH 
      ? `${n.title.substring(0, MAX_TITLE_LENGTH)}...` 
      : n.title;
    const sanitizedTitle = truncatedTitle
      .replace(/\\/g, '\\\\') 
      .replace(/"/g, '\\"')   
      .replace(/\n/g, ' ');  
    return `- ${sanitizedTitle} [${n.tag}]`;
  }).join('\n');

  const sentimentSchema = {
    type: Type.OBJECT,
    properties: {
      label: { type: Type.STRING, description: "Un label court: 'Plutôt positif', 'Neutre', 'Plutôt négatif'." },
      description: { type: Type.STRING, description: "Une description de 1-2 phrases expliquant le sentiment global pour le secteur OOH." },
      keyTakeaways: {
        type: Type.ARRAY,
        description: "Une liste de 2-3 points clés (phrases courtes) à retenir.",
        items: { type: Type.STRING }
      }
    },
    required: ["label", "description", "keyTakeaways"],
    propertyOrdering: ["label", "description", "keyTakeaways"],
  };

  const parsingErrorFallback = {
    label: "Analyse Indisponible",
    description: "Le service d'analyse a renvoyé un format de données incorrect.",
    keyTakeaways: []
  };

  try {
    const ai = createGenAIInstance();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `En tant qu'analyste financier, analyse ces titres d'actualités du secteur OOH:\n${newsTitles}\n\nQuel est le sentiment de marché global qui s'en dégage ? Fournis aussi 2-3 points clés à retenir. Réponds en français.

**RÈGLES IMPÉRATIVES DE FORMATAGE JSON (la requête échouera si non respectées) :**
1.  La réponse DOIT être un objet JSON valide respectant strictement le schéma fourni.
2.  **Échappement OBLIGATOIRE des guillemets** : TOUS les guillemets (") que tu utilises à l'intérieur des valeurs de chaîne de caractères (par exemple dans les champs 'description' ou 'keyTakeaways') DOIVENT impérativement être échappés avec un backslash (\\).
    -   **Exemple correct :** \`{"description": "L'analyste a déclaré : \\"C'est une bonne nouvelle pour le secteur.\\""}\`
    -   **Exemple INCORRECT :** \`{"description": "L'analyste a déclaré : "C'est une bonne nouvelle pour le secteur.""}\`
3.  N'ajoute aucun commentaire ou texte en dehors de l'objet JSON final.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: sentimentSchema,
        temperature: 0.2,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 512 },
      }
    });
    
    const rawResponseText = response.text;
    try {
      const parsed = JSON.parse(cleanJsonResponse(rawResponseText));
      if (parsed && parsed.label && parsed.description && Array.isArray(parsed.keyTakeaways)) {
          return parsed;
      }
      console.warn("fetchOOHSentimentFromNews - JSON is valid but has unexpected structure. RAW:", rawResponseText);
      return { ...fallback, label: "Analyse Invalide", description: "La structure de la réponse IA est inattendue." };
    } catch (parsingError) {
      console.error("fetchOOHSentimentFromNews - JSON PARSING FAILED:", parsingError, "RAW:", rawResponseText);
      return parsingErrorFallback;
    }
  } catch (apiError) {
    const errorString = String(apiError).toLowerCase();
    if (errorString.includes('503') || errorString.includes('unavailable') || errorString.includes('overloaded')) {
      console.warn("fetchOOHSentimentFromNews - Model overloaded (503), returning fallback.");
      return {
        label: "Analyse Indisponible",
        description: "Le modèle d'analyse est momentanément indisponible (erreur 503).",
        keyTakeaways: []
      };
    }
    
    console.error("fetchOOHSentimentFromNews - API CALL FAILED:", apiError);
    return {
      ...fallback,
      label: "Analyse Indisponible",
      description: "Le service d'analyse est momentanément indisponible."
    };
  }
};
