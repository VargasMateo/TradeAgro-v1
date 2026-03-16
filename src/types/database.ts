export type UserRole = 'profesional' | 'client' | 'admin';

export interface User {
  id: number;
  displayName: string;
  email: string;
  role: UserRole;
  createdAt: string;
  createdBy: string;
}

export interface Client extends User {
  role: 'client';
  businessName: string;
  cuit: string;
  ivaCondition: string;
  phoneNumber?: string;
  deletedAt?: string;
}

export interface Profesional extends User {
  role: 'profesional';
  phoneNumber?: string;
  specialty?: string;
  deletedAt?: string;
}

export interface Admin extends User {
  role: 'admin';
}

export type AppUser = Client | Profesional | Admin;

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
