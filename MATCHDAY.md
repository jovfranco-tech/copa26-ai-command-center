# Runbook de día de partido (matchday)

Cómo encender datos reales cuando arranque el torneo. La app está construida para
que **la tabla, los rangos de grupo y las diferencias de gol se deriven solos** de
los resultados; tú sólo aportas dos cosas: **resultados** y (opcional) **alineaciones
oficiales**. Después: commit + push, y CI valida y despliega.

---

## 1) Resultados → tabla / estadísticas (automático al desplegar)

Ya hay una plantilla con **los 72 partidos** lista para llenar: **`results.example.json`**
(un partido por línea, con su `_fixture` de referencia). Cópiala y edita sólo los
partidos jugados:

```bash
cp results.example.json results.json   # results.json está gitignorado (copia de trabajo)
```

```jsonc
{
  "_README": "…",                                            // se ignora (clave con _)
  "M001": { "_fixture": "MEX vs RSA · …", "homeGoals": 2, "awayGoals": 1 },
  "M002": { "_fixture": "KOR vs CZE · …", "homeGoals": 0, "awayGoals": 0 },
  "M007": { "_fixture": "CAN vs BIH · …", "homeGoals": 1, "awayGoals": 0, "status": "LIVE", "minute": 63 },
  "M019": { "_fixture": "USA vs PAR · …", "homeGoals": null, "awayGoals": null }   // null = no jugado → pendiente
}
```

- Deja `null` los partidos no jugados (se omiten en silencio como **pendientes**).
- `status` por defecto es `"FT"`; usa `"LIVE"` + `"minute"` para un partido en curso.
- Opcionales por partido: `"possH"`, `"shotsH"`, `"shotsA"`. El campo `_fixture` y las
  claves que empiezan con `_` se ignoran.

Aplícalo al dataset (**desde la raíz del repo**):

```bash
pnpm --filter @worldcup/ingestion apply:results results.json
```

El script valida cada marcador, ignora ids inexistentes (sin romper), reordena el
calendario por (fecha, hora, id) e imprime una **vista previa de la tabla**. Luego:

```bash
git add packages/shared/src/data/worldcup2026.json
git commit -m "results: jornada N"
git push        # CI corre los tests de integridad y despliega
```

La tabla (`computeStandings`) y los acumulados de gol se recalculan solos a partir
de los partidos con `status: "FT"`. **No hay que tocar nada más.**

> Goleadores individuales: hoy se derivan de `player.goals` (0 pre-torneo). Para
> poblarlos hace falta una fuente de estadísticas por jugador — pendiente, no
> bloquea la tabla.

---

## 2) Alineaciones oficiales → Estadio 3D (oficial > estimada)

Pre-torneo, el estadio muestra un **XI estimado** (plantilla + formación
característica) con el badge **"XI Estimado"**. Cuando se confirme una alineación,
añádela a `apps/web/src/features/stadium/data/officialLineups.ts`:

```ts
export const OFFICIAL_LINEUPS: Record<string, OfficialMatchLineup> = {
  M001: {
    status: 'confirmada',
    source: 'Alineación oficial — sala de prensa',
    home: {
      formation: '4-3-3',
      manager: 'Javier Aguirre',
      starters: [
        { shirt: 1, name: 'Guillermo Ochoa', pos: 'GK', playerId: 'MEX-1' },
        { shirt: 2, name: 'Jorge Sánchez',   pos: 'DF' },
        // ...11 en total, ordenados GK → DF → MF → FW según la formación
      ],
    },
    away: { formation: '4-3-3', manager: 'Hugo Broos', starters: [ /* 11 */ ] },
  },
};
```

- Con **ambas** alineaciones → badge **"XI Oficial"** (verde).
- Con **una** → **"XI Oficial · parcial"** (ámbar); la otra sigue estimada.
- `playerId` (opcional) enlaza a `PLAYERS` (`{EQUIPO}-{n}`) para heredar rating / club / edad.
- Regla de honestidad: usa `status: 'confirmada'` sólo para un XI realmente confirmado;
  `'probable'` para pronósticos de prensa.

Commit + push y listo: el estadio usa el XI real y el badge cambia.

---

## 3) Auto-redespliegue (opcional)

Ya existe un cron diario (`vercel.json` → `/api/data-sync`, 12:00 UTC) que
monitorea. Para que un redeploy se dispare solo cuando cambie tu fuente:

1. En Vercel → Project → **Deploy Hooks**, crea un hook (rama `main`) y copia la URL.
2. Guárdala como env var: `vercel env add DEPLOY_HOOK_URL`.
3. Conecta tu fuente de resultados a un job que: aplique `apply:results` →
   commit/push **o** haga `POST` al Deploy Hook tras actualizar el dataset.

> Nota: el deploy de Vercel es inmutable; para reflejar datos nuevos siempre hace
> falta un **rebuild** (push a `main` o Deploy Hook). No hay escritura en caliente.

---

## Garantías de seguridad

Cada push pasa por el gate de CI (`pnpm test`), que incluye los tests de integridad
de datos: 48 selecciones, 12 grupos de 4, 72 partidos sin duplicados, referencias
válidas, calendario ordenado y **cero estadísticas fabricadas en partidos no
jugados**. Un marcador mal formado o un id roto **no llega a producción**.
