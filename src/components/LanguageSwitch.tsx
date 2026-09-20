import { useLanguage } from '../i18n/LanguageContext.tsx';
import { LANGS } from '../lib/types.ts';
import './LanguageSwitch.css';

export function LanguageSwitch() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="lang-switch" role="group" aria-label={t.languageSwitch}>
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          className="lang-option"
          aria-pressed={code === lang}
          lang={code}
          onClick={() => setLang(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
