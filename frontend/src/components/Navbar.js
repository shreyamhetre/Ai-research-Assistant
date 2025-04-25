import React from 'react';
import { AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import AccountCircle from '@mui/icons-material/AccountCircle';

const Navbar = () => {
  return (
    <AppBar
      position="static"
      style={{
        backgroundColor: '#1e1e1e',
        height: '3rem',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
        borderBottom: '1px solid rgb(98, 103, 98)'

      }}
    >
      <Toolbar
        style={{
          minHeight: '3rem',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        {/* Left: App Name */}
        <Typography
          style={{
            fontWeight: 'bold',
            fontSize: '16px',
            color: '#ffffff',
          }}
        >
          AI Research Assistant
        </Typography>

        {/* Right: Links and Profile Icon */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Typography
            style={{
              marginRight: '20px',
              color: '#ffffff',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'color 0.3s',
            }}
            onMouseEnter={(e) => (e.target.style.color = '#3f51b5')}
            onMouseLeave={(e) => (e.target.style.color = '#ffffff')}
          >
            About
          </Typography>
          <Typography
            style={{
              marginRight: '20px',
              color: '#ffffff',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'color 0.3s',
            }}
            onMouseEnter={(e) => (e.target.style.color = '#3f51b5')}
            onMouseLeave={(e) => (e.target.style.color = '#ffffff')}
          >
            Contact Us
          </Typography>
          <IconButton style={{ color: '#ffffff' }}>
            <AccountCircle />
          </IconButton>
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;