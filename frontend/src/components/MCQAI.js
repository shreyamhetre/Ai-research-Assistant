import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, LinearProgress, Typography } from '@mui/material';
import { api } from '../api';
import { colors, serif } from '../theme';
import { useApp } from '../hooks';
import PageHeader from './PageHeader';
import PaperSelect from './PaperSelect';

const LETTERS = ['A', 'B', 'C', 'D'];

const optionSx = (state) => {
  const base = {
    all: 'unset', boxSizing: 'border-box', display: 'flex', alignItems: 'flex-start', gap: 1.75, p: 2, width: '100%',
    borderRadius: 3, border: `1px solid ${colors.border}`, bgcolor: colors.surface, cursor: 'pointer',
    transition: 'border-color .12s, background-color .12s', '&:focus-visible': { outline: `2px solid ${colors.accent}` },
  };
  if (state === 'correct') return { ...base, cursor: 'default', borderColor: colors.good, bgcolor: colors.goodSoft };
  if (state === 'wrong') return { ...base, cursor: 'default', borderColor: colors.bad, bgcolor: colors.badSoft };
  if (state === 'locked') return { ...base, cursor: 'default', opacity: 0.55 };
  return { ...base, '&:hover': { borderColor: colors.ink } };
};

const Letter = ({ children, state }) => (
  <Box
    sx={{
      width: 24, height: 24, borderRadius: 1.5, display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 12, fontWeight: 600,
      color: state === 'correct' || state === 'wrong' ? '#fff' : colors.muted,
      bgcolor: state === 'correct' ? colors.good : state === 'wrong' ? colors.bad : colors.sunken,
    }}
  >
    {children}
  </Box>
);

const MCQAI = () => {
  const { titles, paper, error: listError } = useApp();
  const selected = paper || titles[0] || '';
  const [mode, setMode] = useState('new'); // 'new' | 'review'
  const [mcqs, setMcqs] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [saved, setSaved] = useState({ due: 0, total: 0 });

  const refreshCounts = useCallback(async () => {
    if (!selected) return;
    try {
      const d = await api.dueCards(selected);
      setSaved({ due: d.cards.length, total: d.total });
    } catch {
      /* counts are a nicety */
    }
  }, [selected]);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts, done]);

  const reset = (m) => {
    setMode(m);
    setMcqs([]);
    setAnswers({});
    setIdx(0);
    setDone(false);
    setError('');
    setInfo('');
  };

  const startNew = async () => {
    reset('new');
    setLoading(true);
    try {
      setMcqs((await api.mcq(selected)).mcqs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const startReview = async () => {
    reset('review');
    setLoading(true);
    try {
      const d = await api.dueCards(selected);
      if (d.cards.length) setMcqs(d.cards);
      else setInfo(d.total ? 'Nothing is due right now. Come back later, or start a new quiz.' : 'No saved questions yet. Start a new quiz first.');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const pick = (j) => {
    const q = mcqs[idx];
    setAnswers({ ...answers, [idx]: j });
    if (q.id) api.review(q.id, j === q.answer_index).catch(() => {}); // reschedules the card
  };

  const q = mcqs[idx];
  const picked = answers[idx];
  const revealed = picked !== undefined;
  const score = mcqs.filter((m, i) => answers[i] === m.answer_index).length;
  const last = idx === mcqs.length - 1;

  return (
    <Box>
      <PageHeader title="Quiz" subtitle="Questions from your paper. Answers are saved and come back on a spaced schedule.">
        <PaperSelect value={selected} disabled={loading} />
      </PageHeader>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button variant="contained" onClick={startNew} disabled={loading || !selected}>
          {loading && mode === 'new' ? <CircularProgress size={18} color="inherit" /> : 'New quiz'}
        </Button>
        <Button variant="outlined" color="primary" onClick={startReview} disabled={loading || !selected || saved.total === 0}>
          Review{saved.due > 0 ? ` (${saved.due} due)` : ''}
        </Button>
        {saved.total > 0 && (
          <Typography sx={{ fontSize: 13, color: colors.faint }}>{saved.total} saved questions</Typography>
        )}
      </Box>

      {(error || listError) && <Alert severity="error" sx={{ mb: 2 }}>{error || listError}</Alert>}
      {info && <Alert severity="info" sx={{ mb: 2 }}>{info}</Alert>}
      {loading && <LinearProgress sx={{ borderRadius: 1 }} />}

      {q && !done && (
        <Box sx={{ maxWidth: 680 }}>
          <Typography variant="overline" sx={{ color: colors.muted }}>
            {mode === 'review' ? 'Review · ' : ''}Question {idx + 1} of {mcqs.length}
          </Typography>
          <LinearProgress
            variant="determinate" value={((idx + (revealed ? 1 : 0)) / mcqs.length) * 100}
            sx={{ height: 4, borderRadius: 2, mt: 1, mb: 4, bgcolor: colors.border, '& .MuiLinearProgress-bar': { bgcolor: colors.accent } }}
          />
          <Typography sx={{ fontFamily: serif, fontSize: 26, fontWeight: 500, lineHeight: 1.3, letterSpacing: '-0.01em', mb: 3 }}>
            {q.question}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            {q.options.map((opt, j) => {
              let state = 'idle';
              if (revealed) state = j === q.answer_index ? 'correct' : j === picked ? 'wrong' : 'locked';
              return (
                <Box component="button" key={j} sx={optionSx(state)} onClick={() => !revealed && pick(j)}>
                  <Letter state={state}>{LETTERS[j]}</Letter>
                  <Typography component="span" sx={{ fontSize: 15, lineHeight: 1.5, color: colors.ink }}>{opt}</Typography>
                </Box>
              );
            })}
          </Box>

          {revealed && (
            <Box sx={{ mt: 3 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 14, color: picked === q.answer_index ? colors.good : colors.bad }}>
                {picked === q.answer_index ? 'Correct' : `Not quite. The answer is ${LETTERS[q.answer_index]}.`}
              </Typography>
              {q.explanation && (
                <Typography sx={{ mt: 0.75, fontSize: 14.5, color: colors.muted, lineHeight: 1.65 }}>{q.explanation}</Typography>
              )}
              <Button variant="contained" sx={{ mt: 3 }} onClick={() => (last ? setDone(true) : setIdx(idx + 1))}>
                {last ? 'See results' : 'Next question'}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {done && (
        <Box sx={{ maxWidth: 680 }}>
          <Typography variant="overline" sx={{ color: colors.muted }}>Your result</Typography>
          <Typography sx={{ fontFamily: serif, fontSize: 64, fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
            {score}<Box component="span" sx={{ color: colors.faint, fontSize: 36 }}> / {mcqs.length}</Box>
          </Typography>
          <Typography sx={{ color: colors.muted, mt: 1, mb: 4 }}>
            {score === mcqs.length ? 'A perfect score.' : score / mcqs.length >= 0.6 ? 'Solid grasp of the paper.' : 'Worth another read, then try again.'}
            {' '}Missed questions return for review soon; the ones you know come back later.
          </Typography>

          <Box sx={{ borderTop: `1px solid ${colors.border}` }}>
            {mcqs.map((m, i) => {
              const ok = answers[i] === m.answer_index;
              return (
                <Box key={i} sx={{ py: 2, borderBottom: `1px solid ${colors.border}`, display: 'flex', gap: 2 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', mt: 1, flexShrink: 0, bgcolor: ok ? colors.good : colors.bad }} />
                  <Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 500 }}>{m.question}</Typography>
                    <Typography sx={{ fontSize: 13.5, color: colors.muted, mt: 0.5 }}>
                      {ok ? 'You answered' : 'Correct answer'}: {m.options[m.answer_index]}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, mt: 4 }}>
            <Button variant="contained" onClick={startNew}>Take a new quiz</Button>
            <Button variant="outlined" color="primary" onClick={startReview}>Review due questions</Button>
          </Box>
        </Box>
      )}

      {!mcqs.length && !loading && !error && !info && (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Typography sx={{ fontFamily: serif, fontSize: 22, mb: 0.5 }}>
            {titles.length ? 'Ready when you are' : 'Your library is empty'}
          </Typography>
          <Typography sx={{ color: colors.muted, fontSize: 14.5 }}>
            {titles.length ? 'Start a new quiz, or review the questions you have saved.' : 'Upload a paper in the Library first.'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MCQAI;
