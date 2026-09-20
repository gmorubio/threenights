import type { ReactNode } from 'react';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import type { TmdbError } from '../lib/tmdb.ts';
import './Notice.css';

export function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="notice" role="alert">
      <strong className="notice-title">{title}</strong>
      <div className="notice-body">{children}</div>
    </div>
  );
}

export function TmdbNotice({ error }: { error: TmdbError }) {
  const { t } = useLanguage();
  return (
    <Notice title={t.errorTitle[error.kind]}>
      <p>{t.errorBody[error.kind]}</p>
    </Notice>
  );
}
