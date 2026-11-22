import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { colors, serif } from '../theme';
import { useApp, useHealth } from '../hooks';

export const TABS = [
  { id: 'library', label: 'Library' },
  { id: 'ask', label: 'Ask' },
  { id: 'summary', label: 'Summaries' },
  { id: 'quiz', label: 'Quiz' },
];

const TopNav = ({ tab, onTab }) => {
  const online = useHealth();
  const { papers } = useApp();
  const dot = online === null ? colors.faint : online ? colors.good : colors.bad;
  const status = online === null ? 'Connecting…' : online ? 'Backend online' : 'Backend offline';

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky', top: 0, zIndex: 20, borderBottom: `1px solid ${colors.border}`,
        bgcolor: 'rgba(250,249,246,0.88)', backdropFilter: 'blur(10px)',
      }}
    >
      <Box sx={{ maxWidth: 860, mx: 'auto', px: { xs: 2, md: 4 }, height: 60, display: 'flex', alignItems: 'center', gap: { xs: 2, md: 5 } }}>
        <Typography
          sx={{ fontFamily: serif, fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em', whiteSpace: 'nowrap', display: { xs: 'none', sm: 'block' } }}
        >
          Research Assistant
          <Box component="span" sx={{ color: colors.accent }}>.</Box>
        </Typography>

        <Box component="nav" sx={{ display: 'flex', gap: { xs: 2, md: 3 }, height: '100%', overflowX: 'auto' }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <Box
                key={t.id}
                component="button"
                onClick={() => onTab(t.id)}
                aria-current={active ? 'page' : undefined}
                sx={{
                  all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.75, height: '100%',
                  boxSizing: 'border-box', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap',
                  color: active ? colors.ink : colors.muted,
                  borderBottom: `2px solid ${active ? colors.ink : 'transparent'}`, mb: '-1px',
                  '&:hover': { color: colors.ink },
                  '&:focus-visible': { outline: `2px solid ${colors.accent}`, outlineOffset: -2, borderRadius: 1 },
                }}
              >
                {t.label}
                {t.id === 'library' && papers.length > 0 && (
                  <Box component="span" sx={{ fontSize: 11.5, color: colors.faint, fontWeight: 500 }}>{papers.length}</Box>
                )}
              </Box>
            );
          })}
        </Box>

        <Tooltip title={status}>
          <Box sx={{ ml: 'auto', width: 8, height: 8, borderRadius: '50%', bgcolor: dot, flexShrink: 0 }} />
        </Tooltip>
      </Box>
    </Box>
  );
};

export default TopNav;
