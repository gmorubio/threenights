import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout.tsx';
import { Catalogue } from './pages/Catalogue.tsx';
import { Movie } from './pages/Movie.tsx';
import { NotFound } from './pages/NotFound.tsx';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Catalogue />} />
        <Route path="movie/:slug" element={<Movie />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
