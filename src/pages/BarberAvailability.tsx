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
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PersonIcon from '@mui/icons-material/Person'
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
import { businessNow } from '../utils/businessTime'

dayjs.locale('es')

type SelectedBookingSlot = {
  start: string
  display: string
}

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
  const today = useMemo(() => businessNow().startOf('day'), [])
  const currentMonthEnd = useMemo(() => today.endOf('month'), [today])
  const adminMinDate = useMemo(() => today.subtract(3, 'month'), [today])
  const adminMaxDate = useMemo(() => today.add(3, 'month'), [today])
  const clientMaxDate = useMemo(() => {
    const oneWeekAhead = today.add(7, 'day')
    return oneWeekAhead.isBefore(currentMonthEnd) ? oneWeekAhead : currentMonthEnd
  }, [currentMonthEnd, today])
  const minSelectableDate = isAdmin ? adminMinDate : today
  const maxSelectableDate = isAdmin ? adminMaxDate : clientMaxDate

  // ── states ──
  const [barber, setBarber] = useState<Barber | null>(null)
  const [loadingBarber, setLoadingBarber] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedDate, setSelectedDate] = useState<Dayjs>(() => businessNow())
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null)
  const [loadingActiveAppointment, setLoadingActiveAppointment] = useState(true)
  const [scheduledDates, setScheduledDates] = useState<Set<string>>(() => new Set())
  const [selectedBookingSlot, setSelectedBookingSlot] = useState<SelectedBookingSlot | null>(null)

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
      const datesWithSchedule = schedules
        .filter((schedule) => {
          const scheduleBarberId =
            typeof schedule.barberId === 'object' && schedule.barberId !== null
              ? schedule.barberId._id
              : schedule.barberId
          const scheduleDate = dayjs(schedule.date).startOf('day')

          return (
            scheduleBarberId === id &&
            !schedule.isDayOff &&
            !scheduleDate.isBefore(minSelectableDate, 'day') &&
            !scheduleDate.isAfter(maxSelectableDate, 'day')
          )
        })
        .map((schedule) => dayjs(schedule.date).format('YYYY-MM-DD'))

      setScheduledDates(new Set(datesWithSchedule))
    } catch (err) {
      console.error('Error loading calendar overview:', err)
      setScheduledDates(new Set())
    } finally {
      setLoadingCalendar(false)
    }
  }, [id, maxSelectableDate, minSelectableDate])

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
      date.isBefore(minSelectableDate, 'day') ||
      date.isAfter(maxSelectableDate, 'day') ||
      (!isAdmin && !date.isSame(today, 'month'))
    )
  }, [isAdmin, maxSelectableDate, minSelectableDate, today])

  const AvailabilityPickerDay = useCallback((dayProps: PickerDayProps) => {
    const dateKey = dayjs(dayProps.day).format('YYYY-MM-DD')
    const statusClass = scheduledDates.has(dateKey) ? 'availability-day-available' : ''
    const className = [dayProps.className, statusClass].filter(Boolean).join(' ')

    return <PickerDay {...dayProps} className={className} />
  }, [scheduledDates])

  // ── 1-hour block formatter ──
  const getBlockTimeRange = useCallback((slot: string) => {
    const [hours, minutes] = slot.split(':').map(Number)
    const startTime = businessNow().hour(hours).minute(minutes).second(0)
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

  const handleSelectSlot = async (slot: string, timeRangeDisplay: string) => {
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

    setSelectedBookingSlot({ start: slot, display: timeRangeDisplay })
  }

  // ── book appointment after the explicit confirmation step ──
  const handleConfirmBooking = async () => {
    if (!barber || !id || !selectedBookingSlot) return

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
      await createAppointment(id, selectedDate.format('YYYY-MM-DD'), selectedBookingSlot.start)
      
      await Swal.fire({
        title: '¡Cita Agendada!',
        text: 'Tu cita ha sido confirmada y agendada correctamente.',
        icon: 'success',
        confirmButtonColor: '#2f6b5f',
        background: '#ffffff',
        color: '#18201d',
      })

      navigate('/dashboard', { replace: true })

    } catch (err) {
      const bookingError = getBookingErrorInfo(err)

      if (bookingError.shouldRefreshAvailability) {
        setSelectedBookingSlot(null)
        await loadSlotsForDate(selectedDate)
      }

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
      <Box className="availability-top-bar">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <CalendarMonthIcon sx={{ color: 'primary.main', fontSize: { xs: 24, sm: 28 } }} />
          <Box className="availability-title-group">
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: 'primary.dark', fontSize: { xs: 18, sm: 20 } }}
            >
              Reserva
            </Typography>
            <Typography variant="body2" className="availability-step-instruction">
              {selectedBookingSlot
                ? 'Confirma los datos de tu reserva'
                : 'Selecciona una fecha y un horario disponible'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {user && (
            <Chip
              icon={<PersonIcon sx={{ fontSize: '16px !important' }} />}
              label={user.name}
              variant="outlined"
              size="small"
              sx={{
                borderColor: 'rgba(178,121,76,0.35)',
                fontWeight: 600,
                color: 'primary.dark',
                fontSize: { xs: 11, sm: 13 },
                height: 28,
                borderRadius: 1,
              }}
            />
          )}
        </Box>
      </Box>

      <Container
        maxWidth="md"
        className="availability-container"
        sx={{
          pt: { xs: 1.5, sm: 2 },
          pb: { xs: 2, sm: 4 },
          px: { xs: 2, sm: 4 },
          maxWidth: 'var(--shell-max-width) !important',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
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
                <Button
                  className="availability-back-button"
                  size="small"
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate('/dashboard')}
                  sx={{
                    borderColor: 'rgba(47,107,95,0.35)',
                    color: 'primary.dark',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': {
                      bgcolor: 'primary.light',
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  Volver a Reserva
                </Button>
              </Box>

              <Stepper
                activeStep={selectedBookingSlot ? 2 : 1}
                alternativeLabel
                className="availability-stepper"
              >
                {['Barbero', 'Fecha y horario', 'Confirmar'].map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

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

              {selectedBookingSlot ? (
                <Box className="availability-confirmation">
                  <Typography variant="h6" className="availability-confirmation-title">
                    Confirma los datos de tu reserva
                  </Typography>

                  <Box className="availability-confirmation-details">
                    <Box className="availability-confirmation-detail">
                      <span>Barbero</span>
                      <strong>{barber.name}</strong>
                    </Box>
                    <Box className="availability-confirmation-detail">
                      <span>Fecha</span>
                      <strong>{selectedDate.format('dddd D [de] MMMM, YYYY')}</strong>
                    </Box>
                    <Box className="availability-confirmation-detail">
                      <span>Horario</span>
                      <strong>{selectedBookingSlot.display}</strong>
                    </Box>
                  </Box>

                  <Box className="availability-confirmation-actions">
                    <Button
                      variant="outlined"
                      onClick={() => setSelectedBookingSlot(null)}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Cambiar horario
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleConfirmBooking}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Confirmar reserva
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box className="availability-booking-grid">
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
                          minDate={minSelectableDate}
                          maxDate={maxSelectableDate}
                          fixedWeekNumber={6}
                        showDaysOutsideCurrentMonth
                        shouldDisableDate={shouldDisableDate}
                        slots={{ day: AvailabilityPickerDay }}
                        sx={{ width: '100%', maxWidth: 380, mx: 'auto' }}
                      />
                    </LocalizationProvider>

                    <Box className="availability-calendar-legend">
                      <span><i className="legend-dot legend-dot-available" />Con agenda disponible</span>
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
                <Box className="availability-slots-section">
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
                                  handleSelectSlot(blockInfo.start, blockInfo.display)
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
                </Box>
              )}
            </Paper>
          </Fade>
        ) : null}
      </Container>
    </Box>
  )
}
