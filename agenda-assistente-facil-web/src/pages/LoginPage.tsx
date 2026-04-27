import { type FormEvent, useState } from "react";

import { login } from "../api";
import type { UserRole } from "../types";

type Props = {
  onLogin: (token: string, role: UserRole) => void;
};

export function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [error, setError] = useState("");

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
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="customer">Paciente</option>
            <option value="provider">Profissional</option>
          </select>
        </label>
        <label>
          E-mail
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Senha
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button type="submit">Acessar</button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
