import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Fade from '@mui/material/Fade'
import Chip from '@mui/material/Chip'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { PickerDay, type PickerDayProps } from '@mui/x-date-pickers/PickerDay'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/es'
import Swal from 'sweetalert2'
import '../styles/BarberAvailability.css'

import {
  fetchBarbers,
  fetchAvailableSlots,
  fetchBarberSchedules,
  fetchMyActiveAppointment,
  createAppointment,
  type Appointment,
  type AvailabilitySlot,
  type Barber,
} from '../api/barber'
import { getAuthUser } from '../auth/session'

dayjs.locale('es')

type CalendarDayStatus = 'available' | 'full'

const appointmentStatusLabel: Record<Appointment['status'], string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
}

function getAppointmentBarberName(appointment: Appointment) {
  return typeof appointment.barberId === 'object' && appointment.barberId !== null
    ? appointment.barberId.name
    : 'Barbero asignado'
}

type BookingErrorInfo = {
  title: string
  message: string
  shouldRefreshAvailability: boolean
}

function getBookingErrorInfo(error: unknown): BookingErrorInfo {
  const response = (error as { response?: { status?: number; data?: { message?: string } } })?.response
  const backendMessage = response?.data?.message

  if (response?.status === 409) {
    if (backendMessage?.startsWith('Ya tienes una reserva activa')) {
      return {
        title: 'Ya tienes una reserva activa',
        message: backendMessage,
        shouldRefreshAvailability: false,
      }
    }

    if (backendMessage === 'This time slot is already occupied') {
      return {
        title: 'Horario no disponible',
        message: 'Este horario acaba de ser tomado. Actualizamos la disponibilidad para que elijas otro bloque.',
        shouldRefreshAvailability: true,
      }
    }

    if (backendMessage?.startsWith('Barber with ID') || backendMessage?.startsWith('Time slot')) {
      return {
        title: 'Bloque no disponible',
        message: 'Este bloque ya no está disponible para la fecha seleccionada. Revisa los horarios actualizados.',
        shouldRefreshAvailability: true,
      }
    }
  }

  return {
    title: 'No se pudo agendar',
    message: backendMessage ?? (error instanceof Error ? error.message : 'Error inesperado al agendar.'),
    shouldRefreshAvailability: false,
  }
}

export default function BarberAvailability() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = getAuthUser()
  const isAdmin = user?.role === 'admin'
  const today = useMemo(() => dayjs().startOf('day'), [])
  const currentMonthStart = useMemo(() => today.startOf('month'), [today])
  const currentMonthEnd = useMemo(() => today.endOf('month'), [today])
  const clientMaxDate = useMemo(() => {
    const oneWeekAhead = today.add(7, 'day')
    return oneWeekAhead.isBefore(currentMonthEnd) ? oneWeekAhead : currentMonthEnd
  }, [currentMonthEnd, today])
  const maxSelectableDate = isAdmin ? currentMonthEnd : clientMaxDate

  // ── states ──
  const [barber, setBarber] = useState<Barber | null>(null)
  const [loadingBarber, setLoadingBarber] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs())
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null)
  const [loadingActiveAppointment, setLoadingActiveAppointment] = useState(false)
  const [calendarStatuses, setCalendarStatuses] = useState<Record<string, CalendarDayStatus>>({})

  // ── session protection ──
  useEffect(() => {
    if (!localStorage.getItem('auth_token')) {
      navigate('/login')
    }
  }, [navigate])

  useEffect(() => {
    let active = true

    if (!localStorage.getItem('auth_token')) {
      return () => {
        active = false
      }
    }

    const timer = setTimeout(() => {
      setLoadingActiveAppointment(true)
      fetchMyActiveAppointment()
        .then((appointment) => {
          if (active) setActiveAppointment(appointment)
        })
        .catch((err) => {
          console.error('Error cargando cita activa:', err)
          if (active) setActiveAppointment(null)
        })
        .finally(() => {
          if (active) setLoadingActiveAppointment(false)
        })
    }, 0)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [])

  // ── load barber info ──
  useEffect(() => {
    let active = true
    const load = async () => {
      await Promise.resolve()
      if (!active) return
      setLoadingBarber(true)
      try {
        const data = await fetchBarbers()
        if (!active) return
        const found = data.find((b) => b._id === id)
        if (found) {
          setBarber(found)
        } else {
          setError('Barbero no encontrado o inactivo.')
        }
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Error cargando barbero')
      } finally {
        if (active) setLoadingBarber(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [id])

  // ── slots fetch handler ──
  const loadSlotsForDate = useCallback(async (date: Dayjs) => {
    if (!id) return
    await Promise.resolve()
    setLoadingSlots(true)
    try {
      const resp = await fetchAvailableSlots(id, date.format('YYYY-MM-DD'))
      setSlots(resp.slots ?? resp.availableSlots.map((time) => ({ time, status: 'available' })))
    } catch (err) {
      console.error('Error fetching availability:', err)
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }, [id])

  const loadCalendarOverview = useCallback(async () => {
    if (!id) return

    setLoadingCalendar(true)
    try {
      const schedules = await fetchBarberSchedules()
      const lookupStart = today.isAfter(currentMonthStart) ? today : currentMonthStart
      const scheduledDates = schedules
        .filter((schedule) => {
          const scheduleBarberId =
            typeof schedule.barberId === 'object' && schedule.barberId !== null
              ? schedule.barberId._id
              : schedule.barberId
          const scheduleDate = dayjs(schedule.date).startOf('day')

          return (
            scheduleBarberId === id &&
            !schedule.isDayOff &&
            !scheduleDate.isBefore(lookupStart, 'day') &&
            !scheduleDate.isAfter(maxSelectableDate, 'day')
          )
        })
        .map((schedule) => dayjs(schedule.date).format('YYYY-MM-DD'))

      const uniqueDates = Array.from(new Set(scheduledDates))
      const availabilityEntries = await Promise.all(
        uniqueDates.map(async (date) => {
          const response = await fetchAvailableSlots(id, date)
          const status: CalendarDayStatus = response.availableSlots.length > 0 ? 'available' : 'full'
          return [date, status] as const
        }),
      )

      setCalendarStatuses(Object.fromEntries(availabilityEntries))
    } catch (err) {
      console.error('Error loading calendar overview:', err)
      setCalendarStatuses({})
    } finally {
      setLoadingCalendar(false)
    }
  }, [currentMonthStart, id, maxSelectableDate, today])

  // ── fetch current day availability by default on mount, and automatically on selectedDate changes ──
  useEffect(() => {
    if (id) {
      const timer = setTimeout(() => {
        loadSlotsForDate(selectedDate)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [id, selectedDate, loadSlotsForDate])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCalendarOverview()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadCalendarOverview])

  const handleDateChange = useCallback((date: Dayjs | null) => {
    if (date) {
      setSelectedDate(date)
    }
  }, [])

  const shouldDisableDate = useCallback((date: Dayjs) => {
    return (
      date.isBefore(today, 'day') ||
      date.isAfter(maxSelectableDate, 'day') ||
      !date.isSame(today, 'month')
    )
  }, [maxSelectableDate, today])

  const AvailabilityPickerDay = useCallback((dayProps: PickerDayProps) => {
    const dateKey = dayjs(dayProps.day).format('YYYY-MM-DD')
    const status = calendarStatuses[dateKey]
    const statusClass = status ? `availability-day-${status}` : ''
    const className = [dayProps.className, statusClass].filter(Boolean).join(' ')

    return <PickerDay {...dayProps} className={className} />
  }, [calendarStatuses])

  // ── 1-hour block formatter ──
  const getBlockTimeRange = useCallback((slot: string) => {
    const [hours, minutes] = slot.split(':').map(Number)
    const startTime = dayjs().hour(hours).minute(minutes).second(0)
    const endTime = startTime.add(1, 'hour')
    return {
      start: slot,
      end: endTime.format('HH:mm'),
      display: `${slot} – ${endTime.format('HH:mm')}`
    }
  }, [])

  const getSlotStatusLabel = useCallback((status: AvailabilitySlot['status']) => {
    if (status === 'occupied') return 'Ocupado'
    if (status === 'expired') return 'Vencido'
    return 'Disponible'
  }, [])

  // ── book appointment with SweetAlert2 ──
  const handleBookSlot = async (slot: string, timeRangeDisplay: string) => {
    if (!barber || !id) return

    if (activeAppointment) {
      await Swal.fire({
        title: 'Ya tienes una reserva activa',
        text: 'Debes completar o cancelar tu cita actual antes de programar una nueva.',
        icon: 'info',
        confirmButtonColor: '#2f6b5f',
        background: '#ffffff',
        color: '#18201d',
      })
      return
    }

    const dateFormatted = selectedDate.format('dddd D [de] MMMM, YYYY')
    const summary = [
      `Barbero: ${barber.name}`,
      `Fecha: ${dateFormatted}`,
      `Bloque de Hora: ${timeRangeDisplay}`,
    ].join('\n')

    // 1. Confirm dialog
    const confirmResult = await Swal.fire({
      title: '¿Confirmar tu Cita?',
      text: summary,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2f6b5f',
      cancelButtonColor: '#5d6762',
      confirmButtonText: 'Sí, agendar al instante',
      cancelButtonText: 'Cancelar',
      background: '#ffffff',
      color: '#18201d',
    })

    if (!confirmResult.isConfirmed) return

    // 2. Loading state popup
    Swal.fire({
      title: 'Agendando cita...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      background: '#ffffff',
      color: '#18201d',
      didOpen: () => {
        Swal.showLoading()
      },
    })

    try {
      await createAppointment(id, selectedDate.format('YYYY-MM-DD'), slot)
      
      // 3. Success dialog
      await Swal.fire({
        title: '¡Cita Agendada!',
        text: 'Tu cita ha sido confirmada y agendada correctamente.',
        icon: 'success',
        confirmButtonColor: '#2f6b5f',
        background: '#ffffff',
        color: '#18201d',
      })

      // Reload available slots so the booked slot is immediately removed from the interface
      await loadSlotsForDate(selectedDate)
      loadCalendarOverview()
      const appointment = await fetchMyActiveAppointment()
      setActiveAppointment(appointment)

    } catch (err) {
      const bookingError = getBookingErrorInfo(err)

      if (bookingError.shouldRefreshAvailability) {
        await loadSlotsForDate(selectedDate)
        loadCalendarOverview()
      }

      // 4. Error dialog
      await Swal.fire({
        title: bookingError.title,
        text: bookingError.message,
        icon: 'error',
        confirmButtonColor: '#2f6b5f',
        background: '#ffffff',
        color: '#18201d',
      })
    }
  }

  // ── render ──
  return (
    <Box className="availability-bg">
      <Container maxWidth="md" className="availability-container" sx={{ py: { xs: 2, sm: 6 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Back Button */}
        <Button
          size="small"
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{
            mb: { xs: 2, sm: 4 },
            alignSelf: 'flex-start',
              borderColor: 'rgba(47,107,95,0.35)',
            color: 'primary.dark',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': {
              bgcolor: 'primary.light',
              borderColor: 'primary.main',
            }
          }}
        >
          Volver a Reserva
        </Button>

        {error && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: 1 }}>
            {error}
          </Alert>
        )}

        {loadingBarber ? (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              backdropFilter: 'blur(12px)',
              background: 'rgba(251,247,242,0.85)',
              mb: 4,
            }}
          >
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <Skeleton variant="circular" width={60} height={60} />
              <Box sx={{ flex: 1 }}>
                <Skeleton width="40%" height={24} sx={{ mb: 1 }} />
                <Skeleton width="60%" height={16} />
              </Box>
            </Box>
          </Paper>
        ) : barber ? (
          <Fade in timeout={500}>
            <Paper elevation={0} className="availability-card">
              {/* Barber Details Header (Name only inside an elegant tag/label, no email or phone) */}
              <Box className="availability-header-label">
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Barbero:
                </Typography>
                <Chip
                  label={barber.name}
                  color="primary"
                  sx={{
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    height: 36,
                    borderRadius: 1,
                  boxShadow: '0 4px 12px rgba(30, 74, 67, 0.2)',
                  }}
                />
              </Box>

              {(loadingActiveAppointment || activeAppointment) && (
                <Box className="availability-active-appointment-card">
                  {loadingActiveAppointment ? (
                    <>
                      <Skeleton width="42%" height={22} />
                      <Skeleton width="78%" height={18} />
                    </>
                  ) : activeAppointment ? (
                    <>
                      <Box className="availability-active-main">
                        <Box className="availability-active-heading">
                          <Box className="availability-active-icon">
                            <CalendarMonthIcon fontSize="small" />
                          </Box>
                          <Box>
                            <Typography variant="overline" className="availability-active-kicker">
                              Cita vigente
                            </Typography>
                            <Typography variant="subtitle1" className="availability-active-title">
                              Reserva activa
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      <Box className="availability-active-details">
                        <Box className="availability-active-detail">
                          <span>Barbero</span>
                          <strong>{getAppointmentBarberName(activeAppointment)}</strong>
                        </Box>
                        <Box className="availability-active-detail">
                          <span>Fecha</span>
                          <strong>{dayjs(activeAppointment.date).format('dddd D [de] MMMM')}</strong>
                        </Box>
                        <Box className="availability-active-detail">
                          <span>Hora</span>
                          <strong>{activeAppointment.timeSlot}</strong>
                        </Box>
                        <Box className="availability-active-detail">
                          <span>Estado</span>
                          <Chip
                            label={appointmentStatusLabel[activeAppointment.status]}
                            size="small"
                            className={`availability-active-status availability-active-status-${activeAppointment.status}`}
                          />
                        </Box>
                      </Box>
                    </>
                  ) : null}
                </Box>
              )}

              {/* Date Selection Section */}
              <Box className="availability-calendar-section">
                <Box className="availability-calendar-header">
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.dark', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarMonthIcon color="primary" />
                    Fecha de cita
                  </Typography>
                </Box>

                <Box className="availability-calendar-card">
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                    <DateCalendar
                      value={selectedDate}
                      onChange={handleDateChange}
                      referenceDate={today}
                      minDate={today}
                      maxDate={maxSelectableDate}
                      disablePast
                      fixedWeekNumber={6}
                      showDaysOutsideCurrentMonth
                      shouldDisableDate={shouldDisableDate}
                      slots={{ day: AvailabilityPickerDay }}
                      sx={{ width: '100%', maxWidth: 380, mx: 'auto' }}
                    />
                  </LocalizationProvider>

                  <Box className="availability-calendar-legend">
                    <span><i className="legend-dot legend-dot-available" />Con agenda disponible</span>
                    <span><i className="legend-dot legend-dot-full" />Agenda llena</span>
                    {loadingCalendar && (
                      <span className="calendar-loading-label">
                        <CircularProgress size={12} />
                        Actualizando
                      </span>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Available Slots Section (Rendered inline on the same page) */}
              <Box className="availability-slots-section" sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.dark', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon color="primary" />
                  Horarios
                </Typography>

                {loadingSlots || loadingActiveAppointment ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5, gap: 2 }}>
                    <CircularProgress size={40} />
                    <Typography variant="body2" color="text.secondary">
                      Consultando disponibilidad...
                    </Typography>
                  </Box>
                ) : slots.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 5, px: 2, bgcolor: 'rgba(47,107,95,0.05)', borderRadius: 1, border: '1px dashed rgba(47,107,95,0.22)' }}>
                    <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 600, mb: 0.8 }}>
                      Sin bloques configurados para esta fecha
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      El barbero no cuenta con bloques de agenda para el {selectedDate.format('dddd D [de] MMMM')}. Por favor, elige otro día en el selector superior.
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Box className="availability-slots-grid">
                      {slots.map((slot) => {
                        const blockInfo = getBlockTimeRange(slot.time)
                        const isAvailable = slot.status === 'available'
                        const isBookingDisabled = !isAvailable || !!activeAppointment
                        return (
                          <Button
                            key={slot.time}
                            variant="outlined"
                            className={`availability-slot-button availability-slot-${slot.status}`}
                            disabled={isBookingDisabled}
                            onClick={() => {
                              if (!isBookingDisabled) {
                                handleBookSlot(blockInfo.start, blockInfo.display)
                              }
                            }}
                            sx={{
                              borderRadius: 1,
                              fontWeight: 600,
                              fontSize: 14,
                              py: 1.8,
                               borderColor: 'rgba(47,107,95,0.32)',
                              color: 'primary.dark',
                              bgcolor: '#fff',
                              textTransform: 'none',
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                bgcolor: 'primary.light',
                                borderColor: 'primary.main',
                                transform: 'translateY(-2px)',
                                 boxShadow: '0 4px 12px rgba(30,74,67,0.18)',
                              },
                            }}
                          >
                            <span className="slot-time-label">{blockInfo.display}</span>
                            <span className="slot-status-label">
                              {getSlotStatusLabel(slot.status)}
                            </span>
                          </Button>
                        )
                      })}
                    </Box>
                  </Box>
                )}
              </Box>
            </Paper>
          </Fade>
        ) : null}
      </Container>
    </Box>
  )
}
