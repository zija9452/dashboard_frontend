import { ToastProvider } from '@/components/ui/Toast';
import { GlobalErrorHandler } from '@/components/GlobalErrorHandler';

export default function CustomerInvoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <GlobalErrorHandler>
        <ToastProvider>
          <div className="min-h-screen bg-white">
            {children}
          </div>
        </ToastProvider>
      </GlobalErrorHandler>
    </>
  );
}
