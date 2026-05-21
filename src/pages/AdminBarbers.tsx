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
import Fade from '@mui/material/Fade'
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
import Divider from '@mui/material/Divider'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ScheduleIcon from '@mui/icons-material/Schedule'
import EventBusyIcon from '@mui/icons-material/EventBusy'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/es'
import './AdminBarbers.css'

import {
  fetchBarbers,
  fetchBarberSchedules,
  createBarberSchedule,
  deleteBarberSchedule,
  type Barber,
  type BarberSchedule,
  type TimeSlot,
} from '../api/barber'

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

/* ── component ── */

export default function AdminBarbers() {
  const navigate = useNavigate()
  const user = getAuthUser()

  const [barbers, setBarbers] = useState<Barber[]>([])
  const [schedules, setSchedules] = useState<BarberSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(null)
  const [selectedBarberId, setSelectedBarberId] = useState<string>('')

  // form dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formBarberId, setFormBarberId] = useState('')
  
  const [formStartDate, setFormStartDate] = useState<Dayjs>(dayjs())
  const [formEndDate, setFormEndDate] = useState<Dayjs>(dayjs())

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
    Promise.all([fetchBarbers(), fetchBarberSchedules()])
      .then(([b, s]) => {
        setBarbers(b.filter((x) => x.isActive))
        setSchedules(s)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Error cargando datos'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    Promise.all([fetchBarbers(), fetchBarberSchedules()])
      .then(([b, s]) => {
        if (!ac.signal.aborted) {
          setBarbers(b.filter((x) => x.isActive))
          setSchedules(s)
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

  // ── default preset templates ──
  const applyPresetA = useCallback(() => {
    setFormWorkingHours([
      { start: '09:00', end: '13:00' },
      { start: '14:00', end: '19:00' },
    ])
    setFormBreakTimes([
      { start: '13:00', end: '14:00' },
    ])
  }, [])

  const applyPresetB = useCallback(() => {
    setFormWorkingHours([
      { start: '09:00', end: '14:00' },
      { start: '15:00', end: '19:00' },
    ])
    setFormBreakTimes([
      { start: '14:00', end: '15:00' },
    ])
  }, [])

  // ── form helpers ──
  const openNewSchedule = () => {
    setFormBarberId(selectedBarberId || (barbers[0]?._id ?? ''))
    setFormStartDate(dayjs())
    setFormEndDate(dayjs())
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

  // Helper to count schedules for each barber
  const getScheduleCountForBarber = useCallback((barberId: string) => {
    return schedules.filter((s) => {
      const bid = typeof s.barberId === 'object' && s.barberId !== null ? s.barberId._id : s.barberId
      return bid === barberId
    }).length
  }, [schedules])

  /* ── render ── */
  return (
    <Box className="admin-bg">
      {/* ── Top Bar ── */}
      <Box className="admin-top-bar">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AdminPanelSettingsIcon sx={{ color: 'primary.main', fontSize: 28 }} />
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: 'primary.dark', fontSize: { xs: 16, sm: 20 } }}
          >
            Admin — Horarios
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
        >
          Dashboard
        </Button>
      </Box>

      {/* ── Content ── */}
      <Container maxWidth="md" sx={{ flex: 1, py: { xs: 1, sm: 3 }, px: { xs: 2, sm: 3 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {!selectedBarberId ? (
          <Box>
            {/* Title / Info card */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'rgba(251,247,242,0.85)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.dark', mb: 0.5 }}>
                Administración Individual de Horarios
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Selecciona un barbero para visualizar, programar y gestionar sus horarios de trabajo de forma independiente.
              </Typography>
            </Paper>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={32} />
              </Box>
            ) : barbers.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                <Typography variant="body2">No hay barberos registrados o activos.</Typography>
              </Box>
            ) : (
              <Box className="barber-selection-grid">
                {barbers.map((barber) => {
                  const sCount = getScheduleCountForBarber(barber._id)
                  return (
                    <Paper
                      key={barber._id}
                      elevation={0}
                      className="barber-admin-card"
                      onClick={() => setSelectedBarberId(barber._id)}
                    >
                      <Box className="barber-admin-avatar">
                        {barber.name.charAt(0).toUpperCase()}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }} noWrap>
                          {barber.name}
                        </Typography>
                        <Chip
                          label={sCount === 1 ? '1 día configurado' : `${sCount} días configurados`}
                          size="small"
                          sx={{
                            bgcolor: sCount > 0 ? 'primary.light' : 'rgba(0,0,0,0.06)',
                            color: sCount > 0 ? 'primary.dark' : 'text.secondary',
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        fullWidth
                        sx={{
                          borderRadius: 999,
                          textTransform: 'none',
                          fontWeight: 700,
                          mt: 1,
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedBarberId(barber._id)
                        }}
                      >
                        Gestionar Horarios
                      </Button>
                    </Paper>
                  )
                })}
              </Box>
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
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'rgba(251,247,242,0.85)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 260 }}>
                <Button
                  startIcon={<ArrowBackIcon />}
                  onClick={() => setSelectedBarberId('')}
                  variant="outlined"
                  size="small"
                  sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
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
                onClick={openNewSchedule}
                size="small"
                sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700, px: 2 }}
              >
                Nuevo Horario
              </Button>
            </Box>

            {/* ── Loading ── */}
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={32} />
              </Box>
            )}

            {/* ── Empty State ── */}
            {!loading && filteredSchedules.length === 0 && (
              <Paper
                elevation={0}
                sx={{
                  p: 5,
                  borderRadius: 3,
                  textAlign: 'center',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <ScheduleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Sin horarios configurados
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Este barbero aún no cuenta con días de trabajo configurados.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={openNewSchedule}
                  sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
                >
                  Configurar primer horario
                </Button>
              </Paper>
            )}

            {/* ── Schedule Cards ── */}
            {!loading && filteredSchedules.length > 0 && (
              <Box sx={{ display: 'grid', gap: 2 }}>
                {filteredSchedules.map((schedule, index) => (
                  <Fade in timeout={300 + index * 80} key={schedule._id}>
                    <Paper elevation={0} className="schedule-card">
                      {/* Card Header */}
                      <Box className="schedule-card-header">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              bgcolor: 'primary.light',
                              color: 'primary.dark',
                              display: 'grid',
                              placeItems: 'center',
                              fontWeight: 700,
                              fontSize: 14,
                              flexShrink: 0,
                            }}
                          >
                            {getBarberName(schedule.barberId).charAt(0).toUpperCase()}
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}
                              noWrap
                            >
                              {getBarberName(schedule.barberId)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {dayjs(schedule.date).format('ddd D [de] MMM, YYYY')}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {schedule.isDayOff ? (
                            <Chip
                              icon={<EventBusyIcon sx={{ fontSize: '16px !important' }} />}
                              label="Día Libre"
                              size="small"
                              sx={{
                                bgcolor: 'rgba(255,152,0,0.1)',
                                color: '#e65100',
                                fontWeight: 600,
                                fontSize: 12,
                              }}
                            />
                          ) : (
                            <Chip
                              icon={<CheckCircleIcon sx={{ fontSize: '16px !important' }} />}
                              label="Activo"
                              size="small"
                              sx={{
                                bgcolor: 'rgba(76,175,80,0.1)',
                                color: '#2e7d32',
                                fontWeight: 600,
                                fontSize: 12,
                              }}
                            />
                          )}
                          <IconButton
                            size="small"
                            onClick={() => setDeleteTarget(schedule)}
                            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>

                      {/* Card Body */}
                      {!schedule.isDayOff && (
                        <Box className="schedule-card-body">
                          {/* Working hours */}
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}
                            >
                              Horario de Trabajo
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                              {schedule.workingHours.length > 0 ? (
                                schedule.workingHours.map((wh, i) => (
                                  <Chip
                                    key={i}
                                    label={`${wh.start} – ${wh.end}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      borderColor: 'rgba(178,121,76,0.3)',
                                      color: 'primary.dark',
                                      fontWeight: 600,
                                      fontSize: 13,
                                    }}
                                  />
                                ))
                              ) : (
                                <Typography variant="caption" color="text.secondary">Sin horario</Typography>
                              )}
                            </Box>
                          </Box>

                          {/* Breaks */}
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}
                            >
                              Descansos
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                              {schedule.breakTimes.length > 0 ? (
                                schedule.breakTimes.map((bt, i) => (
                                  <Chip
                                    key={i}
                                    label={`${bt.start} – ${bt.end}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      borderColor: 'rgba(255,152,0,0.3)',
                                      color: '#e65100',
                                      fontWeight: 600,
                                      fontSize: 13,
                                    }}
                                  />
                                ))
                              ) : (
                                <Typography variant="caption" color="text.secondary">Sin descansos</Typography>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      )}
                    </Paper>
                  </Fade>
                ))}
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
        slotProps={{ paper: { sx: { borderRadius: 3, m: { xs: 2, sm: 4 } } } }}
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
                onChange={(v) => v && setFormStartDate(v)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
              <DatePicker
                label="Hasta"
                value={formEndDate}
                onChange={(v) => v && setFormEndDate(v)}
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
              
              {/* Presets / Default templates */}
              <Box sx={{ mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                  Horarios Predeterminados (Plantillas):
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={applyPresetA}
                    sx={{ textTransform: 'none', borderRadius: 2, fontSize: 11.5 }}
                  >
                    Turno A: 9-13 y 14-19 (Colación 13-14)
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={applyPresetB}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 2,
                      fontSize: 11.5,
                      borderColor: 'rgba(230,81,0,0.5)',
                      color: '#e65100',
                      '&:hover': {
                        borderColor: '#e65100',
                        bgcolor: 'rgba(230,81,0,0.04)',
                      }
                    }}
                  >
                    Turno B: 9-14 y 15-19 (Colación 14-15)
                  </Button>
                </Box>
              </Box>

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
            sx={{ borderRadius: 999, textTransform: 'none', minWidth: 140, fontWeight: 700 }}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'Guardar Horario'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        slotProps={{ paper: { sx: { borderRadius: 3, m: { xs: 2, sm: 4 } } } }}
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
            sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
          >
            Eliminar
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
          sx={{ borderRadius: 2 }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
