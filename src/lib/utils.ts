import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getColorForClient(name: string): string {
  const colors = [
    "2e7d32", // Green
    "1565c0", // Blue
    "c62828", // Red
    "ef6c00", // Orange
    "6a1b9a", // Purple
    "00838f", // Cyan
    "4e342e", // Brown
    "37474f", // Blue Grey
    "d84315", // Deep Orange
    "283593", // Indigo
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
