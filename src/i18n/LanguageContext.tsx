import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { strings } from './strings.ts';
import type { Strings } from './strings.ts';
import type { Lang } from '../lib/types.ts';

const STORAGE_KEY = 'threenights.lang';

function readStored(): Lang | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'es' || stored === 'en' ? stored : null;
  } catch {
    return null; // Storage can be blocked; the app must still work.
  }
}

/** Remembered choice first, then the browser language, then English. */
function initialLang(): Lang {
  return readStored() ?? (navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en');
}

interface LanguageValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Strings;
}

const LanguageContext = createContext<LanguageValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not remembered this time; nothing else to do.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t: strings[lang] }), [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider.');
  return value;
}
