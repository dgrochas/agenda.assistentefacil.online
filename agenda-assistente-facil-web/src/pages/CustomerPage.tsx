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
      setSelectedSlot(null);
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

  return (
    <Layout title="Área do Paciente" onLogout={onLogout}>
      {message && (
        <div className="success">{message}</div>
      )}
      
      {error && (
        <div className="error">{error}</div>
      )}
      
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
              }
            }}
            className="btn-primary"
          >
            {showBookingForm ? "Cancelar" : "+ Novo Agendamento"}
          </button>
        </div>
        
        {showBookingForm && (
          <div className="form">
            <div className="form-group">
              <label htmlFor="provider-select">Profissional</label>
              <select 
                id="provider-select"
                value={selectedProvider} 
                onChange={(e) => setSelectedProvider(e.target.value)}
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.specialty ? `— ${p.specialty}` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="date-select">Data</label>
              <input 
                id="date-select"
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <button 
              type="button" 
              onClick={handleLoadSlots}
              disabled={!selectedProvider || !selectedDate || loadingSlots}
              className="btn-secondary"
              style={{ width: '100%' }}
            >
              {loadingSlots ? (
                <>
                  <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', marginRight: '8px' }}></span>
                  Carregando...
                </>
              ) : "Ver Horários Disponíveis"}
            </button>
            
            {availableSlots.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <label style={{ marginBottom: "0.75rem", display: "block" }}>
                  {reschedulingId ? "Selecione um novo horário:" : "Selecione um horário disponível:"}
                </label>
                <div className="slots-grid">
                  {availableSlots.map((slot, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`slot-button ${selectedSlot?.start === slot.start ? 'selected' : ''}`}
                    >
                      {slot.start}
                    </button>
                  ))}
                </div>
                
                {selectedSlot && (
                  <button
                    type="button"
                    onClick={() => reschedulingId ? handleConfirmReschedule(selectedSlot) : handleBookSlot(selectedSlot)}
                    className="btn-primary"
                    style={{ width: '100%', marginTop: '1rem' }}
                  >
                    {reschedulingId ? "Confirmar Reagendamento" : "Confirmar Agendamento"}
                  </button>
                )}
              </div>
            )}
            
            {availableSlots.length === 0 && !loadingSlots && selectedDate && (
              <p style={{ color: "#64748b", fontStyle: "italic", textAlign: "center", padding: "1rem" }}>
                Nenhum horário disponível para esta data.
              </p>
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
