import type { MatchAnalytics } from '../../packages/shared/src/liveOverlay.js';

export async function generateDynamicMetrics(
  homeCode: string,
  awayCode: string,
  homeGoals: number,
  awayGoals: number,
  minute: number | null,
  geminiKey: string,
): Promise<MatchAnalytics | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
  const prompt = `
Genera un análisis en tiempo real en formato JSON para un partido de la Copa del Mundo.
Equipos: ${homeCode} (Local) vs ${awayCode} (Visitante)
Marcador actual: ${homeGoals} - ${awayGoals}
Minuto: ${minute ?? 'Desconocido'}

El JSON DEBE tener la siguiente estructura exacta y nada más:
{
  "confidence": 85,
  "tacticalRisk": 60,
  "momentum": [array de 20 números entre -100 y 100],
  "storyline": "Narrativa dramática en español sobre el flujo actual del partido.",
  "whatToWatch": ["Punto 1", "Punto 2", "Punto 3"],
  "strategyHome": "Estrategia detectada del local",
  "strategyAway": "Estrategia detectada del visitante",
  "heatZones": [
    { "x": numero, "y": numero, "r": radio, "val": valorEntre0y1 }
  ],
  "pitchZoneInsights": {
    "stands": "Ambiente en gradas",
    "field": "Análisis del césped/juego",
    "screens": "Qué muestra el marcador",
    "lights": "Iluminación/clima"
  }
}

Responde SOLO con el JSON válido.`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const text = body?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return JSON.parse(text) as MatchAnalytics;
  } catch (e) {
    console.error('Gemini metrics error:', e);
    return null;
  }
}
