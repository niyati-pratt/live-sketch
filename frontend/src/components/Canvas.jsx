import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Toolbar     from './Toolbar';
import CursorLayer from './CursorLayer';
import ShareModal  from './ShareModal';
import { useSocket } from '../hooks/useSocket';
import { useCanvas }  from '../hooks/useCanvas';
import { exportAsPNG, exportAsPDF } from '../utils/export';

const API = 'http://localhost:5001/api';

export default function Canvas({ user, token }) {
  const { boardId }   = useParams();
  const navigate      = useNavigate();
  const canvasEl      = useRef(null);
  const wrapperRef    = useRef(null);

  const [tool, setTool]               = useState('select');
  const [color, setColor]             = useState('#1a1a1a');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [cursors, setCursors]         = useState({});
  const [presence, setPresence]       = useState([]);
  const [shareOpen, setShareOpen]     = useState(false);
  const [saveStatus, setSaveStatus]   = useState('Saved');

  const { emit, on, off } = useSocket(token);

  const handleDelta = useCallback((delta) => {
    setSaveStatus('Saving…');
    emit('canvas-delta', { boardId, delta, fullState: JSON.stringify(delta.fullState) });
    setTimeout(() => setSaveStatus('Saved'), 2000);
  }, [boardId, emit]);

  const {
    fabricRef, addShape, addText, addStickyNote,
    deleteSelected, clearAll, loadState, applyRemoteDelta
  } = useCanvas({ canvasEl, tool, color, strokeWidth, onDelta: handleDelta });

  // Join board & listen for socket events
  useEffect(() => {
    if (!boardId) return;
    emit('join-board', { boardId });

    on('board-state', ({ canvasState }) => {
      try { loadState(JSON.parse(canvasState)); } catch {}
    });

    on('canvas-delta', ({ delta }) => applyRemoteDelta(delta));

    on('cursor-move', (data) => {
      setCursors(prev => ({ ...prev, [data.socketId]: data }));
    });

    on('presence-update', ({ users }) => setPresence(users));

    on('user-left', ({ socketId }) => {
      setCursors(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    });

    return () => {
      off('board-state');
      off('canvas-delta');
      off('cursor-move');
      off('presence-update');
      off('user-left');
    };
  }, [boardId, emit, on, off, loadState, applyRemoteDelta]);

  // Broadcast cursor position to other users
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const handler = (e) => {
      const rect = wrapper.getBoundingClientRect();
      emit('cursor-move', {
        boardId,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };
    wrapper.addEventListener('mousemove', handler, { passive: true });
    return () => wrapper.removeEventListener('mousemove', handler);
  }, [boardId, emit]);

  // Resize canvas to fill container using Fabric.js v6 API
  useEffect(() => {
    const fc  = fabricRef.current;
    const el  = wrapperRef.current;
    if (!fc || !el) return;
    const obs = new ResizeObserver(() => {
      fc.setDimensions({ width: el.clientWidth, height: el.clientHeight });
      fc.renderAll();
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [fabricRef]);

  function handleAction(type, extra) {
    if (type === 'text')         addText();
    else if (type === 'sticky')  addStickyNote(extra);
    else                         addShape(type);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Toolbar
        tool={tool}             setTool={setTool}
        color={color}           setColor={setColor}
        strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
        onClear={clearAll}
        onDelete={deleteSelected}
        onExportPNG={() => exportAsPNG(fabricRef.current)}
        onExportPDF={() => exportAsPDF(fabricRef.current)}
        onShare={() => setShareOpen(true)}
        presence={presence}
        saveStatus={saveStatus}
        onAction={handleAction}
      />
      <div className="canvas-wrapper" ref={wrapperRef}>
        <canvas ref={canvasEl} />
        <CursorLayer cursors={cursors} />
      </div>
      {shareOpen && (
        <ShareModal
          boardId={boardId}
          token={token}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}