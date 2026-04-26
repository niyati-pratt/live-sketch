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
    .badge { background: #6366f1; color: #fff; padding: 0.25rem 0.6rem;
             border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .actions { margin-left: auto; display: flex; gap: 0.5rem; }
    .btn { padding: 0.5rem 1rem; border-radius: 8px; border: none;
           cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.15s; }
    .btn-primary { background: #6366f1; color: #fff; }
    .btn-primary:hover { background: #a78bfa; }
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
  <span class="badge"><c:out value="${format}" defaultValue="PNG" /></span>
  <div class="actions">
    <button class="btn btn-ghost" onclick="window.print()">🖨 Print</button>
    <button class="btn btn-primary" onclick="downloadExport('png')">⬇ PNG</button>
    <button class="btn btn-primary" onclick="downloadExport('pdf')">⬇ PDF</button>
  </div>
</header>

<div class="canvas-container">
  <canvas id="exportCanvas" width="1920" height="1080"></canvas>
</div>

<div class="info-bar">
  Board ID: <c:out value="${boardId}" /> &nbsp;·&nbsp;
  Preview renders the current saved state. Export buttons generate server-side files.
</div>

<script>
  (function () {
    const canvasState = <c:out value="${canvasState}" escapeXml="false" />;
    const fc = new fabric.Canvas('exportCanvas', {
      selection: false,
      interactive: false,
    });

    // Scale canvas to fit viewport
    const maxW = window.innerWidth  - 80;
    const maxH = window.innerHeight - 160;
    const scale = Math.min(maxW / 1920, maxH / 1080, 1);
    fc.setWidth(1920 * scale);
    fc.setHeight(1080 * scale);
    fc.setZoom(scale);

    if (canvasState && typeof canvasState === 'object') {
      fc.loadFromJSON(canvasState, () => fc.renderAll());
    }

    window.downloadExport = function(format) {
      const token = '<c:out value="${token}" />';
      const boardId = '<c:out value="${boardId}" />';

      fetch(`/api/boards/${boardId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ format }),
      })
      .then(async res => {
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `board-${boardId}.${format}`; a.click();
        URL.revokeObjectURL(url);
      })
      .catch(err => alert('Export error: ' + err.message));
    };
  })();
</script>
</body>
</html>