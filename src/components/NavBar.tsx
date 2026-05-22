import { useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import { NavLink } from 'react-router-dom'

import img5 from '../assets/img_5.png'
import img6 from '../assets/img_6.png'

// Icons
import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import HomeIcon from '@mui/icons-material/Home'
import DashboardIcon from '@mui/icons-material/Dashboard'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import LoginIcon from '@mui/icons-material/Login'

function getAuthUser(): { role?: string } | null {
  try {
    const raw = localStorage.getItem('auth_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function NavBar() {
  const businessName =
    import.meta.env.VITE_BUSINESS_NAME?.trim() || 'Barber System'
  const isLoggedIn = !!localStorage.getItem('auth_token')
  const user = getAuthUser()
  const isAdmin = user?.role === 'admin'

  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <AppBar
      className="navbar-appbar"
      color="transparent"
      elevation={0}
    >
      <Toolbar className="navbar-toolbar">
        {/* Branding */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box className="navbar-logo-monogram">
            <img src={img5} alt="Logo" className="navbar-logo-icon" />
          </Box>
          <Typography
            variant="h6"
            component="p"
            className="navbar-brand-text"
          >
            {businessName}
          </Typography>
        </Box>

        {/* Desktop Menu */}
        <Box className="navbar-desktop-menu">
          <NavLink to="/" className="nav-hover-link">
            Inicio
          </NavLink>

          {isLoggedIn ? (
            <>
              {isAdmin && (
                <NavLink to="/admin/barbers" className="nav-btn-link">
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<AdminPanelSettingsIcon sx={{ fontSize: '18px !important' }} />}
                    className="navbar-btn-admin"
                  >
                    Admin
                  </Button>
                </NavLink>
              )}
              <NavLink to="/dashboard" className="nav-btn-link">
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<DashboardIcon sx={{ fontSize: '18px !important' }} />}
                  className="navbar-btn-dashboard"
                >
                  Dashboard
                </Button>
              </NavLink>
            </>
          ) : (
            <NavLink to="/login" className="nav-btn-link">
              <Button
                variant="outlined"
                color="primary"
                startIcon={<LoginIcon sx={{ fontSize: '18px !important' }} />}
                className="navbar-btn-login"
              >
                Login
              </Button>
            </NavLink>
          )}
        </Box>

        {/* Mobile Burger Icon */}
        <IconButton
          color="primary"
          aria-label="open menu"
          onClick={() => setMobileOpen(true)}
          className="navbar-mobile-burger"
        >
          <MenuIcon />
        </IconButton>
      </Toolbar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        slotProps={{
          paper: {
            className: "navbar-drawer-paper"
          }
        }}
      >
        <Box className="navbar-drawer-header">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box className="navbar-logo-monogram" sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>
              <img src={img6} alt="Logo" className="navbar-logo-icon" />
            </Box>
            <Typography
              variant="subtitle1"
              className="navbar-brand-text"
              sx={{ fontSize: 16 }}
            >
              {businessName}
            </Typography>
          </Box>
          <IconButton onClick={() => setMobileOpen(false)} color="primary">
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ borderColor: 'rgba(178, 121, 76, 0.12)' }} />

        <List sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 0 }}>
          <ListItem disablePadding>
            <ListItemButton
              component={NavLink}
              to="/"
              onClick={() => setMobileOpen(false)}
              className="navbar-drawer-list-item-btn"
            >
              <ListItemIcon sx={{ minWidth: 35, color: 'inherit' }}>
                <HomeIcon sx={{ fontSize: 20 }} />
              </ListItemIcon>
              <ListItemText
                primary="Inicio"
                sx={{ '& .MuiListItemText-primary': { fontWeight: 600, fontSize: '0.9rem' } }}
              />
            </ListItemButton>
          </ListItem>

          {isLoggedIn ? (
            <>
              <ListItem disablePadding>
                <ListItemButton
                  component={NavLink}
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="navbar-drawer-list-item-btn"
                >
                  <ListItemIcon sx={{ minWidth: 35, color: 'inherit' }}>
                    <DashboardIcon sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Dashboard"
                    sx={{ '& .MuiListItemText-primary': { fontWeight: 600, fontSize: '0.9rem' } }}
                  />
                </ListItemButton>
              </ListItem>

              {isAdmin && (
                <ListItem disablePadding>
                  <ListItemButton
                    component={NavLink}
                    to="/admin/barbers"
                    onClick={() => setMobileOpen(false)}
                    className="navbar-drawer-list-item-btn"
                  >
                    <ListItemIcon sx={{ minWidth: 35, color: 'inherit' }}>
                      <AdminPanelSettingsIcon sx={{ fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Admin Horarios"
                      sx={{ '& .MuiListItemText-primary': { fontWeight: 600, fontSize: '0.9rem' } }}
                    />
                  </ListItemButton>
                </ListItem>
              )}
            </>
          ) : (
            <ListItem disablePadding>
              <ListItemButton
                component={NavLink}
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="navbar-drawer-list-item-btn"
              >
                <ListItemIcon sx={{ minWidth: 35, color: 'inherit' }}>
                  <LoginIcon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText
                  primary="Login"
                  sx={{ '& .MuiListItemText-primary': { fontWeight: 600, fontSize: '0.9rem' } }}
                />
              </ListItemButton>
            </ListItem>
          )}
        </List>
      </Drawer>
    </AppBar>
  )
}

export default NavBar
