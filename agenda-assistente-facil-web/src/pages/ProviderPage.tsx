import { useEffect, useState, useMemo } from "react";
import { Calendar, dateFnsLocalizer, View, SlotInfo } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
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
    if (!selectedSlot) return;
    
    try {
      if (createMode === "block") {
        await createPersonalBlock(token, {
          start_time: selectedSlot.start.toISOString(),
          end_time: selectedSlot.end.toISOString(),
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
    setSelectedSlot({ start: slotInfo.start, end: slotInfo.end });
    setShowCreateModal(true);
    setCreateMode("block");
    setAppointmentTitle("");
    setAppointmentDescription("");
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
        <h2>📅 Calendário de Agendamentos</h2>
        <div style={{ height: "600px", marginTop: "12px" }}>
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

      <section className="card">
        <h2>📋 Lista de Próximos Agendamentos ({scheduledAppointments.length})</h2>
        
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
