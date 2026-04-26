import React, { useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:5001/api';

export default function ShareModal({ boardId, token, onClose }) {
  const [permission, setPermission] = useState('view');
  const [link, setLink]   = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function generateLink() {
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${API}/boards/${boardId}/invite`,
        { permission },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLink(data.link);
    } catch (e) {
      alert('Failed to generate link');
    } finally { setLoading(false); }
  }

  function copyLink() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Share Board</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <label className="modal-label">Permission Level</label>
        <select
          className="modal-select"
          value={permission}
          onChange={e => setPermission(e.target.value)}
        >
          <option value="view">👁 View only — can see but not edit</option>
          <option value="edit">✏️ Can edit — full drawing access</option>
        </select>

        <button className="modal-generate" onClick={generateLink} disabled={loading}>
          {loading ? 'Generating…' : '🔗 Generate Invite Link'}
        </button>

        {link && (
          <>
            <div className="modal-link-box">{link}</div>
            <button
              className={`modal-copy ${copied ? 'copied' : ''}`}
              onClick={copyLink}
            >
              {copied ? '✓ Copied to clipboard!' : 'Copy Link'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
