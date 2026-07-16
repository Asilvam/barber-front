import { createTheme, type ThemeOptions } from '@mui/material/styles';

// Keep MUI as source of truth for colors/typography but mirror the CSS variables
const theme = createTheme({
  palette: {
    primary: {
      main: '#b2794c',
      dark: '#7c4c2f',
      light: '#f1d8c5',
      contrastText: '#fff',
    },
    secondary: {
      main: '#5f5b50',
    },
    background: {
      default: '#f3ede7',
      paper: '#fbf7f2',
    },
    text: {
      primary: '#1f1b1a',
      secondary: '#6b5d58',
    },
    divider: '#dfd4c8',
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
      color: '#1f1b1a',
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
            background: 'linear-gradient(135deg, #b2794c, #c79b6f)',
            color: '#fff',
            boxShadow: '0 12px 20px -16px rgba(124, 76, 47, 0.7)',
          },
        },
        {
          props: { variant: 'outlined', color: 'primary' },
          style: {
            borderColor: 'rgba(178, 121, 76, 0.35)',
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
