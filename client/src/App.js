import React, { useState, useEffect } from 'react';
import Login from './Login';
import axios from 'axios';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement
} from 'chart.js';
import { FiHome, FiCreditCard, FiPieChart, FiPlus, FiTrash2, FiX, FiActivity, FiMoon, FiSun, FiLogOut } from 'react-icons/fi';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ArcElement);

const CATEGORY_STYLES = {
  Rent:   { bg: '#dbeafe', text: '#1e40af', chart: '#3b82f6' },
  Food:   { bg: '#dcfce7', text: '#166534', chart: '#22c55e' },
  Travel: { bg: '#fef3c7', text: '#92400e', chart: '#f59e0b' },
  Tech:   { bg: '#ede9fe', text: '#5b21b6', chart: '#8b5cf6' },
  Other:  { bg: '#f3f4f6', text: '#374151', chart: '#6b7280' },
};

function App() {
  // --- AUTH STATE ---
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  // --- APP STATE ---
  const [view, setView] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [spendingHistory, setSpendingHistory] = useState([]);
  const [stats, setStats] = useState({ total: 0, average: 0 });
  const [insights, setInsights] = useState({ topCategory: 'N/A', highestMonth: 'N/A', growth: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- INPUT STATE ---
  const [newAmount, setNewAmount] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newCategory, setNewCategory] = useState('Food');
  const [newText, setNewText] = useState(''); 

  // --- 1. SETUP AXIOS & FETCH ON LOAD ---
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchData();
    }
  }, [token]);

  // --- AUTH HANDLERS ---
  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setSpendingHistory([]); 
  };

  // --- DATA FETCHING ---
  const fetchData = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/spending');
      const data = res.data;
      setSpendingHistory(data);
      calculateStats(data);
      generateInsights(data);
    } catch (err) { 
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        handleLogout();
      }
    }
  };

  // --- CALCULATIONS ---
  const calculateStats = (data) => {
    if (!data.length) {
      setStats({ total: 0, average: 0 });
      return;
    }
    const total = data.reduce((a, b) => a + b.amount, 0);
    const average = total / data.length;
    setStats({ total, average: Math.round(average) });
  };

  const generateInsights = (data) => {
    if (data.length === 0) return;
    const totals = data.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {});
    const topCat = Object.keys(totals).reduce((a, b) => totals[a] > totals[b] ? a : b);
    const maxTx = data.reduce((prev, current) => (prev.amount > current.amount) ? prev : current);
    
    let growthRate = 0;
    if (data.length >= 2) {
      const last = data[0].amount; 
      const prev = data[1].amount;
      if (prev !== 0) growthRate = ((last - prev) / prev) * 100;
    }

    setInsights({
      topCategory: topCat,
      highestMonth: `${new Date(maxTx.date).toLocaleDateString()} ($${maxTx.amount})`,
      growth: growthRate.toFixed(1)
    });
  };

  // --- 🤖 AI AUTO-CATEGORIZE ---
  const handleAutoCategorize = async () => {
    console.log("1. Auto-Categorize Triggered for:", newText); // DEBUG LOG

    if (!newText) return; 

    try {
      console.log("2. Sending request to Node..."); // DEBUG LOG
      const res = await axios.post('http://localhost:8000/api/classify', {
        text: newText
      });

      console.log("3. Response from Node:", res.data); // DEBUG LOG
      const predictedCategory = res.data.category;

      if (predictedCategory && CATEGORY_STYLES[predictedCategory]) {
        setNewCategory(predictedCategory);
        console.log("4. Category updated to:", predictedCategory); // DEBUG LOG
      }
    } catch (err) {
      console.log("❌ Auto-categorize failed:", err);
    }
  };

  // --- ACTIONS ---
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!newAmount) return;
    try {
      const res = await axios.post('http://localhost:8000/api/spending', {
        amount: newAmount,
        date: newDate || new Date().toISOString(),
        category: newCategory,
        text: newText 
      });
      
      if (res.data.success) {
        setSpendingHistory(res.data.history);
        calculateStats(res.data.history);
        generateInsights(res.data.history);
      }
      
      // Reset Form
      setNewAmount('');
      setNewText('');
      setForecast(null);
      setIsModalOpen(false);
    } catch (err) { 
      alert("Error saving transaction"); 
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Delete transaction?")) return;
    try {
      const res = await axios.delete(`http://localhost:8000/api/spending/${id}`);
      if (res.data.success) {
        setSpendingHistory(res.data.history);
        calculateStats(res.data.history);
        generateInsights(res.data.history);
      }
      setForecast(null);
    } catch (err) { alert("Error deleting"); }
  };

  const handlePredict = async () => {
    try {
      const res = await axios.post('http://localhost:8000/api/forecast', { history: spendingHistory });
      setForecast(res.data);
    } catch (err) { alert("AI Service unavailable"); }
  };

  const toggleTheme = () => {
    const newTheme = !darkMode;
    setDarkMode(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
  };

  // --- CHART DATA PREP ---
  const chartHistory = [...spendingHistory].reverse(); 

  const lineChartData = {
    labels: [...chartHistory.map(item => new Date(item.date).toLocaleDateString()), 'Forecast'],
    datasets: [{
      label: 'Trend',
      data: forecast 
        ? [...chartHistory.map(item => item.amount), forecast.predicted_next_month] 
        : chartHistory.map(item => item.amount),
      fill: true,
      backgroundColor: 'rgba(37, 99, 235, 0.1)',
      borderColor: '#2563eb',
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: forecast ? [...Array(chartHistory.length).fill('#2563eb'), '#10b981'] : '#2563eb'
    }],
  };

  const catTotals = spendingHistory.reduce((acc, curr) => {
    const cat = curr.category || 'Other';
    acc[cat] = (acc[cat] || 0) + curr.amount;
    return acc;
  }, {});
  
  const doughnutData = {
    labels: Object.keys(catTotals),
    datasets: [{
      data: Object.values(catTotals),
      backgroundColor: Object.keys(catTotals).map(k => CATEGORY_STYLES[k]?.chart || '#999'),
      borderColor: darkMode ? '#1f2937' : '#fff',
      borderWidth: 2,
    }]
  };

  // --- RENDER HELPERS ---
  const renderDashboard = () => (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Total Spending</div>
          <div className="stat-value">${stats.total.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Avg Transaction</div>
          <div className="stat-value">${stats.average.toLocaleString()}</div>
        </div>
        <div className="stat-card" style={{ border: '1px solid #10b981', backgroundColor: forecast ? (darkMode ? '#064e3b' : '#f0fdf4') : 'transparent' }}>
          <div className="stat-title">AI Forecast</div>
          <div className="stat-value" style={{ color: '#10b981' }}>{forecast ? `$${forecast.predicted_next_month}` : '---'}</div>
          <div className="stat-trend">{forecast ? "Next Purchase Prediction" : "Click 'Run AI'"}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div className="chart-container">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3>Spending Trend</h3>
            {!forecast && <button className="action-btn" style={{width:'auto', marginTop:0, display:'flex', alignItems:'center', gap:'8px'}} onClick={handlePredict}> <FiActivity /> Run AI Forecast</button>}
          </div>
          <Line data={lineChartData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { x: { grid: {display:false}, ticks: {color: darkMode ? '#9ca3af' : '#666'} }, y: { grid: {borderDash:[5,5], color: darkMode ? '#374151' : '#e5e7eb'}, ticks: {color: darkMode ? '#9ca3af' : '#666'} } } }} />
        </div>
        <div className="chart-container">
          <h3>Category Split</h3>
          <div style={{height: '200px', display:'flex', justifyContent:'center'}}>
             {spendingHistory.length > 0 ? <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, plugins:{legend:{position:'bottom', labels:{color: darkMode ? '#9ca3af' : '#666', boxWidth:10, usePointStyle:true}}} }} /> : <p>No data</p>}
          </div>
        </div>
      </div>
    </>
  );

  const renderTransactions = () => (
    <div className="chart-container">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <h3>Transaction History</h3>
        <button className="primary-btn" style={{width:'auto'}} onClick={() => setIsModalOpen(true)}>
          <FiPlus /> Add New
        </button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: darkMode ? '1px solid #374151' : '2px solid #f3f4f6', textAlign: 'left', color: '#6b7280' }}>
            <th style={{ padding: '10px' }}>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Amount</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {spendingHistory.map((item) => {
            const style = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.Other;
            return (
              <tr key={item.id} style={{ borderBottom: darkMode ? '1px solid #374151' : '1px solid #f9f9f9' }}>
                <td style={{ padding: '15px 10px' }}>{new Date(item.date).toLocaleDateString()}</td>
                <td style={{ color: darkMode ? '#d1d5db' : '#374151' }}>{item.text || '---'}</td>
                <td>
                  <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800', backgroundColor: style.bg, color: style.text }}>
                    {item.category}
                  </span>
                </td>
                <td style={{ fontWeight: '600' }}>${item.amount.toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>
                  <button onClick={() => handleDelete(item.id)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor:'pointer', padding:'8px' }}>
                    <FiTrash2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderInsights = () => (
    <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="chart-container">
        <h3>Top Category</h3>
        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: CATEGORY_STYLES[insights.topCategory]?.text || (darkMode ? '#fff' : '#333'), marginTop: '10px' }}>
          {insights.topCategory}
        </div>
        <p style={{ color: '#6b7280' }}>Highest expense volume.</p>
      </div>
      <div className="chart-container">
        <h3>Month Growth</h3>
        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: insights.growth > 0 ? '#ef4444' : '#10b981', marginTop: '10px' }}>
          {insights.growth > 0 ? `+${insights.growth}%` : `${insights.growth}%`}
        </div>
        <p style={{ color: '#6b7280' }}>Vs previous transaction.</p>
      </div>
      <div className="chart-container" style={{ gridColumn: 'span 2' }}>
        <h3>AI Analysis</h3>
        <p style={{ lineHeight: '1.6', color: darkMode ? '#d1d5db' : '#374151' }}>
          Your highest spending transaction was on <strong>{insights.highestMonth}</strong>. 
          {insights.growth > 10 
            ? " Significant upward trend detected. Recommendation: Review recurring subscriptions." 
            : " Spending is stable. You are maintaining good financial discipline."}
        </p>
      </div>
    </div>
  );

  // --- 3. MAIN RENDER ---
  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="dashboard-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="logo">
          <div style={{width:'32px', height:'32px', background:'#2563eb', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', color:'white'}}>
            <FiActivity />
          </div>
          SmartSpend
        </div>
        
        <div className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
          <div className="icon-btn"><FiHome /> Dashboard</div>
        </div>
        <div className={`nav-item ${view === 'transactions' ? 'active' : ''}`} onClick={() => setView('transactions')}>
          <div className="icon-btn"><FiCreditCard /> Transactions</div>
        </div>
        <div className={`nav-item ${view === 'insights' ? 'active' : ''}`} onClick={() => setView('insights')}>
           <div className="icon-btn"><FiPieChart /> AI Insights</div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: darkMode ? '1px solid #374151' : '1px solid #e5e7eb' }}>
          <div className="nav-item" onClick={toggleTheme}>
            <div className="icon-btn">{darkMode ? <FiSun /> : <FiMoon />} {darkMode ? 'Light' : 'Dark'}</div>
          </div>
          <div className="nav-item" onClick={handleLogout} style={{ color: '#ef4444' }}>
            <div className="icon-btn"><FiLogOut /> Logout</div>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <h2>{view.charAt(0).toUpperCase() + view.slice(1)}</h2>
            <p style={{color:'#6b7280'}}>Welcome back.</p>
          </div>
          <button className="primary-btn" style={{width:'auto'}} onClick={() => setIsModalOpen(true)}>
             <FiPlus /> Add Transaction
          </button>
        </div>

        {view === 'dashboard' && renderDashboard()}
        {view === 'transactions' && renderTransactions()}
        {view === 'insights' && renderInsights()}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Transaction</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><FiX /></button>
            </div>
            
            <form onSubmit={handleAddTransaction}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
              </div>
              
              <div className="form-group">
                <label className="form-label">Description</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Starbucks" 
                  value={newText} 
                  onChange={(e) => setNewText(e.target.value)}
                  onBlur={handleAutoCategorize} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                  {Object.keys(CATEGORY_STYLES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amount ($)</label>
                <input type="number" className="form-input" placeholder="0.00" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} required />
              </div>

              <button type="submit" className="primary-btn">
                Confirm Transaction
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;