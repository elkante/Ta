import QRCode from 'qrcode';

/**
 * Standard, 100% compliant and scannable QR Code SVG generator
 * Powered by standard ISO/IEC 18004 Reed-Solomon polynomial math.
 */
export function generateQRCodeSVG(
  text: string,
  size = 220,
  color = '#111827',
  bgColor = '#ffffff'
): string {
  if (!text) return '';

  let svgResult = '';
  try {
    QRCode.toString(
      text,
      {
        type: 'svg',
        width: size,
        margin: 2, // 2-4 quiet zone modules for rapid camera scanning
        errorCorrectionLevel: 'M',
        color: {
          dark: color,
          light: bgColor,
        },
      },
      (err, svg) => {
        if (!err && svg) {
          svgResult = svg;
        }
      }
    );
  } catch (err) {
    console.error('Failed to generate QR code SVG:', err);
  }

  // Fallback in case of callback failure
  if (!svgResult) {
    try {
      const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
      const moduleCount = qr.modules.size;
      const margin = 2;
      const total = moduleCount + margin * 2;
      const cell = size / total;

      let rects = '';
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (qr.modules.get(r, c)) {
            const x = (c + margin) * cell;
            const y = (r + margin) * cell;
            rects += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(cell + 0.05).toFixed(2)}" height="${(cell + 0.05).toFixed(2)}" fill="${color}" />`;
          }
        }
      }

      svgResult = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
        <rect width="${size}" height="${size}" fill="${bgColor}" rx="12" />
        <g>${rects}</g>
      </svg>`;
    } catch (e) {
      console.error('QR code generation fallback failed:', e);
    }
  }

  return svgResult;
}
