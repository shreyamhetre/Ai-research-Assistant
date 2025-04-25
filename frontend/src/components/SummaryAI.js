// SummaryAI.js
import React, { useState, useEffect } from "react";
import { Box, Typography, Button, CircularProgress, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

const SummaryAI = () => {
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [titles, setTitles] = useState([]);
    const [selectedTitle, setSelectedTitle] = useState('');

    useEffect(() => {
        // Fetch titles on component mount
        const fetchTitles = async () => {
            try {
                const response = await fetch('http://localhost:5000/fetch-titles');
                const data = await response.json();
                if (response.ok && data.titles.length > 0) {
                    setTitles(data.titles);
                    setSelectedTitle(data.titles[0]); // Auto-select the first title
                }
            } catch (error) {
                console.error('Error fetching titles:', error);
                setError('Failed to load paper titles');
            }
        };
        fetchTitles();
    }, []);

    const generateSummary = async () => {
        if (!selectedTitle) {
            setError('Please select a paper');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const response = await fetch('http://localhost:5000/summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title: selectedTitle }),
            });
            const data = await response.json();
            if (response.ok) {
                setSummary(data.summary);
            } else {
                setError(data.error || 'An error occurred while generating the summary');
            }
        } catch (error) {
            console.error('Summary generation error:', error);
            setError(`An error occurred while generating the summary: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box style={{ padding: '20px', backgroundColor: '#1e1e1e', color: "#ffffff", height: 'auto', display: 'flex', flexDirection: 'column', position: 'relative', alignItems: 'center' }}>
            <Box sx={{ alignSelf: 'flex-start', mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={generateSummary}
                    disabled={loading || !selectedTitle}
                    sx={{ 
                        fontSize: '14px',
                        fontFamily: 'Poppins, sans-serif',
                    }}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : "Generate Summary"}
                </Button>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel sx={{ color: '#b0b0b0' }}>Select Paper</InputLabel>
                    <Select
                        value={selectedTitle}
                        onChange={(e) => setSelectedTitle(e.target.value)}
                        label="Select Paper"
                        disabled={loading || titles.length === 0}
                        sx={{
                            color: '#ffffff',
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': { borderColor: '#3f51b5' },
                                '&:hover fieldset': { borderColor: '#3f51b5' },
                                '&.Mui-focused fieldset': { borderColor: '#3f51b5' },
                            },
                            '& .MuiSelect-icon': { color: '#3f51b5' },
                        }}
                    >
                        {titles.map((title) => (
                            <MenuItem key={title} value={title} sx={{ color: '#000000', background: '#ffffff' }}>
                                {title}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>
            
            {error && error.trim() !== '' && (
                <Typography color="error" sx={{ mb: 2 }}>
                    {error}
                </Typography>
            )}

            {summary && (
                <Paper 
                    elevation={3} 
                    sx={{ 
                        p: 2, 
                        bgcolor: "#2a2a2a", 
                        color: "#ffffff",
                        flexGrow: 1,
                        overflow: "auto",
                        maxHeight: "calc(100% - 60px)", 
                        width: "90%"
                    }}
                >
                    <Typography variant="h6" gutterBottom>
                        Summary:
                    </Typography>
                    <Typography variant="body1">
                        {summary}
                    </Typography>
                </Paper>
            )}
        </Box>
    );
};

export default SummaryAI;