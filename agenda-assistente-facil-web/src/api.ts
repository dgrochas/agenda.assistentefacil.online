import type { Appointment, UserRole, EventType } from "./types";
import {
  mockLogin,
  mockGetMyAppointments,
  mockGetProviderAppointments,
  mockSaveAgendaConfig,
  mockGetAvailableSlots,
  mockCreateAppointment,
  mockCancelAppointment,
  mockRescheduleAppointment,
  mockGetProviders,
} from "./mockApi";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true" || true; // Default para mock

async function apiFetch<T>(path: string, token?: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Erro na API");
  }
  return (await response.json()) as T;
}

export async function login(email: string, password: string, role: UserRole) {
  if (USE_MOCK) {
    return mockLogin(email, password, role);
  }
  return apiFetch<{ access_token: string }>("/auth/token", undefined, {
    method: "POST",
    body: JSON.stringify({ email, password, role }),
  });
}

export async function getMyAppointments(token: string) {
  if (USE_MOCK) {
    return mockGetMyAppointments(token);
  }
  return apiFetch<Appointment[]>("/appointments/me", token);
}

export async function getProviderAppointments(token: string, start: string, end: string) {
  if (USE_MOCK) {
    return mockGetProviderAppointments(token, start, end);
  }
  const query = new URLSearchParams({ start, end }).toString();
  return apiFetch<Appointment[]>(`/appointments/provider/me?${query}`, token);
}

export async function saveAgendaConfig(
  token: string,
  payload: {
    slot_duration: number;
    buffer_time: number;
    cancellation_deadline_hours: number;
    work_hours: Record<string, unknown>;
  }
) {
  if (USE_MOCK) {
    return mockSaveAgendaConfig(token, payload);
  }
  return apiFetch("/agenda-config/me", token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getAvailableSlots(professionalId: string, date: string) {
  if (USE_MOCK) {
    return mockGetAvailableSlots(professionalId, date);
  }
  return apiFetch<{ start: string; end: string }[]>(`/slots/${professionalId}?date=${date}`);
}

export async function createAppointment(
  token: string,
  payload: {
    professional_id: string;
    start_time: string;
    end_time: string;
    patient_id?: string;
    title?: string;
    description?: string;
  }
) {
  if (USE_MOCK) {
    return mockCreateAppointment(token, payload);
  }
  return apiFetch<Appointment>("/appointments", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createPersonalBlock(
  token: string,
  payload: {
    start_time: string;
    end_time: string;
    title?: string;
    description?: string;
  }
) {
  return apiFetch<Appointment>("/appointments/personal-block", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createAppointmentForPatient(
  token: string,
  payload: {
    start_time: string;
    end_time: string;
    patient_id: string;
    title?: string;
    description?: string;
  }
) {
  return apiFetch<Appointment>("/appointments/for-patient", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Event Types API
export async function getEventTypes(token: string) {
  return apiFetch<EventType[]>("/appointments/event-types", token);
}

export async function getActiveEventTypes(token: string) {
  return apiFetch<EventType[]>("/appointments/event-types/active", token);
}

export async function createEventType(
  token: string,
  payload: {
    title: string;
    description?: string;
    duration_minutes: number;
    color?: string;
  }
) {
  return apiFetch<EventType>("/appointments/event-types", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateEventType(
  token: string,
  eventTypeId: string,
  payload: {
    title?: string;
    description?: string;
    duration_minutes?: number;
    color?: string;
    is_active?: boolean;
  }
) {
  return apiFetch<EventType>(`/appointments/event-types/${eventTypeId}`, token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteEventType(token: string, eventTypeId: string) {
  return apiFetch<void>(`/appointments/event-types/${eventTypeId}`, token, {
    method: "DELETE",
  });
}

export async function cancelAppointment(token: string, appointmentId: string) {
  if (USE_MOCK) {
    return mockCancelAppointment(token, appointmentId);
  }
  return apiFetch<{ success: boolean }>(`/appointments/${appointmentId}/cancel`, token, {
    method: "POST",
  });
}

export async function rescheduleAppointment(
  token: string,
  appointmentId: string,
  newStartTime: string,
  newEndTime: string
) {
  if (USE_MOCK) {
    return mockRescheduleAppointment(token, appointmentId, newStartTime, newEndTime);
  }
  return apiFetch<Appointment>(`/appointments/${appointmentId}/reschedule`, token, {
    method: "POST",
    body: JSON.stringify({ new_start_time: newStartTime, new_end_time: newEndTime }),
  });
}

export async function getProviders() {
  if (USE_MOCK) {
    return mockGetProviders();
  }
  return apiFetch<{ id: string; name: string; email: string }[]>("/providers");
}
