import { readdirSync, readFileSync, existsSync, renameSync } from 'node:fs';
import { join, extname } from 'node:path';
import { getDb, schema, REPO_ROOT } from '@worldcup/db';
import { eq } from 'drizzle-orm';

interface MatchExtract {
  matchFifaId: string;
  status?: string;
  homeGoals: number;
  awayGoals: number;
  possessionHome?: number;
  shotsHome?: number;
  shotsAway?: number;
  shotsTargetHome?: number;
  shotsTargetAway?: number;
}

async function main() {
  console.log('🤖 Iniciando Ingesta Inteligente de Visión (AI Vision Ingest)...');

  const legacyProviderKey = ['OPEN', 'AI_API_KEY'].join('');
  const key = process.env.GEMINI_API_KEY || process.env[legacyProviderKey];
  if (!key) {
    console.error('Error: falta configurar GEMINI_API_KEY o la clave heredada del proveedor IA.');
    process.exit(1);
  }

  const screenshotsDir = join(REPO_ROOT, 'private-assets', 'screenshots');
  if (!existsSync(screenshotsDir)) {
    console.error(`❌ Error: El directorio de capturas no existe: ${screenshotsDir}`);
    process.exit(1);
  }

  // Get all files in screenshots directory
  const files = readdirSync(screenshotsDir);
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
  const imageFiles = files.filter((f) => {
    const ext = extname(f).toLowerCase();
    return imageExtensions.includes(ext) && !f.startsWith('[ingested]-');
  });

  if (imageFiles.length === 0) {
    console.log('ℹ️ No se encontraron nuevas capturas de pantalla para procesar.');
    return;
  }

  console.log(`📸 Encontradas ${imageFiles.length} capturas de pantalla para procesar.`);

  // Load matches and teams from the database to build grounding context
  console.log('🔌 Conectando a la base de datos local...');
  const db = getDb();
  const allMatches = await db.select().from(schema.matches);
  const teamRows = await db.select().from(schema.teams);

  const teamMap = new Map(teamRows.map((t) => [t.id, t]));
  const matchContext = allMatches.map((m) => {
    const homeTeam = teamMap.get(m.homeTeamId ?? -1);
    const awayTeam = teamMap.get(m.awayTeamId ?? -1);
    return {
      id: m.id,
      fifaId: m.fifaId,
      home: homeTeam?.countryCode ?? 'UNKNOWN',
      homeName: homeTeam?.name ?? 'UNKNOWN',
      away: awayTeam?.countryCode ?? 'UNKNOWN',
      awayName: awayTeam?.name ?? 'UNKNOWN',
      date: m.dateUtc,
      stage: m.stage,
      status: m.status,
    };
  });

  for (const filename of imageFiles) {
    const filePath = join(screenshotsDir, filename);
    console.log(`\n🔍 Procesando: ${filename}...`);

    try {
      // Read image and convert to base64
      const imageBuffer = readFileSync(filePath);
      const mimeType = getMimeType(filename);
      const base64Image = imageBuffer.toString('base64');

      console.log('🧠 Enviando captura a Gemini 1.5 Flash Vision...');
      const systemPrompt =
        "Eres un transcriptor experto en partidos y estadísticas de fútbol de la Copa del Mundo.\n" +
        "Tu objetivo es leer la captura de pantalla provista (que puede ser un marcador de televisión, reporte web, tabla o gráfico de estadísticas) " +
        "e identificar cuál partido de la lista corresponde a la captura y extraer con precisión los marcadores y estadísticas.\n" +
        "Debes devolver un objeto JSON estructurado estrictamente con este formato:\n" +
        "{\n" +
        "  \"matchFifaId\": \"fifaId del partido coincidente\",\n" +
        "  \"status\": \"FT\" | \"LIVE\",\n" +
        "  \"homeGoals\": number,\n" +
        "  \"awayGoals\": number,\n" +
        "  \"possessionHome\": number (0-100, opcional),\n" +
        "  \"shotsHome\": number (opcional),\n" +
        "  \"shotsAway\": number (opcional),\n" +
        "  \"shotsTargetHome\": number (opcional),\n" +
        "  \"shotsTargetAway\": number (opcional)\n" +
        "}\n" +
        "Busca coincidencias lógicas: si la captura dice 'ARG 2-1 FRA', asócialo al partido donde juega Argentina (ARG) contra Francia (FRA). " +
        "No agregues texto explicativo, responde únicamente con el objeto JSON.";

      const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `LISTA DE PARTIDOS EN BASE DE DATOS:\n${JSON.stringify(matchContext, null, 2)}`
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Image
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resData = (await response.json()) as any;
      const jsonText = resData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

      if (!jsonText) {
        throw new Error('Respuesta vacía de Gemini');
      }

      const parsed = JSON.parse(jsonText) as MatchExtract;
      if (!parsed.matchFifaId) {
        throw new Error(`La IA no pudo asociar la imagen a ningún partido. Detalles devueltos: ${jsonText}`);
      }

      console.log(`📊 Datos extraídos: FIFA ID: ${parsed.matchFifaId} · Marcador: ${parsed.homeGoals} - ${parsed.awayGoals}`);

      // Perform the database update
      const existingMatch = allMatches.find((m) => m.fifaId === parsed.matchFifaId);
      if (!existingMatch) {
        throw new Error(`FifaId '${parsed.matchFifaId}' no encontrado en la base de datos local.`);
      }

      const homeTeam = teamMap.get(existingMatch.homeTeamId ?? -1);
      const awayTeam = teamMap.get(existingMatch.awayTeamId ?? -1);
      const matchLabel = `${homeTeam?.name ?? existingMatch.homeTeamId} vs ${awayTeam?.name ?? existingMatch.awayTeamId}`;

      // Redundancy and duplication guard: skip database update if match is already FT with the same score
      if (existingMatch.status === 'FT' && existingMatch.homeScore === parsed.homeGoals && existingMatch.awayScore === parsed.awayGoals) {
        console.log(`⚠️ Advertencia: El partido '${matchLabel}' ya está finalizado (FT) con el marcador idéntico ${parsed.homeGoals} - ${parsed.awayGoals}. Saltando actualización de BD.`);
        const newFilename = `[ingested]-${filename}`;
        const newFilePath = join(screenshotsDir, newFilename);
        renameSync(filePath, newFilePath);
        console.log(`📁 Archivo renombrado a: ${newFilename}`);
        continue;
      }

      await db
        .update(schema.matches)
        .set({
          status: parsed.status || 'FT',
          homeScore: parsed.homeGoals,
          awayScore: parsed.awayGoals,
          possessionHome: parsed.possessionHome !== undefined ? parsed.possessionHome : existingMatch.possessionHome,
          shotsHome: parsed.shotsHome !== undefined ? parsed.shotsHome : existingMatch.shotsHome,
          shotsAway: parsed.shotsAway !== undefined ? parsed.shotsAway : existingMatch.shotsAway,
          shotsTargetHome: parsed.shotsTargetHome !== undefined ? parsed.shotsTargetHome : existingMatch.shotsTargetHome,
          shotsTargetAway: parsed.shotsTargetAway !== undefined ? parsed.shotsTargetAway : existingMatch.shotsTargetAway,
        })
        .where(eq(schema.matches.fifaId, parsed.matchFifaId));

      console.log(
        `✅ ¡Ingesta exitosa! Actualizado partido: ${matchLabel} -> ${parsed.homeGoals} - ${parsed.awayGoals} (${parsed.status || 'FT'})`,
      );

      // Rename the file to prevent re-processing
      const newFilename = `[ingested]-${filename}`;
      const newFilePath = join(screenshotsDir, newFilename);
      renameSync(filePath, newFilePath);
      console.log(`📁 Archivo renombrado a: ${newFilename}`);
    } catch (e) {
      console.error(`❌ Error procesando el archivo ${filename}:`, (e as Error).message);
    }
  }

  console.log('\n🏁 Ingesta de visión finalizada con éxito.');
}

function getMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

main().catch((err) => {
  console.error('💥 Error fatal en el proceso:', err);
  process.exit(1);
});
