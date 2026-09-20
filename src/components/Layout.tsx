import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { LanguageSwitch } from './LanguageSwitch.tsx';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import './Layout.css';

const TMDB_LOGO =
  'https://www.themoviedb.org/assets/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg';

export function Layout() {
  const { t } = useLanguage();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="layout">
      <header className="site-header">
        <Link to="/" className="wordmark" aria-label="Three Nights">
          <span className="wordmark-moons" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="wordmark-text">Three Nights</span>
        </Link>
        <LanguageSwitch />
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">
          <img src={TMDB_LOGO} alt="TMDB" width="92" height="12" loading="lazy" />
        </a>
        <p>{t.tmdbNotice}</p>
      </footer>
    </div>
  );
}
