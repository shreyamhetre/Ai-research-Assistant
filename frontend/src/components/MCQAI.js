import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Paper, Typography, LinearProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { api } from '../api';
import { colors } from '../theme';
import { useTitles } from '../hooks';
import PageHeader from './PageHeader';
import PaperSelect from './PaperSelect';

const LETTERS = ['A', 'B', 'C', 'D'];

const optionStyle = (state) => {
  const base = {
    display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2,
    border: `1px solid ${colors.border}`, cursor: 'pointer', textAlign: 'left',
    bgcolor: 'transparent', color: colors.text, font: 'inherit', width: '100%',
    transition: 'all .12s',
  };
  if (state === 'selected') return { ...base, borderColor: colors.accent, bgcolor: 'rgba(99,102,241,0.12)' };
  if (state === 'correct') return { ...base, cursor: 'default', borderColor: '#34d399', bgcolor: 'rgba(52,211,153,0.12)' };
  if (state === 'wrong') return { ...base, cursor: 'default', borderColor: '#f87171', bgcolor: 'rgba(248,113,113,0.12)' };
  if (state === 'locked') return { ...base, cursor: 'default', opacity: 0.55 };
  return { ...base, '&:hover': { borderColor: colors.accent } };
};

const MCQAI = () => {
  const { titles, error: listError } = useTitles();
  const [selected, setSelected] = useState('');
  const [mcqs, setMcqs] = useState([]);
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selected && titles.length) setSelected(titles[0]);
  }, [titles, selected]);

  const generate = async () => {
    setLoading(true);
    setError('');
    setMcqs([]);
    setAnswers({});
    setChecked(false);
    try {
      const data = await api.mcq(selected);
      setMcqs(data.mcqs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const score = mcqs.filter((q, i) => answers[i] === q.answer_index).length;
  const answered = Object.keys(answers).length;

  return (
    <Box>
      <PageHeader title="Quiz" subtitle="Test your understanding with questions generated from a paper.">
        <PaperSelect titles={titles} value={selected} onChange={setSelected} disabled={loading} />
        <Button variant="contained" onClick={generate} disabled={loading || !selected}>
          {loading ? <CircularProgress size={20} color="inherit" /> : mcqs.length ? 'New quiz' : 'Generate'}
        </Button>
      </PageHeader>

      {(error || listError) && <Alert severity="error" sx={{ mb: 2 }}>{error || listError}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {mcqs.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {mcqs.map((q, i) => (
            <Paper key={i} variant="outlined" sx={{ p: 3, bgcolor: colors.surface }}>
              <Typography variant="caption" color="text.secondary">Question {i + 1} of {mcqs.length}</Typography>
              <Typography sx={{ fontWeight: 600, mb: 2, mt: 0.5 }}>{q.question}</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {q.options.map((opt, j) => {
                  let state = answers[i] === j ? 'selected' : 'idle';
                  if (checked) {
                    if (j === q.answer_index) state = 'correct';
                    else if (answers[i] === j) state = 'wrong';
                    else state = 'locked';
                  }
                  return (
                    <Box
                      component="button" key={j} sx={optionStyle(state)}
                      onClick={() => !checked && setAnswers({ ...answers, [i]: j })}
                    >
                      <Typography component="span" sx={{ fontWeight: 700, color: colors.muted, width: 18 }}>
                        {LETTERS[j]}
                      </Typography>
                      <Typography component="span" sx={{ flex: 1, fontSize: 14 }}>{opt}</Typography>
                      {checked && state === 'correct' && <CheckCircleIcon sx={{ color: '#34d399' }} fontSize="small" />}
                      {checked && state === 'wrong' && <CancelIcon sx={{ color: '#f87171' }} fontSize="small" />}
                    </Box>
                  );
                })}
              </Box>
              {checked && q.explanation && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {q.explanation}
                </Typography>
              )}
            </Paper>
          ))}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {!checked ? (
              <Button variant="contained" disabled={answered < mcqs.length} onClick={() => setChecked(true)}>
                Check answers
              </Button>
            ) : (
              <Typography sx={{ fontWeight: 700, fontSize: 18 }}>
                Score: {score} / {mcqs.length}
              </Typography>
            )}
            {!checked && (
              <Typography variant="body2" color="text.secondary">{answered} / {mcqs.length} answered</Typography>
            )}
          </Box>
        </Box>
      )}

      {!mcqs.length && !loading && !error && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 8 }}>
          {titles.length ? 'Pick a paper and generate a quiz.' : 'Upload a paper in the Library first.'}
        </Typography>
      )}
    </Box>
  );
};

export default MCQAI;
