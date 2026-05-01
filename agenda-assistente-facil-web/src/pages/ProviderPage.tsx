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
  const [configSaved, setConfigSaved] = useState(false);
  const [slotDuration, setSlotDuration] = useState(30);
  const [bufferTime, setBufferTime] = useState(10);
  const [cancellationDeadline, setCancellationDeadline] = useState(24);

  async function loadAppointments() {
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    try {
      const data = await getProviderAppointments(token, start, end);
      setAppointments(data);
    } catch (err) {
      setMessage("Falha ao carregar agendamentos.");
    }
  }

  async function handleSaveConfig() {
    setMessage("");
    setConfigSaved(false);
    try {
      await saveAgendaConfig(token, {
        slot_duration: slotDuration,
        buffer_time: bufferTime,
        cancellation_deadline_hours: cancellationDeadline,
        work_hours: {
          mon: [{ start: "08:00", end: "18:00" }],
          tue: [{ start: "08:00", end: "18:00" }],
          wed: [{ start: "08:00", end: "18:00" }],
          thu: [{ start: "08:00", end: "18:00" }],
          fri: [{ start: "08:00", end: "18:00" }],
        },
      });
      setConfigSaved(true);
      setMessage("Configuração da agenda salva com sucesso!");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao salvar configuração.");
    }
  }

  useEffect(() => {
    loadAppointments().catch(() => setMessage("Falha ao carregar agendamentos."));
  }, []);

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      scheduled: "Agendado",
      canceled: "Cancelado",
      completed: "Realizado",
    };
    return labels[status] || status;
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      scheduled: "#2563eb",
      canceled: "#dc2626",
      completed: "#16a34a",
    };
    return colors[status] || "#6b7280";
  }

  const scheduledAppointments = appointments.filter(a => a.status === "scheduled");
  const otherAppointments = appointments.filter(a => a.status !== "scheduled");

  return (
    <Layout title="Painel do Profissional" onLogout={onLogout}>
      {message && (
        <section 
          className="card" 
          style={{ 
            borderLeft: message.includes("sucesso") ? "4px solid #16a34a" : "4px solid #dc2626" 
          }}
        >
          <p style={{ margin: 0, color: message.includes("sucesso") ? "#16a34a" : "#dc2626" }}>
            {message}
          </p>
        </section>
      )}
      
      <section className="card">
        <h2>Configurações da Agenda</h2>
        <div style={{ display: "grid", gap: "12px", marginTop: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <label>
              Duração da Consulta (min)
              <input 
                type="number" 
                value={slotDuration} 
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                min={15}
                step={15}
                style={{ width: "100%", marginTop: "4px" }}
              />
            </label>
            
            <label>
              Tempo de Respiro (min)
              <input 
                type="number" 
                value={bufferTime} 
                onChange={(e) => setBufferTime(Number(e.target.value))}
                min={0}
                step={5}
                style={{ width: "100%", marginTop: "4px" }}
              />
            </label>
            
            <label>
              Prazo Cancelamento (horas)
              <input 
                type="number" 
                value={cancellationDeadline} 
                onChange={(e) => setCancellationDeadline(Number(e.target.value))}
                min={0}
                step={1}
                style={{ width: "100%", marginTop: "4px" }}
              />
            </label>
          </div>
          
          <button 
            type="button" 
            onClick={handleSaveConfig}
            style={{ 
              background: "#2563eb", 
              color: "white", 
              border: "none", 
              padding: "10px 20px", 
              borderRadius: "6px",
              cursor: "pointer",
              alignSelf: "start",
            }}
          >
            Salvar Configurações
          </button>
          
          {configSaved && (
            <p style={{ color: "#16a34a", margin: 0, fontSize: "14px" }}>
              ✓ Configurações salvas com sucesso!
            </p>
          )}
          
          <div style={{ marginTop: "12px", padding: "12px", background: "#f3f4f6", borderRadius: "6px" }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>Horário de Trabalho Padrão:</h3>
            <p style={{ margin: 0, fontSize: "13px", color: "#666" }}>
              Segunda a Sexta: 08:00 às 18:00
            </p>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#999", fontStyle: "italic" }}>
              * Integração com Google Calendar será implementada em breve
            </p>
          </div>
        </div>
      </section>
      
      <section className="card">
        <h2>Próximos Agendamentos ({scheduledAppointments.length})</h2>
        
        {scheduledAppointments.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>Nenhum agendamento futuro.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {scheduledAppointments.map((a) => (
              <li 
                key={a.id} 
                style={{ 
                  padding: "12px", 
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong>
                    {new Date(a.start_time).toLocaleDateString()} às {" "}
                    {new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </strong>
                  <span style={{ 
                    marginLeft: "8px", 
                    padding: "2px 8px", 
                    borderRadius: "4px", 
                    background: getStatusColor(a.status), 
                    color: "white",
                    fontSize: "12px"
                  }}>
                    {getStatusLabel(a.status)}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  Paciente: {a.patient_id}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      
      {otherAppointments.length > 0 && (
        <section className="card">
          <h2>Histórico Recente</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {otherAppointments.slice(0, 10).map((a) => (
              <li 
                key={a.id} 
                style={{ 
                  padding: "12px", 
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  opacity: 0.7,
                }}
              >
                <div>
                  <strong>
                    {new Date(a.start_time).toLocaleDateString()} às {" "}
                    {new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </strong>
                  <span style={{ 
                    marginLeft: "8px", 
                    padding: "2px 8px", 
                    borderRadius: "4px", 
                    background: getStatusColor(a.status), 
                    color: "white",
                    fontSize: "12px"
                  }}>
                    {getStatusLabel(a.status)}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  Paciente: {a.patient_id}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      
      <section className="card" style={{ background: "#fef3c7", borderLeft: "4px solid #f59e0b" }}>
        <h3 style={{ margin: "0 0 8px 0", color: "#92400e" }}>🔄 Em Desenvolvimento</h3>
        <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", color: "#78350f" }}>
          <li>Integração com Google Calendar OAuth2</li>
          <li>Sincronização automática de eventos</li>
          <li>Cálculo de slots disponíveis baseado na agenda externa</li>
          <li>Notificações por e-mail/WhatsApp</li>
        </ul>
      </section>
    </Layout>
  );
}
