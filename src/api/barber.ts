import { apiClient } from './client'

type CacheEntry<T> = {
  expiresAt: number
  promise: Promise<T>
}

const BARBERS_CACHE_KEY = 'barbers'
const SCHEDULES_CACHE_KEY = 'barber-schedules'
const ACTIVE_APPOINTMENT_CACHE_KEY = 'appointments:me:active'
const BARBERS_TTL_MS = 5 * 60 * 1000
const SCHEDULES_TTL_MS = 60 * 1000
const AVAILABILITY_TTL_MS = 0
const ACTIVE_APPOINTMENT_TTL_MS = 0
const APPOINTMENTS_TTL_MS = 0

const getCache = new Map<string, CacheEntry<unknown>>()

function getCached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  if (ttlMs <= 0) {
    return loader()
  }

  const now = Date.now()
  const cached = getCache.get(key) as CacheEntry<T> | undefined

  if (cached && cached.expiresAt > now) {
    return cached.promise
  }

  const promise = loader().catch((error) => {
    getCache.delete(key)
    throw error
  })

  getCache.set(key, {
    expiresAt: now + ttlMs,
    promise,
  })

  return promise
}

function invalidateCache(keys: string[]) {
  keys.forEach((key) => getCache.delete(key))
}

function invalidateAvailability(barberId?: string, date?: string) {
  if (barberId && date) {
    getCache.delete(getAvailabilityCacheKey(barberId, date))
    return
  }

  Array.from(getCache.keys())
    .filter((key) => key.startsWith('availability:'))
    .forEach((key) => getCache.delete(key))
}

function getAvailabilityCacheKey(barberId: string, date: string) {
  return `availability:${barberId}:${date}`
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
  occupiedSlots?: string[]
  expiredSlots?: string[]
  slots?: AvailabilitySlot[]
}

export interface AvailabilitySlot {
  time: string
  status: 'available' | 'occupied' | 'expired'
}

export interface Appointment {
  _id: string
  clientId: string | {
    _id: string
    name: string
    email: string
    role: string
  }
  barberId: string | Barber
  date: string
  timeSlot: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
}

/* ── API calls ── */

/** List all barbers */
export async function fetchBarbers(): Promise<Barber[]> {
  return getCached(BARBERS_CACHE_KEY, BARBERS_TTL_MS, async () => {
    const { data } = await apiClient.get<Barber[]>('/barbers')
    return data
  })
}

/** Get available slots for a barber on a specific date */
export async function fetchAvailableSlots(
  barberId: string,
  date: string,
): Promise<AvailableSlotsResponse> {
  return getCached(getAvailabilityCacheKey(barberId, date), AVAILABILITY_TTL_MS, async () => {
    const { data } = await apiClient.get<AvailableSlotsResponse>('/appointments/availability', {
      params: { barberId, date },
    })
    return data
  })
}

/** Create a new appointment */
export async function createAppointment(
  barberId: string,
  date: string,
  timeSlot: string,
): Promise<Appointment> {
  try {
    const { data } = await apiClient.post<Appointment>('/appointments', {
      barberId,
      date,
      timeSlot,
    })
    return data
  } finally {
    invalidateCache([ACTIVE_APPOINTMENT_CACHE_KEY])
    invalidateAvailability(barberId, date)
  }
}

/** Get the authenticated client's active appointment, if any */
export async function fetchMyActiveAppointment(): Promise<Appointment | null> {
  return getCached(ACTIVE_APPOINTMENT_CACHE_KEY, ACTIVE_APPOINTMENT_TTL_MS, async () => {
    const { data } = await apiClient.get<Appointment | null>('/appointments/me/active')
    return data
  })
}

/** Cancel the authenticated client's own active appointment */
export async function cancelMyAppointment(appointmentId: string): Promise<Appointment> {
  try {
    const { data } = await apiClient.patch<Appointment>(
      `/appointments/me/${appointmentId}/cancel`,
    )
    return data
  } finally {
    invalidateCache([ACTIVE_APPOINTMENT_CACHE_KEY])
    invalidateAvailability()
  }
}

/** List appointments. Backend restricts this endpoint to admin users. */
export async function fetchAppointments(): Promise<Appointment[]> {
  return getCached('appointments:all', APPOINTMENTS_TTL_MS, async () => {
    const { data } = await apiClient.get<Appointment[]>('/appointments')
    return data
  })
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
  return getCached(SCHEDULES_CACHE_KEY, SCHEDULES_TTL_MS, async () => {
    const { data } = await apiClient.get<BarberSchedule[]>('/barber-schedules')
    return data
  })
}

/** Create a barber schedule */
export async function createBarberSchedule(
  payload: CreateSchedulePayload,
): Promise<BarberSchedule> {
  const { data } = await apiClient.post<BarberSchedule>('/barber-schedules', payload)
  invalidateCache([SCHEDULES_CACHE_KEY])
  invalidateAvailability(payload.barberId, payload.date)
  return data
}

/** Update a barber schedule */
export async function updateBarberSchedule(
  id: string,
  payload: Partial<CreateSchedulePayload>,
): Promise<BarberSchedule> {
  const { data } = await apiClient.patch<BarberSchedule>(`/barber-schedules/${id}`, payload)
  invalidateCache([SCHEDULES_CACHE_KEY])
  invalidateAvailability(payload.barberId, payload.date)
  return data
}

/** Delete a barber schedule */
export async function deleteBarberSchedule(id: string): Promise<void> {
  await apiClient.delete(`/barber-schedules/${id}`)
  invalidateCache([SCHEDULES_CACHE_KEY])
  invalidateAvailability()
}

/** Update a barber (e.g. phone, isActive status) */
export async function updateBarber(
  id: string,
  payload: Partial<Barber>,
): Promise<Barber> {
  const { data } = await apiClient.patch<Barber>(`/barbers/${id}`, payload)
  invalidateCache([BARBERS_CACHE_KEY])
  return data
}

/** Create a new barber */
export async function createBarber(
  payload: Omit<Barber, '_id'>,
): Promise<Barber> {
  const { data } = await apiClient.post<Barber>('/barbers', payload)
  invalidateCache([BARBERS_CACHE_KEY])
  return data
}
