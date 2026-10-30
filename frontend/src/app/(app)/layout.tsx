import { AppGate } from "@/components/app/AppGate";
import { AppStateProvider } from "@/components/providers/AppStateProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { MotionProvider } from "@/components/ui/Motion";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <AuthProvider>
        <AppStateProvider>
          <ToastProvider>
            <AppGate>{children}</AppGate>
          </ToastProvider>
        </AppStateProvider>
      </AuthProvider>
    </MotionProvider>
  );
}
