import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Login', to: '/login' },
]

function NavBar() {
  const businessName =
    import.meta.env.VITE_BUSINESS_NAME?.trim() || 'Barber System'
  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{
        boxShadow: 'none',
        background: 'none',
        p: 0,
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          px: { xs: 2, sm: 7 },
          py: { xs: 1, sm: 3 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              bgcolor: 'primary.light',
              color: 'primary.dark',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            BS
          </Box>
          <Typography
            variant="h6"
            component="p"
            sx={{
              fontWeight: 600,
              color: 'primary.dark',
              m: 0,
            }}
          >
            {businessName}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {navItems.map((item) => (
            <Button
              key={item.to}
              component={NavLink}
              to={item.to}
              variant="outlined"
              color="primary"
              sx={{
                borderRadius: 999,
                fontWeight: 600,
                px: 2,
                textTransform: 'none',
              }}
              activeClassName="active"
            >
              {item.label}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default NavBar
