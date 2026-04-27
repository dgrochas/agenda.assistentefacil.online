import type { Appointment, UserRole } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

export async function apiFetch<T>(path: string, token?: string, options?: RequestInit): Promise<T> {
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
  return apiFetch<{ access_token: string }>("/auth/token", undefined, {
    method: "POST",
    body: JSON.stringify({ email, password, role }),
  });
}

export async function getMyAppointments(token: string) {
  return apiFetch<Appointment[]>("/appointments/me", token);
}

export async function getProviderAppointments(token: string, start: string, end: string) {
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
  return apiFetch("/agenda-config/me", token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
