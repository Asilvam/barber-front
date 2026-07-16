import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import packageMeta from '../../package.json'
import type { AuthResponse } from '../types/auth'
import { register } from '../api/auth'
import { getAuthToken, saveAuthSession } from '../auth/session'
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


  const [token, setToken] = useState<string | null>(() => getAuthToken())

  const businessName =
    import.meta.env.VITE_BUSINESS_NAME?.trim() || 'Barber System'
  const appVersion = packageMeta.version

  const saveAuth = useCallback((payload: AuthResponse) => {
    setToken(payload.token)
    saveAuthSession(payload)
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
        const payload = await register(name, email, password)
        saveAuth(payload)
      } catch (err) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setError(
          msg ??
            (err instanceof Error
              ? err.message
              : 'Ocurrió un error inesperado al intentar registrarte.'),
        )
      } finally {
        setLoading(false)
      }
    },
    [name, email, password, confirmPassword, saveAuth],
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
    <Box className="auth-layout">
      <Container maxWidth="xs" className="auth-container">
        <Box className="auth-card">
          <Box className="auth-header">
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
            className="auth-form"
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
              className="auth-submit-btn"
            >
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </Button>
          </Box>
          <Box className="auth-footer-link">
            <MuiLink
              onClick={() => navigate('/login')}
              underline="hover"
              color="primary"
              className="auth-link"
            >
              ¿Ya tienes cuenta? Inicia sesión
            </MuiLink>
          </Box>
          <Box
            component="footer"
            className="auth-footer"
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
