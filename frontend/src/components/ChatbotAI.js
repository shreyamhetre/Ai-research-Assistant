import React, { useState, useRef, useEffect } from "react";
import { 
    TextField, 
    Button, 
    Box, 
    Typography, 
    Paper, 
    CircularProgress,
    Avatar
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';

const ChatbotAI = () => {
    const [query, setQuery] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleInputChange = (e) => {
        setQuery(e.target.value);
    };

    const handleSendQuery = async () => {
        if (!query.trim()) return;

        const userMessage = {
            text: query,
            sender: "user"
        };
        setMessages(prev => [...prev, userMessage]);
        
        const currentQuery = query;
        setQuery("");
        setLoading(true);

        try {
            const response = await fetch('http://localhost:5000/chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: currentQuery }),
            });

            const data = await response.json();

            if (response.ok) {
                const botMessage = {
                    text: data.response,
                    sender: "bot"
                };
                setMessages(prev => [...prev, botMessage]);
            } else {
                throw new Error(data.error || "Failed to get response");
            }
        } catch (error) {
            console.error('Chatbot error:', error);
            const errorMessage = {
                text: `Error: ${error.message}`,
                sender: "bot",
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey && query.trim()) {
            e.preventDefault();
            handleSendQuery();
        }
    };

    return (
        <Box
            style={{
                padding: "20px",
                backgroundColor: "#1e1e1e",
                color: "#ffffff",
                height: "80vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    p: 2,
                    bgcolor: "#2a2a2a",
                    color: "#ffffff",
                    flexGrow: 1,
                    mb: 2,
                    overflow: "auto",
                    display: "flex",
                    flexDirection: "column",
                    border: '2px solid rgb(98, 103, 98)'
                }}
            >
                {messages.length === 0 ? (
                    <Box 
                        sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            height: '100%',
                            opacity: 0.7
                        }}
                    >
                        <SmartToyIcon sx={{ fontSize: 60, mb: 2 ,color: "#000000"}} />
                        <Typography variant="body1">
                            Ask me anything!
                        </Typography>
                    </Box>
                ) : (
                    messages.map((msg, index) => (
                        <Box
                            key={index}
                            sx={{
                                display: "flex",
                                mb: 2,
                                flexDirection: msg.sender === "user" ? "row-reverse" : "row",
                                alignItems: "flex-start"
                            }}
                        >
                            <Avatar 
                                sx={{ 
                                    bgcolor: msg.sender === "user" ? "#3f51b5" : (msg.isError ? "#f44336" : "white"),
                                    mr: msg.sender === "user" ? 0 : 1,
                                    ml: msg.sender === "user" ? 1 : 0,
                                    width: msg.sender === "user" ? 32 : 40,
                                    height: msg.sender === "user" ? 32 : 40
                                }}
                            >
                                {msg.sender === "user" ? <PersonIcon /> : <SmartToyIcon />}
                            </Avatar>
                            <Paper
                                sx={{
                                    p: 1.5,
                                    bgcolor: msg.sender === "user" ? "#3f51b5" : (msg.isError ? "#f44336" : "white"),
                                    color: msg.sender === "user" ? "#ffffff" : (msg.isError ? "#ffffff" : "#000000"),
                                    maxWidth: "75%",
                                    borderRadius: '10px',
                                    wordBreak: "break-word"
                                }}
                            >
                                <Typography variant="body1">{msg.text}</Typography>
                            </Paper>
                        </Box>
                    ))
                )}
                <div ref={messagesEndRef} />
            </Paper>

            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    borderTop: "1px solid #3f51b5",
                    pt: 2
                }}
            >
                <TextField
                    fullWidth
                    variant="outlined"
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your query here..."
                    multiline
                    maxRows={3}
                    disabled={loading}
                    InputProps={{
                        style: { color: "#ffffff", backgroundColor: "#2c2c2c" },
                    }}
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            "& fieldset": { borderColor: "#3f51b5" },
                            "&:hover fieldset": { borderColor: "#3f51b5" },
                            "&.Mui-focused fieldset": { borderColor: "#3f51b5" },
                        },
                    }}
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSendQuery}
                    disabled={!query.trim() || loading}
                    style={{ marginLeft: "10px", width: "50px", height: "50px" }}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
                </Button>
            </Box>
        </Box>
    );
};

export default ChatbotAI;