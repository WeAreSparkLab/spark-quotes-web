import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

// Icon configuration
const THEME_COLOR = '#6672E7';
const BG_COLOR = '#0E0F1D';
const SIZES = [192, 512];

function generateIcon(size, isMaskable = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, size, size);
  
  // Calculate sizing
  const padding = isMaskable ? size * 0.2 : size * 0.1;
  const contentSize = size - (padding * 2);
  const center = size / 2;
  
  // Draw a sparkle/star icon with "S" for Spark
  // Outer glow circle
  const gradient = ctx.createRadialGradient(center, center, 0, center, center, contentSize / 2);
  gradient.addColorStop(0, THEME_COLOR);
  gradient.addColorStop(1, 'rgba(102, 114, 231, 0.3)');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(center, center, contentSize / 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw sparkle/quote symbol
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = size * 0.02;
  
  // Draw quotation marks (simple sparkle effect)
  const quoteSize = contentSize * 0.3;
  const quoteY = center - quoteSize * 0.3;
  const quoteX1 = center - quoteSize * 0.6;
  const quoteX2 = center + quoteSize * 0.2;
  
  // Left quote
  ctx.font = `bold ${quoteSize}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('"', quoteX1, quoteY);
  
  // Right quote (closing)
  ctx.fillText('"', quoteX2, center + quoteSize * 0.3);
  
  // Add star sparkles
  const drawStar = (x, y, radius, points = 4) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const r = i % 2 === 0 ? radius : radius / 3;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();
  };
  
  const starSize = size * 0.04;
  drawStar(center - contentSize * 0.35, center - contentSize * 0.35, starSize);
  drawStar(center + contentSize * 0.35, center - contentSize * 0.35, starSize);
  drawStar(center + contentSize * 0.35, center + contentSize * 0.35, starSize);
  
  return canvas;
}

// Generate all icons
const iconsDir = path.join(process.cwd(), 'public', 'icons');

for (const size of SIZES) {
  // Regular icon
  const regularCanvas = generateIcon(size, false);
  const regularBuffer = regularCanvas.toBuffer('image/png', { compressionLevel: 9 });
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), regularBuffer);
  console.log(`✓ Generated icon-${size}.png (${Math.round(regularBuffer.length / 1024)}KB)`);
  
  // Maskable icon (with more padding for safe area)
  const maskableCanvas = generateIcon(size, true);
  const maskableBuffer = maskableCanvas.toBuffer('image/png', { compressionLevel: 9 });
  fs.writeFileSync(path.join(iconsDir, `maskable-${size}.png`), maskableBuffer);
  console.log(`✓ Generated maskable-${size}.png (${Math.round(maskableBuffer.length / 1024)}KB)`);
}

// Also create apple-touch-icon
const appleCanvas = generateIcon(180, false);
const appleBuffer = appleCanvas.toBuffer('image/png', { compressionLevel: 9 });
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), appleBuffer);
console.log(`✓ Generated apple-touch-icon.png (${Math.round(appleBuffer.length / 1024)}KB)`);

console.log('\n✨ All icons generated successfully!');
