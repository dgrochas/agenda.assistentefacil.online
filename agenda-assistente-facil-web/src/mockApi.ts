import type { Appointment, UserRole } from "./types";

// Mock de dados para desenvolvimento
const mockAppointments: Appointment[] = [
  {
    id: "1",
    professional_id: "prof-1",
    patient_id: "patient-1",
    start_time: new Date(Date.now() + 86400000).toISOString(), // amanhã
    end_time: new Date(Date.now() + 86400000 + 1800000).toISOString(),
    status: "scheduled",
  },
  {
    id: "2",
    professional_id: "prof-1",
    patient_id: "patient-1",
    start_time: new Date(Date.now() + 172800000).toISOString(), // depois de amanhã
    end_time: new Date(Date.now() + 172800000 + 1800000).toISOString(),
    status: "scheduled",
  },
  {
    id: "3",
    professional_id: "prof-1",
    patient_id: "patient-2",
    start_time: new Date(Date.now() - 86400000).toISOString(), // ontem
    end_time: new Date(Date.now() - 86400000 + 1800000).toISOString(),
    status: "completed",
  },
];

const mockAvailableSlots = [
  { start: "09:00", end: "09:30" },
  { start: "09:30", end: "10:00" },
  { start: "10:30", end: "11:00" },
  { start: "14:00", end: "14:30" },
  { start: "15:00", end: "15:30" },
  { start: "16:00", end: "16:30" },
];

// Simula delay de rede
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mockLogin(email: string, password: string, role: UserRole) {
  await delay(300);
  
  if (!email || !password) {
    throw new Error("E-mail e senha são obrigatórios");
  }
  
  // Mock: aceita qualquer login válido
  return { access_token: `mock-token-${role}-${email}` };
}

export async function mockGetMyAppointments(token: string): Promise<Appointment[]> {
  await delay(200);
  // Filtra agendamentos do paciente logado
  return mockAppointments.filter(a => a.patient_id === "patient-1");
}

export async function mockGetProviderAppointments(token: string, start: string, end: string): Promise<Appointment[]> {
  await delay(200);
  // Retorna todos os agendamentos do período
  return mockAppointments.filter(a => {
    const appointmentDate = new Date(a.start_time);
    return appointmentDate >= new Date(start) && appointmentDate <= new Date(end);
  });
}

export async function mockSaveAgendaConfig(
  token: string,
  payload: {
    slot_duration: number;
    buffer_time: number;
    cancellation_deadline_hours: number;
    work_hours: Record<string, unknown>;
  }
) {
  await delay(300);
  console.log("Configuração salva:", payload);
  return { success: true, ...payload };
}

export async function mockGetAvailableSlots(professionalId: string, date: string): Promise<typeof mockAvailableSlots> {
  await delay(300);
  // Retorna slots mock para a data solicitada
  return mockAvailableSlots;
}

export async function mockCreateAppointment(
  token: string,
  payload: {
    professional_id: string;
    start_time: string;
    end_time: string;
  }
): Promise<Appointment> {
  await delay(400);
  const newAppointment: Appointment = {
    id: String(Date.now()),
    professional_id: payload.professional_id,
    patient_id: "patient-1",
    start_time: payload.start_time,
    end_time: payload.end_time,
    status: "scheduled",
  };
  mockAppointments.push(newAppointment);
  return newAppointment;
}

export async function mockCancelAppointment(token: string, appointmentId: string): Promise<{ success: boolean }> {
  await delay(300);
  const index = mockAppointments.findIndex(a => a.id === appointmentId);
  if (index === -1) {
    throw new Error("Agendamento não encontrado");
  }
  mockAppointments[index].status = "canceled";
  return { success: true };
}

export async function mockRescheduleAppointment(
  token: string,
  appointmentId: string,
  newStartTime: string,
  newEndTime: string
): Promise<Appointment> {
  await delay(400);
  const index = mockAppointments.findIndex(a => a.id === appointmentId);
  if (index === -1) {
    throw new Error("Agendamento não encontrado");
  }
  mockAppointments[index].start_time = newStartTime;
  mockAppointments[index].end_time = newEndTime;
  return mockAppointments[index];
}

export async function mockGetProviders(): Promise<{ id: string; name: string; email: string; specialty?: string }[]> {
  await delay(200);
  return [
    { id: "prof-1", name: "Dr. Silva", email: "dr.silva@exemplo.com", specialty: "Cardiologia" },
    { id: "prof-2", name: "Dra. Santos", email: "dra.santos@exemplo.com", specialty: "Dermatologia" },
    { id: "prof-3", name: "Dr. Oliveira", email: "dr.oliveira@exemplo.com", specialty: "Ortopedia" },
  ];
}
