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
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([]);
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
    <section className="card">
      <h2>Entrar</h2>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Perfil
          <select 
            value={role} 
            onChange={(e) => {
              setRole(e.target.value as UserRole);
              if (e.target.value === "customer") {
                loadProviders();
              }
            }}
          >
            <option value="customer">Paciente</option>
            <option value="provider">Profissional</option>
          </select>
        </label>
        
        {role === "customer" && (
          <label>
            Selecionar Profissional
            <select 
              value={selectedProvider} 
              onChange={(e) => setSelectedProvider(e.target.value)}
              disabled={loadingProviders}
            >
              {loadingProviders ? (
                <option>Carregando...</option>
              ) : (
                providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </label>
        )}
        
        <label>
          E-mail
          <input 
            type="email"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="seu@email.com"
          />
        </label>
        <label>
          Senha
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="******"
          />
        </label>
        <button type="submit">Acessar</button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      
      <div style={{ marginTop: "16px", fontSize: "12px", color: "#666" }}>
        <p><strong>Dica:</strong> Use qualquer e-mail e senha para testar (modo mock).</p>
      </div>
    </section>
  );
}
