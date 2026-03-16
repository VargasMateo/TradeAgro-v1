export type UserRole = 'profesional' | 'cliente' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  phone?: string;
  avatarUrl?: string;
  specialty?: string;
  createdAt?: string;
}

export interface Client {
  id: number;
  displayName: string;
  businessName: string;
  cuit: string;
  ivaCondition: string; // Matches 'RI', 'CF', etc.
  email: string;
  phoneNumber?: string;
  createdBy: string;
  createdAt: string; // timestamp
  deletedAt?: string; // timestamp
}

export interface Field {
  id: string;
  clientId: number;
  name: string;
  lat?: number;
  lng?: number;
  lotNames: string[];
}

export type JobStatus = 'Pendiente' | 'En Proceso' | 'Completado' | 'Cancelado';

export interface Job {
  id: number;
  jobCode: string; // e.g., '#AG-1234'
  clientId: number;
  userId: string; // The professional/operator assigned
  date: string;
  service: string;
  title: string;
  description?: string;
  hectares: number;
  amountUsd: number;
  status: JobStatus;
  campaign: string;
  fieldName: string;
  lotName: string;
  createdAt?: string; // timestamp
}
