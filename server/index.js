const express = require('express');
const cors = require('cors');
const axios = require('axios'); // Used to talk to Python
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = 8000;
const SECRET_KEY = "super-secret-key-change-this-later"; 

app.use(cors());
app.use(express.json());

// --- MIDDLEWARE: Protect Routes ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) return res.status(401).json({ error: "Access Denied" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid Token" });
    req.user = user; 
    next();
  });
};

// --- AUTH ROUTES ---
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword }
    });
    res.json({ message: "User registered!", userId: user.id });
  } catch (error) {
    res.status(400).json({ error: "Email already exists" });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
      res.json({ token, email: user.email });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});


// --- AI ROUTES (The "Bridge") ---

// 1. Auto-Categorize (Text -> Category)
app.post('/api/classify', async (req, res) => {
  const { text } = req.body;
  try {
    // Send to Python Microservice (Port 5001)
    const response = await axios.post('http://127.0.0.1:5001/predict_category', { text });
    res.json(response.data);
  } catch (error) {
    console.error("AI Service Error:", error.message);
    res.json({ category: "Other" }); // Fallback
  }
});

// 2. Forecast (History -> Next Month)
app.post('/api/forecast', async (req, res) => {
  try {
    const userHistory = req.body.history; // Expecting array of { amount: 100, ... }
    
    // Extract just numbers for Python
    const plainNumbers = userHistory.map(item => item.amount);
    
    const response = await axios.post('http://127.0.0.1:5001/predict', { history: plainNumbers });
    res.json(response.data);
  } catch (error) {
    console.error("AI Service Error:", error.message);
    res.status(500).json({ error: "AI unavailable" });
  }
});


// --- TRANSACTION ROUTES ---
app.get('/api/spending', authenticateToken, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id }, 
      orderBy: { date: 'desc' },
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/spending', authenticateToken, async (req, res) => {
  const { amount, category, text, date } = req.body;
  try {
    await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        category: category || 'Other',
        text: text || '',
        date: date ? new Date(date) : undefined,
        userId: req.user.id, 
      },
    });

    const updatedHistory = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' },
    });
    res.json({ success: true, history: updatedHistory });

  } catch (error) {
    res.status(500).json({ error: "Failed to save" });
  }
});

app.delete('/api/spending/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.transaction.deleteMany({
      where: { 
        id: parseInt(id),
        userId: req.user.id 
      },
    });

    const updatedHistory = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' },
    });
    res.json({ success: true, history: updatedHistory });

  } catch (error) {
    res.status(500).json({ error: "Failed to delete" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Master Server running on http://localhost:${PORT}`);
});