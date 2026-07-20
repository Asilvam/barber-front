import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import TextField from '@mui/material/TextField'
import Divider from '@mui/material/Divider'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import EditIcon from '@mui/icons-material/Edit'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ScheduleIcon from '@mui/icons-material/Schedule'
import EventBusyIcon from '@mui/icons-material/EventBusy'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/es'
import '../styles/AdminBarbers.css'

import {
  fetchBarbers,
  fetchAppointments,
  fetchBarberSchedules,
  createBarberSchedule,
  deleteBarberSchedule,
  updateBarber,
  createBarber,
  type Appointment,
  type Barber,
  type BarberSchedule,
  type TimeSlot,
} from '../api/barber'
import { businessDate, businessNow } from '../utils/businessTime'

dayjs.locale('es')

/* ── helpers ── */

function getAuthUser(): { name: string; role: string } | null {
  try {
    const raw = localStorage.getItem('auth_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Helper to generate dates between start and end (inclusive)
function getDatesInRange(start: Dayjs, end: Dayjs): Dayjs[] {
  const dates: Dayjs[] = []
  let current = start.clone().startOf('day')
  const final = end.clone().startOf('day')
  while (current.isBefore(final) || current.isSame(final, 'day')) {
    dates.push(current)
    current = current.add(1, 'day')
  }
  return dates
}



// Generate exact hours on the hour (e.g. 09:00, 10:00) to restrict select options
const HOUR_OPTIONS = Array.from({ length: 24 }).map((_, h) => {
  const hr = String(h).padStart(2, '0')
  return `${hr}:00`
})

const appointmentStatusLabel: Record<Appointment['status'], string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
}

function getAppointmentBarberId(appointment: Appointment) {
  return typeof appointment.barberId === 'object' && appointment.barberId !== null
    ? appointment.barberId._id
    : appointment.barberId
}

function getAppointmentClientLabel(appointment: Appointment) {
  if (typeof appointment.clientId === 'object' && appointment.clientId !== null) {
    return appointment.clientId.name || appointment.clientId.email || 'Cliente'
  }

  return 'Cliente'
}

function getAppointmentClientEmail(appointment: Appointment) {
  return typeof appointment.clientId === 'object' && appointment.clientId !== null
    ? appointment.clientId.email
    : ''
}

function isActiveNonExpiredSchedule(schedule: BarberSchedule): boolean {
  const today = businessNow().startOf('day')
  const scheduleDate = businessDate(schedule.date).startOf('day')
  return !schedule.isDayOff && !scheduleDate.isBefore(today)
}

/* ── component ── */

export default function AdminBarbers() {
  const navigate = useNavigate()
  const user = getAuthUser()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [barbers, setBarbers] = useState<Barber[]>([])
  const [schedules, setSchedules] = useState<BarberSchedule[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null)
  const [selectedBarberId, setSelectedBarberId] = useState<string>('')

  // form dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formBarberId, setFormBarberId] = useState('')
  
  const [formStartDate, setFormStartDate] = useState<Dayjs>(() => businessNow())
  const [formEndDate, setFormEndDate] = useState<Dayjs>(() => businessNow())

  const [formIsDayOff, setFormIsDayOff] = useState(false)
  const [formWorkingHours, setFormWorkingHours] = useState<TimeSlot[]>([
    { start: '09:00', end: '13:00' },
    { start: '14:00', end: '19:00' },
  ])
  const [formBreakTimes, setFormBreakTimes] = useState<TimeSlot[]>([
    { start: '13:00', end: '14:00' },
  ])
  const [submitting, setSubmitting] = useState(false)

  // delete dialog target
  const [deleteTarget, setDeleteTarget] = useState<BarberSchedule | null>(null)

  // calendar states
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(() => businessNow())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Dayjs | null>(() => businessNow())

  // Barber edit dialog states
  const [barberEditOpen, setBarberEditOpen] = useState(false)
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null)
  const [editPhone, setEditPhone] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [savingBarber, setSavingBarber] = useState(false)

  // Barber create dialog states
  const [barberCreateOpen, setBarberCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createPhone, setCreatePhone] = useState('')
  const [createIsActive, setCreateIsActive] = useState(true)
  const [creatingBarber, setCreatingBarber] = useState(false)

  // ── redirect if not admin ──
  useEffect(() => {
    if (!localStorage.getItem('auth_token')) {
      navigate('/login')
      return
    }
    if (user?.role !== 'admin') {
      navigate('/dashboard')
    }
  }, [navigate, user?.role])

  // ── load data ──
  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([fetchBarbers(), fetchBarberSchedules(), fetchAppointments()])
      .then(([b, s, a]) => {
        setBarbers(b)
        setSchedules(s)
        setAppointments(a)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando datos'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    Promise.all([fetchBarbers(), fetchBarberSchedules(), fetchAppointments()])
      .then(([b, s, a]) => {
        if (!ac.signal.aborted) {
          setBarbers(b)
          setSchedules(s)
          setAppointments(a)
        }
      })
      .catch((err) => {
        if (!ac.signal.aborted) setError(err instanceof Error ? err.message : 'Error cargando datos')
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })
    return () => ac.abort()
  }, [])


  // Helper to count schedules for a barber
  const getScheduleCountForBarber = useCallback((barberId: string) => {
    return schedules.filter((s) => {
      const bid = typeof s.barberId === 'object' && s.barberId !== null ? s.barberId._id : s.barberId
      return bid === barberId && isActiveNonExpiredSchedule(s)
    }).length
  }, [schedules])

  const dashboardKpis = useMemo(() => {
    const activeBarbers = barbers.filter((barber) => barber.isActive).length
    const inactiveBarbers = barbers.length - activeBarbers
    const activeAppointments = appointments.filter((appointment) => appointment.status === 'pending' || appointment.status === 'confirmed').length

    return {
      totalBarbers: barbers.length,
      activeBarbers,
      inactiveBarbers,
      totalSchedules: schedules.filter((schedule) => isActiveNonExpiredSchedule(schedule)).length,
      activeAppointments,
    }
  }, [appointments, barbers, schedules])

  // Barber edit handlers
  const handleOpenEditBarber = (barber: Barber) => {
    setEditingBarber(barber)
    setEditPhone(barber.phone || '')
    setEditIsActive(barber.isActive)
    setBarberEditOpen(true)
  }

  const handleSaveBarber = async () => {
    if (!editingBarber) return
    setSavingBarber(true)
    try {
      await updateBarber(editingBarber._id, {
        phone: editPhone,
        isActive: editIsActive,
      })
      setToast({ message: 'Barbero actualizado correctamente', severity: 'success' })
      setBarberEditOpen(false)
      loadData()
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Error al actualizar el barbero',
        severity: 'error',
      })
    } finally {
      setSavingBarber(false)
    }
  }

  // Barber create handlers
  const handleOpenCreateBarber = () => {
    setCreateName('')
    setCreateEmail('')
    setCreatePhone('')
    setCreateIsActive(true)
    setBarberCreateOpen(true)
  }
  const handleSaveCreateBarber = async () => {
    if (!createName.trim()) {
      setToast({ message: 'El nombre es obligatorio', severity: 'error' })
      return
    }
    if (!createEmail.trim()) {
      setToast({ message: 'El correo electrónico es obligatorio', severity: 'error' })
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(createEmail.trim())) {
      setToast({ message: 'El formato del correo electrónico no es válido', severity: 'error' })
      return
    }
    if (!createPhone.trim()) {
      setToast({ message: 'El teléfono es obligatorio', severity: 'error' })
      return
    }

    setCreatingBarber(true)
    try {
      await createBarber({
        name: createName.trim(),
        email: createEmail.trim(),
        phone: createPhone.trim(),
        isActive: createIsActive,
      })
      setToast({ message: 'Barbero creado correctamente', severity: 'success' })
      setBarberCreateOpen(false)
      loadData()
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Error al crear el barbero',
        severity: 'error',
      })
    } finally {
      setCreatingBarber(false)
    }
  }

  // ── form helpers ──
  const openNewSchedule = (prefilledDate?: Dayjs, barberId?: string) => {
    setFormBarberId(barberId || selectedBarberId || (barbers[0]?._id ?? ''))
    const initialDate = prefilledDate || businessNow()
    setFormStartDate(initialDate)
    setFormEndDate(initialDate)
    setFormIsDayOff(false)
    setFormWorkingHours([{ start: '09:00', end: '13:00' }, { start: '14:00', end: '19:00' }])
    setFormBreakTimes([{ start: '13:00', end: '14:00' }])
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formBarberId) return
    setSubmitting(true)

    if (formStartDate.isAfter(formEndDate, 'day')) {
      setToast({ message: 'La fecha "Desde" no puede ser posterior a "Hasta"', severity: 'error' })
      setSubmitting(false)
      return
    }

    // Calculate array of dates based on chosen mode
    const datesToCreate = getDatesInRange(formStartDate, formEndDate)

    if (datesToCreate.length === 0) {
      setToast({ message: 'Selecciona fechas válidas antes de continuar', severity: 'error' })
      setSubmitting(false)
      return
    }

    // Protection to avoid server saturation (max 62 days)
    if (datesToCreate.length > 62) {
      setToast({ message: 'El rango máximo permitido es de 62 días (2 meses)', severity: 'error' })
      setSubmitting(false)
      return
    }

    try {
      // Execute all creations in parallel
      const promises = datesToCreate.map((date) =>
        createBarberSchedule({
          barberId: formBarberId,
          date: date.format('YYYY-MM-DD'),
          isDayOff: formIsDayOff,
          workingHours: formIsDayOff ? [] : formWorkingHours,
          breakTimes: formIsDayOff ? [] : formBreakTimes,
        })
      )

      await Promise.all(promises)

      setToast({
        message: `Horarios creados para ${datesToCreate.length} día(s) exitosamente`,
        severity: 'success',
      })
      setDialogOpen(false)
      loadData()
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : 'Error al crear horario')
      setToast({ message: msg, severity: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteBarberSchedule(deleteTarget._id)
      setToast({ message: 'Horario eliminado', severity: 'success' })
      setDeleteTarget(null)
      loadData()
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Error al eliminar', severity: 'error' })
      setDeleteTarget(null)
    }
  }

  const updateWorkingHour = (i: number, field: 'start' | 'end', v: string) => {
    setFormWorkingHours((p) => p.map((wh, idx) => (idx === i ? { ...wh, [field]: v } : wh)))
  }

  const updateBreakTime = (i: number, field: 'start' | 'end', v: string) => {
    setFormBreakTimes((p) => p.map((bt, idx) => (idx === i ? { ...bt, [field]: v } : bt)))
  }

  const getBarberName = (bid: string | Barber): string => {
    if (typeof bid === 'object' && bid !== null) return bid.name
    return barbers.find((b) => b._id === bid)?.name ?? String(bid).slice(0, 8)
  }

  // Memoized sorted schedules to show the most recent first
  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => dayjs(b.date).diff(dayjs(a.date)))
  }, [schedules])

  // Filtered schedules for the currently selected barber
  const filteredSchedules = useMemo(() => {
    if (!selectedBarberId) return []
    return sortedSchedules.filter((s) => {
      const bid = typeof s.barberId === 'object' && s.barberId !== null ? s.barberId._id : s.barberId
      return bid === selectedBarberId
    })
  }, [sortedSchedules, selectedBarberId])

  const filteredAppointments = useMemo(() => {
    if (!selectedBarberId) return []

    return appointments
      .filter((appointment) => getAppointmentBarberId(appointment) === selectedBarberId)
      .sort((a, b) => {
        const dateDiff = dayjs(a.date).diff(dayjs(b.date))
        if (dateDiff !== 0) return dateDiff
        return a.timeSlot.localeCompare(b.timeSlot)
      })
  }, [appointments, selectedBarberId])

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {}

    filteredAppointments.forEach((appointment) => {
      const dateStr = dayjs(appointment.date).format('YYYY-MM-DD')
      map[dateStr] = [...(map[dateStr] ?? []), appointment]
    })

    return map
  }, [filteredAppointments])

  // Memoized cache mapping date string (YYYY-MM-DD) to BarberSchedule for O(1) rendering lookups
  const scheduleMap = useMemo(() => {
    const map: Record<string, BarberSchedule> = {}
    filteredSchedules.forEach((s) => {
      const dateStr = dayjs(s.date).format('YYYY-MM-DD')
      map[dateStr] = s
    })
    return map
  }, [filteredSchedules])

  // Lógica de cuadrícula mensual de fechas completas (con días de relleno, lunes a domingo)
  const calendarDays = useMemo(() => {
    const startOfMonth = currentMonth.startOf('month')
    const startOfWeek = startOfMonth.startOf('week')
    
    const days: Dayjs[] = []
    let curr = startOfWeek.clone()
    // 42 days (6 weeks) guarantees a complete rectangular grid for any month
    for (let i = 0; i < 42; i++) {
      days.push(curr)
      curr = curr.add(1, 'day')
    }
    return days
  }, [currentMonth])

  /* ── render ── */
  return (
    <Box className="admin-bg">
      {/* ── Content ── */}
      <Container
        maxWidth="xl"
        sx={{
          flex: 1,
          py: { xs: 2, sm: 4 },
          px: { xs: 2, sm: 4 },
          maxWidth: 'var(--shell-max-width) !important',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3, lg: 3.5 },
            mb: 2.5,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            background:
              'linear-gradient(135deg, rgba(47,107,95,0.12) 0%, rgba(239,245,243,0.85) 55%, rgba(255,255,255,1) 100%)',
          }}
        >
          <Box className="admin-barbers-hero-layout">
            <Box className="admin-barbers-hero-copy">
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark' }}>
                Centro de Barberos
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Administra perfiles, horarios y disponibilidad del equipo de trabajo.
              </Typography>
            </Box>
            <Box className="admin-barbers-hero-actions">
              {!selectedBarberId && (
                <Button
                  className="admin-barbers-hero-button"
                  size="small"
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenCreateBarber}
                  sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700 }}
                >
                  Agregar
                </Button>
              )}
              <Button
                className="admin-barbers-hero-button"
                size="small"
                variant="outlined"
                startIcon={<CalendarMonthIcon />}
                onClick={() => navigate('/admin/reserves')}
                sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
              >
                Ver Reservas
              </Button>
              <Button
                className="admin-barbers-hero-button"
                size="small"
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/dashboard')}
                sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
              >
                Volver
              </Button>
            </Box>
          </Box>
        </Paper>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2.2, flexWrap: 'wrap' }}>
          <Chip label={`Barberos: ${dashboardKpis.totalBarbers}`} color="primary" />
          <Chip label={`Activos: ${dashboardKpis.activeBarbers}`} color="success" />
          <Chip label={`Inactivos: ${dashboardKpis.inactiveBarbers}`} color="default" />
          <Chip label={`Horarios: ${dashboardKpis.totalSchedules}`} color="warning" />
          <Chip label={`Reservas activas: ${dashboardKpis.activeAppointments}`} color="secondary" />
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>
            {error}
          </Alert>
        )}

        {!selectedBarberId ? (
          <Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={32} />
              </Box>
            ) : barbers.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                <Typography variant="body2">No hay barberos registrados o activos.</Typography>
              </Box>
            ) : isMobile ? (
              <Box sx={{ display: 'grid', gap: 1.1 }}>
                {barbers.map((barber) => (
                  <Paper key={barber._id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.4 }}>
                    <Stack spacing={0.8}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {barber.name}
                        </Typography>
                        <Chip size="small" label={barber.isActive ? 'Activo' : 'Inactivo'} color={barber.isActive ? 'success' : 'default'} sx={{ fontWeight: 700 }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                        {barber.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getScheduleCountForBarber(barber._id)} horarios activos
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title="Ver Calendario y Horarios" arrow>
                          <IconButton size="small" color="primary" onClick={() => setSelectedBarberId(barber._id)}>
                            <CalendarMonthIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar Información del Barbero" arrow>
                          <IconButton size="small" sx={{ color: '#2e7d32' }} onClick={() => handleOpenEditBarber(barber)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Box>
            ) : (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  overflowX: 'auto',
                  bgcolor: '#ffffff',
                }}
              >
                <Table sx={{ minWidth: '100%', tableLayout: 'fixed' }} size="small">
                  <TableHead sx={{ bgcolor: 'rgba(47,107,95,0.08)' }}>
                    <TableRow>
                      <TableCell sx={{ width: { xs: '50%', sm: '55%' }, fontWeight: 600, color: '#333333', borderRight: '1px solid #dcdcdc', borderBottom: '2px solid #c0c0c0', py: 1, px: { xs: 1, sm: 1.5 } }}>Barbero</TableCell>
                      <TableCell sx={{ width: { xs: '25%', sm: '25%' }, fontWeight: 600, color: '#333333', borderRight: '1px solid #dcdcdc', borderBottom: '2px solid #c0c0c0', py: 1, px: { xs: 1, sm: 1.5 } }}>Estado</TableCell>
                      <TableCell align="center" sx={{ width: { xs: '25%', sm: '20%' }, fontWeight: 600, color: '#333333', borderBottom: '2px solid #c0c0c0', py: 1, px: { xs: 1, sm: 1.5 } }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {barbers.map((barber) => {
                      return (
                        <TableRow
                          key={barber._id}
                          hover
                          sx={{
                            transition: 'background-color 0.15s ease',
                            '&:hover': {
                              bgcolor: '#fafafa !important',
                            },
                          }}
                        >
                          <TableCell sx={{ py: 1, px: { xs: 1, sm: 1.5 }, borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', overflow: 'hidden' }}>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 600, color: '#1a1a1a', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {barber.name}
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: '0.75rem',
                                  color: '#666666',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {barber.email}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                                {getScheduleCountForBarber(barber._id)} horarios
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ py: 1, px: { xs: 1, sm: 1.5 }, borderRight: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0', overflow: 'hidden' }}>
                            <Chip
                              size="small"
                              label={barber.isActive ? 'Activo' : 'Inactivo'}
                              color={barber.isActive ? 'success' : 'default'}
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ py: 0.5, px: { xs: 0.5, sm: 1 }, borderBottom: '1px solid #e0e0e0' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: { xs: 0.5, sm: 1 } }}>
                              <Tooltip title="Ver Calendario y Horarios" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => setSelectedBarberId(barber._id)}
                                  sx={{
                                    color: 'primary.main',
                                    p: 0.5,
                                      '&:hover': { bgcolor: 'rgba(47, 107, 95, 0.1)' },
                                  }}
                                >
                                  <CalendarMonthIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Editar Información del Barbero" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenEditBarber(barber)}
                                  sx={{
                                    color: '#2e7d32',
                                    p: 0.5,
                                    '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.08)' },
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        ) : (
          <Box>
            {/* Header / Filter Navigation top row */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 3,
                flexWrap: 'wrap',
                gap: 2,
                p: 2.5,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'rgba(255,255,255,0.86)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 260 }}>
                <Button
                  startIcon={<ArrowBackIcon />}
                  onClick={() => setSelectedBarberId('')}
                  variant="outlined"
                  size="small"
                  sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
                >
                  Volver
                </Button>
                
                <Box sx={{ ml: 1, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>
                    Gestionando a:
                  </Typography>
                  <FormControl size="small" variant="standard" fullWidth sx={{ mt: -0.5 }}>
                    <Select
                      value={selectedBarberId}
                      onChange={(e) => setSelectedBarberId(e.target.value)}
                      sx={{
                        fontWeight: 700,
                        color: 'primary.dark',
                        fontSize: '1.1rem',
                        '&:before': { borderBottom: 'none !important' },
                        '&:after': { borderBottom: 'none !important' },
                        '& .MuiSelect-select': { py: 0.2 },
                      }}
                    >
                      {barbers.map((b) => (
                        <MenuItem key={b._id} value={b._id} sx={{ fontWeight: 600 }}>{b.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => openNewSchedule()}
                size="small"
                sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700, px: 2 }}
              >
                Nuevo Horario
              </Button>
            </Box>

            {/* ── Loading ── */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <Box className="calendar-admin-layout">
                {/* Calendario (Lado Izquierdo) */}
                <Box className="calendar-card-container">
                  {/* Cabecera del Calendario */}
                  <Box className="calendar-nav-header">
                    <IconButton
                      onClick={() => setCurrentMonth((prev) => prev.subtract(1, 'month'))}
                      className="calendar-nav-btn"
                      size="small"
                    >
                      <ChevronLeftIcon />
                    </IconButton>
                    <Typography className="calendar-month-title" variant="h6">
                      {currentMonth.format('MMMM YYYY').replace(/^\w/, (c) => c.toUpperCase())}
                    </Typography>
                    <IconButton
                      onClick={() => setCurrentMonth((prev) => prev.add(1, 'month'))}
                      className="calendar-nav-btn"
                      size="small"
                    >
                      <ChevronRightIcon />
                    </IconButton>
                  </Box>

                  {/* Días de la semana */}
                  <Box className="calendar-weekdays-grid">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                      <Typography key={d} className="calendar-weekday-label">
                        {d}
                      </Typography>
                    ))}
                  </Box>

                  {/* Cuadrícula de días */}
                  <Box className="calendar-days-grid">
	                    {calendarDays.map((day) => {
	                      const dateStr = day.format('YYYY-MM-DD')
	                      const schedule = scheduleMap[dateStr]
	                      const isTodayVal = day.isSame(businessNow(), 'day')
	                      const isSelected = selectedCalendarDate ? day.isSame(selectedCalendarDate, 'day') : false
	                      const isOutside = !day.isSame(currentMonth, 'month')

                      let cellClass = 'calendar-day-cell'
                      if (isOutside) cellClass += ' outside-month'
                      if (isTodayVal) cellClass += ' today'
                      if (isSelected) cellClass += ' selected'

                      if (schedule) {
                        if (schedule.isDayOff) {
                          cellClass += ' is-day-off'
                        } else {
                          cellClass += ' is-working'
                        }
	                      } else {
	                        cellClass += ' is-empty'
	                      }

	                      return (
                        <Box
                          key={dateStr}
                          className={cellClass}
                          onClick={() => setSelectedCalendarDate(day)}
                        >
                          <span className="day-number">{day.date()}</span>

                          {schedule ? (
                            schedule.isDayOff ? (
                              <Box className="day-off-indicator-wrapper">
                                <span className="day-off-dot" />
                                <span className="day-off-text">Libre</span>
                              </Box>
                            ) : (
                              <Box className="working-indicator-wrapper">
                                <span className="working-dot" />
                                <span className="working-hours-summary">
                                  Activo
                                </span>
                              </Box>
                            )
                          ) : (
                            <span
                              className="add-quick-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                openNewSchedule(day)
                              }}
                            >
                              +
                            </span>
                          )}

	                        </Box>
	                      )
	                    })}
                  </Box>

	                  <Box className="calendar-admin-legend">
	                    <span><i className="legend-working" />Horario activo</span>
	                    <span><i className="legend-day-off" />Día libre</span>
	                    <span><i className="legend-empty" />Sin configurar</span>
	                  </Box>
                </Box>

                {/* Panel de Detalle Derecho */}
                <Box className="details-panel-container">
                  <Paper elevation={0} className="details-panel-card">
	                    {selectedCalendarDate ? (
	                      (() => {
	                        const selectedDateStr = selectedCalendarDate.format('YYYY-MM-DD')
	                        const selectedSchedule = scheduleMap[selectedDateStr]
	                        const selectedDateAppointments = appointmentsByDate[selectedDateStr] ?? []

	                        // Helper function to calculate net working hours
	                        const getNetHours = (sch: BarberSchedule) => {
                          if (sch.isDayOff) return 0
                          let totalMinutes = 0
                          sch.workingHours.forEach((wh) => {
                            const start = dayjs(`2000-01-01T${wh.start}`)
                            const end = dayjs(`2000-01-01T${wh.end}`)
                            totalMinutes += end.diff(start, 'minute')
                          })
                          sch.breakTimes.forEach((bt) => {
                            const start = dayjs(`2000-01-01T${bt.start}`)
                            const end = dayjs(`2000-01-01T${bt.end}`)
                            totalMinutes -= end.diff(start, 'minute')
                          })
                          return Math.max(0, totalMinutes / 60)
                        }

                        return (
                          <Box>
                            {/* Fila 1 (Título): Cabecera con la fecha seleccionada y el icono de eliminación sutil a la derecha */}
	                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
	                              <Typography className="details-date-header" sx={{ textTransform: 'capitalize' }}>
	                                {selectedCalendarDate.format('dddd, D [de] MMMM')}
	                              </Typography>
	                              {selectedSchedule && (
	                                <IconButton
	                                  size="small"
	                                  onClick={() => setDeleteTarget(selectedSchedule)}
	                                  sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
	                                >
	                                  <DeleteIcon fontSize="small" />
	                                </IconButton>
	                              )}
	                            </Box>

	                            <Divider sx={{ mb: 2 }} />

	                            <Typography variant="caption" className="details-section-title">
	                              Disponibilidad del barbero
	                            </Typography>

	                            {selectedSchedule ? (
	                              <Box
	                                sx={{
	                                  display: 'grid',
	                                  gridTemplateColumns: '1fr 1fr',
	                                  gridTemplateRows: 'auto auto auto',
	                                  rowGap: 2.5,
	                                  columnGap: 2,
	                                }}
	                              >
                              {/* Fila 1 - Columna 1: Estado del Día */}
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 700,
                                    color: 'text.secondary',
                                    textTransform: 'uppercase',
                                    display: 'block',
                                    mb: 0.5,
                                    letterSpacing: 0.5,
                                  }}
                                >
                                  Estado
                                </Typography>
                                {selectedSchedule.isDayOff ? (
                                  <Chip
                                    icon={<EventBusyIcon sx={{ fontSize: '14px !important' }} />}
                                    label="Día Libre"
                                    size="small"
                                    sx={{
                                      bgcolor: 'rgba(255,152,0,0.08)',
                                      color: '#e65100',
                                      fontWeight: 600,
                                      fontSize: 11,
                                    }}
                                  />
                                ) : (
                                  <Chip
                                    icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                                    label="Activo"
                                    size="small"
                                    sx={{
                                      bgcolor: 'rgba(76,175,80,0.08)',
                                      color: '#2e7d32',
                                      fontWeight: 600,
                                      fontSize: 11,
                                    }}
                                  />
                                )}
                              </Box>

                              {/* Fila 1 - Columna 2: Disponibilidad */}
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 700,
                                    color: 'text.secondary',
                                    textTransform: 'uppercase',
                                    display: 'block',
                                    mb: 0.5,
                                    letterSpacing: 0.5,
                                  }}
                                >
                                  Operatividad
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 600,
                                    color: selectedSchedule.isDayOff ? '#e65100' : '#2e7d32',
                                  }}
                                >
                                  {selectedSchedule.isDayOff ? 'No disponible' : 'Habilitado'}
                                </Typography>
                              </Box>

                              {/* Fila 2 - Columna 1: Horario de Trabajo */}
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 700,
                                    color: 'text.secondary',
                                    textTransform: 'uppercase',
                                    display: 'block',
                                    mb: 0.5,
                                    letterSpacing: 0.5,
                                  }}
                                >
                                  Horario
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                  {!selectedSchedule.isDayOff && selectedSchedule.workingHours.length > 0 ? (
                                    selectedSchedule.workingHours.map((wh, idx) => (
                                      <Chip
                                        key={idx}
                                        label={`${wh.start} – ${wh.end}`}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                          borderColor: 'rgba(178,121,76,0.25)',
                                          color: 'primary.dark',
                                          fontWeight: 600,
                                          fontSize: 11,
                                          height: 22,
                                        }}
                                      />
                                    ))
                                  ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                      —
                                    </Typography>
                                  )}
                                </Box>
                              </Box>

                              {/* Fila 2 - Columna 2: Descansos */}
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 700,
                                    color: 'text.secondary',
                                    textTransform: 'uppercase',
                                    display: 'block',
                                    mb: 0.5,
                                    letterSpacing: 0.5,
                                  }}
                                >
                                  Descansos
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                  {!selectedSchedule.isDayOff && selectedSchedule.breakTimes.length > 0 ? (
                                    selectedSchedule.breakTimes.map((bt, idx) => (
                                      <Chip
                                        key={idx}
                                        label={`${bt.start} – ${bt.end}`}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                          borderColor: 'rgba(255,152,0,0.25)',
                                          color: '#e65100',
                                          fontWeight: 600,
                                          fontSize: 11,
                                          height: 22,
                                        }}
                                      />
                                    ))
                                  ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                                      —
                                    </Typography>
                                  )}
                                </Box>
                              </Box>

                              {/* Fila 3 - Columna 1: Horas Netas de Trabajo */}
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 700,
                                    color: 'text.secondary',
                                    textTransform: 'uppercase',
                                    display: 'block',
                                    mb: 0.5,
                                    letterSpacing: 0.5,
                                  }}
                                >
                                  Jornada Neta
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                  {selectedSchedule.isDayOff ? '0 hrs' : `${getNetHours(selectedSchedule)} hrs`}
                                </Typography>
                              </Box>

	                              {/* Fila 3 - Columna 2: Notas/Información */}
	                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 700,
                                    color: 'text.secondary',
                                    textTransform: 'uppercase',
                                    display: 'block',
                                    mb: 0.5,
                                    letterSpacing: 0.5,
                                  }}
                                >
                                  Información
                                </Typography>
	                                <Typography
	                                  variant="body2"
	                                  sx={{ fontStyle: 'italic', fontSize: '0.78rem', color: 'text.secondary' }}
	                                >
	                                  {selectedSchedule.isDayOff ? 'Día de descanso' : 'Horario disponible para recibir citas'}
	                                </Typography>
	                              </Box>
	                              </Box>
	                            ) : (
	                              <Box className="availability-config-empty">
	                                <Typography variant="body2" color="text.secondary">
	                                  No hay horario configurado para este día.
	                                </Typography>
	                                <Button
	                                  variant="contained"
	                                  size="small"
	                                  startIcon={<AddIcon />}
	                                  onClick={() => openNewSchedule(selectedCalendarDate)}
	                                  sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600, mt: 1.5 }}
	                                >
	                                  Configurar Día
	                                </Button>
	                              </Box>
	                            )}

	                            <Divider sx={{ my: 2 }} />

	                            <Box className="appointments-day-section">
	                              <Box className="appointments-day-header">
	                                <Typography variant="caption" className="details-section-title">
	                                  Citas de ese día
	                                </Typography>
	                                <Chip
	                                  label={`${selectedDateAppointments.length} cita${selectedDateAppointments.length === 1 ? '' : 's'}`}
	                                  size="small"
	                                  variant="outlined"
	                                  className="appointments-count-chip"
	                                />
	                              </Box>

	                              {selectedDateAppointments.length === 0 ? (
	                                <Box className="appointments-empty-state">
	                                  <Typography variant="body2" color="text.secondary">
	                                    No hay citas agendadas para esta fecha.
	                                  </Typography>
	                                </Box>
	                              ) : (
	                                <Box className="appointments-list">
	                                  {selectedDateAppointments.map((appointment) => (
	                                    <Box key={appointment._id} className={`appointment-row appointment-row-${appointment.status}`}>
	                                      <Box className="appointment-time-pill">{appointment.timeSlot}</Box>
	                                      <Box className="appointment-client-info">
	                                        <Typography variant="body2" className="appointment-client-name">
	                                          {getAppointmentClientLabel(appointment)}
	                                        </Typography>
	                                        {getAppointmentClientEmail(appointment) && (
	                                          <Typography variant="caption" className="appointment-client-email">
	                                            {getAppointmentClientEmail(appointment)}
	                                          </Typography>
	                                        )}
	                                      </Box>
	                                      <Chip
	                                        label={appointmentStatusLabel[appointment.status]}
	                                        size="small"
	                                        className={`appointment-status-chip appointment-status-${appointment.status}`}
	                                      />
	                                    </Box>
	                                  ))}
	                                </Box>
	                              )}
	                            </Box>
	                          </Box>
	                        )
                      })()
                    ) : (
                      <Box className="details-empty-state">
                        <Typography variant="body2" color="text.secondary">
                          Selecciona un día en el calendario para ver y gestionar sus detalles.
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Container>

      {/* ── Create Dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={() => !submitting && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 1, m: { xs: 2, sm: 4 } } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          <ScheduleIcon color="primary" />
          Configurar Horario
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
          {/* Barber Selection */}
          <FormControl fullWidth size="small">
            <InputLabel>Barbero</InputLabel>
            <Select
              value={formBarberId}
              onChange={(e) => setFormBarberId(e.target.value)}
              label="Barbero"
              disabled={!!selectedBarberId}
            >
              {barbers.map((b) => (
                <MenuItem key={b._id} value={b._id}>{b.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Date Range Inputs */}
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
              <DatePicker
                label="Desde"
                value={formStartDate}
                onChange={(v) => {
                  if (v) {
                    setFormStartDate(v)
                    if (formEndDate && v.isAfter(formEndDate, 'day')) {
                      setFormEndDate(v)
                    }
                  }
                }}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
              <DatePicker
                label="Hasta"
                value={formEndDate}
                onChange={(v) => {
                  if (v) {
                    setFormEndDate(v)
                    if (formStartDate && v.isBefore(formStartDate, 'day')) {
                      setFormStartDate(v)
                    }
                  }
                }}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </LocalizationProvider>
          </Box>

          {/* Day off */}
          <FormControlLabel
            control={
              <Switch
                checked={formIsDayOff}
                onChange={(e) => setFormIsDayOff(e.target.checked)}
                color="primary"
              />
            }
            label="Día Libre (no laborable)"
          />

          {!formIsDayOff && (
            <>
              <Divider />

              {/* Working Hours */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.dark', mt: 1 }}>
                Horarios de Trabajo
              </Typography>
              
              {formWorkingHours.map((wh, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Inicio</InputLabel>
                    <Select
                      value={wh.start}
                      onChange={(e) => updateWorkingHour(i, 'start', e.target.value)}
                      label="Inicio"
                    >
                      {HOUR_OPTIONS.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Fin</InputLabel>
                    <Select
                      value={wh.end}
                      onChange={(e) => updateWorkingHour(i, 'end', e.target.value)}
                      label="Fin"
                    >
                      {HOUR_OPTIONS.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <IconButton
                    size="small"
                    onClick={() => setFormWorkingHours((p) => p.filter((_, idx) => idx !== i))}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}

              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setFormWorkingHours((p) => [...p, { start: '09:00', end: '13:00' }])}
                sx={{ textTransform: 'none', alignSelf: 'flex-start', fontWeight: 600 }}
              >
                Agregar Bloque de Trabajo
              </Button>

              {/* Break times */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#e65100', mt: 1.5 }}>
                Descansos (Colación)
              </Typography>

              {formBreakTimes.map((bt, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Inicio</InputLabel>
                    <Select
                      value={bt.start}
                      onChange={(e) => updateBreakTime(i, 'start', e.target.value)}
                      label="Inicio"
                    >
                      {HOUR_OPTIONS.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Fin</InputLabel>
                    <Select
                      value={bt.end}
                      onChange={(e) => updateBreakTime(i, 'end', e.target.value)}
                      label="Fin"
                    >
                      {HOUR_OPTIONS.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <IconButton
                    size="small"
                    onClick={() => setFormBreakTimes((p) => p.filter((_, idx) => idx !== i))}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}

              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setFormBreakTimes((p) => [...p, { start: '13:00', end: '14:00' }])}
                sx={{
                  textTransform: 'none',
                  alignSelf: 'flex-start',
                  fontWeight: 600,
                  color: '#e65100',
                  '&:hover': {
                    bgcolor: 'rgba(230,81,0,0.04)',
                  }
                }}
              >
                Agregar Bloque de Descanso
              </Button>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || !formBarberId}
            sx={{ borderRadius: 1, textTransform: 'none', minWidth: 140, fontWeight: 700 }}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Guardar Horario'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        slotProps={{ paper: { sx: { borderRadius: 1, m: { xs: 2, sm: 4 } } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>¿Eliminar horario?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Se eliminará el horario de <strong>{deleteTarget ? getBarberName(deleteTarget.barberId) : ''}</strong> del día{' '}
            <strong>{deleteTarget ? dayjs(deleteTarget.date).format('D [de] MMM, YYYY') : ''}</strong>.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 700 }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Barber Modal ── */}
      <Dialog
        open={barberEditOpen}
        onClose={() => setBarberEditOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 1,
              width: '100%',
              maxWidth: 400,
              m: { xs: 2, sm: 4 },
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider', pb: 1.5 }}>
          Editar Información
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '20px !important' }}>
          {editingBarber && (
            <>
              {/* Nombre (Sólo lectura) */}
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
                  Nombre (Sólo Lectura)
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', bgcolor: '#f5f5f5', px: 1.5, py: 1, borderRadius: 1 }}>
                  {editingBarber.name}
                </Typography>
              </Box>

              {/* Correo Electrónico (Sólo lectura) */}
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
                  Correo Electrónico (Sólo Lectura)
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary', bgcolor: '#f5f5f5', px: 1.5, py: 1, borderRadius: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {editingBarber.email}
                </Typography>
              </Box>

              {/* Días Programados (Sólo lectura) */}
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
                  Días Programados (Sólo Lectura)
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.dark', bgcolor: 'rgba(47, 107, 95, 0.08)', px: 1.5, py: 1, borderRadius: 1 }}>
                  {getScheduleCountForBarber(editingBarber._id)} {getScheduleCountForBarber(editingBarber._id) === 1 ? 'día' : 'días'}
                </Typography>
              </Box>

              {/* Teléfono (Editable) */}
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
                  Teléfono
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Ingrese el teléfono"
                />
              </Box>

              {/* Estado (Editable) */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #dcdcdc', p: 1.5, borderRadius: 1 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Estado del Barbero
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {editIsActive ? 'Activo y disponible' : 'Inactivo'}
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editIsActive}
                      onChange={(e) => setEditIsActive(e.target.checked)}
                      color="success"
                    />
                  }
                  label=""
                  sx={{ mr: 0 }}
                />
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
          <Button onClick={() => setBarberEditOpen(false)} disabled={savingBarber} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveBarber}
            disabled={savingBarber}
            sx={{ borderRadius: 1, textTransform: 'none', minWidth: 120, fontWeight: 700 }}
          >
            {savingBarber ? <CircularProgress size={20} color="inherit" /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Registrar Nuevo Barbero Modal ── */}
      <Dialog
        open={barberCreateOpen}
        onClose={() => setBarberCreateOpen(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 1,
              width: '100%',
              maxWidth: 400,
              m: { xs: 2, sm: 4 },
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider', pb: 1.5 }}>
          Registrar Nuevo Barbero
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '20px !important' }}>
          {/* Nombre (Editable) */}
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
              Nombre Completo *
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Ingrese el nombre completo"
            />
          </Box>

          {/* Correo Electrónico (Editable) */}
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
              Correo Electrónico *
            </Typography>
            <TextField
              size="small"
              fullWidth
              type="email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
            />
          </Box>

          {/* Teléfono (Editable) */}
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
              Teléfono *
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={createPhone}
              onChange={(e) => setCreatePhone(e.target.value)}
              placeholder="Ingrese el teléfono (ej. +569...)"
            />
          </Box>

          {/* Estado (Editable) */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #dcdcdc', p: 1.5, borderRadius: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Estado Inicial
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {createIsActive ? 'Activo y disponible' : 'Inactivo'}
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={createIsActive}
                  onChange={(e) => setCreateIsActive(e.target.checked)}
                  color="success"
                />
              }
              label=""
              sx={{ mr: 0 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
          <Button onClick={() => setBarberCreateOpen(false)} disabled={creatingBarber} sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCreateBarber}
            disabled={creatingBarber}
            sx={{ borderRadius: 1, textTransform: 'none', minWidth: 120, fontWeight: 700 }}
          >
            {creatingBarber ? <CircularProgress size={20} color="inherit" /> : 'Registrar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Toast ── */}
      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast(null)}
          severity={toast?.severity ?? 'success'}
          variant="filled"
          sx={{ borderRadius: 1 }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
