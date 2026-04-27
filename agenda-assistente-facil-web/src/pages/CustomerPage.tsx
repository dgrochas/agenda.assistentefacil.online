import { useEffect, useState } from "react";

import { getMyAppointments } from "../api";
import { Layout } from "../components/Layout";
import type { Appointment } from "../types";

type Props = {
  token: string;
  onLogout: () => void;
};

export function CustomerPage({ token, onLogout }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyAppointments(token)
      .then(setAppointments)
      .catch(() => setError("Falha ao carregar seus agendamentos."));
  }, [token]);

  return (
    <Layout title="Meu Painel de Paciente" onLogout={onLogout}>
      <section className="card">
        <h2>Meus agendamentos</h2>
        {error ? <p className="error">{error}</p> : null}
        <ul>
          {appointments.map((a) => (
            <li key={a.id}>
              {new Date(a.start_time).toLocaleString()} - {a.status}
            </li>
          ))}
        </ul>
      </section>
    </Layout>
  );
}
