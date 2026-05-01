export type UserRole = "provider" | "customer";

export type AppointmentType = "patient_appointment" | "personal_block";

export type Appointment = {
  id: string;
  professional_id: string;
  patient_id?: string;
  start_time: string;
  end_time: string;
  status: "scheduled" | "canceled" | "completed";
  appointment_type: AppointmentType;
  title?: string;
  description?: string;
};

export type EventType = {
  id: string;
  professional_id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  is_active: boolean;
  color?: string;
};
