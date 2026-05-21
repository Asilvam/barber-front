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
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import PhoneIcon from '@mui/icons-material/Phone'
import EmailIcon from '@mui/icons-material/Email'
import type { AuthUser } from '../types/auth'
import './Dashboard.css'

import {
  fetchBarbers,
  type Barber,
} from '../api/barber'

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

/* ──────────────────── component ──────────────────── */

export default function Dashboard() {
  const navigate = useNavigate()
  const user = getAuthUser()

  // ── state ──
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loadingBarbers, setLoadingBarbers] = useState(false)
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
            Dashboard
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {user && user.role === 'admin' && (
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<AdminPanelSettingsIcon />}
              onClick={() => navigate('/admin/barbers')}
              sx={{
                borderRadius: 999,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: { xs: 11, sm: 13 },
                boxShadow: '0 4px 14px rgba(178,121,76,0.25)',
              }}
            >
              Admin Horarios
            </Button>
          )}
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
              borderRadius: 999,
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
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
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
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        gap: 2,
                      }}
                    >
                      <Skeleton variant="circular" width={40} height={40} />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton width="60%" height={20} sx={{ mb: 1 }} />
                        <Skeleton width="80%" height={16} sx={{ mb: 0.5 }} />
                        <Skeleton width="40%" height={16} />
                      </Box>
                    </Paper>
                  ))}
                </Box>
              ) : barbers.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                  <Typography variant="body2">No hay barberos registrados</Typography>
                </Box>
              ) : (
                <Box className="barbers-grid">
                  {barbers.map((barber) => {
                    return (
                      <Paper
                        key={barber._id}
                        elevation={0}
                        onClick={() => handleSelectBarber(barber)}
                        className="barber-card"
                      >
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: '50%',
                              bgcolor: 'primary.light',
                              color: 'primary.dark',
                              display: 'grid',
                              placeItems: 'center',
                              fontWeight: 700,
                              fontSize: 16,
                              flexShrink: 0,
                              transition: 'all 0.2s',
                            }}
                          >
                            {barber.name.charAt(0).toUpperCase()}
                          </Box>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}
                              noWrap
                            >
                              {barber.name}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.5 }}>
                              <EmailIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {barber.email}
                              </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                              <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {barber.phone}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
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
