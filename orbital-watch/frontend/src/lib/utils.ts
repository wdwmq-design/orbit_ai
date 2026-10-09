import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCoord(val: number | null | undefined, precision = 4): string {
  if (val === null || val === undefined || isNaN(val)) return "—"
  return val.toFixed(precision)
}

export function formatNum(val: number | null | undefined, precision = 2): string {
  if (val === null || val === undefined || isNaN(val)) return "—"
  return val.toFixed(precision)
}
