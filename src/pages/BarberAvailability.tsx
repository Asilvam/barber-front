import { useState, useEffect, useCallback } from 'react'
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
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/es'
import Swal from 'sweetalert2'
import './BarberAvailability.css'

import {
  fetchBarbers,
  fetchAvailableSlots,
  createAppointment,
  type Barber,
} from '../api/barber'

dayjs.locale('es')

export default function BarberAvailability() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // ── states ──
  const [barber, setBarber] = useState<Barber | null>(null)
  const [loadingBarber, setLoadingBarber] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs())
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // ── session protection ──
  useEffect(() => {
    if (!localStorage.getItem('auth_token')) {
      navigate('/login')
    }
  }, [navigate])

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
      setSlots(resp.availableSlots)
    } catch (err) {
      console.error('Error fetching availability:', err)
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }, [id])

  // ── fetch current day availability by default on mount, and automatically on selectedDate changes ──
  useEffect(() => {
    if (id) {
      const timer = setTimeout(() => {
        loadSlotsForDate(selectedDate)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [id, selectedDate, loadSlotsForDate])

  const handleDateChange = useCallback((date: Dayjs | null) => {
    if (date) {
      setSelectedDate(date)
    }
  }, [])

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

  // ── book appointment with SweetAlert2 ──
  const handleBookSlot = async (slot: string, timeRangeDisplay: string) => {
    if (!barber || !id) return

    const dateFormatted = selectedDate.format('dddd D [de] MMMM, YYYY')

    // 1. Confirm dialog
    const confirmResult = await Swal.fire({
      title: '¿Confirmar tu Cita?',
      html: `
        <div style="text-align: left; padding: 5px 15px; font-size: 15px;">
          <p style="margin: 6px 0;"><strong>Barbero:</strong> ${barber.name}</p>
          <p style="margin: 6px 0;"><strong>Fecha:</strong> ${dateFormatted}</p>
          <p style="margin: 6px 0;"><strong>Bloque de Hora:</strong> ${timeRangeDisplay}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#b2794c',
      cancelButtonColor: '#5f5b50',
      confirmButtonText: 'Sí, agendar al instante',
      cancelButtonText: 'Cancelar',
      background: '#fbf7f2',
      color: '#1f1b1a',
    })

    if (!confirmResult.isConfirmed) return

    // 2. Loading state popup
    Swal.fire({
      title: 'Agendando cita...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      background: '#fbf7f2',
      color: '#1f1b1a',
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
        confirmButtonColor: '#b2794c',
        background: '#fbf7f2',
        color: '#1f1b1a',
      })

      // Reload available slots so the booked slot is immediately removed from the interface
      loadSlotsForDate(selectedDate)

    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : 'Error inesperado al agendar.')

      // 4. Error dialog
      await Swal.fire({
        title: 'No se pudo agendar',
        text: msg,
        icon: 'error',
        confirmButtonColor: '#b2794c',
        background: '#fbf7f2',
        color: '#1f1b1a',
      })
    }
  }

  // ── render ──
  return (
    <Box className="availability-bg">
      <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Back Button */}
        <Button
          size="small"
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{
            mb: 4,
            alignSelf: 'flex-start',
            borderColor: 'rgba(178,121,76,0.35)',
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
          <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {loadingBarber ? (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
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
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(178, 121, 76, 0.18)',
                  }}
                />
                <Chip
                  label="Disponible"
                  color="success"
                  variant="filled"
                  size="small"
                  sx={{ fontWeight: 700, px: 1, ml: 'auto' }}
                />
              </Box>

              {/* Date Selection Section (Compact) */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.dark', mb: 1.8, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarMonthIcon color="primary" />
                  Fecha de la Cita:
                </Typography>
                <Box sx={{ maxWidth: { xs: '100%', sm: 320 } }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                    <DatePicker
                      value={selectedDate}
                      onChange={handleDateChange}
                      disablePast
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                          sx: {
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2.5,
                              bgcolor: '#fff',
                              '&:hover fieldset': {
                                borderColor: 'primary.main',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: 'primary.main',
                              }
                            }
                          }
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Box>
              </Box>

              {/* Available Slots Section (Rendered inline on the same page) */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.dark', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon color="primary" />
                  Bloques Horarios Disponibles:
                </Typography>

                {loadingSlots ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5, gap: 2 }}>
                    <CircularProgress size={40} />
                    <Typography variant="body2" color="text.secondary">
                      Consultando disponibilidad...
                    </Typography>
                  </Box>
                ) : slots.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 5, px: 2, bgcolor: 'rgba(178,121,76,0.04)', borderRadius: 3, border: '1px dashed rgba(178,121,76,0.2)' }}>
                    <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 600, mb: 0.8 }}>
                      Sin turnos libres para esta fecha
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      El barbero no cuenta con bloques disponibles para el {selectedDate.format('dddd D [de] MMMM')}. Por favor, elige otro día en el selector superior.
                    </Typography>
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                      Contamos con <strong>{slots.length} bloques libres</strong> para el {selectedDate.format('dddd D [de] MMMM')}. Presiona un horario para reservar al instante:
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                        gap: 2,
                      }}
                    >
                      {slots.map((slot) => {
                        const blockInfo = getBlockTimeRange(slot)
                        return (
                          <Button
                            key={slot}
                            variant="outlined"
                            onClick={() => handleBookSlot(blockInfo.start, blockInfo.display)}
                            sx={{
                              borderRadius: 2.5,
                              fontWeight: 600,
                              fontSize: 14,
                              py: 1.8,
                              borderColor: 'rgba(178,121,76,0.3)',
                              color: 'primary.dark',
                              bgcolor: '#fff',
                              textTransform: 'none',
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                bgcolor: 'primary.light',
                                borderColor: 'primary.main',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(178,121,76,0.18)',
                              },
                            }}
                          >
                            {blockInfo.display}
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
