import { useEffect, useState, useMemo } from "react";
import { Calendar, dateFnsLocalizer, View, SlotInfo } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

import { 
  getProviderAppointments, 
  saveAgendaConfig,
  createPersonalBlock,
  createAppointmentForPatient,
  getEventTypes,
  createEventType,
  deleteEventType,
} from "../api";
import { Layout } from "../components/Layout";
import type { Appointment, EventType } from "../types";

import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  "pt-BR": ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

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
  const [currentView, setCurrentView] = useState<View>("month");
  
  // Estados para horário de trabalho
  const [workDayStart, setWorkDayStart] = useState("08:00");
  const [workDayEnd, setWorkDayEnd] = useState("18:00");
  const [workDays, setWorkDays] = useState({
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: false,
    sun: false,
  });
  
  // Estados para tipos de evento
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [showNewEventTypeModal, setShowNewEventTypeModal] = useState(false);
  const [newEventTypeTitle, setNewEventTypeTitle] = useState("");
  const [newEventTypeDuration, setNewEventTypeDuration] = useState(30);
  const [newEventTypeColor, setNewEventTypeColor] = useState("#2563eb");
  
  // Estados para criar agendamento/bloqueio
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [createMode, setCreateMode] = useState<"patient" | "block">("patient");
  const [patientEmail, setPatientEmail] = useState("");
  const [appointmentTitle, setAppointmentTitle] = useState("");
  const [appointmentDescription, setAppointmentDescription] = useState("");
  
  // Estados para edição de data e hora no modal
  const [modalStartDate, setModalStartDate] = useState<string>("");
  const [modalStartTime, setModalStartTime] = useState<string>("");
  const [modalEndTime, setModalEndTime] = useState<string>("");

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
  
  async function loadEventTypes() {
    try {
      const data = await getEventTypes(token);
      setEventTypes(data);
    } catch (err) {
      console.error("Falha ao carregar tipos de evento");
    }
  }

  async function handleSaveConfig() {
    setMessage("");
    setConfigSaved(false);
    try {
      // Construir horários de trabalho baseados nos dias selecionados
      const workHours: any = {};
      const dayMap: Record<string, string> = {
        mon: 'Segunda',
        tue: 'Terça',
        wed: 'Quarta',
        thu: 'Quinta',
        fri: 'Sexta',
        sat: 'Sábado',
        sun: 'Domingo',
      };
      
      Object.entries(workDays).forEach(([day, isActive]) => {
        if (isActive) {
          workHours[day] = [{ start: workDayStart, end: workDayEnd }];
        }
      });
      
      await saveAgendaConfig(token, {
        slot_duration: slotDuration,
        buffer_time: bufferTime,
        cancellation_deadline_hours: cancellationDeadline,
        work_hours: workHours,
      });
      setConfigSaved(true);
      setMessage("Configuração da agenda salva com sucesso!");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao salvar configuração.");
    }
  }
  
  async function handleCreateEventType() {
    if (!newEventTypeTitle.trim()) {
      alert("Digite um título para o tipo de evento");
      return;
    }
    try {
      const created = await createEventType(token, {
        title: newEventTypeTitle,
        duration_minutes: newEventTypeDuration,
        color: newEventTypeColor,
      });
      setEventTypes([...eventTypes, created]);
      setShowNewEventTypeModal(false);
      setNewEventTypeTitle("");
      setNewEventTypeDuration(30);
      setMessage("Tipo de evento criado com sucesso!");
    } catch (err) {
      setMessage("Falha ao criar tipo de evento.");
    }
  }
  
  async function handleDeleteEventType(id: string) {
    if (!confirm("Tem certeza que deseja excluir este tipo de evento?")) {
      return;
    }
    try {
      await deleteEventType(token, id);
      setEventTypes(eventTypes.filter(et => et.id !== id));
      setMessage("Tipo de evento excluído com sucesso!");
    } catch (err) {
      setMessage("Falha ao excluir tipo de evento.");
    }
  }
  
  async function handleCreateAppointment() {
    if (!selectedSlot || !modalStartDate || !modalStartTime || !modalEndTime) return;
    
    // Criar datas baseadas nos campos separados
    const startDateTime = new Date(`${modalStartDate}T${modalStartTime}`);
    const endDateTime = new Date(`${modalStartDate}T${modalEndTime}`);
    
    try {
      if (createMode === "block") {
        await createPersonalBlock(token, {
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          title: appointmentTitle || "Bloqueio Pessoal",
          description: appointmentDescription,
        });
      } else {
        // Em produção, buscaria o ID do paciente pelo email
        alert("Funcionalidade de agendar para paciente requer busca de pacientes por email. Implementação futura.");
        return;
      }
      setShowCreateModal(false);
      setSelectedSlot(null);
      setAppointmentTitle("");
      setAppointmentDescription("");
      setPatientEmail("");
      setMessage(createMode === "block" ? "Bloqueio criado com sucesso!" : "Agendamento criado com sucesso!");
      loadAppointments();
    } catch (err) {
      setMessage("Falha ao criar agendamento.");
    }
  }

  useEffect(() => {
    loadAppointments().catch(() => setMessage("Falha ao carregar agendamentos."));
    loadEventTypes().catch(() => console.error("Falha ao carregar tipos de evento"));
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

  // Transformar agendamentos em eventos para o calendário
  const calendarEvents = useMemo(() => {
    return appointments.map((a) => ({
      id: a.id,
      title: `Paciente: ${a.patient_id}`,
      start: new Date(a.start_time),
      end: new Date(a.end_time),
      status: a.status,
      resource: a,
    }));
  }, [appointments]);

  // Customizar estilo do evento baseado no status
  function getEventStyle(event: { status: string }) {
    const colors: Record<string, string> = {
      scheduled: "#2563eb",
      canceled: "#dc2626",
      completed: "#16a34a",
    };
    return {
      backgroundColor: colors[event.status] || "#6b7280",
      borderColor: colors[event.status] || "#6b7280",
      color: "white",
      padding: "2px 4px",
      borderRadius: "4px",
      fontSize: "12px",
    };
  }

  function handleSelectSlot(slotInfo: SlotInfo) {
    const start = slotInfo.start;
    const end = slotInfo.end;
    
    setSelectedSlot({ start, end });
    setShowCreateModal(true);
    setCreateMode("block");
    setAppointmentTitle("");
    setAppointmentDescription("");
    setPatientEmail("");
    
    // Preencher os campos de data e hora separadamente
    const startDateStr = start.toISOString().split('T')[0];
    const startTimeStr = start.toTimeString().slice(0, 5);
    const endTimeStr = end.toTimeString().slice(0, 5);
    
    setModalStartDate(startDateStr);
    setModalStartTime(startTimeStr);
    setModalEndTime(endTimeStr);
  }

  function handleSelectEvent(event: any) {
    const appointment = event.resource as Appointment;
    const statusLabel = getStatusLabel(appointment.status);
    const typeLabel = appointment.appointment_type === "personal_block" ? "Bloqueio Pessoal" : "Consulta";
    alert(
      `${typeLabel}\n${new Date(appointment.start_time).toLocaleString()}\nStatus: ${statusLabel}\n${appointment.title ? `Título: ${appointment.title}` : ""}`
    );
  }

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
          
          <div style={{ marginTop: "16px", padding: "12px", background: "#f3f4f6", borderRadius: "6px" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "14px" }}>⏰ Horário de Trabalho</h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "13px", fontWeight: 500 }}>Hora de Início:</span>
                <input 
                  type="time" 
                  value={workDayStart}
                  onChange={(e) => setWorkDayStart(e.target.value)}
                  style={{ padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                />
              </label>
              
              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "13px", fontWeight: 500 }}>Hora de Término:</span>
                <input 
                  type="time" 
                  value={workDayEnd}
                  onChange={(e) => setWorkDayEnd(e.target.value)}
                  style={{ padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                />
              </label>
            </div>
            
            <div style={{ marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "8px" }}>Dias da Semana:</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
                {[
                  { key: 'mon', label: 'Seg' },
                  { key: 'tue', label: 'Ter' },
                  { key: 'wed', label: 'Qua' },
                  { key: 'thu', label: 'Qui' },
                  { key: 'fri', label: 'Sex' },
                  { key: 'sat', label: 'Sáb' },
                  { key: 'sun', label: 'Dom' },
                ].map((day) => (
                  <label 
                    key={day.key}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={workDays[day.key as keyof typeof workDays]}
                      onChange={(e) => setWorkDays({ ...workDays, [day.key]: e.target.checked })}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <span style={{ fontSize: "12px", color: "#666" }}>{day.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div style={{ marginTop: "12px", padding: "8px", background: "#dbeafe", borderRadius: "4px" }}>
              <p style={{ margin: 0, fontSize: "12px", color: "#1e40af" }}>
                <strong>Resumo:</strong> {Object.entries(workDays).filter(([_, active]) => active).length > 0 
                  ? `Trabalha ${Object.entries(workDays).filter(([_, active]) => active).length} dias por semana, das ${workDayStart} às ${workDayEnd}`
                  : "Nenhum dia selecionado"}
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "24px", alignItems: "start" }}>
        <section className="card">
          <h2>📅 Calendário de Agendamentos</h2>
          <p style={{ margin: "12px 0", fontSize: "14px", color: "#666" }}>
            Selecione um período no calendário para criar um evento (bloqueio ou agendamento)
          </p>
          <div style={{ height: "600px" }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              view={currentView}
              onView={(view) => setCurrentView(view)}
              style={{ height: "100%" }}
              culture="pt-BR"
              step={30}
              timeslots={2}
              defaultView="month"
              views={["month", "week", "day", "agenda"]}
              eventPropGetter={(event) => ({
                style: getEventStyle(event),
              })}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              selectable
              messages={{
                date: "Data",
                time: "Hora",
                event: "Evento",
                allDay: "Dia inteiro",
                week: "Semana",
                work_week: "Semana útil",
                day: "Dia",
                month: "Mês",
                previous: "Anterior",
                next: "Próximo",
                yesterday: "Ontem",
                tomorrow: "Amanhã",
                today: "Hoje",
                agenda: "Agenda",
                noEventsInRange: "Nenhum agendamento neste período.",
                showMore: (total: number) => `+${total} mais`,
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "16px", marginTop: "12px", fontSize: "13px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "16px", height: "16px", background: "#2563eb", borderRadius: "4px" }} />
              <span>Agendado</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "16px", height: "16px", background: "#dc2626", borderRadius: "4px" }} />
              <span>Cancelado</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "16px", height: "16px", background: "#16a34a", borderRadius: "4px" }} />
              <span>Realizado</span>
            </div>
          </div>
        </section>

        {scheduledAppointments.length > 0 && (
          <section 
            className="card" 
            style={{ 
              minWidth: "300px", 
              maxWidth: "400px",
              alignSelf: "start",
              maxHeight: "600px",
              overflowY: "auto"
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px" }}>📋 Próximos Agendamentos ({scheduledAppointments.length})</h3>
            
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {scheduledAppointments.map((a) => (
                <li 
                  key={a.id} 
                  style={{ 
                    padding: "12px", 
                    borderBottom: "1px solid #e5e7eb",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <strong style={{ fontSize: "14px" }}>
                      {new Date(a.start_time).toLocaleDateString('pt-BR')}
                    </strong>
                    <span style={{ 
                      padding: "2px 8px", 
                      borderRadius: "4px", 
                      background: getStatusColor(a.status), 
                      color: "white",
                      fontSize: "11px",
                      fontWeight: "bold"
                    }}>
                      {getStatusLabel(a.status)}
                    </span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#666" }}>
                    ⏰ {new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: "13px", color: "#374151", fontWeight: "500" }}>
                    👤 Paciente: {a.patient_id}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      
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
      
      {/* Modal de Criar Evento */}
      {showCreateModal && selectedSlot && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "white",
            padding: "24px",
            borderRadius: "8px",
            width: "100%",
            maxWidth: "500px",
            maxHeight: "90vh",
            overflow: "auto",
          }}>
            <h3 style={{ margin: "0 0 16px 0" }}>
              {createMode === "block" ? "🔒 Criar Bloqueio Pessoal" : "📅 Agendar para Paciente"}
            </h3>
            
            {/* Campos de Data e Hora Separados */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>
                  Data:
                </label>
                <input
                  type="date"
                  value={modalStartDate}
                  onChange={(e) => setModalStartDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>
                  Hora Início:
                </label>
                <input
                  type="time"
                  value={modalStartTime}
                  onChange={(e) => setModalStartTime(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "13px" }}>
                  Hora Fim:
                </label>
                <input
                  type="time"
                  value={modalEndTime}
                  onChange={(e) => setModalEndTime(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
              </div>
            </div>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                Tipo de Evento:
              </label>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setCreateMode("block")}
                  style={{
                    flex: 1,
                    padding: "12px",
                    border: createMode === "block" ? "2px solid #2563eb" : "1px solid #d1d5db",
                    borderRadius: "6px",
                    background: createMode === "block" ? "#eff6ff" : "white",
                    cursor: "pointer",
                    fontWeight: createMode === "block" ? "bold" : "normal",
                  }}
                >
                  🔒 Bloqueio Pessoal
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode("patient")}
                  style={{
                    flex: 1,
                    padding: "12px",
                    border: createMode === "patient" ? "2px solid #2563eb" : "1px solid #d1d5db",
                    borderRadius: "6px",
                    background: createMode === "patient" ? "#eff6ff" : "white",
                    cursor: "pointer",
                    fontWeight: createMode === "patient" ? "bold" : "normal",
                  }}
                >
                  📅 Paciente
                </button>
              </div>
            </div>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                Título:
              </label>
              <input
                type="text"
                value={appointmentTitle}
                onChange={(e) => setAppointmentTitle(e.target.value)}
                placeholder={createMode === "block" ? "Ex: Almoço, Reunião..." : "Ex: Consulta de Rotina"}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              />
            </div>
            
            {createMode === "patient" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                  E-mail do Paciente:
                </label>
                <input
                  type="email"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  placeholder="paciente@exemplo.com"
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                />
              </div>
            )}
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
                Descrição (opcional):
              </label>
              <textarea
                value={appointmentDescription}
                onChange={(e) => setAppointmentDescription(e.target.value)}
                placeholder="Adicione detalhes sobre este evento..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "14px",
                  resize: "vertical",
                }}
              />
            </div>
            
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedSlot(null);
                  setAppointmentTitle("");
                  setAppointmentDescription("");
                  setPatientEmail("");
                  setModalStartDate("");
                  setModalStartTime("");
                  setModalEndTime("");
                }}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateAppointment}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "6px",
                  background: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                {createMode === "block" ? "Criar Bloqueio" : "Agendar Paciente"}
              </button>
            </div>
          </div>
        </div>
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
