import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App.tsx';
import { LanguageProvider } from './i18n/LanguageContext.tsx';
import { WatchedProvider } from './lib/WatchedContext.tsx';
import './styles/global.css';

// The site lives under /<repo-name>/ on GitHub Pages and under / locally.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <LanguageProvider>
        <WatchedProvider>
          <App />
        </WatchedProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
);
