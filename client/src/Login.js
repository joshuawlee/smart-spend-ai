import React, { useState } from 'react';

function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const endpoint = isRegistering ? '/api/register' : '/api/login';
    
    try {
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      if (isRegistering) {
        // After register, switch to login view automatically
        alert('Registration successful! Please log in.');
        setIsRegistering(false);
      } else {
        // LOGIN SUCCESS: Pass the token up to App.js
        onLogin(data.token);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>{isRegistering ? 'Create Account' : 'Welcome Back'}</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.button}>
            {isRegistering ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        <p 
          style={styles.link} 
          onClick={() => setIsRegistering(!isRegistering)}
        >
          {isRegistering 
            ? 'Already have an account? Log In' 
            : 'Need an account? Sign Up'}
        </p>
      </div>
    </div>
  );
}

// Simple Styles
const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' },
  card: { padding: '2rem', background: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', width: '300px', textAlign: 'center' },
  input: { display: 'block', width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc' },
  button: { width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  link: { marginTop: '10px', color: '#007bff', cursor: 'pointer', fontSize: '0.9rem' }
};

export default Login;