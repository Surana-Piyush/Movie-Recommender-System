import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { SemanticSearch } from './pages/SemanticSearch';
import { SimilarMovie } from './pages/SimilarMovie';
import { Recommendations } from './pages/Recommendations';
import { Ratings } from './pages/Ratings';
import { Profile } from './pages/Profile';
import { MovieDetail } from './pages/MovieDetail';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<Landing />} />

      {/* Guest Only Auth Routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected Dashboard & Feature Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/semantic-search" element={<SemanticSearch />} />
        <Route path="/similar-movie" element={<SimilarMovie />} />
        <Route path="/hybrid-recommendation" element={<Recommendations />} />
        <Route path="/ratings" element={<Ratings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/movie/:tmdb_id" element={<MovieDetail />} />
      </Route>

      {/* Catch-all fallback redirect */}
      <Route path="*" element={<Landing />} />
    </Routes>
  );
};

export default App;
