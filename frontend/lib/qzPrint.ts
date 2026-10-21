import Swal from 'sweetalert2';

declare const qz: any;

// Sends ZPL labels to the Zebra printer through QZ Tray (script loaded in app/layout.tsx).
// Same flow as the shop Stock In page (app/(pages)/stock/stockin/page.tsx printBarcodes).
// Returns true when every label was sent.
export async function printZplLabels(zplCommands: Array<string | { zpl: string }>): Promise<boolean> {
  try {
    if (typeof qz === 'undefined') {
      Swal.fire({ title: 'QZ Tray Not Installed', html: `<p>QZ Tray is required for barcode printing.</p><p class="mt-2">Please install it from:</p><a href="https://qz.io" target="_blank" class="text-blue-600 underline">https://qz.io</a>`, icon: 'error', confirmButtonText: 'Close' });
      return false;
    }
    const zplData = zplCommands.map((cmd) => typeof cmd === 'string' ? cmd : cmd.zpl);
    try {
      if (!qz.websocket.isActive()) await qz.websocket.connect();
    } catch {
      const r = await Swal.fire({ title: 'QZ Tray Connection Failed', html: `<p>Cannot connect to QZ Tray application.</p>`, icon: 'error', confirmButtonText: 'Retry', showCancelButton: true, cancelButtonText: 'Close' });
      return r.isConfirmed ? printZplLabels(zplCommands) : false;
    }

    let printer;
    try {
      printer = await qz.printers.find('ZDesigner GX420d');
      if (!printer) {
        const allPrinters = await qz.printers.find();
        if (allPrinters.length === 0) throw new Error('No printers found');
        const { value: selectedPrinter } = await Swal.fire({ title: 'Select Printer', html: `<p>ZDesigner GX420d not found. Please select a printer:</p><select id="printer-select" class="swal2-input">${allPrinters.map((p: any) => `<option value="${p}">${p}</option>`).join('')}</select>`, focusConfirm: false, showCancelButton: true, confirmButtonText: 'Print', cancelButtonText: 'Cancel', preConfirm: () => (document.getElementById('printer-select') as HTMLSelectElement)?.value });
        if (!selectedPrinter) return false;
        printer = selectedPrinter;
      }
    } catch (printerError) {
      Swal.fire({ title: 'Printer Error', html: `<p>Cannot access printers. Error: ${(printerError as Error).message}</p>`, icon: 'error', confirmButtonText: 'OK' });
      return false;
    }

    const validZplData = zplData.filter((zpl) => zpl?.trim().length > 0 && zpl.includes('^XA') && zpl.includes('^XZ'));
    if (validZplData.length === 0) {
      Swal.fire({ title: 'No Valid Barcodes', html: `<p>All ZPL commands were empty or invalid.</p>`, icon: 'warning', confirmButtonText: 'OK' });
      return false;
    }
    const config = qz.configs.create(printer, { forceRaw: true, encoding: 'UTF-8' });
    for (const zpl of validZplData) {
      await qz.print(config, [zpl]);
    }
    return true;
  } catch (error) {
    Swal.fire({ title: 'Print Failed', html: `<p>Could not print barcodes. Error: ${(error as Error).message}</p>`, icon: 'error', confirmButtonText: 'OK' });
    return false;
  }
}
