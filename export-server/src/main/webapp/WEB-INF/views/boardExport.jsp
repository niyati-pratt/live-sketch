<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="jakarta.tags.core" %>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Export — <c:out value="${boardTitle}" /></title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #1a1a1f; color: #e2e8f0; font-family: system-ui, sans-serif;
           display: flex; flex-direction: column; min-height: 100vh; }
    header { background: #0f0f11; border-bottom: 1px solid #2a2a35;
             padding: 1rem 1.5rem; display: flex; align-items: center; gap: 1rem; }
    header h1 { font-size: 1.1rem; }
    .badge { background: #00e5ff; color: #07070f; padding: 0.25rem 0.6rem;
             border-radius: 4px; font-size: 0.75rem; font-weight: 700; }
    .actions { margin-left: auto; display: flex; gap: 0.5rem; }
    .btn { padding: 0.5rem 1rem; border-radius: 8px; border: none;
           cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.15s; }
    .btn-primary { background: #00e5ff; color: #07070f; }
    .btn-primary:hover { background: #33ecff; }
    .btn-ghost { background: transparent; color: #e2e8f0; border: 1px solid #2a2a35; }
    .btn-ghost:hover { background: #2a2a35; }
    .canvas-container { flex: 1; display: flex; align-items: center; justify-content: center;
                        padding: 2rem; }
    canvas { border-radius: 8px; box-shadow: 0 25px 60px rgba(0,0,0,0.5); }
    .info-bar { background: #0f0f11; border-top: 1px solid #2a2a35;
                padding: 0.75rem 1.5rem; font-size: 0.8rem; color: #64748b; }
    @media print {
      header, .info-bar { display: none; }
      body { background: white; }
      canvas { box-shadow: none; }
    }
  </style>
</head>
<body>

<header>
  <span style="font-size: 1.4rem">🎨</span>
  <h1><c:out value="${boardTitle}" /></h1>
  <span class="badge"><c:out value="${not empty format ? format : 'PNG'}" /></span>
  <div class="actions">
    <button class="btn btn-ghost" onclick="window.print()">🖨 Print</button>
    <button class="btn btn-primary" onclick="downloadExport('png')">⬇ PNG</button>
    <button class="btn btn-primary" onclick="downloadExport('pdf')">⬇ PDF</button>
  </div>
</header>

<div class="canvas-container">
  <canvas id="exportCanvas"></canvas>
</div>

<div class="info-bar">
  Board ID: <c:out value="${boardId}" /> &nbsp;·&nbsp;
  Preview renders the current saved state.
</div>

<script id="canvas-data" type="application/json"><c:out value="${canvasState}" escapeXml="false" /></script>

<script>
(function () {
  const raw = document.getElementById('canvas-data').textContent.trim();
  let canvasState = null;
  try { canvasState = JSON.parse(raw); } catch(e) { console.error('JSON parse error:', e); }

  const W = 1920, H = 1080;
  const maxW = window.innerWidth - 80;
  const maxH = window.innerHeight - 160;
  const scale = Math.min(maxW / W, maxH / H, 1);

  const fc = new fabric.Canvas('exportCanvas', {
    selection: false,
    width:  W * scale,
    height: H * scale,
  });

  fc.setZoom(scale);

  if (canvasState) {
    fc.loadFromJSON(canvasState, function() { fc.renderAll(); });
  }

  window.downloadExport = function(format) {
    if (format === 'pdf') {
      alert('For PDF: use the 🖨 Print button and choose "Save as PDF".');
      return;
    }
    const boardId = '<c:out value="${boardId}"/>';
    const dataUrl = fc.toDataURL({ format: 'png', multiplier: 1 / scale });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'board-' + boardId + '.png';
    a.click();
  };
})();
</script>
</body>
</html>