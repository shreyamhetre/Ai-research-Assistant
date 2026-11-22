import React, { useCallback, useEffect, useState } from 'react';
import { Box, ThemeProvider, CssBaseline } from '@mui/material';
import theme, { colors } from './theme';
import { AppProvider } from './hooks';
import TopNav, { TABS } from './components/TopNav';
import UploadPlayground from './components/UploadPlayground';
import SummaryAI from './components/SummaryAI';
import ChatbotAI from './components/ChatbotAI';
import MCQAI from './components/MCQAI';

const PAGES = { library: UploadPlayground, ask: ChatbotAI, summary: SummaryAI, quiz: MCQAI };
const fromHash = () => {
  const id = window.location.hash.replace('#/', '');
  return TABS.some((t) => t.id === id) ? id : 'library';
};

const App = () => {
  const [tab, setTab] = useState(fromHash);

  useEffect(() => {
    const onHash = () => setTab(fromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useCallback((id) => {
    window.location.hash = `#/${id}`;
  }, []);

  const Page = PAGES[tab];
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider go={go}>
        <Box sx={{ minHeight: '100vh', bgcolor: colors.bg }}>
          <TopNav tab={tab} onTab={go} />
          <Box component="main" sx={{ maxWidth: 860, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 3, md: 6 } }}>
            <Page />
          </Box>
        </Box>
      </AppProvider>
    </ThemeProvider>
  );
};

export default App;
