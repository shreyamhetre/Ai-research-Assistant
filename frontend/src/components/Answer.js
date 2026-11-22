import React from 'react';
import { Box, Tooltip } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import { pdfUrl } from '../api';
import { colors } from '../theme';

/** Numbered badge; hover shows the passage, click opens the PDF at that page. */
const Cite = ({ n, source }) => (
  <Tooltip
    title={
      source ? (
        <>
          <strong>{source.title} · p.{source.page}</strong>
          <br />
          {source.snippet}…
          <br />
          <em>Click to open the PDF</em>
        </>
      ) : ''
    }
  >
    <Box
      component="sup"
      onClick={() => source && window.open(pdfUrl(source.title, source.page), '_blank', 'noopener')}
      sx={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 16, height: 16, px: 0.5,
        mx: '2px', borderRadius: 1, fontSize: 10.5, fontWeight: 600, lineHeight: 1, cursor: source ? 'pointer' : 'default',
        bgcolor: colors.accentSoft, color: colors.accent, verticalAlign: 'baseline', position: 'relative', top: -2,
        '&:hover': source ? { bgcolor: colors.accent, color: '#fff' } : {},
      }}
    >
      {n}
    </Box>
  </Tooltip>
);

/** Turn [1] / [1, 2] markers into link-like tokens that the renderer swaps for citation badges. */
const withCites = (text) =>
  text.replace(/\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g, (_, ids) =>
    ids.split(',').map((i) => `[${i.trim()}](cite:${i.trim()})`).join('')
  );

const Answer = ({ text, sources = [] }) => (
  <Box className="md">
    <ReactMarkdown
      urlTransform={(u) => u}
      components={{
        a: ({ href, children }) =>
          href?.startsWith('cite:') ? (
            <Cite n={Number(href.slice(5))} source={sources.find((s) => s.id === Number(href.slice(5)))} />
          ) : (
            <a href={href} target="_blank" rel="noreferrer">{children}</a>
          ),
      }}
    >
      {withCites(text)}
    </ReactMarkdown>
  </Box>
);

export default Answer;
