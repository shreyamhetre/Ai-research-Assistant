import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Skeleton, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { api } from '../api';
import { colors } from '../theme';
import { useTitles } from '../hooks';
import PageHeader from './PageHeader';
import PaperSelect from './PaperSelect';

const SummaryAI = () => {
  const { titles, error: listError } = useTitles();
  const [selected, setSelected] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selected && titles.length) setSelected(titles[0]);
  }, [titles, selected]);

  const generate = async () => {
    setLoading(true);
    setError('');
    setSummary('');
    try {
      const data = await api.summary(selected);
      setSummary(data.summary);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <PageHeader title="Summaries" subtitle="A structured overview of any paper in your library.">
        <PaperSelect titles={titles} value={selected} onChange={setSelected} disabled={loading} />
        <Button variant="contained" onClick={generate} disabled={loading || !selected}>
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Summarise'}
        </Button>
      </PageHeader>

      {(error || listError) && <Alert severity="error" sx={{ mb: 2 }}>{error || listError}</Alert>}

      {loading && (
        <Paper variant="outlined" sx={{ p: 3, bgcolor: colors.surface }}>
          <Skeleton width="30%" /><Skeleton /><Skeleton /><Skeleton width="80%" />
        </Paper>
      )}

      {summary && (
        <Paper variant="outlined" sx={{ p: 3, bgcolor: colors.surface }}>
          <Typography variant="overline" color="text.secondary">{selected}</Typography>
          <Box className="md" sx={{ mt: 1, fontSize: 14.5 }}>
            <ReactMarkdown>{summary}</ReactMarkdown>
          </Box>
        </Paper>
      )}

      {!summary && !loading && !error && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 8 }}>
          {titles.length ? 'Pick a paper and press Summarise.' : 'Upload a paper in the Library first.'}
        </Typography>
      )}
    </Box>
  );
};

export default SummaryAI;
