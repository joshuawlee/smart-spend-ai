import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function App() {
  const [forecast, setForecast] = useState(null);
  const [spendingHistory, setSpendingHistory] = useState([]);
  const [stats, setStats] = useState({ total: 0, average: 0 });
  
  // NEW: State for the input box
  const [newAmount, setNewAmount] = useState('');

  // Load Data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/spending');
      setSpendingHistory(res.data);
      calculateStats(res.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const calculateStats = (data) => {
    if (!data.length) return;
    const total = data.reduce((a, b) => a + b, 0);
    const average = total / data.length;
    setStats({ total, average: Math.round(average) });
  };

  // NEW: Handle adding a transaction
  const handleAddTransaction = async (e) => {
    e.preventDefault(); // Prevent page reload
    if (!newAmount) return;

    try {
      // Send to server
      await axios.post('http://localhost:8000/api/spending', {
        amount: newAmount
      });
      
      // Clear input and refresh data
      setNewAmount('');
      setForecast(null); // Reset forecast since data changed
      fetchData(); // Re-fetch to update chart
      alert("Transaction Added! 💸");
    } catch (err) {
      alert("Error saving transaction");
    }
  };

  const handlePredict = async () => {
    try {
      const res = await axios.post('http://localhost:8000/api/forecast', {
        history: spendingHistory
      });
      setForecast(res.data);
    } catch (err) {
      console.error(err);
      alert("Error connecting to server.");
    }
  };

  const data = {
    labels: spendingHistory.map((_, i) => `Month ${i + 1}`),
    datasets: [
      {
        label: 'Spending Trend',
        data: forecast 
          ? [...spendingHistory, forecast.predicted_next_month] 
          : spendingHistory,
        fill: true,
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderColor: '#2563eb',
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: forecast 
          ? [...Array(spendingHistory.length).fill('#2563eb'), '#10b981'] 
          : '#2563eb'
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1f2937',
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      y: { grid: { borderDash: [5, 5] }, beginAtZero: true },
      x: { grid: { display: false } }
    }
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div className="logo"><span>💳</span> SmartSpend</div>
        <div className="nav-item active">Dashboard</div>
        <div className="nav-item">Transactions</div>
        <div className="nav-item">AI Insights</div>
        
        {/* NEW: Quick Add Form in Sidebar */}
        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '10px' }}>Quick Add</p>
          <form onSubmit={handleAddTransaction}>
            <input 
              type="number" 
              placeholder="Amount ($)" 
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '10px' }}
            />
            <button 
              type="submit" 
              style={{ width: '100%', padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              + Add Month
            </button>
          </form>
        </div>
      </div>

      <div className="main-content">
        <div className="header">
          <h2>Financial Overview</h2>
          <p>Track your spending habits with AI-powered forecasting.</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-title">Total Spending</div>
            <div className="stat-value">${stats.total.toLocaleString()}</div>
            <div className="stat-trend trend-up">Lifetime Volume</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-title">Monthly Average</div>
            <div className="stat-value">${stats.average.toLocaleString()}</div>
            <div className="stat-trend">Based on last {spendingHistory.length} months</div>
          </div>

          <div className="stat-card" style={{ border: '1px solid #10b981' }}>
            <div className="stat-title">Next Month Forecast</div>
            <div className="stat-value" style={{ color: '#10b981' }}>
              {forecast ? `$${forecast.predicted_next_month}` : '---'}
            </div>
            <div className="stat-trend">
              {forecast ? (
                <span className={forecast.predicted_next_month > stats.average ? "trend-down" : "trend-up"}>
                  {forecast.trend} Trend
                </span>
              ) : "AI Ready"}
            </div>
          </div>
        </div>

        <div className="chart-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Spending Analytics</h3>
            {!forecast && (
              <button className="action-btn" style={{ width: 'auto', marginTop: 0 }} onClick={handlePredict}>
                Run AI Forecast
              </button>
            )}
          </div>
          <Line data={data} options={options} />
        </div>
      </div>
    </div>
  );
}

export default App;