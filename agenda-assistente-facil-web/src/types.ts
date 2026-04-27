export type UserRole = "provider" | "customer";

export type Appointment = {
  id: string;
  professional_id: string;
  patient_id: string;
  start_time: string;
  end_time: string;
  status: "scheduled" | "canceled" | "completed";
};
