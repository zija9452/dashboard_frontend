import React, { useEffect, useRef, useState } from 'react';
import { zplRenderer } from '@/utils/print/zpl-renderer';

interface BarcodePreviewProps {
  zplData: string;
  width?: number;
  height?: number;
}

const BarcodePreview: React.FC<BarcodePreviewProps> = ({
  zplData,
  width = 400,
  height = 300
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderPreview = async () => {
      if (!canvasRef.current) return;

      setLoading(true);
      setError(null);

      try {
        // Use the canvas reference to render
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Could not get 2D context');
        }

        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Parse ZPL commands
        const commands = zplRenderer.parseZPL(zplData);

        // Draw based on commands
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';

        let currentX = 0;
        let currentY = 0;

        for (const cmd of commands) {
          switch (cmd.command) {
            case '^FO': // Field Origin
              // Update position
              if (cmd.parameters.length >= 2) {
                currentX = parseInt(cmd.parameters[0]) || 0;
                currentY = parseInt(cmd.parameters[1]) || 0;
              }
              break;
            case '^FD': // Field Data
              // Draw text
              if (cmd.parameters.length > 0) {
                const text = cmd.parameters[0].replace(/[\^~]/g, '');
                ctx.fillText(text, currentX, currentY + 12);
              }
              break;
            case '^GB': // Graphic Box
              // Draw box
              if (cmd.parameters.length >= 3) {
                const boxWidth = parseInt(cmd.parameters[0]) || 0;
                const boxHeight = parseInt(cmd.parameters[1]) || 0;
                const thickness = parseInt(cmd.parameters[2]) || 1;

                ctx.strokeStyle = '#000000';
                ctx.lineWidth = thickness;
                ctx.strokeRect(currentX, currentY, boxWidth, boxHeight);
              }
              break;
            case '^BY': // Barcode Field Default
              // Set barcode parameters
              break;
            case '^BC': // Barcode Code 128
              // Draw barcode representation
              if (cmd.parameters.length > 0) {
                const barcodeData = cmd.parameters[0];
                drawBarcodePlaceholder(ctx, barcodeData, currentX, currentY);
              }
              break;
            default:
              // Other commands - skip for now
              break;
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render preview');
        console.error('Error rendering barcode preview:', err);
      } finally {
        setLoading(false);
      }
    };

    renderPreview();
  }, [zplData, width, height]);

  // Helper function to draw barcode placeholder
  const drawBarcodePlaceholder = (ctx: CanvasRenderingContext2D, data: string, x: number, y: number) => {
    // Draw alternating bars (barcode lines)
    const barWidth = 2;
    const barHeight = 80;

    for (let i = 0; i < Math.min(data.length, 30); i++) {
      const barX = x + (i * barWidth * 2);
      // Alternate between thick and thin bars
      ctx.fillStyle = '#000000';
      ctx.fillRect(barX, y, barWidth + (i % 3), barHeight);
    }
  };

  // Helper function to draw complete label with all elements
  const drawCompleteLabel = (
    ctx: CanvasRenderingContext2D,
    barcode: string,
    productName: string,
    price: number,
    startX: number,
    startY: number
  ) => {
    // 1. Draw barcode lines
    drawBarcodePlaceholder(ctx, barcode, startX + 50, startY + 50);

    // 2. Draw barcode number (below barcode)
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(barcode, startX + 60, startY + 145);

    // 3. Draw product name (below barcode number)
    ctx.font = '14px Arial';
    const truncatedName = productName.length > 35 ? productName.substring(0, 35) + '...' : productName;
    ctx.fillText(truncatedName, startX + 60, startY + 170);

    // 4. Draw price (at the bottom, larger and bold)
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`Price: Rs. ${price.toFixed(2)}`, startX + 60, startY + 200);
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="text-lg font-medium mb-2">ZPL Preview</h3>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
          <span className="ml-2">Rendering preview...</span>
        </div>
      )}

      {error && (
        <div className="text-red-600 p-4 bg-red-50 rounded">
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="border bg-white"
          />
          <div className="mt-2 text-xs text-gray-500">
            This is a visual approximation. Actual print may vary.
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodePreview;