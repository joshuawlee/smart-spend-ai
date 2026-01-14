const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs'); // Import File System module
const path = require('path');

const app = express();
const PORT = 8000;
const FLASK_URL = 'http://127.0.0.1:5001/predict';

app.use(cors());
app.use(express.json());

// 1. NEW ROUTE: Get Spending History from "Database"
app.get('/api/spending', (req, res) => {
    try {
        // Read the JSON file
        const dataPath = path.join(__dirname, 'data', 'spending.json');
        const rawData = fs.readFileSync(dataPath);
        const jsonData = JSON.parse(rawData);
        
        // Send it to frontend
        res.json(jsonData.history);
    } catch (error) {
        console.error("Error reading DB:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// 2. Updated Forecast Route (Uses data from Frontend)
app.post('/api/forecast', async (req, res) => {
    try {
        const userHistory = req.body.history;
        console.log("➡️ Forwarding to AI...");
        const response = await axios.post(FLASK_URL, { history: userHistory });
        res.json(response.data);
    } catch (error) {
        console.error("❌ AI Error:", error.message);
        res.status(500).json({ error: "AI Service unavailable" });
    }
});

// 3. Add a new spending amount (The "Create" in CRUD)
app.post('/api/spending', (req, res) => {
    try {
        const { amount } = req.body;
        
        // 1. Read existing file
        const dataPath = path.join(__dirname, 'data', 'spending.json');
        const rawData = fs.readFileSync(dataPath);
        const jsonData = JSON.parse(rawData);

        // 2. Add new amount to the array
        jsonData.history.push(Number(amount));

        // 3. Save BACK to the file
        fs.writeFileSync(dataPath, JSON.stringify(jsonData, null, 2));

        // 4. Send back success
        res.json({ success: true, history: jsonData.history });
        console.log(`✅ Added new transaction: $${amount}`);

    } catch (error) {
        console.error("Error saving data:", error);
        res.status(500).json({ error: "Failed to save data" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Node Gateway running on http://localhost:${PORT}`);
});