import { GoogleGenAI } from "@google/genai";
import { CurrencyPairData, Timeframe } from '../types';

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key missing");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeMarketWithGemini = async (
  pairData: CurrencyPairData,
  timeframe: Timeframe
): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "Clé API manquante. Impossible d'analyser.";

  const prompt = `
    Agis comme un expert en trading d'options binaires spécialisé sur les marchés OTC (Over-The-Counter) de Pocket Option.
    Analyse technique rapide pour la paire ${pairData.symbol}.
    Timeframe: ${timeframe}.
    Prix actuel: ${pairData.currentPrice}.
    RSI (14): ${pairData.rsi.toFixed(2)}.
    Stochastique: ${pairData.stochastic.toFixed(2)}.
    Changement récent: ${pairData.change.toFixed(4)}%.
    Signal technique détecté: ${pairData.signal}.

    Donne une recommandation CLAIRE (HAUSSE ou BAISSE) suivie d'une explication ultra-courte (1 phrase) expliquant pourquoi, basée sur la volatilité OTC et les indicateurs.
    Exemple: "HAUSSE - RSI survendu indiquant un rebond imminent."
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 100,
      }
    });
    
    return response.text || "Analyse non disponible.";
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "Erreur lors de l'analyse IA. Vérifiez votre clé API.";
  }
};