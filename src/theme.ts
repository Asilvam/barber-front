import { createTheme, type ThemeOptions } from '@mui/material/styles';

// Keep MUI as source of truth for colors/typography but mirror the CSS variables
const theme = createTheme({
  palette: {
    primary: {
      main: '#c91470',
      dark: '#941251',
      light: '#f9deeb',
      contrastText: '#fff',
    },
    secondary: {
      main: '#4a474e',
    },
    background: {
      default: '#f5f3f4',
      paper: '#ffffff',
    },
    text: {
      primary: '#1b191d',
      secondary: '#5e5961',
    },
    divider: '#e3dce1',
  },
  typography: {
    fontFamily: ['Work Sans', 'Helvetica Neue', 'Arial', 'sans-serif'].join(','),
    h1: {
      fontFamily: 'Oswald, Impact, sans-serif',
      fontWeight: 600,
    },
    h2: {
      fontFamily: 'Oswald, Impact, sans-serif',
      fontWeight: 600,
    },
    h3: {
      fontFamily: 'Oswald, Impact, sans-serif',
      fontWeight: 600,
    },
    body1: {
      color: '#18201d',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
        contained: {
          // slight default contained adjustments
        },
        outlined: {
          // slight default outlined adjustments
        },
      },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: {
            background: 'linear-gradient(135deg, #c91470, #ed3c98)',
            color: '#fff',
            boxShadow: '0 12px 20px -16px rgba(148, 18, 81, 0.6)',
          },
        },
        {
          props: { variant: 'outlined', color: 'primary' },
          style: {
            borderColor: 'rgba(201, 20, 112, 0.35)',
          },
        },
      ],
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#fff',
        },
      },
    },
  },
} as ThemeOptions);

export default theme;
