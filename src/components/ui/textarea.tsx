import * as React from "react";

import { fieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldClass, "min-h-[88px] resize-y py-2.5", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
