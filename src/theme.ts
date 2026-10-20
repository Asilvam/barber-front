import { palette } from './palette';
import { createTheme, type ThemeOptions } from '@mui/material/styles';

// Keep MUI as source of truth for colors/typography but mirror the CSS variables
const theme = createTheme({
  palette: {
    primary: {
      main: palette.primary,
      dark: palette.primaryDark,
      light: palette.primaryLight,
      contrastText: '#fff',
    },
    secondary: {
      main: palette.secondary,
    },
    warning: { main: palette.pending.main },
    success: { main: palette.confirmed.main },
    error: { main: palette.cancelled.main },
    info: { main: palette.info.main },
    background: {
      default: palette.surface,
      paper: palette.panel,
    },
    text: {
      primary: palette.charcoal,
      secondary: palette.textSecondary,
    },
    divider: palette.border,
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
      color: palette.charcoal,
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
    MuiChip: {
      styleOverrides: {
        root: ({ ownerState }) => {
          const tones = {
            warning: palette.pending,
            success: palette.confirmed,
            error: palette.cancelled,
            info: palette.info,
            default: palette.completed,
          };
          const tone = tones[ownerState.color as keyof typeof tones];
          return tone ? {
            color: tone.main,
            backgroundColor: ownerState.variant === 'outlined' ? 'transparent' : tone.background,
            borderColor: tone.main,
          } : {};
        },
      },
    },
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
            background: 'linear-gradient(135deg, #c91470, #d51a78)',
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
