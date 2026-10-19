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

import cutDetail from '../assets/portfolio/cut-detail.jpg'
import lowFade from '../assets/portfolio/low-fade.jpg'
import curlyFade from '../assets/portfolio/curly-fade.jpg'
import fadePromo from '../assets/portfolio/fade-promo.svg'

const barberSlides = [
  {
    src: fadePromo,
    alt: 'Promoción Shalo Barber: corte degradado, cejas, diseño de líneas, barba y asesoramiento por $8.000. Agenda ahora.',
    position: 'center',
    durationMs: 10000,
  },
  {
    src: cutDetail,
    alt: 'Degradado con diseño de líneas, visto de perfil',
    position: '54% center',
  },
  {
    src: lowFade,
    alt: 'Corte fade con volumen y acabado limpio',
    position: '52% center',
  },
  {
    src: curlyFade,
    alt: 'Degradado en cabello rizado',
    position: '52% center',
  },
]

function Home() {
  const [slideIndex, setSlideIndex] = useState(0)
  const appVersion = packageMeta.version
  const isLoggedIn = !!localStorage.getItem('auth_token')

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSlideIndex((prev) => (prev + 1) % barberSlides.length)
    }, barberSlides[slideIndex].durationMs ?? 5200)
    return () => window.clearTimeout(timeout)
  }, [slideIndex])

  return (
    <Box className="auth-layout home-layout">
      <Container
        maxWidth={false}
        className="home-container"
      >
        <Box className="home-content-row">
          {/* Brand Card */}
          <Box className="home-brand-card home-copy-column">
            <Typography variant="h1" sx={{ fontSize: { xs: 32, sm: 44 }, mb: 1 }}>
              Un corte que se nota.
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 2 }}>
              Tu estilo, tu hora. Reserva tu próximo corte con Shalo Barber.
            </Typography>
            <Box sx={{ display: 'grid', gap: 1, fontWeight: 500, color: 'primary.dark', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box component="span" sx={{ width: 24, height: 24, bgcolor: 'primary.light', color: 'primary.dark', borderRadius: 1, display: 'grid', placeItems: 'center' }}>✓</Box>
                <Typography variant="body2">Cortes con detalle</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box component="span" sx={{ width: 24, height: 24, bgcolor: 'primary.light', color: 'primary.dark', borderRadius: 1, display: 'grid', placeItems: 'center' }}>✓</Box>
                <Typography variant="body2">Horarios disponibles</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box component="span" sx={{ width: 24, height: 24, bgcolor: 'primary.light', color: 'primary.dark', borderRadius: 1, display: 'grid', placeItems: 'center' }}>✓</Box>
                <Typography variant="body2">Reserva en minutos</Typography>
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
          <Box className="home-media-column">
            <Box className="brand-visual home-brand-visual">
              <div className="carousel home-carousel">
              {barberSlides.map((slide, index) => (
                <img
                  key={slide.src}
                  src={slide.src}
                  alt={slide.alt}
                  className={`${index === slideIndex ? 'active' : ''} ${slide.src === fadePromo ? 'promo-slide' : ''}`}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  style={{ objectPosition: slide.position }}
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
        </Box>
      </Container>
      <Box component="footer" className="footer footer-wide" sx={{ py: 2, px: { xs: 2, sm: 7 }, bgcolor: 'background.paper', mt: 'auto' }}>
        <span>Shalo Barber</span>
        <span className="version">Version {appVersion}</span>
      </Box>
    </Box>
  )
}

export default Home
