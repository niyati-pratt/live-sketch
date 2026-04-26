import React from 'react';

export default function CursorLayer({ cursors }) {
  return (
    <div className="cursor-layer">
      {Object.entries(cursors).map(([socketId, c]) => (
        <div key={socketId} className="remote-cursor" style={{ transform: `translate(${c.x}px, ${c.y}px)` }}>
          <svg width="20" height="20" viewBox="0 0 20 20">
            <path d="M0 0L0 16L5 11L9 18L11 17L7 10L13 10Z"
              fill={c.color} stroke="#fff" strokeWidth="1.5" />
          </svg>
          <span className="cursor-label" style={{ background: c.color }}>{c.username}</span>
        </div>
      ))}
    </div>
  );
}