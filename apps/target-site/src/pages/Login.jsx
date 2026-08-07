import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, setToken } from '../api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('student1@crestwood.edu');
  const [password, setPassword] = useState('Student2024!');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('login');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const { access_token } = mode === 'login'
        ? await api.login(email, password)
        : await api.register({ email, password, name: email.split('@')[0], major: 'Undeclared' });
      setToken(access_token);
      onLogin();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="form-page">
      <div className="neu-card">
        <p className="eyebrow">Student Portal</p>
        <h2>{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>
        <p className="muted" style={{ marginBottom: 16, fontSize: '0.9rem' }}>
          Demo accounts: student1@crestwood.edu / Student2024! · admin@crestwood.edu / Admin2024!
        </p>
        {error && <p style={{ color: 'var(--accent-alert)', marginBottom: 12 }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input className="neu-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="neu-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="neu-btn primary" type="submit" style={{ width: '100%', marginBottom: 12 }}>
            {mode === 'login' ? 'Sign In' : 'Register'}
          </button>
        </form>
        <button className="neu-btn" style={{ width: '100%' }} onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign In'}
        </button>
        <p style={{ marginTop: 16, textAlign: 'center' }}><Link to="/">← Back to Home</Link></p>
      </div>
    </div>
  );
}
