import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement
} from 'chart.js';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement);

// --- THE NEW COLOR SYSTEM ---
// Define colors once here, use them everywhere (Table badges & Chart).
const CATEGORY_STYLES = {
  Rent:   { bg: '#dbeafe', text: '#1e40af', chart: '#3b82f6' }, // Blue
  Food:   { bg: '#dcfce7', text: '#166534', chart: '#22c55e' }, // Green
  Travel: { bg: '#fef3c7', text: '#92400e', chart: '#f59e0b' }, // Amber/Orange
  Tech:   { bg: '#ede9fe', text: '#5b21b6', chart: '#8b5cf6' }, // Purple
  Other:  { bg: '#f3f4f6', text: '#374151', chart: '#6b7280' }, // Gray
};
// ---------------------------

function App() {
  const [forecast, setForecast] = useState(null);
  const [spendingHistory, setSpendingHistory] = useState([]);
  const [stats, setStats] = useState({ total: 0, average: 0 });
  
  // Input State
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState('');
  // Important: Default to a valid category key
  const [newCategory, setNewCategory] = useState('Food'); 

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/spending');
      setSpendingHistory(res.data);
      calculateStats(res.data);
    } catch (err) { console.error(err); }
  };

  const calculateStats = (data) => {
    if (!data.length) return;
    const total = data.reduce((a, b) => a + b.amount, 0);
    const average = total / data.length;
    setStats({ total, average: Math.round(average) });
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!newAmount) return;

    try {
      await axios.post('http://localhost:8000/api/spending', {
        amount: newAmount,
        date: newDate || new Date().toISOString().split('T')[0],
        category: newCategory
      });
      setNewAmount('');
      // Keep date and category selected for faster multiple entry
      setForecast(null);
      fetchData();
    } catch (err) { alert("Error saving transaction"); }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:8000/api/spending/${id}`);
      setForecast(null);
      fetchData();
    } catch (err) { alert("Error deleting item"); }
  };

  const handlePredict = async () => {
    try {
      const res = await axios.post('http://localhost:8000/api/forecast', {
        history: spendingHistory
      });
      setForecast(res.data);
    } catch (err) { alert("Error connecting to server."); }
  };

  // --- CHART LOGIC ---
  
  // 1. Line Chart Data
  const lineChartData = {
    labels: [...spendingHistory.map(item => item.date), 'Forecast'],
    datasets: [{
      label: 'Spending Trend',
      data: forecast 
        ? [...spendingHistory.map(item => item.amount), forecast.predicted_next_month] 
        : spendingHistory.map(item => item.amount),
      fill: true,
      backgroundColor: 'rgba(37, 99, 235, 0.1)',
      borderColor: '#2563eb',
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: forecast 
        ? [...Array(spendingHistory.length).fill('#2563eb'), '#10b981'] 
        : '#2563eb'
    }],
  };

  // 2. Doughnut Chart Data (Aggregation)
  const categoryTotals = spendingHistory.reduce((acc, curr) => {
    const cat = curr.category || 'Other';
    acc[cat] = (acc[cat] || 0) + curr.amount;
    return acc;
  }, {});

  const doughnutLabels = Object.keys(categoryTotals);
  const doughnutValues = Object.values(categoryTotals);

  // Map labels to our color system
  const doughnutColors = doughnutLabels.map(label => 
    CATEGORY_STYLES[label]?.chart || CATEGORY_STYLES.Other.chart
  );

  const doughnutData = {
    labels: doughnutLabels,
    datasets: [{
      data: doughnutValues,
      backgroundColor: doughnutColors,
      // POLISH: Add white border to separate slices cleanly
      borderColor: '#ffffff',
      borderWidth: 2,
      // POLISH: Make slice pop out on hover
      hoverOffset: 15, 
    }]
  };

  // POLISH: Doughnut Options for cleaner look
  const doughnutOptions = {
    responsive: true,
    cutout: '65%', // Thinner ring looks more modern
    plugins: {
      legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 10 } },
      tooltip: { 
        backgroundColor: '#1f2937',
        bodyFont: { size: 14, weight: 'bold' },
        callbacks: {
           // Add dollar sign to tooltip
           label: function(context) {
               let label = context.label || '';
               if (label) { label += ': '; }
               if (context.parsed !== null) {
                   label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed);
               }
               return label;
           }
        }
      }
    }
  };


  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div className="logo"><span>💳</span> SmartSpend</div>
        <div className="nav-item active">Dashboard</div>
        <div className="nav-item">Transactions</div>
        <div className="nav-item">AI Insights</div>
        
        {/* Quick Add Form */}
        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '10px' }}>Quick Add</p>
          <form onSubmit={handleAddTransaction}>
             <input 
              type="date" 
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '10px', fontFamily: 'sans-serif' }}
            />
            <select 
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '10px', backgroundColor: 'white' }}
            >
              {/* Generate options from our config object */}
              {Object.keys(CATEGORY_STYLES).map(cat => (
                 <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
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
              + Add Transaction
            </button>
          </form>
        </div>
      </div>

      <div className="main-content">
        <div className="header">
          <h2>Financial Overview</h2>
        </div>

        {/* STAT CARDS */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-title">Total Spending</div>
            <div className="stat-value">${stats.total.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Monthly Average</div>
            <div className="stat-value">${stats.average.toLocaleString()}</div>
          </div>
          <div className="stat-card" style={{ border: '1px solid #10b981', backgroundColor: forecast ? '#f0fdf4' : 'white' }}>
            <div className="stat-title">AI Forecast (Next Month)</div>
            <div className="stat-value" style={{ color: '#10b981' }}>
              {forecast ? `$${forecast.predicted_next_month}` : '---'}
            </div>
            <div className="stat-trend">
              {forecast ? (
                <span className={forecast.predicted_next_month > stats.average ? "trend-down" : "trend-up"}>
                  {forecast.trend} Trend 
                </span>
              ) : "Click 'Run AI' below"}
            </div>
          </div>
        </div>

        {/* TWO CHARTS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
          
          {/* Main Line Chart */}
          <div className="chart-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Spending Trend</h3>
              {!forecast && (
                <button className="action-btn" style={{ width: 'auto', marginTop: 0 }} onClick={handlePredict}>
                  Run AI Forecast
                </button>
              )}
            </div>
            <Line data={lineChartData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: {display: false}}, y: { grid: {borderDash: [5,5]}} } }} />
          </div>

          {/* Doughnut Chart */}
          <div className="chart-container">
            <h3 style={{ margin: '0 0 20px 0' }}>By Category</h3>
            <div style={{ height: '250px', display: 'flex', justifyContent: 'center' }}>
              {spendingHistory.length > 0 ? (
                 <Doughnut data={doughnutData} options={doughnutOptions} />
              ) : <p>Add data to see breakdown</p>}
             
            </div>
          </div>

        </div>

        {/* TRANSACTION TABLE */}
        <div className="chart-container">
          <h3>Recent Transactions</h3>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee', color: '#6b7280', fontSize: '0.9rem' }}>
                <th style={{ padding: '10px' }}>Date</th>
                <th>Category</th>
                <th>Amount</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {spendingHistory.map((item) => {
                // Look up style based on category name
                const style = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.Other;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                    <td style={{ padding: '15px 10px' }}>{item.date}</td>
                    <td>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        backgroundColor: style.bg, // Use looked-up bg
                        color: style.text          // Use looked-up text color
                      }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600' }}>${item.amount.toLocaleString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        style={{ background: 'transparent', color: '#9ca3af', border: '1px solid #e5e7eb', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                        className="delete-btn"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

export default App;