import { useEffect, useState } from 'react'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import NavBar from '../components/NavBar'
import packageMeta from '../../package.json'

const barberSlides = [
  {
    src: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1400&q=80',
    alt: 'Barberia moderna con estilo premium',
  },
  {
    src: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1400&q=80',
    alt: 'Corte masculino moderno con acabado limpio',
  },
  {
    src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1400&q=80',
    alt: 'Estilo moderno con degradado preciso',
  },
  {
    src: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1400&q=80',
    alt: 'Look masculino con corte prolijo',
  },
  {
    src: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1400&q=80',
    alt: 'Corte premium con textura y peinado moderno',
  },
  {
    src: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1400&q=80',
    alt: 'Estilo masculino contemporaneo',
  },
]

function Home() {
  const [slideIndex, setSlideIndex] = useState(0)
  const appVersion = packageMeta.version
  const businessName =
    import.meta.env.VITE_BUSINESS_NAME?.trim() || 'Barber System'

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % barberSlides.length)
    }, 5200)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <Box className="auth-layout home-layout" sx={{ minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
      <NavBar />
      <Container maxWidth="md" sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: { xs: 4, sm: 8 } }}>
        <Box sx={{ width: '100%', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 4, md: 8 }, alignItems: 'center', justifyContent: 'center' }}>
          {/* Brand Card */}
          <Box sx={{ maxWidth: 420, flex: 1, display: 'grid', gap: 2, zIndex: 2 }}>
            <Typography variant="overline" color="secondary" sx={{ textTransform: 'uppercase', letterSpacing: 2.4 }}>
              {businessName}
            </Typography>
            <Typography variant="h1" sx={{ fontSize: { xs: 32, sm: 44 }, mb: 1 }}>
              Reservas Barberos {businessName}
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
          </Box>
          {/* Carrusel de imágenes */}
          <Box className="brand-visual" sx={{ position: 'relative', width: { xs: '100%', sm: 320, md: 360 }, height: { xs: 200, sm: 240, md: 320 }, borderRadius: 4, overflow: 'hidden', boxShadow: 3, flex: 1, zIndex: 1 }}>
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
