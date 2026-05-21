import { useState, useCallback, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import packageMeta from '../../package.json'
import NavBar from '../components/NavBar'
import type { AuthResponse } from '../types/auth'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import MuiLink from '@mui/material/Link'
import CircularProgress from '@mui/material/CircularProgress'

function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)


  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('auth_token')
    } catch {
      return null
    }
  })

  const businessName =
    import.meta.env.VITE_BUSINESS_NAME?.trim() || 'Barber System'
  const appVersion = packageMeta.version

  const apiBaseUrl = useMemo(() => {
    return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
  }, [])

  const saveAuth = useCallback((payload: AuthResponse) => {
    setToken(payload.token)
    localStorage.setItem('auth_token', payload.token)
    localStorage.setItem('auth_user', JSON.stringify(payload.user))
    navigate('/dashboard')
  }, [navigate])



  useEffect(() => {
    if (token) {
      navigate('/dashboard')
    }
  }, [token, navigate])

  const handleRegister = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      setError(null)

      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.')
        return
      }

      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.')
        return
      }

      setLoading(true)
      try {
        const response = await fetch(`${apiBaseUrl}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, email, password }),
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || 'Error al registrar el usuario. Revisa tus datos.')
        }

        const payload = (await response.json()) as AuthResponse
        saveAuth(payload)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Ocurrió un error inesperado al intentar registrarte.',
        )
      } finally {
        setLoading(false)
      }
    },
    [apiBaseUrl, name, email, password, confirmPassword, saveAuth],
  )

  if (token) {
    return (
      <Box
        sx={{
          minHeight: '100svh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'radial-gradient(circle at top left, #f7efe6 0%, #efe2d6 45%, #e7d7c8 100%)',
        }}
      >
        <CircularProgress color="primary" />
        <Typography variant="body2" sx={{ mt: 2, color: 'primary.dark', fontWeight: 600 }}>
          Redirigiendo...
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      className="auth-layout"
      sx={{
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <NavBar />
      <Container
        maxWidth="xs"
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: { xs: 4, sm: 8 },
        }}
      >
        <Box
          sx={{
            width: '100%',
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: 3,
            p: { xs: 3, sm: 4 },
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Typography variant="overline" color="secondary">
              Crea tu Cuenta
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Regístrate para comenzar a agendar tus citas.
            </Typography>
          </Box>
          <Box
            component="form"
            onSubmit={handleRegister}
            sx={{ display: 'grid', gap: 2 }}
          >
            <TextField
              label="Nombre Completo"
              type="text"
              placeholder="Juan Pérez"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              fullWidth
              size="small"
            />
            <TextField
              label="Email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              fullWidth
              size="small"
            />
            <TextField
              label="Contraseña"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              fullWidth
              size="small"
            />
            <TextField
              label="Confirmar Contraseña"
              type="password"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              fullWidth
              size="small"
            />
            {error ? (
              <Typography color="error" sx={{ fontWeight: 600 }}>
                {error}
              </Typography>
            ) : null}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ borderRadius: 999, mt: 1 }}
            >
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </Button>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
              fontSize: 13,
              color: 'text.secondary',
              mt: 3,
            }}
          >
            <MuiLink
              onClick={() => navigate('/login')}
              underline="hover"
              color="primary"
              sx={{ cursor: 'pointer' }}
            >
              ¿Ya tienes cuenta? Inicia sesión
            </MuiLink>
          </Box>
          <Box
            component="footer"
            className="footer"
            sx={{
              mt: 3,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'text.secondary',
            }}
          >
            <span>{businessName}</span>
            <span className="version">Version {appVersion}</span>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

export default Register
