import React from 'react';
import { Box, List, ListItem, ListItemText } from '@mui/material';

const Sidebar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'upload', label: 'Upload Pdf' },
    { id: 'summary', label: 'Summary Agent' },
    { id: 'chatbot', label: 'Chatbot Agent' },
    { id: 'mcq', label: 'MCQ Agent' },
  ];

  return (
    <Box
      style={{
        width: '20%',
        backgroundColor: '#2a2a2a',
        height: '100%',
        padding: '20px',
        boxSizing: 'border-box',
        // borderRight: '1px solidrgb(15, 113, 56)',
        borderRight: '1px solid rgb(98, 103, 98)'
      }}
    >
      <List>
        {tabs.map((tab) => (
          <ListItem
            key={tab.id}
            button
            onClick={() => onTabChange(tab.id)}
            style={{
              backgroundColor: activeTab === tab.id ? '#3f51b5' : '#3a3a3a',
              marginBottom: '10px',
              borderRadius: '5px',
              transition: 'background-color 0.3s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#3f51b5')}
            onMouseLeave={(e) =>
              e.currentTarget.style.backgroundColor =
                activeTab === tab.id ? '#3f51b5' : '#3a3a3a'
            }
          >
            <ListItemText
              primary={tab.label}
              primaryTypographyProps={{
                style: { color: '#ffffff', fontSize: '14px' },
              }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default Sidebar;