import { createTheme } from '@mui/material/styles';

export const serif = '"Newsreader", Georgia, "Times New Roman", serif';

export const colors = {
  bg: '#faf9f6',
  surface: '#ffffff',
  sunken: '#f3f1ec',
  border: '#e7e4dc',
  borderStrong: '#d6d2c6',
  ink: '#1c1b18',
  text: '#1c1b18',
  muted: '#6f6d64',
  faint: '#9a978c',
  accent: '#c2410c',
  accentSoft: '#fff0e4',
  good: '#2f7d5b',
  goodSoft: '#e8f3ed',
  bad: '#b3372f',
  badSoft: '#fbebe9',
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: colors.ink, contrastText: '#fff' },
    secondary: { main: colors.accent },
    success: { main: colors.good },
    error: { main: colors.bad },
    background: { default: colors.bg, paper: colors.surface },
    text: { primary: colors.text, secondary: colors.muted },
    divider: colors.border,
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", -apple-system, "Segoe UI", Roboto, sans-serif',
    h4: { fontFamily: serif, fontWeight: 500, fontSize: '2.1rem', letterSpacing: '-0.02em', lineHeight: 1.15 },
    h5: { fontFamily: serif, fontWeight: 500, fontSize: '1.6rem', letterSpacing: '-0.015em' },
    overline: { letterSpacing: '0.09em', fontWeight: 600, fontSize: '0.68rem' },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 9, paddingInline: 16, fontSize: 14 },
        outlinedPrimary: { borderColor: colors.borderStrong, '&:hover': { borderColor: colors.ink, backgroundColor: 'transparent' } },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { backgroundColor: colors.surface, '& fieldset': { borderColor: colors.borderStrong } } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.ink, fontSize: 12, lineHeight: 1.5, maxWidth: 380, padding: '8px 12px', borderRadius: 8,
        },
      },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
  },
});

export default theme;
