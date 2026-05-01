import { useEffect, useState } from "react";

import { cancelAppointment, createAppointment, getAvailableSlots, getMyAppointments, getProviders, rescheduleAppointment } from "../api";
import { Layout } from "../components/Layout";
import type { Appointment } from "../types";

type Props = {
  token: string;
  onLogout: () => void;
};

export function CustomerPage({ token, onLogout }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<{ start: string; end: string }[]>([]);
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

  useEffect(() => {
    loadProviders();
    loadAppointments();
  }, [token]);

  async function loadProviders() {
    try {
      const data = await getProviders();
      setProviders(data);
      if (data.length > 0 && !selectedProvider) {
        setSelectedProvider(data[0].id);
      }
    } catch (err) {
      console.error("Erro ao carregar profissionais:", err);
    }
  }

  async function loadAppointments() {
    try {
      const data = await getMyAppointments(token);
      setAppointments(data);
    } catch (err) {
      setError("Falha ao carregar seus agendamentos.");
    }
  }

  async function handleLoadSlots() {
    if (!selectedProvider || !selectedDate) return;
    
    setLoadingSlots(true);
    setError("");
    try {
      const slots = await getAvailableSlots(selectedProvider, selectedDate);
      setAvailableSlots(slots);
    } catch (err) {
      setError("Falha ao carregar horários disponíveis.");
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleBookSlot(slot: { start: string; end: string }) {
    if (!selectedProvider) return;
    
    try {
      const startDateTime = new Date(`${selectedDate}T${slot.start}`);
      const endDateTime = new Date(`${selectedDate}T${slot.end}`);
      
      await createAppointment(token, {
        professional_id: selectedProvider,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
      });
      
      setMessage("Agendamento realizado com sucesso!");
      setShowBookingForm(false);
      setAvailableSlots([]);
      loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao agendar.");
    }
  }

  async function handleCancelAppointment(appointmentId: string) {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;
    
    try {
      await cancelAppointment(token, appointmentId);
      setMessage("Agendamento cancelado com sucesso!");
      loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cancelar.");
    }
  }

  async function handleRescheduleRequest(appointment: Appointment) {
    setReschedulingId(appointment.id);
    setSelectedDate(new Date(appointment.start_time).toISOString().split('T')[0]);
    setSelectedProvider(appointment.professional_id);
    setShowBookingForm(true);
    handleLoadSlots();
  }

  async function handleConfirmReschedule(slot: { start: string; end: string }) {
    if (!reschedulingId) return;
    
    try {
      const startDateTime = new Date(`${selectedDate}T${slot.start}`);
      const endDateTime = new Date(`${selectedDate}T${slot.end}`);
      
      await rescheduleAppointment(token, reschedulingId, startDateTime.toISOString(), endDateTime.toISOString());
      
      setMessage("Agendamento reagendado com sucesso!");
      setReschedulingId(null);
      setShowBookingForm(false);
      setAvailableSlots([]);
      loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao reagendar.");
    }
  }

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

  const upcomingAppointments = appointments.filter(a => a.status === "scheduled");
  const pastAppointments = appointments.filter(a => a.status !== "scheduled");

  return (
    <Layout title="Meu Painel de Paciente" onLogout={onLogout}>
      {message && (
        <section className="card" style={{ borderLeft: "4px solid #16a34a" }}>
          <p style={{ margin: 0, color: "#16a34a" }}>{message}</p>
        </section>
      )}
      
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Novo Agendamento</h2>
          <button 
            type="button" 
            onClick={() => setShowBookingForm(!showBookingForm)}
            style={{ background: "#2563eb", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px" }}
          >
            {showBookingForm ? "Cancelar" : "+ Agendar Consulta"}
          </button>
        </div>
        
        {showBookingForm && (
          <div style={{ marginTop: "16px", display: "grid", gap: "12px" }}>
            <label>
              Profissional
              <select 
                value={selectedProvider} 
                onChange={(e) => setSelectedProvider(e.target.value)}
                style={{ width: "100%", marginTop: "4px" }}
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            
            <label>
              Data
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{ width: "100%", marginTop: "4px" }}
              />
            </label>
            
            <button 
              type="button" 
              onClick={handleLoadSlots}
              disabled={!selectedProvider || !selectedDate || loadingSlots}
              style={{ 
                background: "#2563eb", 
                color: "white", 
                border: "none", 
                padding: "10px", 
                borderRadius: "6px",
                cursor: (!selectedProvider || !selectedDate || loadingSlots) ? "not-allowed" : "pointer",
                opacity: (!selectedProvider || !selectedDate || loadingSlots) ? 0.6 : 1,
              }}
            >
              {loadingSlots ? "Carregando..." : "Ver Horários Disponíveis"}
            </button>
            
            {availableSlots.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <h3>Horários Disponíveis:</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px", marginTop: "8px" }}>
                  {availableSlots.map((slot, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => reschedulingId ? handleConfirmReschedule(slot) : handleBookSlot(slot)}
                      style={{
                        padding: "8px",
                        border: "1px solid #2563eb",
                        background: "white",
                        color: "#2563eb",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      {slot.start}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {availableSlots.length === 0 && !loadingSlots && selectedDate && (
              <p style={{ color: "#666", fontStyle: "italic" }}>Nenhum horário disponível para esta data.</p>
            )}
          </div>
        )}
      </section>
      
      <section className="card">
        <h2>Próximos Agendamentos</h2>
        {error ? <p className="error">{error}</p> : null}
        
        {upcomingAppointments.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>Você não tem agendamentos futuros.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {upcomingAppointments.map((a) => (
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
                  <strong>{new Date(a.start_time).toLocaleDateString()} às {new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
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
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => handleRescheduleRequest(a)}
                    style={{
                      padding: "6px 12px",
                      border: "none",
                      background: "#f59e0b",
                      color: "white",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    Reagendar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCancelAppointment(a.id)}
                    style={{
                      padding: "6px 12px",
                      border: "none",
                      background: "#dc2626",
                      color: "white",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px"
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      
      {pastAppointments.length > 0 && (
        <section className="card">
          <h2>Histórico</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {pastAppointments.map((a) => (
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
                  <strong>{new Date(a.start_time).toLocaleDateString()} às {new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
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
              </li>
            ))}
          </ul>
        </section>
      )}
    </Layout>
  );
}
