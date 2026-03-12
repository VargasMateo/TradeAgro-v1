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
  businessName: string;
  fantasyName?: string;
  cuit: string;
  ivaConditionId: number;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email: string;
  isActive: boolean;
  registeredAt?: string;
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
