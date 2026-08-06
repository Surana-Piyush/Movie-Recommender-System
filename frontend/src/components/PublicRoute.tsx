import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const PublicRoute: React.FC = () => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
