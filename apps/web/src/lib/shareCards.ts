interface ShareCardOptions {
  title: string;
  subtitle: string;
  lines: string[];
  footer?: string;
  fileName: string;
}

export async function shareTextCard(options: ShareCardOptions): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, '#101827');
  gradient.addColorStop(0.58, '#182033');
  gradient.addColorStop(1, '#0b1019');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1350);

  ctx.fillStyle = 'rgba(201, 162, 75, 0.16)';
  ctx.fillRect(0, 0, 1080, 18);
  ctx.fillRect(0, 1332, 1080, 18);

  ctx.strokeStyle = 'rgba(201, 162, 75, 0.5)';
  ctx.lineWidth = 2;
  roundRect(ctx, 72, 76, 936, 1198, 34);
  ctx.stroke();

  ctx.fillStyle = '#e0bd6c';
  ctx.font = '700 34px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Mundial 2026', 540, 160);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 70px Arial, sans-serif';
  wrapText(ctx, options.title, 540, 285, 820, 78);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.font = '500 34px Arial, sans-serif';
  wrapText(ctx, options.subtitle, 540, 450, 800, 44);

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  roundRect(ctx, 138, 570, 804, 470, 28);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 40px Arial, sans-serif';
  options.lines.slice(0, 6).forEach((line, index) => {
    wrapText(ctx, line, 180, 650 + index * 68, 720, 45, 'left');
  });

  ctx.fillStyle = 'rgba(224, 189, 108, 0.82)';
  ctx.font = '700 26px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(options.footer ?? 'Quiniela privada', 540, 1166);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 0.92));
  if (!blob) return;

  const file = new File([blob], options.fileName, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: options.title, text: options.subtitle });
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = options.fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign = 'center',
): void {
  const words = text.split(/\s+/);
  let line = '';
  ctx.textAlign = align;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

