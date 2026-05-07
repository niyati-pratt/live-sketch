import { useEffect, useRef, useCallback } from 'react';
import {
  Canvas as FabricCanvas, PencilBrush,
  Rect, Circle, Line, Triangle, IText, Group
} from 'fabric';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function useCanvas({ canvasEl, tool, color, strokeWidth, onDelta, canEdit = true }) {
  const fabricRef  = useRef(null);
  const onDeltaRef = useRef(onDelta);
  const isApplyingRemote = useRef(false); // flag to prevent re-emitting remote changes

  useEffect(() => { onDeltaRef.current = onDelta; }, [onDelta]);

  useEffect(() => {
    if (!canvasEl.current) return;
    const fc = new FabricCanvas(canvasEl.current, {
      isDrawingMode: false,
      selection: true,
      backgroundColor: '#ffffff',
    });
    fabricRef.current = fc;

    let lastEmit = 0;
    const emitDelta = (type, obj) => {
      if (isApplyingRemote.current) return; // don't re-emit remote changes
      const now = Date.now();
      if (now - lastEmit < 50) return;
      lastEmit = now;
      onDeltaRef.current?.({
        type,
        object: obj?.toObject(['id']),
        fullState: fc.toJSON(['id']),
      });
    };

    fc.on('object:modified', (e) => emitDelta('modified', e.target));
    fc.on('object:added', (e) => {
      if (isApplyingRemote.current) return;
      if (!e.target.id) e.target.id = uid();
      emitDelta('added', e.target);
    });
    fc.on('object:removed', (e) => {
      if (isApplyingRemote.current) return;
      emitDelta('removed', e.target);
    });

    return () => { fc.dispose(); };
  }, [canvasEl]); // eslint-disable-line

  // Tool switching
  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    if (!canEdit) {
      fc.isDrawingMode = false;
      fc.selection     = false;
      fc.forEachObject(obj => { obj.selectable = false; obj.evented = false; });
      fc.renderAll();
      return;
    }
    fc.isDrawingMode = tool === 'pen' || tool === 'eraser';
    fc.selection     = tool === 'select';
    if (tool === 'pen') {
      fc.freeDrawingBrush = new PencilBrush(fc);
      fc.freeDrawingBrush.color = color;
      fc.freeDrawingBrush.width = strokeWidth;
    } else if (tool === 'eraser') {
      fc.freeDrawingBrush = new PencilBrush(fc);
      fc.freeDrawingBrush.color = '#ffffff';
      fc.freeDrawingBrush.width = strokeWidth * 3;
    }
  }, [tool, color, strokeWidth, canEdit]);

  const addShape = useCallback((type) => {
    const fc = fabricRef.current;
    if (!fc || !canEdit) return;
    const center = { left: fc.getWidth() / 2 - 50, top: fc.getHeight() / 2 - 50 };
    let obj;
    if (type === 'rect')
      obj = new Rect({ ...center, width: 120, height: 80, fill: color, opacity: 0.85, rx: 4, ry: 4 });
    else if (type === 'circle')
      obj = new Circle({ ...center, radius: 50, fill: color, opacity: 0.85 });
    else if (type === 'line')
      obj = new Line([center.left, center.top, center.left + 150, center.top],
        { stroke: color, strokeWidth, selectable: true });
    else if (type === 'triangle')
      obj = new Triangle({ ...center, width: 100, height: 100, fill: color, opacity: 0.85 });
    if (obj) {
      obj.id = uid();
      fc.add(obj);
      fc.setActiveObject(obj);
      fc.renderAll();
    }
  }, [color, strokeWidth, canEdit]);

  const addText = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || !canEdit) return;
    const t = new IText('Double-click to edit', {
      left: 100, top: 100, fontSize: 18, fill: '#111', fontFamily: 'Arial',
    });
    t.id = uid();
    fc.add(t);
    fc.setActiveObject(t);
    fc.renderAll();
  }, [canEdit]);

  const addStickyNote = useCallback((noteColor = '#fef08a') => {
    const fc = fabricRef.current;
    if (!fc || !canEdit) return;
    const rect = new Rect({ width: 180, height: 140, fill: noteColor, rx: 4, ry: 4 });
    const text = new IText('Note...', { left: 10, top: 10, fontSize: 14, fill: '#1a1a1a', width: 160 });
    const group = new Group([rect, text], { left: 200, top: 200, subTargetCheck: true });
    group.id = uid();
    fc.add(group);
    fc.setActiveObject(group);
    fc.renderAll();
  }, [canEdit]);

  const deleteSelected = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || !canEdit) return;
    fc.getActiveObjects().forEach(obj => fc.remove(obj));
    fc.discardActiveObject();
    fc.renderAll();
  }, [canEdit]);

  const clearAll = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || !canEdit) return;
    fc.clear();
    fc.backgroundColor = '#ffffff';
    fc.renderAll();
    // Broadcast full clear to other users
    onDeltaRef.current?.({ type: 'clear', object: null, fullState: fc.toJSON(['id']) });
  }, [canEdit]);

  const loadState = useCallback((jsonState) => {
    const fc = fabricRef.current;
    if (!fc || !jsonState) return;
    isApplyingRemote.current = true;
    fc.loadFromJSON(jsonState).then(() => {
      fc.renderAll();
      isApplyingRemote.current = false;
    });
  }, []);

  // ── KEY FIX ────────────────────────────────────────────────────────────────
  // Instead of trying to recreate individual objects (which breaks for IText
  // and Group), we reload the FULL canvas state from the delta.
  // fullState is already sent with every delta from the server.
  const applyRemoteDelta = useCallback((delta) => {
    const fc = fabricRef.current;
    if (!fc) return;

    // Use full state reload for all delta types — most reliable approach
    if (delta.fullState) {
      isApplyingRemote.current = true;
      const state = typeof delta.fullState === 'string'
        ? JSON.parse(delta.fullState)
        : delta.fullState;

      fc.loadFromJSON(state).then(() => {
        fc.renderAll();
        isApplyingRemote.current = false;
      });
      return;
    }

    // Fallback for clear (no fullState needed)
    if (delta.type === 'clear') {
      isApplyingRemote.current = true;
      fc.clear();
      fc.backgroundColor = '#ffffff';
      fc.renderAll();
      isApplyingRemote.current = false;
    }
  }, []);

  return { fabricRef, addShape, addText, addStickyNote, deleteSelected, clearAll, loadState, applyRemoteDelta };
}