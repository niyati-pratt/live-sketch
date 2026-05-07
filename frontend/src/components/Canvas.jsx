import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Toolbar     from './Toolbar';
import CursorLayer from './CursorLayer';
import ShareModal  from './ShareModal';
import { useSocket } from '../hooks/useSocket';
import { useCanvas }  from '../hooks/useCanvas';
import { exportAsPNG, exportAsPDF } from '../utils/export';

const API = 'http://localhost:5001/api';

export default function Canvas({ user, token }) {
  const { boardId }   = useParams();
  const canvasEl      = useRef(null);
  const wrapperRef    = useRef(null);

  const [tool, setTool]               = useState('select');
  const [color, setColor]             = useState('#1a1a1a');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [cursors, setCursors]         = useState({});
  const [presence, setPresence]       = useState([]);
  const [shareOpen, setShareOpen]     = useState(false);
  const [saveStatus, setSaveStatus]   = useState('Saved');
  const [canEdit, setCanEdit]         = useState(true);

  const { emit, on, off } = useSocket(token);

  const handleDelta = useCallback((delta) => {
    if (!canEdit) return;
    setSaveStatus('Saving…');
    emit('canvas-delta', {
      boardId,
      delta,
      fullState: JSON.stringify(delta.fullState),
    });
    setTimeout(() => setSaveStatus('Saved'), 2000);
  }, [boardId, emit, canEdit]);

  const {
    fabricRef, addShape, addText, addStickyNote,
    deleteSelected, clearAll, loadState, applyRemoteDelta
  } = useCanvas({ canvasEl, tool, color, strokeWidth, onDelta: handleDelta, canEdit });

  // Use refs for callbacks so socket listeners don't need to be re-registered
  // This fixes the bug where switching boards causes stale listeners to stack up
  const loadStateRef         = useRef(loadState);
  const applyRemoteDeltaRef  = useRef(applyRemoteDelta);
  useEffect(() => { loadStateRef.current        = loadState; },        [loadState]);
  useEffect(() => { applyRemoteDeltaRef.current = applyRemoteDelta; }, [applyRemoteDelta]);

  // Check edit permission
  useEffect(() => {
    if (!boardId || !token) return;
    axios.get(`${API}/boards/${boardId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(({ data }) => setCanEdit(data.canEdit)).catch(() => {});
  }, [boardId, token]);

  // Socket events — only depends on boardId so it only re-runs on board change
  useEffect(() => {
    if (!boardId) return;
    emit('join-board', { boardId });

    // Define stable handlers that call the latest function via ref
    const handleBoardState = ({ canvasState }) => {
      try { loadStateRef.current(JSON.parse(canvasState)); } catch {}
    };

    const handleCanvasDelta = ({ delta }) => {
      applyRemoteDeltaRef.current(delta);
    };

    const handleCursorMove = (data) => {
      setCursors(prev => ({ ...prev, [data.socketId]: data }));
    };

    const handlePresenceUpdate = ({ users }) => setPresence(users);

    const handleUserLeft = ({ socketId }) => {
      setCursors(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    };

    on('board-state',      handleBoardState);
    on('canvas-delta',     handleCanvasDelta);
    on('cursor-move',      handleCursorMove);
    on('presence-update',  handlePresenceUpdate);
    on('user-left',        handleUserLeft);

    return () => {
      // Remove exact listeners — prevents stacking up on board switch
      off('board-state',      handleBoardState);
      off('canvas-delta',     handleCanvasDelta);
      off('cursor-move',      handleCursorMove);
      off('presence-update',  handlePresenceUpdate);
      off('user-left',        handleUserLeft);
    };
  }, [boardId, emit, on, off]); // only boardId and stable socket functions

  // Cursor broadcasting
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const handler = (e) => {
      const rect = wrapper.getBoundingClientRect();
      emit('cursor-move', { boardId, x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    wrapper.addEventListener('mousemove', handler, { passive: true });
    return () => wrapper.removeEventListener('mousemove', handler);
  }, [boardId, emit]);

  // Resize canvas
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
    if (!canEdit) return;
    if (type === 'text')        addText();
    else if (type === 'sticky') addStickyNote(extra);
    else                        addShape(type);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Toolbar
        tool={tool}               setTool={setTool}
        color={color}             setColor={setColor}
        strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
        onClear={canEdit ? clearAll : () => {}}
        onDelete={canEdit ? deleteSelected : () => {}}
        onExportPNG={() => exportAsPNG(fabricRef.current)}
        onExportPDF={() => exportAsPDF(fabricRef.current)}
        onShare={() => setShareOpen(true)}
        presence={presence}
        saveStatus={saveStatus}
        onAction={handleAction}
        canEdit={canEdit}
      />
      {!canEdit && (
        <div style={{
          background: 'rgba(245,197,66,0.15)',
          border: '1px solid rgba(245,197,66,0.3)',
          color: '#f5c542',
          padding: '0.4rem 1rem',
          fontSize: '0.8rem',
          textAlign: 'center',
          fontWeight: 500,
        }}>
          👁 View only — you can see this board but cannot make changes
        </div>
      )}
      <div className="canvas-wrapper" ref={wrapperRef}>
        <canvas ref={canvasEl} />
        <CursorLayer cursors={cursors} />
      </div>
      {shareOpen && (
        <ShareModal boardId={boardId} token={token} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}
