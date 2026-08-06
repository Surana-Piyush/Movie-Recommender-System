import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SkeletonGrid } from './SkeletonCard';

export const ProtectedRoute: React.FC = () => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0d12] flex items-center justify-center p-6">
        <SkeletonGrid count={4} message="Authenticating CineCast AI profile..." />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
