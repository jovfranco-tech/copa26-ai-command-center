/**
 * ingestion.config.ts — generado con assets 100% legales (libres / CC):
 *   - 48 banderas de flagcdn.com (robots.txt: permite todo)
 *   - 15 estadios de Wikimedia Commons vía upload.wikimedia.org (CC/PD; robots OK)
 *
 * Corre:  pnpm db:migrate && pnpm db:seed   (una vez)
 *         pnpm ingest:assets                 (descarga a private-assets/, registra y enlaza)
 *         pnpm dev                           (la app local sirve los estadios descargados)
 *
 * Para escudos/fotos oficiales: añade tus URLs en crests/playerPhotos (fuentes a las
 * que tengas acceso permitido). FIFA.com bloquea bots, así que el scraper se detendrá.
 */
import type { IngestionConfig } from './packages/ingestion/src/config';

const config: IngestionConfig = {
  userAgent: 'FIFA-Private-Dashboard/0.1 (personal local research; respects robots.txt)',
  minDelayMs: 4000,
  maxDelayMs: 10000,
  maxConcurrency: 1,
  headless: true,
  forceRefetch: false,
  robotsBase: 'https://www.fifa.com',
  sources: { fixtures: [], teams: [], players: [], playerProfiles: [], matchStats: [], venues: [] },
  selectors: {},
  assets: {
    flags: [
    { entityId: 'MEX', url: 'https://flagcdn.com/mx.svg' },
    { entityId: 'RSA', url: 'https://flagcdn.com/za.svg' },
    { entityId: 'KOR', url: 'https://flagcdn.com/kr.svg' },
    { entityId: 'CZE', url: 'https://flagcdn.com/cz.svg' },
    { entityId: 'CAN', url: 'https://flagcdn.com/ca.svg' },
    { entityId: 'BIH', url: 'https://flagcdn.com/ba.svg' },
    { entityId: 'QAT', url: 'https://flagcdn.com/qa.svg' },
    { entityId: 'SUI', url: 'https://flagcdn.com/ch.svg' },
    { entityId: 'BRA', url: 'https://flagcdn.com/br.svg' },
    { entityId: 'MAR', url: 'https://flagcdn.com/ma.svg' },
    { entityId: 'HAI', url: 'https://flagcdn.com/ht.svg' },
    { entityId: 'SCO', url: 'https://flagcdn.com/gb-sct.svg' },
    { entityId: 'USA', url: 'https://flagcdn.com/us.svg' },
    { entityId: 'PAR', url: 'https://flagcdn.com/py.svg' },
    { entityId: 'AUS', url: 'https://flagcdn.com/au.svg' },
    { entityId: 'TUR', url: 'https://flagcdn.com/tr.svg' },
    { entityId: 'GER', url: 'https://flagcdn.com/de.svg' },
    { entityId: 'CUW', url: 'https://flagcdn.com/cw.svg' },
    { entityId: 'CIV', url: 'https://flagcdn.com/ci.svg' },
    { entityId: 'ECU', url: 'https://flagcdn.com/ec.svg' },
    { entityId: 'NED', url: 'https://flagcdn.com/nl.svg' },
    { entityId: 'JPN', url: 'https://flagcdn.com/jp.svg' },
    { entityId: 'SWE', url: 'https://flagcdn.com/se.svg' },
    { entityId: 'TUN', url: 'https://flagcdn.com/tn.svg' },
    { entityId: 'BEL', url: 'https://flagcdn.com/be.svg' },
    { entityId: 'EGY', url: 'https://flagcdn.com/eg.svg' },
    { entityId: 'IRN', url: 'https://flagcdn.com/ir.svg' },
    { entityId: 'NZL', url: 'https://flagcdn.com/nz.svg' },
    { entityId: 'ESP', url: 'https://flagcdn.com/es.svg' },
    { entityId: 'CPV', url: 'https://flagcdn.com/cv.svg' },
    { entityId: 'KSA', url: 'https://flagcdn.com/sa.svg' },
    { entityId: 'URU', url: 'https://flagcdn.com/uy.svg' },
    { entityId: 'FRA', url: 'https://flagcdn.com/fr.svg' },
    { entityId: 'SEN', url: 'https://flagcdn.com/sn.svg' },
    { entityId: 'IRQ', url: 'https://flagcdn.com/iq.svg' },
    { entityId: 'NOR', url: 'https://flagcdn.com/no.svg' },
    { entityId: 'ARG', url: 'https://flagcdn.com/ar.svg' },
    { entityId: 'ALG', url: 'https://flagcdn.com/dz.svg' },
    { entityId: 'AUT', url: 'https://flagcdn.com/at.svg' },
    { entityId: 'JOR', url: 'https://flagcdn.com/jo.svg' },
    { entityId: 'POR', url: 'https://flagcdn.com/pt.svg' },
    { entityId: 'COD', url: 'https://flagcdn.com/cd.svg' },
    { entityId: 'UZB', url: 'https://flagcdn.com/uz.svg' },
    { entityId: 'COL', url: 'https://flagcdn.com/co.svg' },
    { entityId: 'ENG', url: 'https://flagcdn.com/gb-eng.svg' },
    { entityId: 'CRO', url: 'https://flagcdn.com/hr.svg' },
    { entityId: 'GHA', url: 'https://flagcdn.com/gh.svg' },
    { entityId: 'PAN', url: 'https://flagcdn.com/pa.svg' },
    ],
    crests: [],
    playerPhotos: [],
    venueImages: [
    { entityId: 'van', url: 'https://upload.wikimedia.org/wikipedia/commons/4/42/BC_Place_Opening_Day_2011-09-30.jpg' },
    { entityId: 'sea', url: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Qwest_Field_North.jpg' },
    { entityId: 'sf', url: 'https://upload.wikimedia.org/wikipedia/commons/d/d2/Levi%27s_Stadium_interior_1.jpg' },
    { entityId: 'lax', url: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/SoFi_Stadium_%2851126606022%29.jpg' },
    { entityId: 'gdl', url: 'https://upload.wikimedia.org/wikipedia/commons/8/8b/Estadio_Omnilife_Chivas.jpg' },
    { entityId: 'mex', url: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Vista_a%C3%A9rea_del_Estadio_Azteca_-_2026_-_02.jpg' },
    { entityId: 'mty', url: 'https://upload.wikimedia.org/wikipedia/commons/5/57/Mexico_Guadalupe_Monterrey_Estadio_BBVA_Bancomer_fifa_world_cup_2026_6.JPG' },
    { entityId: 'hou', url: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Reliantstadium.jpg' },
    { entityId: 'dal', url: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Cowboys_Stadium_2.jpg' },
    { entityId: 'kc', url: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Arrowhead_Stadium_2010.JPG' },
    { entityId: 'atl', url: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Mercedes_Benz_Stadium_time_lapse_capture_2017-08-13.jpg' },
    { entityId: 'mia', url: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Hard_Rock_Stadium_for_Super_Bowl_LIV_%2849606707583%29.jpg' },
    { entityId: 'tor', url: 'https://upload.wikimedia.org/wikipedia/commons/d/d2/BMO_Field_in_2016.png' },
    { entityId: 'bos', url: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Gillette_Stadium02.jpg' },
    { entityId: 'phi', url: 'https://upload.wikimedia.org/wikipedia/commons/7/71/Philly_%2845%29.JPG' },
    { entityId: 'nyc', url: 'https://upload.wikimedia.org/wikipedia/commons/4/46/New_Meadowlands_Stadium_Mezz_Corner.jpg' },
    ],
  },
};

export default config;
