import { Link } from 'react-router';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.ts';

export function NotFound() {
  const { t } = useLanguage();
  useDocumentTitle(t.notFoundTitle);

  return (
    <section className="page-narrow">
      <h1>{t.notFoundTitle}</h1>
      <p className="muted">{t.notFoundBody}</p>
      <p>
        <Link to="/" className="back-link">
          {t.backToCatalogue}
        </Link>
      </p>
    </section>
  );
}
