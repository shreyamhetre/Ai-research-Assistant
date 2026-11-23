import React from 'react';
import { Box, Typography } from '@mui/material';
import { pdfUrl } from '../api';
import { colors, serif } from '../theme';

const VERDICT = {
  consensus: { label: 'Consensus', fg: colors.good, bg: colors.goodSoft },
  contradiction: { label: 'Contradiction', fg: colors.bad, bg: colors.badSoft },
  partial: { label: 'Partial overlap', fg: colors.accent, bg: colors.accentSoft },
  single: { label: 'One paper only', fg: colors.muted, bg: colors.sunken },
};

const STANCE = {
  agrees: { label: 'Agrees', color: colors.good },
  disagrees: { label: 'Disagrees', color: colors.bad },
  partial: { label: 'Partly', color: colors.accent },
  not_mentioned: { label: 'Not mentioned', color: colors.faint },
};

const Pill = ({ fg, bg, children }) => (
  <Box component="span" sx={{ px: 1.25, py: 0.35, borderRadius: 5, fontSize: 12, fontWeight: 600, color: fg, bgcolor: bg, whiteSpace: 'nowrap' }}>
    {children}
  </Box>
);

const Position = ({ pos }) => {
  const s = STANCE[pos.stance] || STANCE.partial;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 12.5, color: colors.muted, fontWeight: 500 }} noWrap title={pos.paper}>{pos.paper}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: s.color, mt: 0.25 }}>{s.label}</Typography>
      {pos.claim && <Typography sx={{ fontSize: 14, lineHeight: 1.55, mt: 0.5 }}>{pos.claim}</Typography>}
      {pos.pages?.length > 0 && (
        <Typography sx={{ fontSize: 12.5, mt: 0.75, color: colors.faint }}>
          {pos.pages.map((p, i) => (
            <React.Fragment key={p}>
              {i > 0 && ', '}
              <Box
                component="a" href={pdfUrl(pos.paper, p)} target="_blank" rel="noreferrer"
                sx={{ color: colors.accent, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                p.{p}
              </Box>
            </React.Fragment>
          ))}
        </Typography>
      )}
    </Box>
  );
};

/** Result of the multi-agent comparison crew: synthesis, then each point with every paper's stance. */
const ComparisonCard = ({ data }) => (
  <Box>
    <Typography variant="overline" sx={{ color: colors.muted }}>Comparison · {data.topic}</Typography>
    {data.summary && (
      <Typography sx={{ fontFamily: serif, fontSize: 19, lineHeight: 1.5, mt: 0.5, mb: 2 }}>{data.summary}</Typography>
    )}
    {data.points.length === 0 && (
      <Typography sx={{ color: colors.muted, fontSize: 14 }}>No comparable points were found for this topic.</Typography>
    )}
    {data.points.map((p, i) => {
      const v = VERDICT[p.verdict] || VERDICT.partial;
      return (
        <Box key={i} sx={{ py: 2.25, borderTop: `1px solid ${colors.border}` }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', mb: 1.5 }}>
            <Typography sx={{ fontFamily: serif, fontSize: 18, fontWeight: 500, flex: 1, minWidth: 200 }}>{p.point}</Typography>
            <Pill fg={v.fg} bg={v.bg}>{v.label}</Pill>
          </Box>
          <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: `repeat(auto-fit, minmax(${p.positions.length > 2 ? 170 : 220}px, 1fr))` }}>
            {p.positions.map((pos, j) => <Position key={j} pos={pos} />)}
          </Box>
        </Box>
      );
    })}
  </Box>
);

export default ComparisonCard;
