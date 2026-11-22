import React from 'react';
import { Box, Typography } from '@mui/material';

const PageHeader = ({ title, subtitle, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: 3, flexWrap: 'wrap' }}>
    <Box>
      <Typography variant="h5">{title}</Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {children && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>{children}</Box>}
  </Box>
);

export default PageHeader;
