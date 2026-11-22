import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Skeleton, TextField, Typography,
} from '@mui/material';
import { api, pdfUrl } from '../api';
import { colors, serif } from '../theme';
import { useApp } from '../hooks';
import PageHeader from './PageHeader';

const RowAction = ({ children, onClick }) => (
  <Box
    component="button"
    onClick={onClick}
    sx={{
      all: 'unset', cursor: 'pointer', fontSize: 13.5, fontWeight: 500, color: colors.muted, px: 1, py: 0.5, borderRadius: 1.5,
      '&:hover': { color: colors.ink, bgcolor: colors.sunken }, '&:focus-visible': { outline: `2px solid ${colors.accent}` },
    }}
  >
    {children}
  </Box>
);

const UploadPlayground = () => {
  const inputRef = useRef(null);
  const { papers, loaded, error: listError, refresh, setPaper, go } = useApp();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  // Drop a PDF anywhere on the page.
  useEffect(() => {
    const over = (e) => { e.preventDefault(); setDragging(true); };
    const leave = (e) => { if (!e.relatedTarget) setDragging(false); };
    const drop = (e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer?.files?.[0]); };
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
  }, []);

  const close = () => {
    if (loading) return;
    setFile(null);
    setTitle('');
    setError('');
  };

  const upload = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.upload(file, title.trim());
      setNotice(`Added “${title.trim()}” (${res.chunks} passages indexed).`);
      setFile(null);
      setTitle('');
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const open = (t, tab) => {
    setPaper(t);
    go(tab);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.deletePaper(toDelete);
      setNotice(`Deleted “${toDelete}”.`);
      setToDelete(null);
      refresh();
    } catch (e) {
      setError(e.message);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const picker = (
    <input
      ref={inputRef} type="file" accept=".pdf,application/pdf" hidden
      onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }}
    />
  );

  return (
    <Box>
      <PageHeader title="Your library" subtitle="Upload papers, then ask questions, read summaries or take a quiz.">
        <Button variant="contained" onClick={() => inputRef.current?.click()}>Upload paper</Button>
      </PageHeader>
      {picker}

      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {error && !file && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {listError && <Alert severity="warning" sx={{ mb: 2 }}>{listError}</Alert>}

      {!loaded ? (
        <Skeleton variant="rounded" height={72} />
      ) : papers.length === 0 ? (
        <Box
          onClick={() => inputRef.current?.click()}
          sx={{
            border: `1.5px dashed ${colors.borderStrong}`, borderRadius: 4, py: 9, textAlign: 'center', cursor: 'pointer',
            '&:hover': { borderColor: colors.ink, bgcolor: colors.surface },
          }}
        >
          <Typography sx={{ fontFamily: serif, fontSize: 24, fontWeight: 500, mb: 0.5 }}>Add your first paper</Typography>
          <Typography sx={{ color: colors.muted, fontSize: 14.5 }}>Drop a PDF anywhere, or click to browse. Up to 25 MB.</Typography>
        </Box>
      ) : (
        <Box sx={{ borderTop: `1px solid ${colors.border}` }}>
          {papers.map((p) => (
            <Box
              key={p.title}
              sx={{
                display: 'flex', alignItems: 'center', gap: 2, py: 2.25, px: 1, borderBottom: `1px solid ${colors.border}`,
                flexWrap: 'wrap', '&:hover': { bgcolor: 'rgba(243,241,236,0.6)' },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 220 }}>
                <Typography sx={{ fontFamily: serif, fontSize: 19, fontWeight: 500, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                  {p.title}
                </Typography>
                <Typography sx={{ fontSize: 13, color: colors.faint, mt: 0.5 }}>
                  {p.pages} pages · {p.chunks} passages ·{' '}
                  {new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <RowAction onClick={() => open(p.title, 'ask')}>Ask</RowAction>
                <RowAction onClick={() => open(p.title, 'summary')}>Summarise</RowAction>
                <RowAction onClick={() => open(p.title, 'quiz')}>Quiz</RowAction>
                <RowAction onClick={() => window.open(pdfUrl(p.title), '_blank', 'noopener')}>PDF</RowAction>
                <RowAction onClick={() => setToDelete(p.title)}>Delete</RowAction>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {dragging && (
        <Box
          sx={{
            position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center', pointerEvents: 'none',
            bgcolor: 'rgba(250,249,246,0.92)', border: `2px dashed ${colors.accent}`, m: 2, borderRadius: 4,
          }}
        >
          <Typography sx={{ fontFamily: serif, fontSize: 30, color: colors.accent }}>Drop PDF to add it</Typography>
        </Box>
      )}

      <Dialog open={!!toDelete} onClose={() => !deleting && setToDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontFamily: serif, fontSize: 24, fontWeight: 500 }}>Delete this paper?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: colors.muted, fontSize: 14.5 }}>
            “{toDelete}” and its passages, saved summary and quiz cards will be removed. This can’t be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setToDelete(null)} disabled={deleting} color="inherit">Cancel</Button>
          <Button variant="contained" onClick={confirmDelete} disabled={deleting} sx={{ bgcolor: colors.bad, '&:hover': { bgcolor: '#962d26' } }}>
            {deleting ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!file} onClose={close} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontFamily: serif, fontSize: 24, fontWeight: 500 }}>Add paper</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: colors.muted, mb: 2 }} noWrap>{file?.name}</Typography>
          <TextField
            autoFocus fullWidth size="small" label="Title" value={title}
            onChange={(e) => setTitle(e.target.value)} disabled={loading}
            onKeyDown={(e) => e.key === 'Enter' && title.trim() && !loading && upload()}
          />
          {loading && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: colors.muted }}>
              Reading and indexing the paper. The first upload also loads the embedding model, so it can take a moment.
            </Typography>
          )}
          {error && file && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
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
