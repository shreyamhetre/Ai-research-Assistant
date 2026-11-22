import React from 'react';
import { Box, Typography, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFileOutlined';
import ArticleIcon from '@mui/icons-material/ArticleOutlined';
import ChatIcon from '@mui/icons-material/ChatBubbleOutline';
import QuizIcon from '@mui/icons-material/QuizOutlined';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { colors } from '../theme';

export const TABS = [
  { id: 'upload', label: 'Library', icon: <UploadFileIcon fontSize="small" /> },
  { id: 'chatbot', label: 'Ask', icon: <ChatIcon fontSize="small" /> },
  { id: 'summary', label: 'Summaries', icon: <ArticleIcon fontSize="small" /> },
  { id: 'mcq', label: 'Quiz', icon: <QuizIcon fontSize="small" /> },
];

const Sidebar = ({ activeTab, onTabChange }) => (
  <Box
    component="nav"
    sx={{
      width: 232,
      flexShrink: 0,
      bgcolor: colors.surface,
      borderRight: `1px solid ${colors.border}`,
      p: 2,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1, py: 1, mb: 3 }}>
      <Box
        sx={{
          width: 32, height: 32, borderRadius: 2, display: 'grid', placeItems: 'center',
          background: `linear-gradient(135deg, ${colors.accent}, #8b5cf6)`,
        }}
      >
        <AutoStoriesIcon sx={{ fontSize: 18, color: '#fff' }} />
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.1 }}>
        Research
        <br />
        Assistant
      </Typography>
    </Box>

    <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <ListItemButton
            key={tab.id}
            selected={active}
            onClick={() => onTabChange(tab.id)}
            sx={{
              borderRadius: 2,
              color: active ? colors.text : colors.muted,
              '&.Mui-selected': { bgcolor: 'rgba(99,102,241,0.16)', color: '#fff' },
              '&.Mui-selected:hover': { bgcolor: 'rgba(99,102,241,0.22)' },
              '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 34, color: active ? colors.accent : 'inherit' }}>
              {tab.icon}
            </ListItemIcon>
            <ListItemText primary={tab.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
          </ListItemButton>
        );
      })}
    </List>

    <Typography sx={{ mt: 'auto', px: 1, fontSize: 11.5, color: colors.muted }}>
      RAG over your papers · pgvector · BGE
    </Typography>
  </Box>
);

export default Sidebar;
