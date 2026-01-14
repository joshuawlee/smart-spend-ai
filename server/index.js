const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 8000; // Node runs on port 5000
const FLASK_URL = 'http://127.0.0.1:5001/predict'; // Python runs on 5001

// Middleware
app.use(cors()); // Allow Frontend requests
app.use(express.json()); // specific helper to parse JSON data

// 1. Basic Health Check Route
// This is just to test if the server works at all.
app.get('/', (req, res) => {
    res.send('API Gateway is running...');
});

// 2. The Main Route
// The Frontend will call THIS URL, not the Python one directly.
app.post('/api/forecast', async (req, res) => {
    try {
        // Get the data that React sent us
        const userHistory = req.body.history;

        console.log("➡️ Received request from Frontend. Forwarding to AI...");

        // Send that data to the Python Microservice
        const response = await axios.post(FLASK_URL, {
            history: userHistory
        });

        // Send the Python answer back to the React Frontend
        console.log("⬅️ Got answer from AI. Sending to Frontend.");
        res.json(response.data);

    } catch (error) {
        console.error("❌ Error:", error.message);
        res.status(500).json({ error: "Failed to connect to AI Service" });
    }
});

// Start the Server
app.listen(PORT, () => {
    console.log(`🚀 Node Gateway running on http://localhost:${PORT}`);
});