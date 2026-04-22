import React from "react";
import { Navigate } from "react-router-dom";
import { getToken, getUserRole } from "../lib/auth";

export default function ProtectedRoute({ children, requiredRole }) {
  const token = getToken();
  const role = getUserRole();

  if (!token) return <Navigate to="/login" replace />;
  if (requiredRole && role !== requiredRole) {
    return <Navigate to={role === "admin" ? "/admin/dashboard" : "/dashboard"} replace />;
  }

  return children;
}
