import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import packageMeta from '../../package.json'
import NavBar from '../components/NavBar'
import type { AuthResponse } from '../types/auth'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Divider from '@mui/material/Divider'
import MuiLink from '@mui/material/Link'
import CircularProgress from '@mui/material/CircularProgress'

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: unknown) => void | Promise<void>;
  }): void;
  renderButton(
    element: HTMLElement,
    config: {
      theme?: string;
      size?: string;
      shape?: string;
      text?: string;
      width?: number;
    }
  ): void;
}

interface GoogleAccounts {
  id: GoogleAccountsId;
}

interface GoogleObject {
  accounts: GoogleAccounts;
}

declare global {
  interface Window {
    google?: GoogleObject;
  }
}

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
  const googleButtonRef = useRef<HTMLDivElement | null>(null)
  const googleRenderedRef = useRef(false)

  const apiBaseUrl = useMemo(() => {
    return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
  }, [])
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const [googleEnabled, setGoogleEnabled] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(() => {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID ? null : 'VITE_GOOGLE_CLIENT_ID no configurado'
  })
  const appVersion = packageMeta.version

  // callbacks and helper functions declared in order to satisfy linting

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

  const handleGoogleLogin = useCallback(async (credential: string) => {
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
  }, [apiBaseUrl, saveAuth])

  const handleManualLogin = useCallback(async (event: React.FormEvent) => {
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
  }, [apiBaseUrl, email, password, saveAuth])

  const initializeGoogle = useCallback(async (): Promise<void> => {
    if (!googleClientId || !googleButtonRef.current) {
      throw new Error('Google client ID o contenedor no disponible')
    }
    if (googleRenderedRef.current) {
      setGoogleEnabled(true)
      return
    }

    // Wait for window.google.accounts.id to be available with timeout
    const waitForGoogleAccounts = (timeout = 3000, interval = 200) =>
      new Promise<void>((resolve, reject) => {
        const start = Date.now()
        const tick = () => {
          const g = window.google
          if (g?.accounts?.id) {
            return resolve()
          }
          if (Date.now() - start >= timeout) {
            return reject(new Error('API de Google no disponible en window.google (timeout)'))
          }
          setTimeout(tick, interval)
        }
        tick()
      })

    try {
      console.debug('Waiting for window.google.accounts.id to be available...')
      await waitForGoogleAccounts(4000, 250)
    } catch (err) {
      console.error('Google accounts.id not available:', err)
      throw err
    }

    const googleApi = window.google
    try {
      console.debug('Initializing google.accounts.id', googleApi?.accounts?.id)
      googleApi?.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response: unknown) => {
          const resp = response as { credential?: string } | null
          if (!resp || !resp.credential) {
            setError('No se pudo obtener la credencial de Google.')
            return
          }
          await handleGoogleLogin(resp.credential)
        },
      })
      googleApi?.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        width: 320,
      })
      console.debug('Google button render attempted')
      googleRenderedRef.current = true
      setGoogleEnabled(true)
    } catch (err) {
      console.error('Error initializing Google Identity:', err)
      throw err
    }
  }, [googleClientId, handleGoogleLogin])

  const initializeGoogleCb = useCallback(async () => {
    return initializeGoogle()
  }, [initializeGoogle])

  useEffect(() => {
    if (!googleClientId) {
      return
    }

    const scriptId = 'google-identity-service'
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null
    if (existingScript) {
      // script already present: try to initialize
      initializeGoogleCb().catch((err) => setGoogleError(String(err)))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.id = scriptId
    script.onload = () => {
      console.debug('Google Identity script loaded')
      // Give the library a short moment to attach to window.google.accounts.id
      initializeGoogleCb().catch((err) => {
        console.error('initializeGoogle failed after script load:', err)
        setGoogleError(String(err))
      })
    }
    script.onerror = () => setGoogleError('No se pudo cargar la librería de Google Identity')
    document.body.appendChild(script)

    return () => {
      // avoid leaking handlers
      script.onload = null
      script.onerror = null
    }
  }, [googleClientId, initializeGoogleCb])

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
              Bienvenido
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
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, flexDirection: 'column', alignItems: 'center' }}>
            {googleClientId ? (
              <>
                <Box ref={googleButtonRef} data-google-button="true" component="div" sx={{ width: 320, minHeight: 44 }} />
                {!googleEnabled && !googleError ? (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    Cargando inicio de sesión con Google…
                  </Typography>
                ) : null}
                {googleError ? (
                  <Typography color="error" sx={{ mt: 1, fontWeight: 600 }}>
                    {googleError}
                  </Typography>
                ) : null}
              </>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Google Sign-In no configurado. Establece <code>VITE_GOOGLE_CLIENT_ID</code> en tu archivo de entorno.
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 3,
              fontSize: 13,
            }}
          >
            <MuiLink
              onClick={() => navigate('/register')}
              underline="hover"
              color="primary"
              sx={{ cursor: 'pointer', fontWeight: 600 }}
            >
              ¿No tienes cuenta? Regístrate aquí
            </MuiLink>
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
            <MuiLink href="/" underline="hover" color="primary">
              Volver al inicio
            </MuiLink>
            <Box component="span" sx={{ color: 'divider' }}>•</Box>
            <Box component="span" sx={{ color: 'secondary.main' }}>Soporte</Box>
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

export default Login
