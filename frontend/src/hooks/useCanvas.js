import { useEffect, useRef, useCallback } from 'react';
import {
  Canvas as FabricCanvas, PencilBrush,
  Rect, Circle, Line, Triangle, IText, Group, util
} from 'fabric';

export function useCanvas({ canvasEl, tool, color, strokeWidth, onDelta }) {
  const fabricRef = useRef(null);

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
      const now = Date.now();
      if (now - lastEmit < 50) return;
      lastEmit = now;
      onDelta?.({ type, object: obj?.toObject(['id']), fullState: fc.toJSON(['id']) });
    };

    fc.on('object:modified', (e) => emitDelta('modified', e.target));
    fc.on('object:added',    (e) => { if (e.target.__fromRemote) return; emitDelta('added', e.target); });
    fc.on('object:removed',  (e) => emitDelta('removed', e.target));

    return () => { fc.dispose(); };
  }, [canvasEl]); // eslint-disable-line

  useEffect(() => {
    const fc = fabricRef.current;
    if (!fc) return;
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
  }, [tool, color, strokeWidth]);

  const addShape = useCallback((type) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const center = { left: fc.getWidth() / 2 - 50, top: fc.getHeight() / 2 - 50 };
    let obj;
    if (type === 'rect') {
      obj = new Rect({ ...center, width: 120, height: 80, fill: color, opacity: 0.85, rx: 4, ry: 4 });
    } else if (type === 'circle') {
      obj = new Circle({ ...center, radius: 50, fill: color, opacity: 0.85 });
    } else if (type === 'line') {
      obj = new Line([center.left, center.top, center.left + 150, center.top],
        { stroke: color, strokeWidth, selectable: true });
    } else if (type === 'triangle') {
      obj = new Triangle({ ...center, width: 100, height: 100, fill: color, opacity: 0.85 });
    }
    if (obj) { fc.add(obj); fc.setActiveObject(obj); fc.renderAll(); }
  }, [color, strokeWidth]);

  const addText = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const t = new IText('Double-click to edit', {
      left: 100, top: 100, fontSize: 18, fill: '#111', fontFamily: 'Arial',
    });
    fc.add(t); fc.setActiveObject(t); fc.renderAll();
  }, []);

  const addStickyNote = useCallback((noteColor = '#fef08a') => {
    const fc = fabricRef.current;
    if (!fc) return;
    const rect = new Rect({ width: 180, height: 140, fill: noteColor, rx: 4, ry: 4 });
    const text = new IText('Note...', { left: 10, top: 10, fontSize: 14, fill: '#1a1a1a', width: 160 });
    const group = new Group([rect, text], { left: 200, top: 200, subTargetCheck: true });
    fc.add(group); fc.setActiveObject(group); fc.renderAll();
  }, []);

  const deleteSelected = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const active = fc.getActiveObjects();
    active.forEach(obj => fc.remove(obj));
    fc.discardActiveObject();
    fc.renderAll();
  }, []);

  const clearAll = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.clear(); fc.backgroundColor = '#ffffff'; fc.renderAll();
  }, []);

  const loadState = useCallback((jsonState) => {
    const fc = fabricRef.current;
    if (!fc || !jsonState) return;
    fc.loadFromJSON(jsonState).then(() => fc.renderAll());
  }, []);

  const applyRemoteDelta = useCallback((delta) => {
  const fc = fabricRef.current;
  if (!fc) return;

  if (delta.type === 'added' && delta.object) {
    util.enlivenObjects([delta.object]).then(([obj]) => {
      if (!obj) return;
      obj.__fromRemote = true;
      fc.add(obj);
      fc.renderAll();
    });
  } else if (delta.type === 'modified' && delta.object) {
    const existing = fc.getObjects().find(o => o.id === delta.object.id);
    if (existing) {
      // Destructure out read-only properties before calling set()
      const { type, ...safeProps } = delta.object;
      existing.set(safeProps);
      existing.setCoords();
      fc.renderAll();
    }
  } else if (delta.type === 'removed' && delta.object) {
    const obj = fc.getObjects().find(o => o.id === delta.object.id);
    if (obj) { fc.remove(obj); fc.renderAll(); }
  }
}, []);

  return { fabricRef, addShape, addText, addStickyNote, deleteSelected, clearAll, loadState, applyRemoteDelta };
}