import * as React from "react";

import { cn } from "@/lib/utils";

export const fieldClass =
  "flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-base shadow-soft transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/25 sm:text-sm";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Rendered inside the field on the leading edge, e.g. a search glyph. */
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, icon, ...props }, ref) => {
  const input = (
    <input type={type} ref={ref} className={cn(fieldClass, icon && "pl-9", className)} {...props} />
  );
  if (!icon) return input;
  return (
    <div className="relative w-full">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
        {icon}
      </span>
      {input}
    </div>
  );
});
Input.displayName = "Input";

export { Input };
