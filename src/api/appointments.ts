import { apiClient } from './client'
import type { Barber } from './barber'

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type AppointmentCancellationActor = 'user' | 'admin'

export type AppointmentUser = {
  _id: string
  name: string
  email: string
  role: string
}

export interface AdminAppointment {
  _id: string
  date: string
  timeSlot: string
  status: AppointmentStatus
  cancelledBy?: AppointmentCancellationActor
  cancelledAt?: string
  archivedAt?: string
  archivedBy?: string
  barberId: string | Barber
  clientId: string | AppointmentUser
}

export async function fetchAdminAppointments(includeArchived = false): Promise<AdminAppointment[]> {
  const { data } = await apiClient.get<AdminAppointment[]>('/appointments', includeArchived ? { params: { includeArchived: true } } : undefined)
  return data
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
): Promise<AdminAppointment> {
  const { data } = await apiClient.patch<AdminAppointment>(`/appointments/${appointmentId}`, {
    status,
  })
  return data
}

export async function archiveAppointment(appointmentId: string): Promise<void> {
  await apiClient.delete(`/appointments/${appointmentId}`)
}
