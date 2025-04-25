import React, { useRef, useState } from 'react';
import { Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress } from '@mui/material';

const UploadPlayground = ({ onPaperUpload }) => {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(' ');


  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
      setDialogOpen(true);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleUpload = async () => {
    if (!selectedFile || !title) {
      setError('Please provide both a file and title');
      return;
    }
    setLoading(true);
    setError(' ');


    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', title);
    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        // Reset form
        setTitle('');
        setFileName('');
        setSelectedFile(null);
        setDialogOpen(false);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(`Upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        flex: 1,
        backgroundColor: '#1e1e1e',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        height: '90%'
      }}
    >
      <p style={{ fontSize: '18px', marginBottom: '30px', textAlign: 'center' }}>
        Hi, I am a research assistant, how can I help you?
      </p>

      <Box
        style={{
          width: '300px',
          backgroundColor: 'rgb(60, 62, 60)',
          borderRadius: '15px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <Button
          variant="contained"
          onClick={handleButtonClick}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Upload File'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <Typography variant="body2" mt={1} noWrap>
          {fileName || 'No file chosen'}
        </Typography>
        
        {error && (
          <Typography variant="body2" mt={1} color="error">
            {error}
          </Typography>
        )}
      </Box>

      {/* Title Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose}>
        <DialogTitle>Enter Paper Title</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Paper Title"
            type="text"
            fullWidth
            variant="outlined"
            value={title}
            onChange={handleTitleChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            color="primary" 
            disabled={!title.trim() || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UploadPlayground;