import React from 'react';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';

const PaperSelect = ({ titles, value, onChange, disabled, allowAll, minWidth = 240 }) => (
  <FormControl size="small" sx={{ minWidth }}>
    <InputLabel>Paper</InputLabel>
    <Select
      label="Paper"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || (!allowAll && titles.length === 0)}
      displayEmpty={allowAll}
      MenuProps={{ slotProps: { paper: { sx: { maxWidth: 420 } } } }}
    >
      {allowAll && <MenuItem value="">All papers</MenuItem>}
      {titles.map((t) => (
        <MenuItem key={t} value={t} sx={{ whiteSpace: 'normal' }}>
          {t}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);

export default PaperSelect;
