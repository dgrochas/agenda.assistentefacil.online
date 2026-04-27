import { useMemo, useState } from "react";

import { CustomerPage } from "./pages/CustomerPage";
import { LoginPage } from "./pages/LoginPage";
import { ProviderPage } from "./pages/ProviderPage";
import type { UserRole } from "./types";

function getSession() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role") as UserRole | null;
  if (!token || !role) return null;
  return { token, role };
}

export default function App() {
  const initial = useMemo(getSession, []);
  const [token, setToken] = useState<string | null>(initial?.token ?? null);
  const [role, setRole] = useState<UserRole | null>(initial?.role ?? null);

  function onLogin(nextToken: string, nextRole: UserRole) {
    localStorage.setItem("token", nextToken);
    localStorage.setItem("role", nextRole);
    setToken(nextToken);
    setRole(nextRole);
  }

  function onLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setToken(null);
    setRole(null);
  }

  if (!token || !role) return <LoginPage onLogin={onLogin} />;
  if (role === "provider") return <ProviderPage token={token} onLogout={onLogout} />;
  return <CustomerPage token={token} onLogout={onLogout} />;
}
