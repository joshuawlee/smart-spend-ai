const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8000; // Make sure this is 8000
const FLASK_URL = 'http://127.0.0.1:5001/predict';

app.use(cors());
app.use(express.json());

// Helper: Get Data Path
const getDataPath = () => path.join(__dirname, 'data', 'spending.json');

// 1. GET: Fetch all transactions
app.get('/api/spending', (req, res) => {
    try {
        const rawData = fs.readFileSync(getDataPath());
        const jsonData = JSON.parse(rawData);
        
        // Safety Sort: Ensure they are sorted when we read them too
        jsonData.history.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        res.json(jsonData.history);
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
});

// 2. POST: Add new transaction (FIXED: Categories + Sorting)
app.post('/api/spending', (req, res) => {
    try {
        // FIX 1: Explicitly get 'category' from the request
        const { amount, date, category } = req.body;
        
        const rawData = fs.readFileSync(getDataPath());
        const jsonData = JSON.parse(rawData);

        // Create new object
        const newTransaction = {
            id: Date.now(),
            amount: Number(amount),
            date: date || new Date().toISOString().split('T')[0],
            // FIX 1: Ensure category is saved, default to 'Other' if missing
            category: category || "Other" 
        };

        jsonData.history.push(newTransaction);

        // FIX 2: Sort Chronologically (Oldest -> Newest)
        jsonData.history.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Save sorted data back to file
        fs.writeFileSync(getDataPath(), JSON.stringify(jsonData, null, 2));

        res.json({ success: true, history: jsonData.history });
        console.log(`✅ Added: $${amount} for ${category} on ${newTransaction.date}`);

    } catch (error) {
        console.error("Save Error:", error);
        res.status(500).json({ error: "Failed to save" });
    }
});

// 3. DELETE: Remove transaction by ID
app.delete('/api/spending/:id', (req, res) => {
    try {
        const { id } = req.params;
        const rawData = fs.readFileSync(getDataPath());
        let jsonData = JSON.parse(rawData);

        // Filter out the item
        jsonData.history = jsonData.history.filter(item => item.id !== Number(id));

        // Save
        fs.writeFileSync(getDataPath(), JSON.stringify(jsonData, null, 2));
        res.json({ success: true, history: jsonData.history });

    } catch (error) {
        res.status(500).json({ error: "Failed to delete" });
    }
});

// 4. PREDICT: Forecast
app.post('/api/forecast', async (req, res) => {
    try {
        const userHistory = req.body.history;
        const plainNumbers = userHistory.map(item => item.amount);
        const response = await axios.post(FLASK_URL, { history: plainNumbers });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: "AI Service unavailable" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Node Gateway running on http://localhost:${PORT}`);
});