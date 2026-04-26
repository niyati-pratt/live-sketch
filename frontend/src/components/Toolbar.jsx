import React from 'react';

const TOOL_GROUPS = [
  [
    { id: 'select',   icon: '↖',  title: 'Select (V)' },
  ],
  [
    { id: 'pen',      icon: '✏️',  title: 'Pen (P)' },
    { id: 'eraser',   icon: '◻',   title: 'Eraser (E)' },
  ],
  [
    { id: 'text',     icon: 'T',   title: 'Text (T)' },
    { id: 'sticky',   icon: '⬛',   title: 'Sticky Note (S)' },
  ],
  [
    { id: 'rect',     icon: '▭',   title: 'Rectangle (R)' },
    { id: 'circle',   icon: '○',   title: 'Circle (C)' },
    { id: 'line',     icon: '╱',   title: 'Line (L)' },
    { id: 'triangle', icon: '△',   title: 'Triangle' },
  ],
];

const STICKY_COLORS = [
  '#fef08a', // yellow
  '#86efac', // green
  '#93c5fd', // blue
  '#f9a8d4', // pink
  '#fdba74', // orange
];

export default function Toolbar({
  tool, setTool, color, setColor,
  strokeWidth, setStrokeWidth,
  onClear, onDelete, onExportPNG, onExportPDF, onShare,
  presence, saveStatus, onAction,
}) {
  function handleToolClick(id) {
    setTool(id);
    if (id === 'text')    onAction('text');
    else if (['rect', 'circle', 'line', 'triangle'].includes(id)) onAction(id);
    // sticky and pen/eraser/select don't trigger onAction immediately
  }

  return (
    <div className="toolbar">
      {/* Tool groups */}
      {TOOL_GROUPS.map((group, gi) => (
        <div key={gi} className="toolbar-group">
          {group.map(t => (
            <button
              key={t.id}
              className={`tool-btn ${tool === t.id ? 'active' : ''}`}
              title={t.title}
              onClick={() => handleToolClick(t.id)}
            >
              {t.icon}
            </button>
          ))}
        </div>
      ))}

      {/* Sticky colors — only shown when sticky is active */}
      {tool === 'sticky' && (
        <div className="toolbar-group">
          <div className="sticky-palette">
            {STICKY_COLORS.map(c => (
              <div
                key={c}
                className="sticky-dot"
                style={{ background: c }}
                title="Add sticky note"
                onClick={() => onAction('sticky', c)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Stroke color + width */}
      <div className="toolbar-group">
        <div className="color-swatch" style={{ background: color }} title="Stroke color">
          <input type="color" value={color} onChange={e => setColor(e.target.value)} />
        </div>
        <input
          type="range"
          className="stroke-slider"
          min="1" max="24"
          value={strokeWidth}
          onChange={e => setStrokeWidth(Number(e.target.value))}
          title={`Stroke: ${strokeWidth}px`}
        />
      </div>

      {/* Edit actions */}
      <div className="toolbar-group">
        <button className="tool-btn" title="Delete selected" onClick={onDelete}>🗑</button>
        <button className="tool-btn" title="Clear all" onClick={onClear}>⊘</button>
      </div>

      {/* Right section */}
      <div className="toolbar-right">
        {/* Save status */}
        <div className={`save-pill ${saveStatus === 'Saving…' ? 'saving' : ''}`}>
          <div className="save-pill-dot" />
          {saveStatus}
        </div>

        {/* Presence avatars */}
        {presence.length > 0 && (
          <div className="presence-stack">
            {presence.slice(0, 6).map(u => (
              <div
                key={u.socketId}
                className="presence-avatar"
                style={{ background: u.color || '#00e5ff' }}
                title={u.username}
              >
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

        <button className="tb-action primary" onClick={onShare}>Share</button>
        <button className="tb-action" onClick={onExportPNG}>PNG</button>
        <button className="tb-action" onClick={onExportPDF}>PDF</button>
      </div>
    </div>
  );
}
