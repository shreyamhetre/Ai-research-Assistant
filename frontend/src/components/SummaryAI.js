import React, { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Skeleton, Typography } from '@mui/material';
import { api } from '../api';
import { colors, serif } from '../theme';
import { copyText, useApp } from '../hooks';
import PageHeader from './PageHeader';
import PaperSelect from './PaperSelect';
import Answer from './Answer';

const download = (name, text) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^\w-]+/g, '_')}-summary.md`;
  a.click();
  URL.revokeObjectURL(url);
};

const SummaryAI = () => {
  const { titles, paper, error: listError } = useApp();
  const selected = paper || titles[0] || '';
  const [result, setResult] = useState({ title: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.summary(selected);
      setResult({ title: selected, text: data.summary });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    copyText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Box>
      <PageHeader title="Summaries" subtitle="Contributions, method, results and limitations at a glance.">
        <PaperSelect value={selected} disabled={loading} />
        <Button variant="contained" onClick={generate} disabled={loading || !selected}>
          {loading ? <CircularProgress size={18} color="inherit" /> : result.text ? 'Regenerate' : 'Summarise'}
        </Button>
      </PageHeader>

      {(error || listError) && <Alert severity="error" sx={{ mb: 2 }}>{error || listError}</Alert>}

      {loading && (
        <Box sx={{ maxWidth: 680 }}>
          <Skeleton width="45%" height={34} />
          <Skeleton /><Skeleton /><Skeleton width="80%" />
          <Skeleton width="30%" height={34} sx={{ mt: 2 }} />
          <Skeleton /><Skeleton width="65%" />
        </Box>
      )}

      {!loading && result.text && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, borderBottom: `1px solid ${colors.border}`, pb: 1.5, mb: 3 }}>
            <Typography sx={{ fontFamily: serif, fontSize: 18, fontWeight: 500, flex: 1, minWidth: 0 }} noWrap>{result.title}</Typography>
            <Button size="small" color="inherit" onClick={copy} sx={{ color: colors.muted }}>{copied ? 'Copied' : 'Copy'}</Button>
            <Button size="small" color="inherit" onClick={() => download(result.title, result.text)} sx={{ color: colors.muted }}>
              Download .md
            </Button>
          </Box>
          <Box sx={{ maxWidth: 680, fontSize: 16, color: '#2b2a26' }}>
            <Answer text={result.text} />
          </Box>
        </Box>
      )}

      {!loading && !result.text && !error && (
        <Box sx={{ textAlign: 'center', mt: 10 }}>
          <Typography sx={{ fontFamily: serif, fontSize: 22, mb: 0.5 }}>
            {titles.length ? 'No summary yet' : 'Your library is empty'}
          </Typography>
          <Typography sx={{ color: colors.muted, fontSize: 14.5 }}>
            {titles.length ? 'Choose a paper and press Summarise.' : 'Upload a paper in the Library first.'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SummaryAI;
