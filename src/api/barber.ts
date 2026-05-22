import axios from 'axios'

const API = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

function authHeaders() {
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/* ── Types ── */

export interface Barber {
  _id: string
  name: string
  email: string
  phone: string
  isActive: boolean
}

export interface AvailableSlotsResponse {
  date: string
  barberId: string
  availableSlots: string[]
}

export interface Appointment {
  _id: string
  clientId: string
  barberId: string | Barber
  date: string
  timeSlot: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
}

/* ── API calls ── */

/** List all barbers */
export async function fetchBarbers(): Promise<Barber[]> {
  const { data } = await axios.get<Barber[]>(`${API}/barbers`, {
    headers: authHeaders(),
  })
  return data
}

/** Get available slots for a barber on a specific date */
export async function fetchAvailableSlots(
  barberId: string,
  date: string,
): Promise<AvailableSlotsResponse> {
  const { data } = await axios.get<AvailableSlotsResponse>(
    `${API}/appointments/availability`,
    {
      params: { barberId, date },
      headers: authHeaders(),
    },
  )
  return data
}

/** Create a new appointment */
export async function createAppointment(
  barberId: string,
  date: string,
  timeSlot: string,
): Promise<Appointment> {
  const { data } = await axios.post<Appointment>(
    `${API}/appointments`,
    { barberId, date, timeSlot },
    { headers: authHeaders() },
  )
  return data
}

/* ── Barber Schedules (Admin) ── */

export interface TimeSlot {
  start: string
  end: string
}

export interface BarberSchedule {
  _id: string
  barberId: string | Barber
  date: string
  isDayOff: boolean
  workingHours: TimeSlot[]
  breakTimes: TimeSlot[]
}

export interface CreateSchedulePayload {
  barberId: string
  date: string
  isDayOff?: boolean
  workingHours?: TimeSlot[]
  breakTimes?: TimeSlot[]
}

/** List all barber schedules */
export async function fetchBarberSchedules(): Promise<BarberSchedule[]> {
  const { data } = await axios.get<BarberSchedule[]>(`${API}/barber-schedules`, {
    headers: authHeaders(),
  })
  return data
}

/** Create a barber schedule */
export async function createBarberSchedule(
  payload: CreateSchedulePayload,
): Promise<BarberSchedule> {
  const { data } = await axios.post<BarberSchedule>(
    `${API}/barber-schedules`,
    payload,
    { headers: authHeaders() },
  )
  return data
}

/** Update a barber schedule */
export async function updateBarberSchedule(
  id: string,
  payload: Partial<CreateSchedulePayload>,
): Promise<BarberSchedule> {
  const { data } = await axios.patch<BarberSchedule>(
    `${API}/barber-schedules/${id}`,
    payload,
    { headers: authHeaders() },
  )
  return data
}

/** Delete a barber schedule */
export async function deleteBarberSchedule(id: string): Promise<void> {
  await axios.delete(`${API}/barber-schedules/${id}`, {
    headers: authHeaders(),
  })
}

/** Update a barber (e.g. phone, isActive status) */
export async function updateBarber(
  id: string,
  payload: Partial<Barber>,
): Promise<Barber> {
  const { data } = await axios.patch<Barber>(
    `${API}/barbers/${id}`,
    payload,
    { headers: authHeaders() },
  )
  return data
}

/** Create a new barber */
export async function createBarber(
  payload: Omit<Barber, '_id'>,
): Promise<Barber> {
  const { data } = await axios.post<Barber>(
    `${API}/barbers`,
    payload,
    { headers: authHeaders() },
  )
  return data
}


