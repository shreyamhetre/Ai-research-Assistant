import React, { useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, List, ListItem, ListItemIcon, ListItemText, Paper, TextField, Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUploadOutlined';
import DescriptionIcon from '@mui/icons-material/DescriptionOutlined';
import { api } from '../api';
import { colors } from '../theme';
import { useTitles } from '../hooks';
import PageHeader from './PageHeader';

const UploadPlayground = () => {
  const inputRef = useRef(null);
  const { titles, error: listError, refresh } = useTitles();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const pick = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.');
      return;
    }
    setError('');
    setNotice('');
    setFile(f);
    setTitle(f.name.replace(/\.pdf$/i, ''));
  };

  const close = () => {
    if (loading) return;
    setFile(null);
    setTitle('');
  };

  const upload = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.upload(file, title.trim());
      setNotice(`"${title.trim()}" added (${res.chunks} passages indexed).`);
      setFile(null);
      setTitle('');
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Library"
        subtitle="Upload research papers, then ask questions, summarise or quiz yourself."
      />

      <Paper
        variant="outlined"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
        sx={{
          p: 5, textAlign: 'center', cursor: 'pointer', borderStyle: 'dashed', borderWidth: 2,
          borderColor: dragging ? colors.accent : colors.border,
          bgcolor: dragging ? 'rgba(99,102,241,0.08)' : colors.surface,
          transition: 'all .15s',
          '&:hover': { borderColor: colors.accent },
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 40, color: colors.accent, mb: 1 }} />
        <Typography sx={{ fontWeight: 600 }}>Drop a PDF here, or click to browse</Typography>
        <Typography variant="body2" color="text.secondary">PDF only, up to 25 MB</Typography>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          hidden
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }}
        />
      </Paper>

      {notice && <Alert severity="success" sx={{ mt: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {(error && !file) && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {listError && <Alert severity="warning" sx={{ mt: 2 }}>{listError}</Alert>}

      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mt: 4, mb: 1 }}>
        Your papers ({titles.length})
      </Typography>
      <Paper variant="outlined" sx={{ bgcolor: colors.surface }}>
        {titles.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            No papers yet.
          </Typography>
        ) : (
          <List disablePadding>
            {titles.map((t, i) => (
              <ListItem key={t} divider={i < titles.length - 1}>
                <ListItemIcon sx={{ minWidth: 36 }}><DescriptionIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary={t} primaryTypographyProps={{ fontSize: 14 }} />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Dialog open={!!file} onClose={close} fullWidth maxWidth="xs">
        <DialogTitle>Add paper</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} noWrap>
            {file?.name}
          </Typography>
          <TextField
            autoFocus fullWidth size="small" label="Title" value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
          {error && file && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={close} disabled={loading} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={upload} disabled={!title.trim() || loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UploadPlayground;
