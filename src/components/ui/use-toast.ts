import { useSyncExternalStore } from "react";

export type ToastVariant = "default" | "success" | "destructive";

export interface Toast {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

const DISMISS_AFTER_MS = 5000;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Raises a toast. Safe to call from anywhere, including react-query callbacks. */
export function toast({ title, description, variant = "default" }: ToastOptions) {
  const id = nextId++;
  toasts = [...toasts, { id, title, description, variant }];
  emit();
  setTimeout(() => dismissToast(id), DISMISS_AFTER_MS);
  return id;
}

export function dismissToast(id: number) {
  const next = toasts.filter((t) => t.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    subscribe,
    () => toasts,
    () => toasts,
  );
}
