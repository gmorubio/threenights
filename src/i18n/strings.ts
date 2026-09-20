import type { Lang } from '../lib/types.ts';
import type { TmdbErrorKind } from '../lib/tmdb.ts';

export interface Strings {
  tagline: string;
  /** "Parte 2" in Spanish, "Night 2" in English. */
  partLabel: (n: number) => string;
  partCount: (n: number) => string;
  partsHeading: string;
  startsAt: string;
  cutAt: string;
  untilEnd: string;
  showCue: string;
  hideCue: string;
  spoilerNote: string;
  approxNote: string;
  copyNote: (runtime: string) => string;
  edition: string;
  directedBy: string;
  cast: string;
  as: string;
  overview: string;
  noOverview: string;
  overviewFallback: string;
  backToCatalogue: string;
  emptyCatalogue: string;
  invalidFile: string;
  invalidFileHelp: string;
  notFoundTitle: string;
  notFoundBody: string;
  loading: string;
  languageSwitch: string;
  tmdbNotice: string;
  errorTitle: Record<TmdbErrorKind, string>;
  errorBody: Record<TmdbErrorKind, string>;
}

export const strings: Record<Lang, Strings> = {
  es: {
    tagline: 'Películas para ver en varias noches, cortadas donde toca.',
    partLabel: (n) => `Parte ${n}`,
    partCount: (n) => (n === 1 ? '1 parte' : `${n} partes`),
    partsHeading: 'Partes',
    startsAt: 'Empieza en',
    cutAt: 'Corta en',
    untilEnd: 'Hasta el final',
    showCue: 'Mostrar pista de corte',
    hideCue: 'Ocultar pista',
    spoilerNote: 'Describe el final de esta parte.',
    approxNote: 'Duración de la última parte aproximada, según TMDB.',
    copyNote: (runtime) =>
      `Cortes marcados sobre una copia de ${runtime}. Si la tuya dura otra cosa, guíate por las pistas.`,
    edition: 'Edición',
    directedBy: 'Dirección',
    cast: 'Reparto',
    as: 'como',
    overview: 'Sinopsis',
    noOverview: 'TMDB no tiene sinopsis de esta película.',
    overviewFallback: 'TMDB no tiene la sinopsis en español. Se muestra en inglés.',
    backToCatalogue: 'Catálogo',
    emptyCatalogue: 'Aún no hay películas. Añade un fichero JSON en la carpeta movies.',
    invalidFile: 'Fichero no válido',
    invalidFileHelp: 'Corrige el fichero y ejecuta npm run validate.',
    notFoundTitle: 'Aquí no hay nada',
    notFoundBody: 'No existe ninguna película con esa dirección.',
    loading: 'Cargando',
    languageSwitch: 'Idioma',
    tmdbNotice: 'Este producto usa la API de TMDB, pero no está avalado ni certificado por TMDB.',
    errorTitle: {
      'missing-token': 'Falta el token de TMDB',
      unauthorized: 'TMDB ha rechazado el token',
      'not-found': 'TMDB no conoce esta película',
      network: 'No se puede conectar con TMDB',
      http: 'TMDB ha devuelto un error',
    },
    errorBody: {
      'missing-token':
        'Copia .env.example como .env, pega tu token de acceso de lectura en VITE_TMDB_READ_TOKEN y reinicia npm run dev.',
      unauthorized:
        'Revisa que VITE_TMDB_READ_TOKEN en .env contenga el token de acceso de lectura completo, no la API key corta, y reinicia npm run dev.',
      'not-found': 'Comprueba el tmdbId del fichero JSON.',
      network: 'Comprueba tu conexión a internet y recarga la página.',
      http: 'Vuelve a intentarlo en unos minutos.',
    },
  },
  en: {
    tagline: 'Movies to watch over a few nights, cut where it makes sense.',
    partLabel: (n) => `Night ${n}`,
    partCount: (n) => (n === 1 ? '1 night' : `${n} nights`),
    partsHeading: 'Nights',
    startsAt: 'Starts at',
    cutAt: 'Cut at',
    untilEnd: 'Until the end',
    showCue: 'Show cut cue',
    hideCue: 'Hide cue',
    spoilerNote: 'Describes how this night ends.',
    approxNote: 'Length of the last night is approximate, based on TMDB.',
    copyNote: (runtime) =>
      `Cuts marked on a copy running ${runtime}. If yours differs, go by the cues.`,
    edition: 'Edition',
    directedBy: 'Directed by',
    cast: 'Cast',
    as: 'as',
    overview: 'Overview',
    noOverview: 'TMDB has no overview for this movie.',
    overviewFallback: 'TMDB has no English overview. Showing the Spanish one.',
    backToCatalogue: 'Catalogue',
    emptyCatalogue: 'No movies yet. Add a JSON file to the movies folder.',
    invalidFile: 'Invalid file',
    invalidFileHelp: 'Fix the file and run npm run validate.',
    notFoundTitle: 'Nothing here',
    notFoundBody: 'There is no movie at this address.',
    loading: 'Loading',
    languageSwitch: 'Language',
    tmdbNotice: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
    errorTitle: {
      'missing-token': 'TMDB token missing',
      unauthorized: 'TMDB rejected the token',
      'not-found': 'TMDB does not know this movie',
      network: 'Cannot reach TMDB',
      http: 'TMDB returned an error',
    },
    errorBody: {
      'missing-token':
        'Copy .env.example to .env, paste your API Read Access Token into VITE_TMDB_READ_TOKEN and restart npm run dev.',
      unauthorized:
        'Check that VITE_TMDB_READ_TOKEN in .env holds the full API Read Access Token, not the short API key, then restart npm run dev.',
      'not-found': 'Check the tmdbId in the JSON file.',
      network: 'Check your internet connection and reload the page.',
      http: 'Try again in a few minutes.',
    },
  },
};
