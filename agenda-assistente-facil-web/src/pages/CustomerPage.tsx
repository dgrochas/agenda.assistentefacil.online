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
  const [providers, setProviders] = useState<{ id: string; name: string; specialty?: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [bookingStep, setBookingStep] = useState<"select-date" | "select-time" | "confirm">("select-date");

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
    setSelectedSlot(null);
    setBookingStep("select-time");
    try {
      const slots = await getAvailableSlots(selectedProvider, selectedDate);
      setAvailableSlots(slots);
      if (slots.length > 0) {
        setBookingStep("select-time");
      }
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
      setSelectedSlot(null);
      setBookingStep("select-date");
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
    setSelectedSlot(null);
    setBookingStep("select-date");
    setTimeout(() => handleLoadSlots(), 100);
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
      setSelectedSlot(null);
      setBookingStep("select-date");
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

  function getStatusBadgeClass(status: string) {
    const badges: Record<string, string> = {
      scheduled: "badge-success",
      canceled: "badge-danger",
      completed: "badge-info",
    };
    return badges[status] || "badge-info";
  }

  const upcomingAppointments = appointments.filter(a => a.status === "scheduled");
  const pastAppointments = appointments.filter(a => a.status !== "scheduled");

  // Gerar próximos 7 dias para seleção rápida
  const nextDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
  });

  return (
    <Layout title="Área do Paciente" onLogout={onLogout}>
      {message && (
        <div className="success">{message}</div>
      )}
      
      {error && (
        <div className="error">{error}</div>
      )}
      
      {/* Seção de Agendamento - Estilo Calendly */}
      <section className="card">
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h3 className="card-title">Agendar Nova Consulta</h3>
            <p className="card-subtitle">Escolha o profissional e o melhor horário para você</p>
          </div>
          <button 
            type="button" 
            onClick={() => {
              setShowBookingForm(!showBookingForm);
              if (showBookingForm) {
                setAvailableSlots([]);
                setSelectedSlot(null);
                setBookingStep("select-date");
              }
            }}
            className="btn-primary"
            style={{ fontSize: "1rem", padding: "0.875rem 1.5rem" }}
          >
            {showBookingForm ? "Cancelar" : "+ Novo Agendamento"}
          </button>
        </div>
        
        {showBookingForm && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem", marginTop: "1.5rem" }}>
            {/* Coluna da Esquerda - Seleção de Profissional e Data */}
            <div>
              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label htmlFor="provider-select" style={{ fontSize: "0.9375rem", fontWeight: "600", color: "#1e293b", marginBottom: "0.5rem", display: "block" }}>
                  👨‍⚕️ Profissional
                </label>
                <select 
                  id="provider-select"
                  value={selectedProvider} 
                  onChange={(e) => {
                    setSelectedProvider(e.target.value);
                    setAvailableSlots([]);
                    setSelectedSlot(null);
                  }}
                  style={{ fontSize: "0.9375rem", padding: "0.875rem 1rem" }}
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.specialty ? `— ${p.specialty}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ fontSize: "0.9375rem", fontWeight: "600", color: "#1e293b", marginBottom: "0.75rem", display: "block" }}>
                  📅 Selecione uma Data
                </label>
                
                {/* Quick Select - Próximos 7 dias */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                  {nextDays.map((date, index) => {
                    const dateObj = new Date(date + 'T00:00:00');
                    const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
                    const dayNumber = dateObj.getDate();
                    const month = dateObj.toLocaleDateString('pt-BR', { month: 'short' });
                    const isToday = index === 0;
                    
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => {
                          setSelectedDate(date);
                          setAvailableSlots([]);
                          setSelectedSlot(null);
                        }}
                        className={`slot-button ${selectedDate === date ? 'selected' : ''}`}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          padding: "0.75rem 1rem",
                          minWidth: "70px",
                          border: selectedDate === date ? "2px solid #0ea5e9" : "1px solid #e2e8f0",
                        }}
                      >
                        <span style={{ fontSize: "0.75rem", color: selectedDate === date ? "#0ea5e9" : "#64748b", textTransform: "uppercase" }}>
                          {isToday ? 'Hoje' : dayName}
                        </span>
                        <span style={{ fontSize: "1.25rem", fontWeight: "700", color: selectedDate === date ? "#0ea5e9" : "#1e293b" }}>
                          {dayNumber}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: selectedDate === date ? "#0ea5e9" : "#64748b" }}>
                          {month}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Date Input tradicional */}
                <div className="form-group">
                  <label htmlFor="date-select" style={{ fontSize: "0.875rem", color: "#64748b" }}>Ou escolha outra data:</label>
                  <input 
                    id="date-select"
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setAvailableSlots([]);
                      setSelectedSlot(null);
                    }}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <button 
                type="button" 
                onClick={handleLoadSlots}
                disabled={!selectedProvider || !selectedDate || loadingSlots}
                className="btn-secondary"
                style={{ width: '100%', padding: "0.875rem 1.5rem", fontSize: "0.9375rem", fontWeight: "600" }}
              >
                {loadingSlots ? (
                  <>
                    <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', marginRight: '8px' }}></span>
                    Carregando horários...
                  </>
                ) : "Ver Horários Disponíveis →"}
              </button>
            </div>

            {/* Coluna da Direita - Grid de Horários */}
            {availableSlots.length > 0 && (
              <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e2e8f0" }}>
                <div style={{ marginBottom: "1rem" }}>
                  <h4 style={{ fontSize: "1rem", fontWeight: "600", color: "#1e293b", marginBottom: "0.25rem" }}>
                    ⏰ Horários Disponíveis
                  </h4>
                  <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                    {new Date(selectedDate).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>

                <div className="slots-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "0.5rem" }}>
                  {availableSlots.map((slot, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setSelectedSlot(slot);
                        setBookingStep("confirm");
                      }}
                      className={`slot-button ${selectedSlot?.start === slot.start ? 'selected' : ''}`}
                      style={{
                        padding: "0.875rem 0.5rem",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {slot.start}
                    </button>
                  ))}
                </div>
                
                {selectedSlot && (
                  <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e2e8f0" }}>
                    <div style={{ background: "#ecfdf5", padding: "1rem", borderRadius: "8px", marginBottom: "1rem", border: "1px solid #a7f3d0" }}>
                      <p style={{ fontSize: "0.875rem", color: "#059669", margin: 0 }}>
                        ✅ Horário selecionado: <strong>{selectedSlot.start} - {selectedSlot.end}</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => reschedulingId ? handleConfirmReschedule(selectedSlot) : handleBookSlot(selectedSlot)}
                      className="btn-primary"
                      style={{ width: '100%', padding: "1rem", fontSize: "1rem", fontWeight: "600" }}
                    >
                      {reschedulingId ? "🔄 Confirmar Reagendamento" : "✅ Confirmar Agendamento"}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {availableSlots.length === 0 && !loadingSlots && selectedDate && (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem", background: "#f8fafc", borderRadius: "12px" }}>
                <p style={{ fontSize: "1.125rem", color: "#64748b", marginBottom: "0.5rem" }}>
                  😕 Nenhum horário disponível para esta data
                </p>
                <p style={{ fontSize: "0.875rem", color: "#94a3b8" }}>
                  Tente selecionar outro dia ou profissional
                </p>
              </div>
            )}
          </div>
        )}
      </section>
      
      <section className="card">
        <div className="card-header">
          <h3 className="card-title">Próximos Agendamentos</h3>
          <p className="card-subtitle">Suas consultas futuras</p>
        </div>
        
        {upcomingAppointments.length === 0 ? (
          <p style={{ color: "#64748b", fontStyle: "italic", textAlign: "center", padding: "2rem" }}>
            Você não tem agendamentos futuros.
          </p>
        ) : (
          <div className="appointment-list">
            {upcomingAppointments.map((a) => (
              <div key={a.id} className="appointment-item">
                <div className="appointment-info">
                  <div className="appointment-patient">
                    {new Date(a.start_time).toLocaleDateString('pt-BR')} às {new Date(a.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="appointment-date">
                    <span className={`badge ${getStatusBadgeClass(a.status)}`}>
                      {getStatusLabel(a.status)}
                    </span>
                  </div>
                </div>
                <div className="appointment-actions">
                  <button
                    type="button"
                    onClick={() => handleRescheduleRequest(a)}
                    className="btn-secondary btn-sm"
                  >
                    🔄 Reagendar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCancelAppointment(a.id)}
                    className="btn-danger btn-sm"
                  >
                    ✕ Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      
      {pastAppointments.length > 0 && (
        <section className="card">
          <div className="card-header">
            <h3 className="card-title">Histórico de Consultas</h3>
            <p className="card-subtitle">Seus atendimentos passados</p>
          </div>
          <div className="appointment-list">
            {pastAppointments.map((a) => (
              <div key={a.id} className="appointment-item" style={{ opacity: 0.7 }}>
                <div className="appointment-info">
                  <div className="appointment-patient">
                    {new Date(a.start_time).toLocaleDateString('pt-BR')} às {new Date(a.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="appointment-date">
                    <span className={`badge ${getStatusBadgeClass(a.status)}`}>
                      {getStatusLabel(a.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </Layout>
  );
}
