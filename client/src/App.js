import React, { useState, useEffect } from 'react';
import Login from './Login';
import axios from 'axios';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js';
import {
  FiHome, FiList, FiActivity, FiFileText, FiClock, FiGrid, FiSettings, FiLogOut,
  FiSearch, FiBell, FiChevronDown, FiChevronLeft, FiChevronRight, FiPlus, FiCornerDownRight, FiInfo
} from 'react-icons/fi';
import { BsStars } from 'react-icons/bs';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler);

const CATEGORY_STYLES = {
  Housing: { bg: '#374151', text: '#d1d5db', chart: '#6b7280' },
  Food: { bg: '#064e3b', text: '#34d399', chart: '#10b981' },
  Transportation: { bg: '#451a03', text: '#fbbf24', chart: '#f59e0b' },
  Entertainment: { bg: '#312e81', text: '#818cf8', chart: '#6366f1' },
  Health: { bg: '#7f1d1d', text: '#f87171', chart: '#ef4444' },
  Shopping: { bg: '#4a044e', text: '#e879f9', chart: '#d946ef' },
  Utilities: { bg: '#083344', text: '#38bdf8', chart: '#0ea5e9' },
  Other: { bg: '#1f2937', text: '#9ca3af', chart: '#4b5563' },
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  // App Data State
  const [spendingHistory, setSpendingHistory] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [forecast, setForecast] = useState(null);

  // UI State
  const [view, setView] = useState('dashboard');
  const [revenueTab, setRevenueTab] = useState('Yearly');
  const [doughnutFilter, setDoughnutFilter] = useState('Last 30 Days');
  const [isDoughnutDropdownOpen, setIsDoughnutDropdownOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [aiText, setAiText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Invoice Form State
  const [newPayee, setNewPayee] = useState('');
  const [newInvAmount, setNewInvAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState('');

  // AI Summary State
  const [aiAnalysis, setAiAnalysis] = useState({
    summary: "Loading your financial insights...",
    trend: "...",
    count: 0
  });

  // Stats
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchData();
    }
  }, [token]);

  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
  };

  const fetchData = async () => {
    try {
      const spendRes = await axios.get('http://localhost:8000/api/spending');
      setSpendingHistory(spendRes.data);
      const total = spendRes.data.reduce((a, b) => a + b.amount, 0);
      setTotalSpent(total);

      const invRes = await axios.get('http://localhost:8000/api/invoices');
      setInvoices(invRes.data);

      // Call AI to get forecast and summary
      runForecast(spendRes.data);
      fetchSummary();
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        handleLogout();
      }
    }
  };

  const runForecast = async (data) => {
    try {
      const res = await axios.post('http://localhost:8000/api/forecast', { history: data });
      setForecast(res.data);
    } catch (err) {
      console.error("Forecast err", err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await axios.post('http://localhost:8000/api/summary');
      setAiAnalysis(res.data);
    } catch (err) {
      console.error("Summary fetch err:", err);
    }
  };

  const handleQuickAiAdd = async (e) => {
    e.preventDefault();
    if (!aiText) return;

    // A hacky NLP to extract amount if present: "Starbucks $5"
    let amountMatch = aiText.match(/\$?(\d+(\.\d{1,2})?)/);
    let potentialAmount = amountMatch ? parseFloat(amountMatch[1]) : 0;

    try {
      // Predict category
      const res = await axios.post('http://localhost:8000/api/classify', { text: aiText });
      const predictedCat = res.data.category || 'Other';

      if (potentialAmount > 0) {
        // Automatically add transaction
        const newTx = await axios.post('http://localhost:8000/api/spending', {
          amount: potentialAmount,
          category: predictedCat,
          text: aiText,
          date: new Date().toISOString()
        });
        setSpendingHistory(newTx.data.history);
        setTotalSpent(newTx.data.history.reduce((a, b) => a + b.amount, 0));
        setAiText(''); // clear
      } else {
        alert(`AI Category Prediction: ${predictedCat}. Add an amount like $10 to save.`);
      }
    } catch (err) {
      alert("AI Service unavailable.");
    }
  };

  // --- CALENDAR LOGIC ---
  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(currentYear, calendarDate.getMonth() + 1, 0).getDate();

  const handlePrevMonth = () => setCalendarDate(new Date(currentYear, calendarDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCalendarDate(new Date(currentYear, calendarDate.getMonth() + 1, 1));

  // Calculate daily total for selected date
  const selectedDateTotal = spendingHistory
    .filter(tx => {
      const d = new Date(tx.date);
      return d.getDate() === selectedDate && d.getMonth() === calendarDate.getMonth() && d.getFullYear() === currentYear;
    })
    .reduce((a, b) => a + b.amount, 0);

  // Compare with previous day
  const prevDate = new Date(currentYear, calendarDate.getMonth(), selectedDate - 1);
  const prevDateTotal = spendingHistory
    .filter(tx => {
      const d = new Date(tx.date);
      return d.getDate() === prevDate.getDate() && d.getMonth() === prevDate.getMonth() && d.getFullYear() === prevDate.getFullYear();
    })
    .reduce((a, b) => a + b.amount, 0);

  let dayGrowth = 0;
  if (prevDateTotal > 0) {
    dayGrowth = ((selectedDateTotal - prevDateTotal) / prevDateTotal) * 100;
  } else if (selectedDateTotal > 0) {
    dayGrowth = 100;
  }

  // --- CHART DATA ---
  // Filter for Doughnut
  const doughnutHistory = spendingHistory.filter(tx => {
    const diff = (new Date() - new Date(tx.date)) / (1000 * 60 * 60 * 24);
    if (doughnutFilter === 'Last 7 Days') return diff <= 7;
    if (doughnutFilter === 'This Year') return new Date(tx.date).getFullYear() === new Date().getFullYear();
    return diff <= 30; // default Last 30 Days
  });

  const catTotals = doughnutHistory.reduce((acc, curr) => {
    const cat = curr.category || 'Other';
    acc[cat] = (acc[cat] || 0) + curr.amount;
    return acc;
  }, {});

  // Sort for doughnut
  const sortedCats = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);

  const doughnutData = {
    labels: sortedCats,
    datasets: [{
      data: sortedCats.map(c => catTotals[c]),
      backgroundColor: sortedCats.map(c => CATEGORY_STYLES[c]?.chart || '#999'),
      borderColor: '#1e1e24',
      borderWidth: 4,
      borderRadius: 10,
      cutout: '75%',
    }]
  };

  const doughnutTotal = sortedCats.reduce((sum, cat) => sum + catTotals[cat], 0);

  // Revenue Bar Chart aggregations
  const getAggregatedData = () => {
    let raw = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let labels = [];
    if (revenueTab === 'Yearly') {
      labels = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      raw = [4500, 3800, 5200, 2900, 6000, 4100, 2200, 4800, 4400, 3100, 5000, 4400];

      const currMonthIdx = (new Date().getMonth() + 6) % 12; // map Jan to idx 6
      raw[currMonthIdx] += totalSpent;
    } else if (revenueTab === 'Monthly') {
      labels = ['W1', 'W2', 'W3', 'W4'];
      raw = [1200, 800, 1500, 900];
      raw[3] += totalSpent; // spike current week
    } else {
      labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      raw = [150, 200, 50, 400, 100, 300, 200];
    }
    return { labels, data: raw };
  };

  const agg = getAggregatedData();
  const revenueTotal = agg.data.reduce((a, b) => a + b, 0);
  const revenuePrevTotal = revenueTotal * 0.92; // Dummy previous for display
  const revenueGrowth = ((revenueTotal - revenuePrevTotal) / revenuePrevTotal) * 100;
  const barData = {
    labels: agg.labels,
    datasets: [{
      label: 'Revenue',
      data: agg.data,
      backgroundColor: (context) => {
        const index = context.dataIndex;
        // Highlight active ending bar
        return index === agg.data.length - 1 ? '#3b82f6' : '#2d2d35';
      },
      borderRadius: 6,
      borderSkipped: false,
      barThickness: 24,
    }]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, tooltip: {
        callbacks: {
          label: (ctx) => `$${ctx.raw}`
        }
      }
    },
    scales: {
      x: { grid: { display: false, drawBorder: false }, ticks: { color: '#9ca3af' } },
      y: { grid: { display: false, drawBorder: false }, ticks: { stepSize: 1500, color: '#9ca3af' } }
    },
    animation: { duration: 0 }
  };

  const handleInvoiceToggle = async (inv) => {
    // Cycle through: Unpaid -> Paid -> Pending
    let nextStatus = 'Paid';
    if (inv.status === 'Paid') nextStatus = 'Pending';
    if (inv.status === 'Pending') nextStatus = 'Unpaid';

    try {
      const res = await axios.patch(`http://localhost:8000/api/invoices/${inv.id}/status`, { status: nextStatus });
      setInvoices(res.data.invoices);
    } catch (err) {
      alert("Error updating invoice status");
    }
  };

  // Payment Score Calculation
  const calculatePaymentScore = () => {
    if (invoices.length === 0) return 100;
    const totalEverBilled = invoices.reduce((a, b) => a + b.amount, 0);
    const totalUnpaidAmount = invoices.filter(i => i.status === 'Unpaid').reduce((a, b) => a + b.amount, 0);
    if (totalEverBilled === 0) return 100;

    // Score proportional to the ratio of paid/total billed
    const ratio = Math.max(0, 100 - (totalUnpaidAmount / totalEverBilled) * 100);
    return Math.round(ratio);
  };
  const currentScore = calculatePaymentScore();

  const handleAddInvoice = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:8000/api/invoices', {
        payee: newPayee,
        amount: newInvAmount,
        dueDate: newDueDate,
        status: 'Pending'
      });
      setInvoices(res.data.invoices);
      setIsModalOpen(false);
      setNewPayee('');
      setNewInvAmount('');
      setNewDueDate('');
    } catch (err) {
      alert("Error adding invoice");
    }
  };

  // --- RENDER ---
  if (!token) return <Login onLogin={handleLogin} />;

  return (
    <div className="dashboard-container">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="logo-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="white" />
            <circle cx="12" cy="12" r="4" fill="#121214" />
          </svg>
        </div>

        <div className={`nav-icon ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}><FiHome /></div>
        <div className={`nav-icon ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}><FiList /></div>
        <div className={`nav-icon ${view === 'activity' ? 'active' : ''}`} onClick={() => setView('activity')}><FiActivity /></div>
        <div className={`nav-icon ${view === 'files' ? 'active' : ''}`} onClick={() => setView('files')}><FiFileText /></div>
        <div className={`nav-icon ${view === 'time' ? 'active' : ''}`} onClick={() => setView('time')}><FiClock /></div>
        <div className={`nav-icon ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}><FiGrid /></div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="nav-icon"><FiSettings /></div>
          <div className="nav-icon" onClick={handleLogout} style={{ color: '#ef4444' }}><FiLogOut /></div>
        </div>
      </div>

      <div className="main-content">
        {/* HEADER */}
        <div className="top-header">
          <h1>Overview</h1>
          <div className="header-right">
            <div className="search-bar">
              <FiSearch />
              <input placeholder="Search activities..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            <div className="profile-section" style={{ cursor: 'pointer' }} onClick={() => alert('Profile settings coming soon!')}>
              <img src="https://i.pravatar.cc/150?img=47" className="profile-pic" alt="Emma" />
              <div className="profile-info">
                <span className="profile-name">Emma Parson</span>
                <span className="profile-email">emma.pars@gmail.com</span>
              </div>
              <FiChevronDown style={{ marginLeft: '0.5rem', color: '#9ca3af' }} />
            </div>

            <button className="notification-btn" onClick={() => alert('No new notifications')}>
              <FiBell />
            </button>
          </div>
        </div>

        {view === 'dashboard' && (
          <div className="dashboard-grid">

            {/* REVENUE CHART WIDGET */}
            <div className="widget revenue-widget">
              <div className="widget-header">
                <h3 className="widget-title">Revenue</h3>
                <div className="widget-actions">
                  {['Weekly', 'Monthly', 'Yearly'].map(t => (
                    <button key={t} className={`action-pill ${revenueTab === t ? 'active' : ''}`} onClick={() => setRevenueTab(t)}>
                      {t}
                    </button>
                  ))}
                  <button className="action-btn-circle" style={{ background: 'transparent' }}><FiList /></button>
                </div>
              </div>

              <div className="revenue-amount">
                ${revenueTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                <span className={`revenue-badge ${revenueGrowth < 0 ? 'badge-red' : ''}`}>{revenueGrowth >= 0 ? '▲' : '▼'} {Math.abs(revenueGrowth).toFixed(1)}%</span>
                <span className="revenue-compare">vs last period</span>
              </div>

              <div style={{ height: '240px', width: '100%' }}>
                <Bar data={barData} options={barOptions} />
              </div>
            </div>

            {/* CALENDAR WIDGET */}
            <div className="widget calendar-widget">
              <div className="widget-header" style={{ justifyContent: 'center', gap: '1.5rem' }}>
                <FiChevronLeft onClick={handlePrevMonth} style={{ color: '#9ca3af', cursor: 'pointer' }} />
                <h3 className="cal-date-title" style={{ margin: 0 }}>{currentMonth}, {currentYear}</h3>
                <FiChevronRight onClick={handleNextMonth} style={{ color: '#9ca3af', cursor: 'pointer' }} />
              </div>

              <div className="calendar-grid">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => <div key={d} className="cal-header">{d}</div>)}
                {/* 3 empty striped blocks */}
                <div className="cal-day striped"></div><div className="cal-day striped"></div><div className="cal-day striped"></div>

                {[...Array(daysInMonth)].map((_, i) => (
                  <div
                    key={i}
                    className={`cal-day ${selectedDate === i + 1 ? 'active' : ''}`}
                    onClick={() => setSelectedDate(i + 1)}
                  >
                    {i + 1}
                  </div>
                ))}
                {/* trailing striped blocks */}
                <div className="cal-day striped"></div><div className="cal-day striped"></div>
              </div>

              <div className="cal-summary">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <FiActivity color="#9ca3af" />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>${selectedDateTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
                  </div>
                </div>
                <div style={{ color: dayGrowth >= 0 ? 'var(--danger)' : 'var(--accent-green)', fontSize: '0.75rem', fontWeight: '500' }}>
                  {dayGrowth >= 0 ? '▲' : '▼'} {Math.abs(dayGrowth).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* AI SUMMARY WIDGET */}
            <div className="widget ai-summary-widget">
              <div className="widget-header">
                <h3 className="widget-title" style={{ display: 'flex', alignItems: 'center' }}><BsStars className="ai-icon" /> How can I help you?</h3>
                <button className="action-btn-circle" style={{ background: 'rgba(255,255,255,0.05)' }}><FiCornerDownRight /></button>
              </div>

              <div className="ai-content">
                <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>AI Summary</div>
                <p className="ai-text">
                  {aiAnalysis.summary}
                </p>

                <div className="ai-mini-cards">
                  <div className="ai-mini-card">
                    <div className="ai-mini-label">Recent Transactions</div>
                    <div className="ai-mini-value">{aiAnalysis.count} <span className="ai-badge badge-orange">{aiAnalysis.trend}</span></div>
                  </div>
                  <div className="ai-mini-card">
                    <div className="ai-mini-label">Customer Payments</div>
                    <div className="ai-mini-value">{invoices.filter(i => i.status === 'Paid').length} <span className="ai-badge badge-green">Processed</span></div>
                  </div>
                </div>
              </div>

              <form className="ai-input-container" onSubmit={handleQuickAiAdd}>
                <input
                  placeholder="Ask me anything... (e.g. Starbucks $5)"
                  value={aiText}
                  onChange={e => setAiText(e.target.value)}
                />
                <button type="submit" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><BsStars /></button>
              </form>
            </div>

            {/* SPENDING WIDGET */}
            <div className="widget spending-widget">
              <div className="widget-header">
                <h3 className="widget-title">Spending</h3>
                <div style={{ position: 'relative' }}>
                  <div className="search-bar" style={{ background: 'transparent', padding: '0.25rem', cursor: 'pointer' }} onClick={() => setIsDoughnutDropdownOpen(!isDoughnutDropdownOpen)}>
                    <span style={{ fontSize: '0.8rem' }}>{doughnutFilter}</span>
                    <FiChevronDown style={{ marginLeft: '0.5rem' }} />
                  </div>
                  {isDoughnutDropdownOpen && (
                    <div className="dropdown-menu" style={{ position: 'absolute', right: 0, top: '100%', background: '#1e1e24', border: '1px solid #374151', borderRadius: '8px', padding: '0.5rem', zIndex: 10, display: 'flex', flexDirection: 'column', minWidth: '120px' }}>
                      {['Last 7 Days', 'Last 30 Days', 'This Year'].map(f => (
                        <div key={f} style={{ padding: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', color: '#d1d5db' }} onClick={() => { setDoughnutFilter(f); setIsDoughnutDropdownOpen(false); }}>
                          {f}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="spending-content">
                <div className="spending-chart-wrapper">
                  <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `$${ctx.raw}` } } } }} />
                  <div className="spending-total-overlay">
                    <div className="spending-total-val">${doughnutTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</div>
                    <div className="spending-total-lbl">Total</div>
                  </div>
                </div>

                <div className="spending-legend">
                  {sortedCats.slice(0, 5).map(cat => (
                    <div key={cat} className="legend-item">
                      <div className="legend-dot" style={{ backgroundColor: CATEGORY_STYLES[cat]?.chart }}></div>
                      <span>{cat}</span>
                    </div>
                  ))}
                  {sortedCats.length > 5 && <div className="legend-item"><div className="legend-dot" style={{ background: '#4b5563' }}></div><span>Other</span></div>}
                </div>
              </div>

              <div className="spending-footer">
                <FiInfo style={{ marginTop: '0.15rem' }} />
                <span>Most expenses come from {sortedCats[0] || 'Unknown'} and {sortedCats[1] || 'Unknown'} while {sortedCats[2] || 'other categories'} show a slight increase.</span>
              </div>
            </div>

            {/* INVOICES WIDGET */}
            <div className="widget invoices-widget">
              <div className="widget-header">
                <h3 className="widget-title">Invoices</h3>
                <button className="action-btn-circle" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => setIsModalOpen(true)}><FiPlus /></button>
              </div>

              <div className="payment-score">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Payment Score</span>
                <div className="score-bars">
                  {[...Array(40)].map((_, i) => {
                    const threshold = (i / 40) * 100;
                    return <div key={i} className={`score-bar ${threshold < currentScore ? 'active' : ''}`}></div>;
                  })}
                </div>
                <span style={{ fontWeight: '600' }}>{currentScore}</span>
              </div>

              <div className="invoice-list">
                {invoices.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginTop: '1rem' }}>No pending invoices.</div>
                ) : (
                  invoices.map((inv) => (
                    <div key={inv.id} className="invoice-item">
                      <div className="inv-date-col">
                        <span className="inv-date">{new Date(inv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span className="inv-due">in {Math.ceil((new Date(inv.dueDate) - new Date()) / (1000 * 60 * 60 * 24))} days</span>
                      </div>

                      <div
                        className={`inv-badge inv-${inv.status.toLowerCase()}`}
                        onClick={() => handleInvoiceToggle(inv)}
                        style={{ cursor: 'pointer' }}
                        title="Click to change status"
                      >
                        {inv.status}
                      </div>

                      <div className="inv-payee">{inv.payee}</div>
                      <div className="inv-amount">${inv.amount.toFixed(2)}</div>
                    </div>
                  ))
                )}

                {/* Dummy ones to match screenshot if empty */}
                {invoices.length === 0 && (
                  <>
                    <div className="invoice-item">
                      <div className="inv-date-col"><span className="inv-date">Aug 9</span><span className="inv-due">in 1 week</span></div>
                      <div className="inv-badge inv-unpaid">Unpaid</div>
                      <div className="inv-payee">Leonard Kim</div>
                      <div className="inv-amount">$130.00</div>
                    </div>
                    <div className="invoice-item">
                      <div className="inv-date-col"><span className="inv-date">Aug 24</span><span className="inv-due">in 2 weeks</span></div>
                      <div className="inv-badge inv-paid">Paid</div>
                      <div className="inv-payee">John Smith</div>
                      <div className="inv-amount">$220.00</div>
                    </div>
                    <div className="invoice-item">
                      <div className="inv-date-col"><span className="inv-date">Sep 9</span><span className="inv-due">in 1 month</span></div>
                      <div className="inv-badge inv-pending">Pending</div>
                      <div className="inv-payee">Anna Spirid</div>
                      <div className="inv-amount">$2080.00</div>
                    </div>
                  </>
                )}
              </div>

              <div className="view-all" style={{ cursor: 'pointer' }} onClick={() => setView('files')}>View all invoices ↗</div>
            </div>

          </div>
        )}

        {view !== 'dashboard' && (
          <div className="placeholder-view">
            <h2 style={{ textTransform: 'capitalize' }}>{view} View</h2>
            <p style={{ color: 'var(--text-muted)' }}>This module is currently under development.</p>
            {view === 'files' && (
              <div className="invoice-list" style={{ maxWidth: '600px', marginTop: '2rem' }}>
                {invoices.map((inv) => (
                  <div key={inv.id} className="invoice-item">
                    <div className="inv-date-col">
                      <span className="inv-date">{new Date(inv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className={`inv-badge inv-${inv.status.toLowerCase()}`}>{inv.status}</div>
                    <div className="inv-payee">{inv.payee}</div>
                    <div className="inv-amount">${inv.amount.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
            {view === 'list' && (
              <div className="transaction-list" style={{ marginTop: '2rem', width: '100%', maxWidth: '800px', background: 'var(--card-dark)', borderRadius: '12px', padding: '1rem' }}>
                {spendingHistory.filter(tx => tx.text.toLowerCase().includes(searchQuery.toLowerCase()) || tx.category.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 20).map(tx => (
                  <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--bg-dark)' }}>
                    <div>
                      <div style={{ fontWeight: '500' }}>{tx.text || 'Uncategorized expense'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(tx.date).toLocaleDateString()} • {tx.category}</div>
                    </div>
                    <div style={{ fontWeight: '600', color: 'white' }}>-${tx.amount.toFixed(2)}</div>
                  </div>
                ))}
                {spendingHistory.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No transactions found.</div>}
              </div>
            )}
          </div>
        )}

      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #374151', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Create Invoice</h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleAddInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label" style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Payee Name</label>
                <input type="text" className="form-input" style={{ background: 'var(--bg-dark)', border: '1px solid #374151', padding: '0.75rem', borderRadius: '8px', width: '100%', color: 'white', marginTop: '0.25rem' }} value={newPayee} onChange={(e) => setNewPayee(e.target.value)} required />
              </div>

              <div>
                <label className="form-label" style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Amount ($)</label>
                <div style={{ position: 'relative', marginTop: '0.25rem' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>$</span>
                  <input type="number" step="0.01" className="form-input" style={{ background: 'var(--bg-dark)', border: '1px solid #374151', padding: '0.75rem 1rem 0.75rem 2rem', borderRadius: '8px', width: '100%', color: 'white' }} value={newInvAmount} onChange={(e) => setNewInvAmount(e.target.value)} required />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Select Due Date</label>
                <div style={{ background: 'var(--bg-dark)', borderRadius: '8px', padding: '1rem', marginTop: '0.25rem', border: '1px solid #374151' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                    <FiChevronLeft onClick={(e) => { e.preventDefault(); setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1)); }} cursor="pointer" color="#9ca3af" />
                    <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{calendarDate.toLocaleString('default', { month: 'long' })} {calendarDate.getFullYear()}</span>
                    <FiChevronRight onClick={(e) => { e.preventDefault(); setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1)); }} cursor="pointer" color="#9ca3af" />
                  </div>
                  <div className="calendar-grid" style={{ gap: '0.25rem' }}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(d => <div key={d} className="cal-header" style={{ fontSize: '0.7rem', color: '#6b7280' }}>{d}</div>)}
                    {[...Array(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate())].map((_, i) => {
                      const dayStr = `${calendarDate.getFullYear()}-${(calendarDate.getMonth() + 1).toString().padStart(2, '0')}-${(i + 1).toString().padStart(2, '0')}`;
                      return (
                        <div key={i} className={`cal-day ${newDueDate === dayStr ? 'active' : ''}`}
                          style={{ height: '30px', width: '30px', fontSize: '0.8rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => setNewDueDate(dayStr)}
                        >
                          {i + 1}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <button type="submit" className="primary-btn" style={{ marginTop: '1rem', width: '100%', padding: '0.75rem' }} disabled={!newDueDate}>
                Save Invoice
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}