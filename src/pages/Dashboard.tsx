import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Fade from '@mui/material/Fade'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import PersonIcon from '@mui/icons-material/Person'
import PhoneIcon from '@mui/icons-material/Phone'
import EmailIcon from '@mui/icons-material/Email'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import Swal from 'sweetalert2'
import type { AuthUser } from '../types/auth'
import '../styles/Dashboard.css'

import {
  cancelMyAppointment,
  fetchBarbers,
  fetchMyActiveAppointment,
  type Appointment,
  type Barber,
} from '../api/barber'

dayjs.locale('es')

/* ──────────────────── helpers ──────────────────── */

function getAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('auth_user')
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthUser
    return { ...parsed, role: parsed.role || 'user' }
  } catch {
    return null
  }
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

/* ──────────────────── component ──────────────────── */

export default function Dashboard() {
  const navigate = useNavigate()
  const user = getAuthUser()
  const isAdmin = user?.role === 'admin'

  // ── state ──
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null)
  const [loadingActiveAppointment, setLoadingActiveAppointment] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── redirect if not logged in ──
  useEffect(() => {
    if (!localStorage.getItem('auth_token')) {
      navigate('/login')
    }
  }, [navigate])

  // ── initial mount: load barbers ──
  useEffect(() => {
    const controller = new AbortController()
    fetchBarbers()
      .then((data) => {
        if (!controller.signal.aborted) {
          setBarbers(data.filter((barber) => barber.isActive))
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Error cargando barberos')
        }
      })
    return () => controller.abort()
  }, [])

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

  const handleSelectBarber = useCallback((barber: Barber) => {
    if (loadingActiveAppointment || activeAppointment) return
    navigate(`/barbers/${barber._id}/availability`)
  }, [activeAppointment, loadingActiveAppointment, navigate])

  const handleCancelAppointment = async () => {
    if (!activeAppointment) return

    const confirmation = await Swal.fire({
      title: '¿Cancelar tu reserva?',
      text: 'El horario quedará disponible para otra persona.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#b44747',
      cancelButtonColor: '#5d6762',
      confirmButtonText: 'Sí, cancelar reserva',
      cancelButtonText: 'Volver',
      background: '#ffffff',
      color: '#18201d',
    })

    if (!confirmation.isConfirmed) return

    Swal.fire({
      title: 'Cancelando reserva...',
      text: 'Por favor, espera un momento.',
      allowOutsideClick: false,
      background: '#ffffff',
      color: '#18201d',
      didOpen: () => Swal.showLoading(),
    })

    try {
      await cancelMyAppointment(activeAppointment._id)
      await Swal.fire({
        title: 'Reserva cancelada',
        text: 'El horario fue liberado correctamente.',
        icon: 'success',
        confirmButtonColor: '#2f6b5f',
        background: '#ffffff',
        color: '#18201d',
      })
      setActiveAppointment(null)
    } catch (err) {
      const response = (
        err as { response?: { data?: { message?: string } } }
      )?.response

      await Swal.fire({
        title: 'No se pudo cancelar',
        text:
          response?.data?.message ??
          (err instanceof Error ? err.message : 'Ocurrió un error inesperado.'),
        icon: 'error',
        confirmButtonColor: '#2f6b5f',
        background: '#ffffff',
        color: '#18201d',
      })
    }
  }

  /* ──────────────────── render ──────────────────── */
  return (
    <Box className="dashboard-bg">
      {/* ── Top Bar ── */}
      <Box className="dashboard-top-bar">
        {!loadingActiveAppointment && !activeAppointment && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <CalendarMonthIcon sx={{ color: 'primary.main', fontSize: { xs: 24, sm: 28 } }} />
            <Box className="dashboard-title-group">
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, color: 'primary.dark', fontSize: { xs: 18, sm: 20 } }}
              >
                Reserva
              </Typography>
              <Typography variant="body2" className="dashboard-step-instruction">
                Selecciona un barbero disponible
              </Typography>
            </Box>
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', ml: 'auto' }}>
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

      {/* ── Main Content ── */}
      <Container
        maxWidth="md"
        sx={{
          flex: 1,
          pt: { xs: 1.5, sm: 2 },
          pb: { xs: 2, sm: 4 },
          maxWidth: 'var(--shell-max-width) !important',
          px: { xs: 2, sm: 4 },
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>
            {error}
          </Alert>
        )}

        {(loadingActiveAppointment || activeAppointment) && (
          <Paper elevation={0} className="active-appointment-card">
            {loadingActiveAppointment ? (
              <>
                <Skeleton width="35%" height={22} />
                <Skeleton width="70%" height={18} />
              </>
            ) : activeAppointment ? (
              <>
                <Box className="active-appointment-main">
                  <Box className="active-appointment-heading">
                    <Box className="active-appointment-icon">
                      <CalendarMonthIcon fontSize="small" />
                    </Box>
                    <Box>
                      <Typography variant="overline" className="active-appointment-kicker">
                        Cita vigente
                      </Typography>
                      <Typography variant="subtitle1" className="active-appointment-title">
                        Ya tienes una reserva activa
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box className="active-appointment-side">
                  <Box className="active-appointment-details">
                    <Box className="active-appointment-detail">
                      <span>Barbero</span>
                      <strong>{getAppointmentBarberName(activeAppointment)}</strong>
                    </Box>
                    <Box className="active-appointment-detail">
                      <span>Fecha</span>
                      <strong>{dayjs(activeAppointment.date).format('dddd D [de] MMMM')}</strong>
                    </Box>
                    <Box className="active-appointment-detail">
                      <span>Hora</span>
                      <strong>{activeAppointment.timeSlot}</strong>
                    </Box>
                    <Box className="active-appointment-detail">
                      <span>Estado</span>
                      <Chip
                        label={appointmentStatusLabel[activeAppointment.status]}
                        size="small"
                        className={`active-appointment-status active-appointment-status-${activeAppointment.status}`}
                      />
                    </Box>
                  </Box>
                  <Button
                    className="active-appointment-cancel-button"
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<CancelOutlinedIcon />}
                    onClick={handleCancelAppointment}
                  >
                    Cancelar reserva
                  </Button>
                </Box>
              </>
            ) : null}
          </Paper>
        )}

        {/* ── Barbers Grid ── */}
        {!loadingActiveAppointment && !activeAppointment && (
          <Fade in timeout={500}>
          <Paper elevation={0} className="dashboard-container-card">
            <Stepper
              activeStep={0}
              alternativeLabel
              sx={{ px: { xs: 1.5, sm: 3 }, pt: { xs: 2, sm: 3 }, pb: 1 }}
            >
              {['Barbero', 'Fecha y horario', 'Confirmar'].map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Box
              sx={{
                px: { xs: 2, sm: 3 },
                py: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, color: 'primary.dark', fontSize: { xs: 15, sm: 16 } }}
              >
                Barberos Disponibles
              </Typography>
            </Box>

            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              {barbers.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                  <Typography variant="body2">No hay barberos registrados</Typography>
                </Box>
              ) : (
                <Box className={`barbers-grid ${isAdmin ? 'barbers-grid-admin' : 'barbers-grid-client'}`}>
                  {barbers.map((barber) => {
                    return (
                      <Paper
                        key={barber._id}
                        elevation={0}
                        onClick={() => handleSelectBarber(barber)}
                        className={`barber-card ${isAdmin ? 'barber-card-admin' : 'barber-card-client'}`}
                      >
                        {isAdmin ? (
                          <Box className="barber-admin-content">
                            <Box className="barber-avatar barber-avatar-compact">
                              {barber.name.charAt(0).toUpperCase()}
                            </Box>
                            <Box className="barber-admin-rows">
                              <Box className="barber-admin-row barber-admin-row-name">
                                <PersonIcon sx={{ fontSize: 15, color: 'primary.main' }} />
                                <Typography
                                  variant="subtitle2"
                                  className="barber-admin-name"
                                >
                                  {barber.name}
                                </Typography>
                              </Box>

                              <Box className="barber-admin-row">
                                <EmailIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary" className="barber-admin-detail-text">
                                  {barber.email}
                                </Typography>
                              </Box>

                              <Box className="barber-admin-row">
                                <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary" className="barber-admin-detail-text">
                                  {barber.phone}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        ) : (
                          <Box className="barber-client-card-content">
                            <Box className="barber-avatar">
                              {barber.name.charAt(0).toUpperCase()}
                            </Box>
                            <Typography
                              variant="subtitle1"
                              className="barber-client-name"
                              title={barber.name}
                            >
                              {barber.name}
                            </Typography>
                          </Box>
                        )}
                      </Paper>
                    )
                  })}
                </Box>
              )}
            </Box>
          </Paper>
          </Fade>
        )}
      </Container>
    </Box>
  )
}
