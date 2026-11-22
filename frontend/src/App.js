import React, { useState } from 'react';
import { Box, ThemeProvider, CssBaseline } from '@mui/material';
import theme, { colors } from './theme';
import Sidebar from './components/Sidebar';
import UploadPlayground from './components/UploadPlayground';
import SummaryAI from './components/SummaryAI';
import ChatbotAI from './components/ChatbotAI';
import MCQAI from './components/MCQAI';

const PAGES = {
  upload: UploadPlayground,
  summary: SummaryAI,
  chatbot: ChatbotAI,
  mcq: MCQAI,
};

const App = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const Page = PAGES[activeTab];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', bgcolor: colors.bg }}>
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <Box component="main" sx={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
          <Box sx={{ maxWidth: 900, mx: 'auto', p: { xs: 2, md: 4 }, height: '100%', boxSizing: 'border-box' }}>
            <Page />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default App;
