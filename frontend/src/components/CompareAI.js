import React, { useState } from 'react';
import { Alert, Box, Button, Checkbox, CircularProgress, TextField, Typography } from '@mui/material';
import { api, pdfUrl } from '../api';
import { colors, serif } from '../theme';
import { useApp } from '../hooks';
import PageHeader from './PageHeader';

const MAX_PAPERS = 4;

const VERDICT = {
  consensus: { label: 'Consensus', fg: colors.good, bg: colors.goodSoft },
  contradiction: { label: 'Contradiction', fg: colors.bad, bg: colors.badSoft },
  partial: { label: 'Partial overlap', fg: colors.accent, bg: colors.accentSoft },
  single: { label: 'One paper only', fg: colors.muted, bg: colors.sunken },
};

const STANCE = {
  agrees: { label: 'Agrees', color: colors.good },
  disagrees: { label: 'Disagrees', color: colors.bad },
  partial: { label: 'Partly', color: colors.accent },
  not_mentioned: { label: 'Not mentioned', color: colors.faint },
};

const Pill = ({ fg, bg, children }) => (
  <Box component="span" sx={{ px: 1.25, py: 0.35, borderRadius: 5, fontSize: 12, fontWeight: 600, color: fg, bgcolor: bg, whiteSpace: 'nowrap' }}>
    {children}
  </Box>
);

const Position = ({ pos }) => {
  const s = STANCE[pos.stance] || STANCE.partial;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 12.5, color: colors.muted, fontWeight: 500 }} noWrap title={pos.paper}>{pos.paper}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: s.color, mt: 0.25 }}>{s.label}</Typography>
      {pos.claim && <Typography sx={{ fontSize: 14, lineHeight: 1.55, mt: 0.5 }}>{pos.claim}</Typography>}
      {pos.pages?.length > 0 && (
        <Typography sx={{ fontSize: 12.5, mt: 0.75, color: colors.faint }}>
          {pos.pages.map((p, i) => (
            <React.Fragment key={p}>
              {i > 0 && ', '}
              <Box
                component="a" href={pdfUrl(pos.paper, p)} target="_blank" rel="noreferrer"
                sx={{ color: colors.accent, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                p.{p}
              </Box>
            </React.Fragment>
          ))}
        </Typography>
      )}
    </Box>
  );
};

const CompareAI = () => {
  const { titles, error: listError } = useApp();
  const [chosen, setChosen] = useState([]);
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggle = (t) =>
    setChosen((c) => (c.includes(t) ? c.filter((x) => x !== t) : c.length < MAX_PAPERS ? [...c, t] : c));

  const run = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await api.compare(chosen, topic.trim()));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const ready = chosen.length >= 2 && topic.trim() && !loading;

  return (
    <Box>
      <PageHeader title="Compare" subtitle="Where do your papers agree, and where do they contradict each other?" />

      {listError && <Alert severity="warning" sx={{ mb: 2 }}>{listError}</Alert>}

      {titles.length < 2 ? (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Typography sx={{ fontFamily: serif, fontSize: 22, mb: 0.5 }}>Add at least two papers</Typography>
          <Typography sx={{ color: colors.muted, fontSize: 14.5 }}>Comparison needs two or more papers in your library.</Typography>
        </Box>
      ) : (
        <>
          <Typography variant="overline" sx={{ color: colors.muted }}>
            Choose 2 to {MAX_PAPERS} papers ({chosen.length} selected)
          </Typography>
          <Box sx={{ borderTop: `1px solid ${colors.border}`, mt: 1, mb: 3 }}>
            {titles.map((t) => {
              const on = chosen.includes(t);
              return (
                <Box
                  key={t} component="label"
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1, py: 0.75, px: 0.5, borderBottom: `1px solid ${colors.border}`,
                    cursor: 'pointer', opacity: !on && chosen.length >= MAX_PAPERS ? 0.45 : 1, '&:hover': { bgcolor: colors.sunken },
                  }}
                >
                  <Checkbox size="small" checked={on} onChange={() => toggle(t)} disabled={loading} />
                  <Typography sx={{ fontFamily: serif, fontSize: 17 }}>{t}</Typography>
                </Box>
              );
            })}
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <TextField
              size="small" sx={{ flex: 1, minWidth: 260 }} placeholder="Topic or question, e.g. “How is learning defined?”"
              value={topic} onChange={(e) => setTopic(e.target.value)} disabled={loading}
              onKeyDown={(e) => e.key === 'Enter' && ready && run()}
            />
            <Button variant="contained" onClick={run} disabled={!ready}>
              {loading ? <CircularProgress size={18} color="inherit" /> : 'Compare'}
            </Button>
          </Box>
        </>
      )}

      {loading && (
        <Typography sx={{ mt: 3, color: colors.muted, fontSize: 14 }}>
          A researcher agent reads each paper, then a critic compares their findings. This can take a minute or two.
        </Typography>
      )}
      {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

      {result && (
        <Box sx={{ mt: 5 }}>
          <Typography variant="overline" sx={{ color: colors.muted }}>Synthesis</Typography>
          <Typography sx={{ fontFamily: serif, fontSize: 21, lineHeight: 1.5, mt: 0.5, mb: 4 }}>{result.summary}</Typography>

          {result.points.length === 0 && (
            <Typography sx={{ color: colors.muted }}>No comparable points were found for this topic.</Typography>
          )}
          {result.points.map((p, i) => {
            const v = VERDICT[p.verdict] || VERDICT.partial;
            return (
              <Box key={i} sx={{ py: 3, borderTop: `1px solid ${colors.border}` }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', mb: 2 }}>
                  <Typography sx={{ fontFamily: serif, fontSize: 20, fontWeight: 500, flex: 1, minWidth: 220 }}>{p.point}</Typography>
                  <Pill fg={v.fg} bg={v.bg}>{v.label}</Pill>
                </Box>
                <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: `repeat(auto-fit, minmax(${p.positions.length > 2 ? 180 : 240}px, 1fr))` }}>
                  {p.positions.map((pos, j) => <Position key={j} pos={pos} />)}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default CompareAI;
