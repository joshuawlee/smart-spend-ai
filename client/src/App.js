import React, { useState } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// 1. Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  const [forecast, setForecast] = useState(null);
  const [spendingHistory] = useState([1200, 1350, 1280, 1450, 1600, 1750]);

  const handlePredict = async () => {
    try {
      // Connect to the Node.js Gateway (Port 5000)
      const res = await axios.post('http://localhost:8000/api/forecast', {
        history: spendingHistory
      });
      setForecast(res.data);
    } catch (err) {
      console.error(err);
      alert("Error connecting to server. Is Node running?");
    }
  };

  const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'July (Pred)'],
    datasets: [
      {
        label: 'Monthly Spending ($)',
        data: forecast 
          ? [...spendingHistory, forecast.predicted_next_month] 
          : spendingHistory,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.3,
        pointBackgroundColor: forecast 
          ? [...Array(6).fill('rgb(75, 192, 192)'), 'red'] 
          : 'rgb(75, 192, 192)'
      },
    ],
  };

  return (
    <div style={{ padding: '50px', fontFamily: 'Arial', textAlign: 'center' }}>
      <h1>SmartSpend 🧠</h1>
      <h3>AI-Powered Financial Forecasting</h3>
      
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Line data={data} />
      </div>

      <div style={{ marginTop: '30px' }}>
        <button 
          onClick={handlePredict}
          style={{ 
            padding: '15px 30px', 
            fontSize: '16px', 
            cursor: 'pointer', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px' 
          }}
        >
          🔮 Generate AI Forecast
        </button>
        
        {forecast && (
          <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f0f9ff', display: 'inline-block', border: '1px solid #bae6fd' }}>
            <h2>Predicted Spending: ${forecast.predicted_next_month}</h2>
            <p>Model Status: {forecast.status}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;