import { ToastProvider } from '@/components/ui/Toast';
import { GlobalErrorHandler } from '@/components/GlobalErrorHandler';
import WhatsAppButton from '@/components/WhatsAppButton';

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
            <WhatsAppButton />
          </div>
        </ToastProvider>
      </GlobalErrorHandler>
    </>
  );
}
