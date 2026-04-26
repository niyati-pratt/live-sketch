import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportAsPNG(fabricCanvas) {
  const dataUrl = fabricCanvas.toDataURL({ format: 'png', multiplier: 2 });
  const link = document.createElement('a');
  link.download = `whiteboard-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}

export async function exportAsPDF(fabricCanvas) {
  const dataUrl = fabricCanvas.toDataURL({ format: 'png', multiplier: 2 });
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080] });
  pdf.addImage(dataUrl, 'PNG', 0, 0, 1920, 1080);
  pdf.save(`whiteboard-${Date.now()}.pdf`);
}