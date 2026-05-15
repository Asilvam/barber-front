import { useEffect, useMemo, useRef, useState } from 'react'
import packageMeta from '../../package.json'
import NavBar from '../components/NavBar'
import type { AuthResponse, AuthUser } from '../types/auth'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Divider from '@mui/material/Divider'
import MuiLink from '@mui/material/Link'

// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    google?: any;
  }
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const businessName =
    import.meta.env.VITE_BUSINESS_NAME?.trim() || 'Barber System'
  const googleButtonRef = useRef<HTMLDivElement | null>(null)
  const googleRenderedRef = useRef(false)

  const apiBaseUrl = useMemo(() => {
    return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
  }, [])
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const appVersion = packageMeta.version

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('auth_user')
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser) as AuthUser)
    }
  }, [])

  useEffect(() => {
    if (!googleClientId) {
      return
    }

    const scriptId = 'google-identity-service'
    const existingScript = document.getElementById(scriptId)
    if (existingScript) {
      initializeGoogle()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.id = scriptId
    script.onload = initializeGoogle
    script.onerror = null
    document.body.appendChild(script)

    return () => {
      script.onload = null
    }
  }, [googleClientId])

  const initializeGoogle = () => {
    if (!googleClientId || !googleButtonRef.current) {
      return
    }
    if (googleRenderedRef.current) {
      return
    }
    const googleApi = window.google
    if (!googleApi?.accounts?.id) {
      return
    }
    googleApi.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (response: any) => {
        if (!response?.credential) {
          setError('No se pudo obtener la credencial de Google.')
          return
        }
        await handleGoogleLogin(response.credential)
      },
    })
    googleApi.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'signin_with',
      width: 320,
    })
    googleRenderedRef.current = true
  }

  const saveAuth = (payload: AuthResponse) => {
    setToken(payload.token)
    setUser(payload.user)
    localStorage.setItem('auth_token', payload.token)
    localStorage.setItem('auth_user', JSON.stringify(payload.user))
  }

  const clearAuth = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }

  const handleManualLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })
      if (!response.ok) {
        throw new Error('Credenciales invalidas')
      }
      const payload = (await response.json()) as AuthResponse
      saveAuth(payload)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar sesion. Revisa tus datos.',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async (credential: string) => {
    setError(null)
    setLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential }),
      })
      if (!response.ok) {
        throw new Error('No se pudo autenticar con Google')
      }
      const payload = (await response.json()) as AuthResponse
      saveAuth(payload)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo validar Google. Intenta nuevamente.',
      )
    } finally {
      setLoading(false)
    }
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
          {user ? (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Typography variant="overline" color="secondary">
                Sesión iniciada
              </Typography>
              <Typography variant="h5">Hola, {user.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                Tu token ya está listo para usar.
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1,
                  borderRadius: 2,
                  border: '1px dashed',
                  borderColor: 'divider',
                  bgcolor: '#fff',
                  fontSize: 13,
                }}
              >
                <span>JWT</span>
                <code>{token?.slice(0, 20)}...</code>
              </Box>
              <Button
                variant="contained"
                color="primary"
                onClick={clearAuth}
                sx={{ borderRadius: 999 }}
              >
                Cerrar sesión
              </Button>
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="overline" color="secondary">
                  Bienvenido
                </Typography>
                <Typography variant="h5" sx={{ mb: 1 }}>
                  Acceso a tu panel
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ingresa con tus credenciales.
                </Typography>
              </Box>
              <Box
                component="form"
                onSubmit={handleManualLogin}
                sx={{ display: 'grid', gap: 2 }}
              >
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  fullWidth
                  size="small"
                />
                {error ? (
                  <Typography
                    color="error"
                    sx={{ fontWeight: 600 }}
                  >
                    {error}
                  </Typography>
                ) : null}
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  sx={{ borderRadius: 999 }}
                >
                  {loading ? 'Ingresando...' : 'Entrar'}
                </Button>
              </Box>
              <Divider sx={{ my: 2 }}>o</Divider>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <div
                  ref={googleButtonRef}
                  style={{ width: 320, minHeight: 44 }}
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 2,
                  fontSize: 13,
                  color: 'text.secondary',
                }}
              >
                <MuiLink
                  href="/"
                  underline="hover"
                  color="primary.main"
                >
                  Volver al inicio
                </MuiLink>
                <span style={{ color: '#dfd4c8' }}>•</span>
                <span style={{ color: '#6b5d58' }}>Soporte</span>
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
            </>
          )}
        </Box>
      </Container>
    </Box>
  )
}

export default Login
