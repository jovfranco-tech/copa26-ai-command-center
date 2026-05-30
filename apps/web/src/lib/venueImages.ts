/**
 * Real stadium photos from Wikimedia Commons (CC / public domain), referenced by
 * the file the Wikidata entity points to (P18). Served via Commons' Special:FilePath
 * thumbnail endpoint. Each card credits + links the source file (attribution).
 *
 * Filenames fetched from Wikidata for the 16 WC2026 venues.
 */
const FILES: Record<string, string> = {
  van: 'BC Place Opening Day 2011-09-30.jpg',
  sea: 'Qwest Field North.jpg',
  sf: "Levi's Stadium interior 1.jpg",
  lax: 'SoFi Stadium (51126606022).jpg',
  gdl: 'Estadio Omnilife Chivas.jpg',
  mex: 'Vista aérea del Estadio Azteca - 2026 - 02.jpg',
  mty: 'Mexico Guadalupe Monterrey Estadio BBVA Bancomer fifa world cup 2026 6.JPG',
  hou: 'Reliantstadium.jpg',
  dal: 'Cowboys Stadium 2.jpg',
  atl: 'Mercedes Benz Stadium time lapse capture 2017-08-13.jpg',
  mia: 'Hard Rock Stadium for Super Bowl LIV (49606707583).jpg',
  tor: 'BMO Field in 2016.png',
  bos: 'Gillette Stadium02.jpg',
  phi: 'Philly (45).JPG',
  nyc: 'New Meadowlands Stadium Mezz Corner.jpg',
};

export interface VenueImage {
  src: string;
  page: string;
}

export function venueImage(id: string): VenueImage | null {
  const file = FILES[id];
  if (!file) return null;
  const enc = encodeURIComponent(file);
  return {
    src: `https://commons.wikimedia.org/wiki/Special:FilePath/${enc}?width=800`,
    page: `https://commons.wikimedia.org/wiki/File:${enc}`,
  };
}
