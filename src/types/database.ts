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
  id: string;
  displayName: string;
  businessName: string;
  cuit: string;
  email: string;
  phoneNumber?: string;
  createdBy: string;
  createdAt: string; // ISO string or timestamp
  deleted?: boolean;
  deletedAt?: string;
}

export interface Field {
  id: string;
  clientId: string;
  name: string;
  lat?: number;
  long?: number;
  lotNames: string[];
}

export type JobStatus = 'Pendiente' | 'En Proceso' | 'Completado' | 'Cancelado';

export interface Job {
  id: number;
  jobCode: string; // e.g., '#AG-1234'
  clientId: number;
  userId: number; // The professional/operator assigned
  date: string;
  serviceId: number;
  title: string;
  description?: string;
  hectares: number;
  amountUsd: number;
  status: JobStatus;
  campaign: string;
  fieldName: string;
  lotName: string;
  createdAt?: string;
}
