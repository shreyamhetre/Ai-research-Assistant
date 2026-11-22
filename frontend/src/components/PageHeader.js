import React from 'react';
import { Box, Typography } from '@mui/material';
import { colors } from '../theme';

const PageHeader = ({ title, subtitle, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 4 }}>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="h4" component="h1">{title}</Typography>
      {subtitle && <Typography sx={{ mt: 1, color: colors.muted, fontSize: 15 }}>{subtitle}</Typography>}
    </Box>
    {children && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>{children}</Box>}
  </Box>
);

export default PageHeader;
