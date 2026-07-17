import { createTheme, type ThemeOptions } from '@mui/material/styles';

// Keep MUI as source of truth for colors/typography but mirror the CSS variables
const theme = createTheme({
  palette: {
    primary: {
      main: '#2f6b5f',
      dark: '#1e4a43',
      light: '#d8e6e2',
      contrastText: '#fff',
    },
    secondary: {
      main: '#5d6762',
    },
    background: {
      default: '#f3f5f4',
      paper: '#ffffff',
    },
    text: {
      primary: '#18201d',
      secondary: '#5d6762',
    },
    divider: '#d8dfdc',
  },
  typography: {
    fontFamily: ['Work Sans', 'Helvetica Neue', 'Arial', 'sans-serif'].join(','),
    h1: {
      fontFamily: 'Playfair Display, Times New Roman, serif',
      fontWeight: 600,
    },
    h2: {
      fontFamily: 'Playfair Display, Times New Roman, serif',
      fontWeight: 600,
    },
    h3: {
      fontFamily: 'Playfair Display, Times New Roman, serif',
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
            background: 'linear-gradient(135deg, #2f6b5f, #3f7f72)',
            color: '#fff',
            boxShadow: '0 12px 20px -16px rgba(30, 74, 67, 0.6)',
          },
        },
        {
          props: { variant: 'outlined', color: 'primary' },
          style: {
            borderColor: 'rgba(47, 107, 95, 0.35)',
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
