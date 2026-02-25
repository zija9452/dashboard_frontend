import { ToastProvider } from '@/components/ui/Toast';

export default function CustomerInvoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ToastProvider>
        <div className="min-h-screen bg-white">
          {children}
        </div>
      </ToastProvider>
    </>
  );
}
