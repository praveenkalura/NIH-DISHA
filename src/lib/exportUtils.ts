// Export utilities for downloading data and charts

/**
 * Export data as CSV
 */
export function exportToCSV(data: Record<string, any>[], filename: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ];

  const csvContent = csvRows.join('\n');
  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Export chart as PNG
 */
export function exportChartAsPNG(chartElement: HTMLElement, filename: string): void {
  // Using html2canvas would be ideal, but for simplicity we'll use SVG export
  const svg = chartElement.querySelector('svg');
  if (!svg) {
    console.warn('No SVG element found in chart');
    return;
  }

  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = svg.clientWidth * 2;
    canvas.height = svg.clientHeight * 2;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.scale(2, 2);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    canvas.toBlob(blob => {
      if (blob) {
        const pngUrl = URL.createObjectURL(blob);
        downloadFile(pngUrl, `${filename}.png`, 'image/png', true);
        URL.revokeObjectURL(pngUrl);
      }
    }, 'image/png');

    URL.revokeObjectURL(url);
  };
  img.src = url;
}

/**
 * Download file utility
 */
function downloadFile(content: string, filename: string, mimeType: string, isUrl: boolean = false): void {
  const link = document.createElement('a');
  link.setAttribute('download', filename);
  
  if (isUrl) {
    link.setAttribute('href', content);
  } else {
    link.setAttribute('href', `data:${mimeType},${encodeURIComponent(content)}`);
  }
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format date for filename
 */
export function formatDateForFilename(): string {
  return new Date().toISOString().slice(0, 10);
}
