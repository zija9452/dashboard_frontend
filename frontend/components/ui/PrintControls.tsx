import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { printManager, PrintResult } from '@/utils/print';

interface PrintControlsProps {
  zplData: string;
  onPrintResult?: (result: PrintResult) => void;
  disabled?: boolean;
}

const PrintControls: React.FC<PrintControlsProps> = ({ zplData, onPrintResult, disabled = false }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  const handlePrint = async () => {
    setLoading(true);
    setStatus('');

    try {
      const result = await printManager.printZPL(zplData);

      if (onPrintResult) {
        onPrintResult(result);
      }

      if (result.success) {
        setStatus(`Successfully printed via ${result.method}`);
      } else {
        setStatus(`Print failed: ${result.error || result.message}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setStatus(`Print error: ${errorMessage}`);

      if (onPrintResult) {
        onPrintResult({
          success: false,
          method: 'unknown',
          message: 'Print failed',
          error: errorMessage
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Create a downloadable file with the ZPL data
    const blob = new Blob([zplData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `label-${new Date().toISOString().slice(0, 19)}.zpl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(zplData).then(() => {
      setStatus('ZPL copied to clipboard!');
      setTimeout(() => setStatus(''), 2000);
    }).catch(err => {
      setStatus('Failed to copy ZPL to clipboard');
    });
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Button
        onClick={handlePrint}
        loading={loading}
        disabled={disabled}
        variant="primary"
      >
        {loading ? 'Printing...' : 'Print'}
      </Button>

      <Button
        onClick={handleExport}
        variant="outline"
        disabled={disabled}
      >
        Export ZPL
      </Button>

      <Button
        onClick={handleCopy}
        variant="outline"
        disabled={disabled}
      >
        Copy
      </Button>

      {status && (
        <div className={`text-sm ml-2 ${status.includes('failed') || status.includes('error') ? 'text-red-600' : 'text-green-600'}`}>
          {status}
        </div>
      )}
    </div>
  );
};

export default PrintControls;