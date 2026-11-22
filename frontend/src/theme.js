import { createTheme } from '@mui/material/styles';

export const colors = {
  bg: '#0b0f17',
  surface: '#111826',
  surfaceAlt: '#172033',
  border: '#1f2a3d',
  text: '#e6eaf2',
  muted: '#8b96ab',
  accent: '#6366f1',
};

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: colors.accent },
    success: { main: '#34d399' },
    error: { main: '#f87171' },
    background: { default: colors.bg, paper: colors.surface },
    text: { primary: colors.text, secondary: colors.muted },
    divider: colors.border,
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", -apple-system, "Segoe UI", Roboto, sans-serif',
    h5: { fontWeight: 650, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});

export default theme;
