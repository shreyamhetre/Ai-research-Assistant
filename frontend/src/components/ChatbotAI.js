import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, IconButton, TextField, Typography } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { api, pdfUrl } from '../api';
import { colors, serif } from '../theme';
import { copyText, useApp } from '../hooks';
import PageHeader from './PageHeader';
import PaperSelect from './PaperSelect';
import Answer from './Answer';

const SUGGESTIONS = [
  'What are the main contributions?',
  'What approach or method is used?',
  'What are the limitations?',
  'Explain the key ideas simply',
];

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
      {msg.grounded === false && !msg.isError && (
        <Typography sx={{ mt: 1.5, fontSize: 12.5, color: colors.accent }}>
          Not found in your papers, so this comes from general knowledge.
        </Typography>
      )}
      {msg.sources?.length > 0 && <Sources sources={citedOnly(msg)} />}
      {!msg.isError && (
        <Box
          component="button"
          onClick={() => copyText(msg.text)}
          sx={{ all: 'unset', cursor: 'pointer', mt: 1.5, fontSize: 12.5, color: colors.faint, '&:hover': { color: colors.ink } }}
        >
          Copy
        </Box>
      )}
    </Box>
  );
};

const Typing = () => (
  <Box sx={{ display: 'flex', gap: 0.6, mb: 4, ml: 0.5 }}>
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
);

const ChatbotAI = () => {
  const { paper } = useApp(); // '' = all papers
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const send = async (text) => {
    const q = (text ?? query).trim();
    if (!q || loading) return;
    // Recent turns give follow-up questions ("and why?") their context.
    const history = messages
      .filter((m) => !m.isError)
      .slice(-6)
      .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));
    setMessages((m) => [...m, { sender: 'user', text: q }]);
    setQuery('');
    setLoading(true);
    try {
      const data = await api.chat(q, paper, history);
      setMessages((m) => [...m, { sender: 'bot', text: data.response, sources: data.sources, grounded: data.grounded }]);
    } catch (e) {
      setMessages((m) => [...m, { sender: 'bot', text: e.message, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  const empty = messages.length === 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 156px)' }}>
      <PageHeader title="Ask" subtitle="Answers come from your papers, with numbered citations.">
        {messages.length > 0 && (
          <Button color="inherit" onClick={() => setMessages([])} sx={{ color: colors.muted }}>New chat</Button>
        )}
        <PaperSelect allowAll />
      </PageHeader>

      <Box sx={{ flex: 1, pb: 3 }}>
        {empty ? (
          <Box sx={{ mt: 4 }}>
            <Typography sx={{ fontFamily: serif, fontSize: 26, fontWeight: 500, mb: 2.5, letterSpacing: '-0.01em' }}>
              What would you like to know?
            </Typography>
            <Box sx={{ borderTop: `1px solid ${colors.border}` }}>
              {SUGGESTIONS.map((s) => (
                <Box
                  key={s}
                  component="button"
                  onClick={() => send(s)}
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
            </Box>
          </Box>
        ) : (
          messages.map((m, i) => <Message key={i} msg={m} />)
        )}
        {loading && <Typing />}
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
          fullWidth multiline maxRows={5} variant="standard" placeholder="Ask about your papers…"
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

export default ChatbotAI;
