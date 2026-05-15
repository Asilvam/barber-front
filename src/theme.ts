import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#b2794c',
      dark: '#7c4c2f',
      light: '#f1d8c5',
    },
    secondary: {
      main: '#5f5b50',
    },
    background: {
      default: '#f3ede7',
      paper: '#fbf7f2',
    },
  },
  typography: {
    fontFamily: [
      'Work Sans',
      'Helvetica Neue',
      'Arial',
      'sans-serif',
    ].join(','),
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
  },
});

export default theme;

