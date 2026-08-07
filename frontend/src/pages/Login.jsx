import { useState } from 'react';
import { api, setToken } from '../api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('secops@crestwood.edu');
  const [password, setPassword] = useState('secops123');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const { access_token } = await api.login(email, password);
      setToken(access_token);
      onLogin();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="login-page">
      <form className="login-box" onSubmit={handleSubmit}>
        <h2>ArachneAI</h2>
        <p style={{ color: '#888', marginBottom: 16, fontSize: '0.9rem' }}>
          Deception-powered threat detection
        </p>
        {error && <div className="error">{error}</div>}
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn" type="submit" style={{ width: '100%' }}>Sign In</button>
      </form>
    </div>
  );
}
