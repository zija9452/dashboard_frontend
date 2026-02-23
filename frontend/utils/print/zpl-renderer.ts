/**
 * ZPL Renderer Utility
 * Converts ZPL commands to visual representation for preview
 */

interface ZPLCommand {
  command: string;
  parameters: string[];
  position: { x: number; y: number };
}

export class ZPLRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(canvas?: HTMLCanvasElement) {
    if (canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
    }
  }

  /**
   * Parse ZPL commands from string
   */
  parseZPL(zplString: string): ZPLCommand[] {
    const commands: ZPLCommand[] = [];
    const lines = zplString.split('\n');

    let currentX = 0;
    let currentY = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Extract command and parameters
      const match = trimmedLine.match(/^~?(\w+)(.*)/);
      if (match) {
        const command = match[1];
        const params = match[2]?.trim().split(',') || [];

        commands.push({
          command,
          parameters: params,
          position: { x: currentX, y: currentY }
        });

        // Update position based on command (simplified)
        if (command === '^FO') {
          // Field Origin command - update position
          if (params.length >= 2) {
            currentX = parseInt(params[0]) || 0;
            currentY = parseInt(params[1]) || 0;
          }
        }
      }
    }

    return commands;
  }

  /**
   * Render ZPL to canvas
   */
  async renderToCanvas(zplString: string, width: number = 400, height: number = 300): Promise<HTMLCanvasElement> {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
    }

    if (!this.ctx) {
      this.ctx = this.canvas.getContext('2d');
    }

    if (!this.ctx) {
      throw new Error('Could not get 2D context');
    }

    this.canvas.width = width;
    this.canvas.height = height;

    // Clear canvas
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, width, height);

    // Parse ZPL commands
    const commands = this.parseZPL(zplString);

    // Draw based on commands
    this.ctx.fillStyle = '#000000';
    this.ctx.font = '12px Arial';

    for (const cmd of commands) {
      switch (cmd.command) {
        case '^FO': // Field Origin
          // Position for next field
          break;
        case '^FD': // Field Data
          // Draw text
          if (cmd.parameters.length > 0 && this.ctx) {
            const text = cmd.parameters[0].replace(/[\^~]/g, '');
            this.ctx.fillText(text, cmd.position.x, cmd.position.y + 12);
          }
          break;
        case '^GB': // Graphic Box
          // Draw box
          if (cmd.parameters.length >= 3 && this.ctx) {
            const width = parseInt(cmd.parameters[0]) || 0;
            const height = parseInt(cmd.parameters[1]) || 0;
            const thickness = parseInt(cmd.parameters[2]) || 1;

            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = thickness;
            this.ctx.strokeRect(cmd.position.x, cmd.position.y, width, height);
          }
          break;
        case '^BY': // Barcode Field Default
          // Set barcode parameters
          break;
        case '^BC': // Barcode Code 128
          // Draw barcode representation
          if (cmd.parameters.length > 0 && this.ctx) {
            const barcodeData = cmd.parameters[0];
            this.drawBarcodePlaceholder(barcodeData, cmd.position.x, cmd.position.y);
          }
          break;
        default:
          // Other commands - skip for now
          break;
      }
    }

    return this.canvas;
  }

  /**
   * Draw a placeholder for barcode
   */
  private drawBarcodePlaceholder(data: string, x: number, y: number) {
    if (!this.ctx) return;

    // Draw alternating bars (barcode lines)
    const barWidth = 2;
    const barHeight = 80;

    for (let i = 0; i < Math.min(data.length, 30); i++) {
      const barX = x + (i * barWidth * 2);
      // Alternate between thick and thin bars
      this.ctx.fillStyle = i % 2 === 0 ? '#000000' : '#000000';
      this.ctx.fillRect(barX, y, barWidth + (i % 3), barHeight);
    }
  }

  /**
   * Draw complete barcode label with all elements
   */
  drawCompleteLabel(
    barcode: string,
    productName: string,
    price: number,
    startX: number,
    startY: number
  ) {
    if (!this.ctx) return;

    const ctx = this.ctx;

    // 1. Draw barcode lines
    this.drawBarcodePlaceholder(barcode, startX + 50, startY + 50);

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
  }

  /**
   * Generate preview image from ZPL
   */
  async generatePreview(zplString: string): Promise<string> {
    const canvas = await this.renderToCanvas(zplString);
    return canvas.toDataURL('image/png');
  }

  /**
   * Validate ZPL syntax
   */
  validateZPL(zplString: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for basic ZPL structure
    if (!zplString.includes('^XA') || !zplString.includes('^XZ')) {
      errors.push('Missing ^XA (start) or ^XZ (end) commands');
    }

    // Check for common syntax errors
    const lines = zplString.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('~') && !line.startsWith('^')) {
        errors.push(`Line ${i + 1}: Invalid command format - must start with ~ or ^`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const zplRenderer = new ZPLRenderer();