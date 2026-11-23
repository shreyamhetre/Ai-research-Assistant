import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Checkbox, IconButton, ListItemText, MenuItem, Select, TextField, Typography } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { api, pdfUrl } from '../api';
import { colors, serif } from '../theme';
import { copyText, useApp } from '../hooks';
import PageHeader from './PageHeader';
import Answer from './Answer';
import QuizPlayer from './QuizPlayer';
import ComparisonCard from './ComparisonCard';

const SUGGESTIONS = [
  'Summarise this paper',
  'Quiz me on this paper',
  'What are the main contributions?',
  'I don’t understand the key idea. Can you explain it simply?',
];

const TOOL_LABEL = {
  search_papers: 'searched your papers',
  summarize_paper: 'summarised a paper',
  generate_quiz: 'generated a quiz',
  review_due_questions: 'loaded your review questions',
  compare_papers: 'handed off to the comparison crew (one researcher per paper plus a critic)',
};

const ALL = '__all__';

/** Which papers the assistant may search. Empty selection = all papers. */
const ScopeSelect = () => {
  const { titles, scope, setScope } = useApp();
  return (
    <Select
      multiple size="small" displayEmpty value={scope}
      onChange={(e) => {
        const v = e.target.value;
        setScope(v.includes(ALL) ? [] : v);
      }}
      renderValue={(v) => (v.length === 0 ? 'All papers' : v.length === 1 ? v[0] : `${v.length} papers`)}
      sx={{ minWidth: 200, maxWidth: 320, fontSize: 14, borderRadius: 2.5 }}
      MenuProps={{ slotProps: { paper: { sx: { maxWidth: 440, mt: 0.5, border: `1px solid ${colors.border}` } } } }}
    >
      <MenuItem value={ALL}>
        <Checkbox size="small" checked={scope.length === 0} />
        <ListItemText primary="All papers" />
      </MenuItem>
      {titles.map((t) => (
        <MenuItem key={t} value={t} sx={{ whiteSpace: 'normal' }}>
          <Checkbox size="small" checked={scope.includes(t)} />
          <ListItemText primary={t} />
        </MenuItem>
      ))}
    </Select>
  );
};

const Sources = ({ sources }) => (
  <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${colors.border}` }}>
    <Typography variant="overline" sx={{ color: colors.faint }}>Sources</Typography>
    <Box sx={{ mt: 0.5, display: 'grid', gap: 0.5 }}>
      {sources.map((s) => (
        <Typography key={s.id} sx={{ fontSize: 13, color: colors.muted, display: 'flex', gap: 1 }}>
          <Box component="span" sx={{ color: colors.accent, fontWeight: 600, minWidth: 14 }}>{s.id}</Box>
          <Box
            component="a" href={pdfUrl(s.title, s.page)} target="_blank" rel="noreferrer"
            sx={{
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'inherit', textDecoration: 'none',
              '&:hover': { color: colors.accent, textDecoration: 'underline' },
            }}
          >
            {s.title} · p.{s.page}
          </Box>
        </Typography>
      ))}
    </Box>
  </Box>
);

/** Only list sources the answer actually cites; fall back to all if it cites none. */
const citedOnly = (msg) => {
  const ids = new Set(
    [...msg.text.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)].flatMap((m) => m[1].split(',').map((n) => Number(n.trim())))
  );
  const shown = msg.sources.filter((s) => ids.has(s.id));
  return shown.length ? shown : msg.sources;
};

const Card = ({ children }) => (
  <Box sx={{ mt: 2, p: 2.5, border: `1px solid ${colors.border}`, borderRadius: 3, bgcolor: colors.surface }}>{children}</Box>
);

const Message = ({ msg }) => {
  if (msg.sender === 'user') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4 }}>
        <Box sx={{ maxWidth: '80%', px: 2.25, py: 1.25, borderRadius: '18px 18px 4px 18px', bgcolor: colors.sunken }}>
          <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.6 }}>{msg.text}</Typography>
        </Box>
      </Box>
    );
  }
  return (
    <Box sx={{ mb: 5 }}>
      <Box sx={{ fontSize: 16, color: msg.isError ? colors.bad : '#2b2a26' }}>
        <Answer text={msg.text} sources={msg.sources} />
      </Box>

      {msg.summary && (
        <Card>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 1.5 }}>
            <Typography sx={{ fontFamily: serif, fontSize: 18, fontWeight: 500, flex: 1, minWidth: 0 }} noWrap>
              {msg.summary.title}
            </Typography>
            <Button size="small" color="inherit" sx={{ color: colors.muted }} onClick={() => copyText(msg.summary.text)}>Copy</Button>
          </Box>
          <Box sx={{ fontSize: 15 }}><Answer text={msg.summary.text} /></Box>
        </Card>
      )}

      {msg.quiz && <Card><QuizPlayer questions={msg.quiz} /></Card>}

      {msg.comparison && <Card><ComparisonCard data={msg.comparison} /></Card>}

      {msg.grounded === false && !msg.isError && !msg.quiz && !msg.summary && !msg.comparison && msg.agent !== undefined && msg.usedTools?.length === 0 && (
        <Typography sx={{ mt: 1.5, fontSize: 12.5, color: colors.faint }}>Answered without searching your papers.</Typography>
      )}
      {msg.sources?.length > 0 && <Sources sources={citedOnly(msg)} />}

      {msg.agent === false && (
        <Typography sx={{ mt: 1.5, fontSize: 12.5, color: colors.accent }}>
          The agent isn’t available on this server (CrewAI needs Python 3.12), so this was answered with direct search.
          Summaries, quizzes and comparisons need the agent.
        </Typography>
      )}
      {msg.usedTools?.length > 0 && (
        <Typography sx={{ mt: 1.5, fontSize: 12.5, color: colors.faint }}>
          Agent {msg.usedTools.map((t) => TOOL_LABEL[t] || t).join(', ')}
        </Typography>
      )}
      {!msg.isError && (
        <Box
          component="button" onClick={() => copyText(msg.text)}
          sx={{ all: 'unset', cursor: 'pointer', mt: 1, fontSize: 12.5, color: colors.faint, display: 'block', '&:hover': { color: colors.ink } }}
        >
          Copy
        </Box>
      )}
    </Box>
  );
};

const Working = () => (
  <Box sx={{ display: 'flex', gap: 1.25, mb: 4, ml: 0.5, alignItems: 'center' }}>
    <Box sx={{ display: 'flex', gap: 0.6 }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 6, height: 6, borderRadius: '50%', bgcolor: colors.ink, animation: 'blink 1.2s infinite',
            animationDelay: `${i * 0.18}s`, '@keyframes blink': { '0%,80%,100%': { opacity: 0.2 }, '40%': { opacity: 0.9 } },
          }}
        />
      ))}
    </Box>
    <Typography sx={{ fontSize: 13, color: colors.faint }}>
      The assistant is working. This takes 10 to 20 seconds; comparing papers runs a team of agents and takes about a minute.
    </Typography>
  </Box>
);

const AssistantAI = () => {
  const { scope, draft, setDraft, titles } = useApp();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [due, setDue] = useState(0);
  const endRef = useRef(null);

  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  // A prompt handed over from the Library (e.g. "Quiz me on this paper") lands in the input box.
  useEffect(() => {
    if (draft) {
      setQuery(draft);
      setDraft('');
    }
  }, [draft, setDraft]);

  const refreshDue = useCallback(() => {
    api.dueCards().then((d) => setDue(d.cards.length)).catch(() => {});
  }, []);
  useEffect(() => {
    refreshDue();
  }, [refreshDue, messages.length]);

  const send = async (text) => {
    const q = (text ?? query).trim();
    if (!q || loading) return;
    const history = messages
      .filter((m) => !m.isError)
      .slice(-6)
      .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));
    setMessages((m) => [...m, { sender: 'user', text: q }]);
    setQuery('');
    setLoading(true);
    try {
      const d = await api.assistant(q, scope, history);
      setMessages((m) => [...m, {
        sender: 'bot', text: d.response, sources: d.sources, grounded: d.grounded,
        quiz: d.quiz, summary: d.summary, comparison: d.comparison, usedTools: d.tools_used, agent: d.agent,
      }]);
    } catch (e) {
      setMessages((m) => [...m, { sender: 'bot', text: e.message, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  const empty = messages.length === 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 156px)' }}>
      <PageHeader title="Study Assistant" subtitle="Ask a doubt, get a summary, or take a quiz, about one paper or several.">
        {messages.length > 0 && (
          <Button color="inherit" onClick={() => setMessages([])} sx={{ color: colors.muted }}>New chat</Button>
        )}
        <ScopeSelect />
      </PageHeader>

      <Box sx={{ flex: 1, pb: 3 }}>
        {empty ? (
          <Box sx={{ mt: 4 }}>
            <Typography sx={{ fontFamily: serif, fontSize: 26, fontWeight: 500, mb: 2.5, letterSpacing: '-0.01em' }}>
              What would you like to do?
            </Typography>
            <Box sx={{ borderTop: `1px solid ${colors.border}` }}>
              {[...SUGGESTIONS, ...(titles.length > 1 ? ['Compare my papers: where do they agree or disagree?'] : [])].map((s) => (
                <Box
                  key={s} component="button" onClick={() => send(s)}
                  sx={{
                    all: 'unset', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box',
                    py: 1.75, px: 0.5, borderBottom: `1px solid ${colors.border}`, fontSize: 15, color: colors.ink,
                    '&:hover': { color: colors.accent }, '&:hover .arrow': { transform: 'translateX(3px)' },
                  }}
                >
                  {s}
                  <Box className="arrow" component="span" sx={{ transition: 'transform .12s', color: colors.faint }}>→</Box>
                </Box>
              ))}
              {due > 0 && (
                <Box
                  component="button" onClick={() => send('Review my due questions')}
                  sx={{
                    all: 'unset', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box',
                    py: 1.75, px: 0.5, borderBottom: `1px solid ${colors.border}`, fontSize: 15, color: colors.accent,
                  }}
                >
                  Review my {due} due question{due === 1 ? '' : 's'}
                  <Box component="span">→</Box>
                </Box>
              )}
            </Box>
          </Box>
        ) : (
          messages.map((m, i) => <Message key={i} msg={m} />)
        )}
        {loading && <Working />}
        <div ref={endRef} />
      </Box>

      <Box
        sx={{
          position: 'sticky', bottom: 16, mt: 2, display: 'flex', alignItems: 'flex-end', gap: 1, p: 0.75, borderRadius: 4,
          bgcolor: colors.surface, border: `1px solid ${colors.borderStrong}`, boxShadow: '0 8px 28px rgba(28,27,24,0.08)',
          '&:focus-within': { borderColor: colors.ink },
        }}
      >
        <TextField
          fullWidth multiline maxRows={5} variant="standard" placeholder="Ask, request a summary, or say “quiz me”…"
          value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          InputProps={{ disableUnderline: true, sx: { px: 1.75, py: 1, fontSize: 15 } }}
        />
        <IconButton
          onClick={() => send()} disabled={!query.trim() || loading} aria-label="Send"
          sx={{
            bgcolor: colors.ink, color: '#fff', width: 38, height: 38, '&:hover': { bgcolor: colors.accent },
            '&.Mui-disabled': { bgcolor: colors.sunken, color: colors.faint },
          }}
        >
          <ArrowUpwardIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default AssistantAI;
