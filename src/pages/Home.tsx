import { useEffect, useState } from 'react'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { Link as RouterLink } from 'react-router-dom'
import packageMeta from '../../package.json'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt'
import LoginIcon from '@mui/icons-material/Login'

import img from '../assets/img.png'
import img1 from '../assets/img_1.png'
import img2 from '../assets/img_2.png'
import img3 from '../assets/img_3.png'
import img4 from '../assets/img_4.png'

const barberSlides = [
  {
    src: img,
    alt: 'Barberia moderna con estilo premium',
  },
  {
    src: img1,
    alt: 'Corte masculino moderno con acabado limpio',
  },
  {
    src: img2,
    alt: 'Estilo moderno con degradado preciso',
  },
  {
    src: img3,
    alt: 'Look masculino con corte prolijo',
  },
  {
    src: img4,
    alt: 'Corte premium con textura y peinado moderno',
  },
]

function Home() {
  const [slideIndex, setSlideIndex] = useState(0)
  const appVersion = packageMeta.version
  const businessName =
    import.meta.env.VITE_BUSINESS_NAME?.trim() || 'Barber System'
  const isLoggedIn = !!localStorage.getItem('auth_token')

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % barberSlides.length)
    }, 5200)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <Box className="auth-layout home-layout">
      <Container
        maxWidth="md"
        className="home-container"
      >
        <Box className="home-content-row">
          {/* Brand Card */}
          <Box className="home-brand-card">
            <Typography variant="overline" color="secondary" sx={{ textTransform: 'uppercase', letterSpacing: 2.4 }}>
              {businessName}
            </Typography>
            <Typography variant="h1" sx={{ fontSize: { xs: 32, sm: 44 }, mb: 1 }}>
              Sistema de Reservas
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 2 }}>
              Reserva con tu barbero favorito.
            </Typography>
            <Box sx={{ display: 'grid', gap: 1, fontWeight: 500, color: 'primary.dark', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box component="span" sx={{ width: 24, height: 24, bgcolor: 'primary.light', color: 'primary.dark', borderRadius: 1, display: 'grid', placeItems: 'center' }}>✓</Box>
                <Typography variant="body2">Elige y reserva</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box component="span" sx={{ width: 24, height: 24, bgcolor: 'primary.light', color: 'primary.dark', borderRadius: 1, display: 'grid', placeItems: 'center' }}>✓</Box>
                <Typography variant="body2">Disponibilidad real</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box component="span" sx={{ width: 24, height: 24, bgcolor: 'primary.light', color: 'primary.dark', borderRadius: 1, display: 'grid', placeItems: 'center' }}>✓</Box>
                <Typography variant="body2">Confirmaciones rápidas</Typography>
              </Box>
            </Box>

            <Box className="home-actions">
              <Button
                component={RouterLink}
                to={isLoggedIn ? '/dashboard' : '/login'}
                variant="contained"
                color="primary"
                startIcon={isLoggedIn ? <CalendarMonthIcon /> : <LoginIcon />}
                className="home-primary-action"
              >
                {isLoggedIn ? 'Reservar ahora' : 'Iniciar sesión'}
              </Button>

              {!isLoggedIn && (
                <Button
                  component={RouterLink}
                  to="/register"
                  variant="outlined"
                  color="primary"
                  startIcon={<PersonAddAltIcon />}
                  className="home-secondary-action"
                >
                  Crear cuenta
                </Button>
              )}
            </Box>
          </Box>
          {/* Carrusel de imágenes */}
          <Box className="brand-visual">
            <div className="carousel">
              {barberSlides.map((slide, index) => (
                <img
                  key={slide.src}
                  src={slide.src}
                  alt={slide.alt}
                  className={index === slideIndex ? 'active' : ''}
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              ))}

              <div className="carousel-controls">
                <button
                  type="button"
                  aria-label="Imagen anterior"
                  onClick={() => setSlideIndex((prev) => (prev - 1 + barberSlides.length) % barberSlides.length)}
                  className="carousel-btn"
                >
                  ‹
                </button>

                <div className="carousel-dots">
                  {barberSlides.map((slide, index) => (
                    <button
                      key={slide.src}
                      type="button"
                      aria-label={`Ir a la imagen ${index + 1}`}
                      aria-pressed={index === slideIndex}
                      onClick={() => setSlideIndex(index)}
                      className={`dot ${index === slideIndex ? 'active' : ''}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  aria-label="Imagen siguiente"
                  onClick={() => setSlideIndex((prev) => (prev + 1) % barberSlides.length)}
                  className="carousel-btn"
                >
                  ›
                </button>
              </div>
            </div>
          </Box>
        </Box>
      </Container>
      <Box component="footer" className="footer footer-wide" sx={{ py: 2, px: { xs: 2, sm: 7 }, bgcolor: 'background.paper', mt: 'auto' }}>
        <span>{businessName}</span>
        <span className="version">Version {appVersion}</span>
      </Box>
    </Box>
  )
}

export default Home
