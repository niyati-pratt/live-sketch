import React from 'react';
import { useNavigate } from 'react-router-dom';

const TOOL_GROUPS = [
  [
    { id: 'select',   icon: '↖',  title: 'Select' },
  ],
  [
    { id: 'pen',      icon: '✏️',  title: 'Pen' },
    { id: 'eraser',   icon: '◻',   title: 'Eraser' },
  ],
  [
    { id: 'text',     icon: 'T',   title: 'Text' },
    { id: 'sticky',   icon: '⬛',   title: 'Sticky Note' },
  ],
  [
    { id: 'rect',     icon: '▭',   title: 'Rectangle' },
    { id: 'circle',   icon: '○',   title: 'Circle' },
    { id: 'line',     icon: '╱',   title: 'Line' },
    { id: 'triangle', icon: '△',   title: 'Triangle' },
  ],
];

const STICKY_COLORS = ['#fef08a','#86efac','#93c5fd','#f9a8d4','#fdba74'];

export default function Toolbar({
  tool, setTool, color, setColor,
  strokeWidth, setStrokeWidth,
  onClear, onDelete, onExportPNG, onExportPDF, onShare,
  presence, saveStatus, onAction, canEdit = true,
}) {
  const nav = useNavigate();

  function handleToolClick(id) {
    if (!canEdit && id !== 'select') return; // view-only: only allow select
    setTool(id);
    if (id === 'text') onAction('text');
    else if (['rect', 'circle', 'line', 'triangle'].includes(id)) onAction(id);
  }

  return (
    <div className="toolbar">
      {/* Back button */}
      <button className="tb-action" onClick={() => nav('/')} title="Back to dashboard"
        style={{ marginRight: '0.25rem' }}>
        ← Back
      </button>

      <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

      {/* Tool groups */}
      {TOOL_GROUPS.map((group, gi) => (
        <div key={gi} className="toolbar-group">
          {group.map(t => (
            <button
              key={t.id}
              className={`tool-btn ${tool === t.id ? 'active' : ''} ${!canEdit && t.id !== 'select' ? 'disabled' : ''}`}
              title={!canEdit && t.id !== 'select' ? 'View only' : t.title}
              onClick={() => handleToolClick(t.id)}
              style={{ opacity: !canEdit && t.id !== 'select' ? 0.35 : 1 }}
            >
              {t.icon}
            </button>
          ))}
        </div>
      ))}

      {/* Sticky colors */}
      {tool === 'sticky' && canEdit && (
        <div className="toolbar-group">
          <div className="sticky-palette">
            {STICKY_COLORS.map(c => (
              <div key={c} className="sticky-dot" style={{ background: c }}
                title="Add sticky note" onClick={() => onAction('sticky', c)} />
            ))}
          </div>
        </div>
      )}

      {/* Color + stroke — only shown when canEdit */}
      {canEdit && (
        <div className="toolbar-group">
          <div className="color-swatch" style={{ background: color }} title="Stroke color">
            <input type="color" value={color} onChange={e => setColor(e.target.value)} />
          </div>
          <input type="range" className="stroke-slider" min="1" max="24"
            value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))}
            title={`Stroke: ${strokeWidth}px`} />
        </div>
      )}

      {/* Delete + Clear — only shown when canEdit */}
      {canEdit && (
        <div className="toolbar-group">
          <button className="tool-btn" title="Delete selected" onClick={onDelete}>🗑</button>
          <button className="tool-btn" title="Clear all" onClick={onClear}>⊘</button>
        </div>
      )}

      {/* Right side */}
      <div className="toolbar-right">
        <div className={`save-pill ${saveStatus === 'Saving…' ? 'saving' : ''}`}>
          <div className="save-pill-dot" />
          {saveStatus}
        </div>

        {presence.length > 0 && (
          <div className="presence-stack">
            {presence.slice(0, 6).map(u => (
              <div key={u.socketId} className="presence-avatar"
                style={{ background: u.color || '#00e5ff' }} title={u.username}>
                {u.username?.[0]?.toUpperCase()}
              </div>
            ))}
            {presence.length > 6 && (
              <div className="presence-avatar" style={{ background: 'var(--surface2)', color: 'var(--text2)' }}>
                +{presence.length - 6}
              </div>
            )}
          </div>
        )}

        {canEdit && <button className="tb-action primary" onClick={onShare}>Share</button>}
        <button className="tb-action" onClick={onExportPNG}>PNG</button>
        <button className="tb-action" onClick={onExportPDF}>PDF</button>
      </div>
    </div>
  );
}