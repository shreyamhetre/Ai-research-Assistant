import React, { useState } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import UploadPlayground from './components/UploadPlayground';
import SummaryAI from './components/SummaryAI';
import ChatbotAI from './components/ChatbotAI';
import MCQAI from './components/MCQAI';

const App = () => {
  const [activeTab, setactiveTab] = useState('upload');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleTabChange = (tab) => {
    setactiveTab(tab);
  };

  const handleSnackbarClose = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };

  const renderPlayground = () => {
    switch (activeTab) {
      case 'summary':
        return <SummaryAI />;
      case 'chatbot':
        return <ChatbotAI />;
      case 'mcq':
        return <MCQAI />;
      case 'upload':
      default:
        return <UploadPlayground />;
    }
  };

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#1e1e1e',
      }}
    >
      <Navbar />
      <Box style={{ display: 'flex', flex: 1 }}>
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
        <Box style={{ flex: 1, padding: '10px' }}>
          {renderPlayground()}
        </Box>
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
export default App;