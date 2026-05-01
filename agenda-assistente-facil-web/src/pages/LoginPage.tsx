import { type FormEvent, useState } from "react";

import { login, getProviders } from "../api";
import type { UserRole } from "../types";

type Props = {
  onLogin: (token: string, role: UserRole) => void;
};

export function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [error, setError] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [providers, setProviders] = useState<{ id: string; name: string; specialty?: string }[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  async function loadProviders() {
    if (role === "customer" && providers.length === 0) {
      setLoadingProviders(true);
      try {
        const data = await getProviders();
        setProviders(data);
        if (data.length > 0) {
          setSelectedProvider(data[0].id);
        }
      } catch (err) {
        console.error("Erro ao carregar profissionais:", err);
      } finally {
        setLoadingProviders(false);
      }
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const data = await login(email, password, role);
      onLogin(data.access_token, role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login.");
    }
  }

  return (
    <div className="container">
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Bem-vindo à Agenda Assistente Fácil</h2>
          <p className="card-subtitle">Faça login para continuar</p>
        </div>
        
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="role">Perfil de Acesso</label>
            <select 
              id="role"
              value={role} 
              onChange={(e) => {
                setRole(e.target.value as UserRole);
                if (e.target.value === "customer") {
                  loadProviders();
                }
              }}
            >
              <option value="customer">👤 Paciente</option>
              <option value="provider">🩺 Profissional</option>
            </select>
          </div>
          
          {role === "customer" && (
            <div className="form-group">
              <label htmlFor="provider">Selecionar Profissional</label>
              <select 
                id="provider"
                value={selectedProvider} 
                onChange={(e) => setSelectedProvider(e.target.value)}
                disabled={loadingProviders}
              >
                {loadingProviders ? (
                  <option>Carregando...</option>
                ) : (
                  providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.specialty ? `— ${p.specialty}` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email">E-mail</label>
            <input 
              id="email"
              type="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="seu@email.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input 
              id="password"
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              required
            />
          </div>
          
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '8px' }}>
            Entrar
          </button>
        </form>
        
        {error && <div className="error" style={{ marginTop: '1rem' }}>{error}</div>}
        
        <div style={{ marginTop: "24px", padding: "16px", background: "#f0f9ff", borderRadius: "12px", border: "1px solid #bae6fd" }}>
          <p style={{ fontSize: "13px", color: "#0369a1", margin: 0 }}>
            💡 <strong>Dica:</strong> Use qualquer e-mail e senha para testar (modo mock).
          </p>
        </div>
      </section>
    </div>
  );
}
