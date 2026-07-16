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
import RefreshIcon from '@mui/icons-material/Refresh'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import PersonIcon from '@mui/icons-material/Person'
import LogoutIcon from '@mui/icons-material/Logout'
import PhoneIcon from '@mui/icons-material/Phone'
import EmailIcon from '@mui/icons-material/Email'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import type { AuthUser } from '../types/auth'
import './Dashboard.css'

import {
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
  const [loadingBarbers, setLoadingBarbers] = useState(false)
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null)
  const [loadingActiveAppointment, setLoadingActiveAppointment] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── redirect if not logged in ──
  useEffect(() => {
    if (!localStorage.getItem('auth_token')) {
      navigate('/login')
    }
  }, [navigate])

  // ── load barbers ──
  const loadBarbers = useCallback(() => {
    setLoadingBarbers(true)
    fetchBarbers()
      .then((data) => {
        setBarbers(data.filter((b) => b.isActive))
        setLoadingBarbers(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error cargando barberos')
        setLoadingBarbers(false)
      })
  }, [])

  // ── initial mount: load barbers ──
  useEffect(() => {
    const controller = new AbortController()
    fetchBarbers()
      .then((data) => {
        if (!controller.signal.aborted) {
          setBarbers(data.filter((b) => b.isActive))
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

    if (isAdmin || !localStorage.getItem('auth_token')) {
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
  }, [isAdmin])

  const handleSelectBarber = useCallback((barber: Barber) => {
    navigate(`/barbers/${barber._id}/availability`)
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    navigate('/login')
  }

  /* ──────────────────── render ──────────────────── */
  return (
    <Box className="dashboard-bg">
      {/* ── Top Bar ── */}
      <Box className="dashboard-top-bar">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <CalendarMonthIcon sx={{ color: 'primary.main', fontSize: { xs: 24, sm: 28 } }} />
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: 'primary.dark', fontSize: { xs: 18, sm: 20 } }}
          >
            Reserva
          </Typography>
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
              }}
            />
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<LogoutIcon sx={{ fontSize: '16px !important' }} />}
            onClick={handleLogout}
            sx={{
              borderRadius: 1,
              textTransform: 'none',
              fontSize: { xs: 11, sm: 13 },
              height: 28,
              fontWeight: 600,
            }}
          >
            Salir
          </Button>
        </Box>
      </Box>

      {/* ── Main Content ── */}
      <Container maxWidth="md" sx={{ flex: 1, py: { xs: 2, sm: 4 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>
            {error}
          </Alert>
        )}

        {!isAdmin && (loadingActiveAppointment || activeAppointment) && (
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
                  <Typography variant="body2" className="active-appointment-copy">
                    Para tomar una nueva hora, primero cancela o completa esta reserva.
                  </Typography>
                </Box>

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
                  <Chip
                    label={appointmentStatusLabel[activeAppointment.status]}
                    size="small"
                    color={activeAppointment.status === 'confirmed' ? 'success' : 'warning'}
                    className="active-appointment-status"
                  />
                </Box>
              </>
            ) : null}
          </Paper>
        )}

        {/* ── Barbers Grid ── */}
        <Fade in timeout={500}>
          <Paper elevation={0} className="dashboard-container-card">
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
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={loadBarbers}
                sx={{ textTransform: 'none', fontWeight: 600, fontSize: { xs: 12, sm: 13 } }}
              >
                Actualizar
              </Button>
            </Box>

            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              {loadingBarbers ? (
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Paper
                      key={i}
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 2,
                      }}
                    >
                      <Skeleton variant="circular" width={58} height={58} />
                      <Skeleton width="55%" height={24} />
                    </Paper>
                  ))}
                </Box>
              ) : barbers.length === 0 ? (
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
      </Container>
    </Box>
  )
}
