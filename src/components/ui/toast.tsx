import * as ToastPrimitive from "@radix-ui/react-toast";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import { dismissToast, useToasts, type ToastVariant } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const variantStyles: Record<ToastVariant, { ring: string; icon: typeof Info; iconClass: string }> = {
  default: { ring: "border-border", icon: Info, iconClass: "text-primary" },
  success: { ring: "border-success/40", icon: CheckCircle2, iconClass: "text-success" },
  destructive: { ring: "border-destructive/40", icon: AlertCircle, iconClass: "text-destructive" },
};

/** Mounted once, near the root. Renders bottom-centre on phones and bottom-right from `sm` up. */
export function Toaster() {
  const toasts = useToasts();

  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={Infinity}>
      {toasts.map((t) => {
        const { ring, icon: Icon, iconClass } = variantStyles[t.variant];
        return (
          <ToastPrimitive.Root
            key={t.id}
            open
            onOpenChange={(open) => !open && dismissToast(t.id)}
            className={cn(
              "pointer-events-auto flex w-full animate-toast-in items-start gap-3 rounded-xl border bg-card p-4 shadow-pop",
              "data-[swipe=end]:animate-out data-[swipe=end]:fade-out-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
              "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
              ring,
            )}
          >
            <Icon className={cn("mt-0.5 size-5 shrink-0", iconClass)} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <ToastPrimitive.Title className="text-sm font-medium">{t.title}</ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="mt-0.5 break-anywhere text-sm text-muted-foreground">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        );
      })}
      <ToastPrimitive.Viewport className="pointer-events-none fixed bottom-0 right-0 z-[60] flex w-full max-w-full flex-col gap-2 p-4 sm:max-w-sm" />
    </ToastPrimitive.Provider>
  );
}
