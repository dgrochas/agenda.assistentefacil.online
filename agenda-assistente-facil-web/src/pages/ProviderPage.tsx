import { useEffect, useState } from "react";

import { getProviderAppointments, saveAgendaConfig } from "../api";
import { Layout } from "../components/Layout";
import type { Appointment } from "../types";

type Props = {
  token: string;
  onLogout: () => void;
};

export function ProviderPage({ token, onLogout }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [message, setMessage] = useState("");

  async function loadAppointments() {
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const data = await getProviderAppointments(token, start, end);
    setAppointments(data);
  }

  async function handleSaveDefaultConfig() {
    setMessage("");
    try {
      await saveAgendaConfig(token, {
        slot_duration: 30,
        buffer_time: 10,
        cancellation_deadline_hours: 24,
        work_hours: {
          mon: [{ start: "08:00", end: "18:00" }],
          tue: [{ start: "08:00", end: "18:00" }],
          wed: [{ start: "08:00", end: "18:00" }],
          thu: [{ start: "08:00", end: "18:00" }],
          fri: [{ start: "08:00", end: "18:00" }]
        }
      });
      setMessage("Configuracao da agenda salva.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao salvar configuracao.");
    }
  }

  useEffect(() => {
    loadAppointments().catch(() => setMessage("Falha ao carregar agendamentos."));
  }, []);

  return (
    <Layout title="Painel do Profissional" onLogout={onLogout}>
      <section className="card">
        <button type="button" onClick={handleSaveDefaultConfig}>
          Salvar configuracao padrao
        </button>
        {message ? <p>{message}</p> : null}
      </section>
      <section className="card">
        <h2>Proximos agendamentos</h2>
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
