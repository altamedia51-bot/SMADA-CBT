import React from 'react';
import { Navigate } from 'react-router-dom';

export default function AdminDocs() {
  // Redirect to the centralized Panduan page
  return <Navigate to="/admin/panduan" replace />;
}
