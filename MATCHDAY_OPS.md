# Guia Operacional — Dia de Partido

## Resumen

Esta guia documenta como actualizar la app con resultados en tiempo real durante el Mundial 2026.

---

## Arquitectura de Actualizacion

```
INMEDIATO (30s)          DURADERO (batch)           VERIFICACION
──────────────           ─────────────────          ──────────────
Live Overlay             apply-results.ts           AI Vision
(Firebase RTDB)          + git push + deploy        (screenshot OCR)
      │                         │                         │
      └── parche runtime        └── dataset permanente    └── double-check
          (todos ven score)         (persiste en builds)      (alerta si discrepa)
```

---

## Flujo 1: Resultado en Tiempo Real (Live Overlay)

### Cuando usar:
- Inmediatamente al terminar un partido (o durante LIVE para score parcial)

### Como:
1. Abrir Firebase Console → Realtime Database
2. En la ruta `/liveOverlay/results/`, crear un nodo con el match ID:

```json
{
  "M001": {
    "homeGoals": 2,
    "awayGoals": 1,
    "status": "FT",
    "minute": 90
  }
}
```

3. La app detecta el cambio automaticamente via Firebase listener
4. Standings, scoring del pool, y dashboard se actualizan en ~2 segundos

### Para un partido LIVE (en curso):
```json
{
  "M001": {
    "homeGoals": 1,
    "awayGoals": 0,
    "status": "LIVE",
    "minute": 67
  }
}
```

### Para limpiar (revertir):
Eliminar el nodo del match ID de `/liveOverlay/results/`.

---

## Flujo 2: Resultado Permanente (Dataset Update)

### Cuando usar:
- Post-jornada, cuando todos los partidos del dia terminaron
- Antes de dormir o al dia siguiente

### Como:
1. Crear archivo `results.json` en la raiz del repo:

```json
{
  "M001": { "homeGoals": 2, "awayGoals": 1, "status": "FT" },
  "M002": { "homeGoals": 0, "awayGoals": 0, "status": "FT" },
  "M007": { "homeGoals": 3, "awayGoals": 2, "status": "FT" }
}
```

2. Ejecutar:
```bash
pnpm --filter @worldcup/ingestion apply:results
```

3. Verificar output:
```
✓ Resultados aplicados: 3 (M001, M002, M007)
Vista previa de la tabla:
   MEX  PJ 1  Pts 3  GF 2  GC 1  DG +1
   ...
```

4. Commit y deploy:
```bash
git add packages/shared/src/data/worldcup2026.json
git commit -m "results: jornada 1 — M001, M002, M007"
git push origin main
npx vercel --prod
```

5. Eliminar los nodos de Live Overlay (ya no necesarios — el dataset tiene los resultados permanentes).

---

## Flujo 3: Alineaciones Oficiales

### Cuando usar:
- 1 hora antes del partido (cuando FIFA publica el XI oficial)

### Como:
En Firebase RTDB, ruta `/liveOverlay/lineups/M001`:

```json
{
  "status": "confirmada",
  "source": "FIFA.com/match-center",
  "home": {
    "formation": "4-3-3",
    "manager": "Javier Aguirre",
    "starters": [
      { "shirt": 1, "name": "Ochoa", "pos": "GK" },
      { "shirt": 4, "name": "Alvarez", "pos": "DF" },
      { "shirt": 10, "name": "Vega", "pos": "MF" },
      { "shirt": 9, "name": "Gimenez", "pos": "FW" }
    ]
  },
  "away": {
    "formation": "4-2-3-1",
    "starters": [...]
  }
}
```

---

## Validaciones Automaticas

El pipeline `apply-results.ts` valida automaticamente:

| Validacion | Accion si falla |
|------------|-----------------|
| Total goles > 15 | **SKIP** — imposible |
| Match ya FT | **WARNING** — sobreescribe con aviso |
| Home == Away | **SKIP** — data integrity issue |
| Fecha fuera de Jun 11 - Jul 19 | **SKIP** — fuera del torneo |

---

## Scoring del Pool

| Resultado | Puntos |
|-----------|--------|
| Marcador exacto (ej: pick 2-1, real 2-1) | **+3** |
| Resultado correcto (ej: pick 3-0 "home wins", real 2-1 "home wins") | **+1** |
| Prediccion incorrecta | **0** |
| Sin prediccion registrada | **0** |

El leaderboard se actualiza automaticamente en Firestore via `onSnapshot`.

---

## Checklist Pre-Torneo (antes del 11 junio)

- [ ] Verificar que `PreTournamentNotice` se auto-oculta (comparar fecha)
- [ ] Verificar que `MockBanner` desaparece con primer resultado
- [ ] Configurar `RESULTS_SOURCE_URL` en Vercel env (si se usa feed automatico)
- [ ] Testear Live Overlay con un resultado de prueba → revertir
- [ ] Verificar que los 3 co-pilotos AI responden correctamente
- [ ] Confirmar que la familia tiene acceso al grupo de quiniela

---

## Checklist Dia de Partido

- [ ] 1h antes: publicar alineaciones en Live Overlay (si disponibles)
- [ ] Durante: actualizar score LIVE en Firebase cada gol
- [ ] Al final: cambiar status a FT en Live Overlay
- [ ] Post-jornada: batch commit via `apply-results.ts`
- [ ] Verificar leaderboard refleja puntos correctos

---

## Comandos Utiles

```bash
# Health check del deploy
curl https://fifa-private-world-cup-dashboard.vercel.app/api/health

# Aplicar resultados
pnpm --filter @worldcup/ingestion apply:results

# Correr tests
pnpm --filter web test

# Build local
pnpm --filter web build

# Deploy
npx vercel --prod
```

---

## Contacto de Emergencia

Si algo se rompe durante un partido:
1. Live Overlay es la opcion mas rapida (no requiere deploy)
2. Si Firebase falla, los usuarios ven datos del ultimo deploy
3. El error boundary muestra "Recargar pagina" si la UI crashea
4. `/api/health` reporta el estado de las API keys y el entorno
