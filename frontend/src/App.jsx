import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, Link, useParams } from 'react-router-dom';
import axios from 'axios';
import Canvas from './components/Canvas';

const API = 'http://localhost:5001/api';

// ── Login ─────────────────────────────────────────────────────────────────────
function Login({ onAuth }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr]   = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const { data } = await axios.post(`${API}/auth/login`, form);
      onAuth(data.token, data.user);
      const redirect = localStorage.getItem('wb_redirect');
      if (redirect) { localStorage.removeItem('wb_redirect'); nav(redirect); }
      else nav('/');
    } catch (e) {
      setErr(e.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-split">
        <div className="auth-left">
          <div className="auth-brand">
            <div className="auth-brand-icon">🎨</div>
            <span className="auth-brand-name">Sketch·Live</span>
          </div>
          <div>
            <h1 className="auth-headline">
              Draw together,<br /><span>in real time.</span>
            </h1>
            <p className="auth-sub">
              A collaborative infinite canvas for teams who think visually.
            </p>
          </div>
          <div className="auth-features">
            {['Real-time cursor presence','Infinite canvas with Fabric.js','Auto-saved every 30 seconds','Export as PNG or PDF'].map(f => (
              <div key={f} className="auth-feature">
                <div className="auth-feature-dot" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-right">
          <h2>Welcome back</h2>
          <p>Sign in to your workspace</p>
          {err && <div className="auth-err">{err}</div>}
          <form onSubmit={submit}>
            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input className="auth-input" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input className="auth-input" type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
          <p className="auth-switch">No account? <Link to="/register">Create one free</Link></p>
        </div>
      </div>
    </div>
  );
}

// ── Register ──────────────────────────────────────────────────────────────────
function Register({ onAuth }) {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [err, setErr]   = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const { data } = await axios.post(`${API}/auth/register`, form);
      onAuth(data.token, data.user);
      const redirect = localStorage.getItem('wb_redirect');
      if (redirect) { localStorage.removeItem('wb_redirect'); nav(redirect); }
      else nav('/');
    } catch (e) {
      setErr(e.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-split">
        <div className="auth-left">
          <div className="auth-brand">
            <div className="auth-brand-icon">🎨</div>
            <span className="auth-brand-name">Sketch·Live</span>
          </div>
          <div>
            <h1 className="auth-headline">Your canvas<br />awaits<span>.</span></h1>
            <p className="auth-sub">Create an account and start collaborating in seconds.</p>
          </div>
          <div className="auth-features">
            {['Free forever for teams','Sticky notes & shapes','Shareable invite links','Revision history'].map(f => (
              <div key={f} className="auth-feature">
                <div className="auth-feature-dot" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-right">
          <h2>Create account</h2>
          <p>Start drawing in under a minute</p>
          {err && <div className="auth-err">{err}</div>}
          <form onSubmit={submit}>
            <div className="auth-field">
              <label className="auth-label">Username</label>
              <input className="auth-input" placeholder="yourname"
                value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
            </div>
            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input className="auth-input" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input className="auth-input" type="password" placeholder="min 6 characters"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Get Started →'}
            </button>
          </form>
          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ user, token, onLogout }) {
  const [boards, setBoards]       = useState([]);
  const [newTitle, setNewTitle]   = useState('');
  const [joinLink, setJoinLink]   = useState('');
  const nav     = useNavigate();
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get(`${API}/boards`, { headers }).then(r => setBoards(r.data)).catch(() => {});
  }, [token]);

  async function createBoard() {
    const title = newTitle.trim() || 'Untitled Board';
    const { data } = await axios.post(`${API}/boards`, { title }, { headers });
    setBoards(prev => [data, ...prev]);
    setNewTitle('');
    nav(`/board/${data._id}`);
  }

  async function deleteBoard(e, id) {
    e.stopPropagation();
    await axios.delete(`${API}/boards/${id}`, { headers });
    setBoards(prev => prev.filter(b => b._id !== id));
  }

  function handleJoin() {
    const token = joinLink.trim().split('/join/')[1];
    if (token) nav(`/join/${token}`);
    else alert('Please paste a valid invite link');
  }

  const avatarColor = user?.color || '#00e5ff';

  return (
    <div className="app-layout">
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">🎨</div>
            <span className="sidebar-brand-name">Sketch·Live</span>
          </div>
          <div className="sidebar-user">
            <div className="sidebar-avatar" style={{ background: avatarColor }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span className="sidebar-username">{user?.username}</span>
          </div>
        </div>

        <div className="sidebar-body">
          {/* Create new board */}
          <div className="sidebar-section-label">New Board</div>
          <div className="new-board-row">
            <input
              className="new-board-input"
              placeholder="Board title…"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createBoard()}
            />
            <button className="btn-new-board" onClick={createBoard} title="Create board">+</button>
          </div>

          {/* Join via invite link */}
          <div className="sidebar-section-label" style={{ marginTop: '1rem' }}>Join a Board</div>
          <div className="new-board-row">
            <input
              className="new-board-input"
              placeholder="Paste invite link…"
              value={joinLink}
              onChange={e => setJoinLink(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <button
              className="btn-new-board"
              style={{ background: 'var(--gold)', color: '#07070f' }}
              onClick={handleJoin}
              title="Join board"
            >→</button>
          </div>

          {/* Board list */}
          <div className="sidebar-section-label" style={{ marginTop: '1rem' }}>Your Boards</div>
          <div className="board-list">
            {boards.length === 0 ? (
              <div className="board-empty">
                <div className="board-empty-icon">🖼</div>
                <div>No boards yet.<br />Create one above.</div>
              </div>
            ) : boards.map(b => (
              <div key={b._id} className="board-item" onClick={() => nav(`/board/${b._id}`)}>
                <div className="board-item-header">
                  <span className="board-item-title">{b.title}</span>
                  <button className="board-item-del" onClick={e => deleteBoard(e, b._id)} title="Delete">✕</button>
                </div>
                <div className="board-item-meta">
                  {new Date(b.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="btn-logout" onClick={onLogout}>Sign out</button>
        </div>
      </div>

      <div className="main-welcome">
        <div className="welcome-orb">🎨</div>
        <div className="welcome-title">Pick a board or create one</div>
        <div className="welcome-sub">All changes sync instantly across every collaborator</div>
      </div>
    </div>
  );
}

// ── Join via invite link ───────────────────────────────────────────────────────
function JoinBoard({ token }) {
  const { inviteToken } = useParams();
  const nav = useNavigate();
  const [status, setStatus] = useState('Joining board…');

  useEffect(() => {
    if (!token) {
      localStorage.setItem('wb_redirect', `/join/${inviteToken}`);
      nav('/login');
      return;
    }
    axios.post(`${API}/boards/join/${inviteToken}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(({ data }) => nav(`/board/${data.boardId}`))
      .catch(() => setStatus('Invalid or expired invite link.'));
  }, [token, inviteToken, nav]);

  return (
    <div className="auth-page">
      <div style={{ textAlign: 'center', color: 'var(--text2)', zIndex: 1, position: 'relative' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔗</div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: 'var(--text)' }}>
          {status}
        </div>
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('wb_token') || '');
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('wb_user')); } catch { return null; }
  });

  function handleAuth(t, u) {
    setToken(t); setUser(u);
    localStorage.setItem('wb_token', t);
    localStorage.setItem('wb_user', JSON.stringify(u));
  }

  function handleLogout() {
    setToken(''); setUser(null);
    localStorage.removeItem('wb_token');
    localStorage.removeItem('wb_user');
  }

  if (!token) {
    return (
      <Routes>
        <Route path="/register"          element={<Register onAuth={handleAuth} />} />
        <Route path="/join/:inviteToken" element={<JoinBoard token={token} />} />
        <Route path="*"                  element={<Login    onAuth={handleAuth} />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/"                  element={<Dashboard user={user} token={token} onLogout={handleLogout} />} />
      <Route path="/board/:boardId"    element={<Canvas    user={user} token={token} />} />
      <Route path="/join/:inviteToken" element={<JoinBoard token={token} />} />
      <Route path="*"                  element={<Navigate to="/" />} />
    </Routes>
  );
}