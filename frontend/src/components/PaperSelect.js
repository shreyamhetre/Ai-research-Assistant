import React from 'react';
import { MenuItem, Select } from '@mui/material';
import { colors } from '../theme';
import { useApp } from '../hooks';

/** Compact dropdown bound to the shared paper selection. */
const PaperSelect = ({ value, disabled, allowAll }) => {
  const { titles, paper, setPaper } = useApp();
  const current = value !== undefined ? value : paper;
  return (
    <Select
      size="small"
      value={current}
      onChange={(e) => setPaper(e.target.value)}
      disabled={disabled || (!allowAll && titles.length === 0)}
      displayEmpty
      renderValue={(v) => v || (allowAll ? 'All papers' : 'Select a paper')}
      sx={{ minWidth: 220, maxWidth: 340, fontSize: 14, color: colors.ink, borderRadius: 2.5 }}
      MenuProps={{ slotProps: { paper: { sx: { maxWidth: 440, mt: 0.5, border: `1px solid ${colors.border}`, boxShadow: '0 10px 30px rgba(28,27,24,0.10)' } } } }}
    >
      {allowAll && <MenuItem value="">All papers</MenuItem>}
      {titles.map((t) => (
        <MenuItem key={t} value={t} sx={{ whiteSpace: 'normal', fontSize: 14 }}>{t}</MenuItem>
      ))}
    </Select>
  );
};

export default PaperSelect;
