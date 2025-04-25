import React, { useState, useEffect } from "react";
import {    
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Divider,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';

const MCQAI = () => {
    const [mcqs, setMcqs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const [titles, setTitles] = useState([]);
    const [selectedTitle, setSelectedTitle] = useState('');

    useEffect(() => {
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

    const generateMCQs = async () => {
        if (!selectedTitle) {
            setError("Please select a paper");
            return;
        }

        setLoading(true);
        setError("");
        setMcqs([]);
        setSelectedAnswers({});
        setShowResults(false);

        try {
            const response = await fetch('http://localhost:5000/createMcq', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title: selectedTitle }),
            });

            const data = await response.json();

            if (response.ok) {
                setMcqs(data.mcqs);
            } else {
                throw new Error(data.error || "Failed to generate MCQs");
            }
        } catch (error) {
            console.error('MCQ generation error:', error);
            setError(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (questionIndex, value) => {
        setSelectedAnswers({
            ...selectedAnswers,
            [questionIndex]: value
        });
    };

    const handleCheckAnswers = () => {
        setShowResults(true);
    };

    const renderMCQs = () => {
        return mcqs.map((mcq, index) => {
            const questionNum = index + 1;
            const options = mcq.options;
            const correctAnswer = mcq.correct_answer;
            const selectedAnswer = selectedAnswers[index];
            const isCorrect = showResults && selectedAnswer === correctAnswer;

            return (
                <Box key={index} sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom sx={{ fontSize: '14px' }}>
                        Question {questionNum}: {mcq.question}
                    </Typography>

                    <FormControl component="fieldset" sx={{ ml: 2 }}>
                        <RadioGroup
                            value={selectedAnswers[index] || ""}
                            onChange={(e) => handleAnswerChange(index, e.target.value)}
                        >
                            {options.map((option, optIndex) => {
                                const optionIdentifier = option.split(')')[0] + ')'; // e.g., "a)"
                                const optionText = option; // Full text, e.g., "a) Conversational fluency and adaptability"
                                return (
                                    <FormControlLabel
                                        key={optIndex}
                                        value={optionIdentifier} // Use "a)", "b)", etc.
                                        control={<Radio sx={{ color: 'white' }} />}
                                        label={optionText} // Display full text
                                        sx={{
                                            color: showResults && optionIdentifier === correctAnswer ? 'rgb(144, 238, 144)' : 
                                                  (showResults && selectedAnswer === optionIdentifier && optionIdentifier !== correctAnswer) ? 'error.main' : 'inherit',
                                            '& .MuiTypography-root': { fontSize: '12px' }
                                        }}
                                    />
                                );
                            })}
                        </RadioGroup>
                    </FormControl>

                    {showResults && (
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                mt: 1, 
                                color: isCorrect ? 'success.main' : 'error.main',
                                fontWeight: 'bold',
                                fontSize: '12px'
                            }}
                        >
                            {isCorrect ? "Correct!" : `Wrong! The correct answer is: ${correctAnswer}`}
                        </Typography>
                    )}
                    
                    <Divider sx={{ mt: 2 }} />
                </Box>
            );
        });
    };

    return (
        <Box
            style={{
                padding: "10px",
                backgroundColor: "#1e1e1e",
                color: "#ffffff",
                height: "80vh",
                display: "flex",
                flexDirection: "column",
                overflow: "auto", // Changed to "auto" to allow scrolling
            }}
        >
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={generateMCQs}
                    disabled={loading || !selectedTitle}
                    sx={{ mt: 2, mr: 2, fontSize: '14px' }}
                >
                    {loading ? <CircularProgress size={24} sx={{ color: "rgb(43, 43, 243)" }} /> : "Generate MCQs"}
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

            {error && (
                <Typography color="error" sx={{ mb: 2 }}>
                    {error}
                </Typography>
            )}

            {mcqs.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button
                        variant="outlined"
                        onClick={handleCheckAnswers}
                        sx={{ 
                            mt: 2, 
                            fontSize: '14px',
                            color: 'rgb(144, 238, 144)', 
                            borderColor: 'rgb(144, 238, 144)',
                            '&:hover': {
                                borderColor: 'rgb(144, 238, 144)',
                                backgroundColor: 'rgba(144, 238, 144, 0.1)',
                            }
                        }}
                    >
                        Check Answers
                    </Button>
                    <Paper 
                        elevation={6} 
                        sx={{ 
                            p: 2, 
                            bgcolor: "#2a2a2a", 
                            color: "#ffffff",
                            overflow: "auto", // Keep this to allow scrolling if needed
                            border: '1px solid rgb(98, 103, 98)',
                            boxSizing: "border-box",
                        }}
                    >
                        {renderMCQs()}
                    </Paper>
                </Box>
            )}
        </Box>
    );
};

export default MCQAI;