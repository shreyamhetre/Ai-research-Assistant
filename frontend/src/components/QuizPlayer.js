import React, { useState } from 'react';
import { Box, LinearProgress, Typography, Button } from '@mui/material';
import { api } from '../api';
import { colors, serif } from '../theme';

const LETTERS = ['A', 'B', 'C', 'D'];

const optionSx = (state) => {
  const base = {
    all: 'unset', boxSizing: 'border-box', display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.5, width: '100%',
    borderRadius: 2.5, border: `1px solid ${colors.border}`, bgcolor: colors.surface, cursor: 'pointer',
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
      width: 22, height: 22, borderRadius: 1.5, display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 11.5, fontWeight: 600,
      color: state === 'correct' || state === 'wrong' ? '#fff' : colors.muted,
      bgcolor: state === 'correct' ? colors.good : state === 'wrong' ? colors.bad : colors.sunken,
    }}
  >
    {children}
  </Box>
);

/** One question at a time with instant feedback. Each answer reschedules the saved card. */
const QuizPlayer = ({ questions }) => {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);

  const q = questions[idx];
  const picked = answers[idx];
  const revealed = picked !== undefined;
  const score = questions.filter((m, i) => answers[i] === m.answer_index).length;
  const last = idx === questions.length - 1;

  const pick = (j) => {
    setAnswers({ ...answers, [idx]: j });
    if (q.id) api.review(q.id, j === q.answer_index).catch(() => {}); // spaced-repetition scheduling
  };

  if (done) {
    return (
      <Box>
        <Typography variant="overline" sx={{ color: colors.muted }}>Your result</Typography>
        <Typography sx={{ fontFamily: serif, fontSize: 44, fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
          {score}<Box component="span" sx={{ color: colors.faint, fontSize: 26 }}> / {questions.length}</Box>
        </Typography>
        <Typography sx={{ color: colors.muted, fontSize: 13.5, mt: 0.5, mb: 2 }}>
          Missed questions come back for review soon; the ones you know come back later.
        </Typography>
        {questions.map((m, i) => {
          const ok = answers[i] === m.answer_index;
          return (
            <Box key={i} sx={{ py: 1.25, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 1.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', mt: 0.9, flexShrink: 0, bgcolor: ok ? colors.good : colors.bad }} />
              <Box>
                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{m.question}</Typography>
                <Typography sx={{ fontSize: 13, color: colors.muted }}>
                  {ok ? 'You answered' : 'Correct answer'}: {m.options[m.answer_index]}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="overline" sx={{ color: colors.muted }}>Question {idx + 1} of {questions.length}</Typography>
      <LinearProgress
        variant="determinate" value={((idx + (revealed ? 1 : 0)) / questions.length) * 100}
        sx={{ height: 4, borderRadius: 2, mt: 0.75, mb: 2.5, bgcolor: colors.border, '& .MuiLinearProgress-bar': { bgcolor: colors.accent } }}
      />
      <Typography sx={{ fontFamily: serif, fontSize: 21, fontWeight: 500, lineHeight: 1.35, mb: 2 }}>{q.question}</Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {q.options.map((opt, j) => {
          let state = 'idle';
          if (revealed) state = j === q.answer_index ? 'correct' : j === picked ? 'wrong' : 'locked';
          return (
            <Box component="button" key={j} sx={optionSx(state)} onClick={() => !revealed && pick(j)}>
              <Letter state={state}>{LETTERS[j]}</Letter>
              <Typography component="span" sx={{ fontSize: 14.5, lineHeight: 1.5, color: colors.ink }}>{opt}</Typography>
            </Box>
          );
        })}
      </Box>

      {revealed && (
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: picked === q.answer_index ? colors.good : colors.bad }}>
            {picked === q.answer_index ? 'Correct' : `Not quite. The answer is ${LETTERS[q.answer_index]}.`}
          </Typography>
          {q.explanation && (
            <Typography sx={{ mt: 0.5, fontSize: 13.5, color: colors.muted, lineHeight: 1.6 }}>{q.explanation}</Typography>
          )}
          <Button variant="contained" size="small" sx={{ mt: 2 }} onClick={() => (last ? setDone(true) : setIdx(idx + 1))}>
            {last ? 'See results' : 'Next question'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default QuizPlayer;
