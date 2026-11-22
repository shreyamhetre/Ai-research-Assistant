import React, { useEffect, useRef, useState } from 'react';
import { Box, Chip, CircularProgress, IconButton, Paper, TextField, Tooltip, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/ArrowUpward';
import ReactMarkdown from 'react-markdown';
import { api } from '../api';
import { colors } from '../theme';
import { useTitles } from '../hooks';
import PageHeader from './PageHeader';
import PaperSelect from './PaperSelect';

const Message = ({ msg }) => {
  const isUser = msg.sender === 'user';
  return (
    <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', mb: 2 }}>
      <Box sx={{ maxWidth: '82%' }}>
        <Paper
          variant="outlined"
          sx={{
            px: 2, py: 1.5, fontSize: 14.5,
            bgcolor: isUser ? colors.accent : msg.isError ? 'rgba(248,113,113,0.12)' : colors.surface,
            borderColor: isUser ? colors.accent : msg.isError ? '#f87171' : colors.border,
            color: isUser ? '#fff' : colors.text,
            wordBreak: 'break-word',
          }}
        >
          {isUser ? (
            <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: 14.5 }}>{msg.text}</Typography>
          ) : (
            <Box className="md"><ReactMarkdown>{msg.text}</ReactMarkdown></Box>
          )}
        </Paper>

        {msg.sources?.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
            {msg.sources.map((s) => (
              <Tooltip key={s.id} title={`${s.snippet}…`} arrow placement="top">
                <Chip
                  size="small" variant="outlined"
                  label={`[${s.id}] ${s.title.length > 34 ? s.title.slice(0, 34) + '…' : s.title} · p.${s.page}`}
                  sx={{ borderColor: colors.border, color: colors.muted }}
                />
              </Tooltip>
            ))}
          </Box>
        )}
        {msg.sender === 'bot' && msg.grounded === false && !msg.isError && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
            Not found in your papers, answered from general knowledge.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const ChatbotAI = () => {
  const { titles } = useTitles();
  const [scope, setScope] = useState('');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const q = query.trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { sender: 'user', text: q }]);
    setQuery('');
    setLoading(true);
    try {
      const data = await api.chat(q, scope);
      setMessages((m) => [...m, { sender: 'bot', text: data.response, sources: data.sources, grounded: data.grounded }]);
    } catch (e) {
      setMessages((m) => [...m, { sender: 'bot', text: e.message, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader title="Ask" subtitle="Answers are grounded in your papers, with citations.">
        <PaperSelect titles={titles} value={scope} onChange={setScope} allowAll />
      </PageHeader>

      <Box sx={{ flex: 1, overflow: 'auto', pr: 1, minHeight: 0 }}>
        {messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 10, color: colors.muted }}>
            <Typography sx={{ fontWeight: 600, color: colors.text, mb: 0.5 }}>Ask anything about your papers</Typography>
            <Typography variant="body2">e.g. “What datasets were used?” or “What are the main limitations?”</Typography>
          </Box>
        ) : (
          messages.map((m, i) => <Message key={i} msg={m} />)
        )}
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: colors.muted, mb: 2 }}>
            <CircularProgress size={14} color="inherit" />
            <Typography variant="body2">Searching your papers…</Typography>
          </Box>
        )}
        <div ref={endRef} />
      </Box>

      <Paper variant="outlined" sx={{ mt: 2, p: 1, display: 'flex', alignItems: 'flex-end', gap: 1, bgcolor: colors.surface }}>
        <TextField
          fullWidth multiline maxRows={5} variant="standard" placeholder="Ask a question…"
          value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          InputProps={{ disableUnderline: true, sx: { px: 1.5, py: 0.75, fontSize: 14.5 } }}
        />
        <IconButton
          onClick={send} disabled={!query.trim() || loading}
          sx={{ bgcolor: colors.accent, color: '#fff', '&:hover': { bgcolor: '#4f46e5' }, '&.Mui-disabled': { bgcolor: colors.surfaceAlt, color: colors.muted } }}
        >
          <SendIcon fontSize="small" />
        </IconButton>
      </Paper>
    </Box>
  );
};

export default ChatbotAI;
