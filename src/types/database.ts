export type UserRole = 'profesional' | 'client' | 'admin';

export interface User {
  id: number;
  displayName: string;
  email: string;
  role: UserRole;
  createdAt: string;
  createdBy: number;
  setupPending?: boolean;
  isTest?: boolean;
}

export interface Client extends User {
  role: 'client';
  businessName: string;
  cuit: string;
  ivaCondition: string;
  phoneNumber?: string;
  hasStations?: boolean;
  clientRole?: 'owner' | 'associated';
  ownerId?: number;
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

export type WorkOrderStatus = 'Pendiente' | 'En Proceso' | 'Completado' | 'Cancelado';

export interface WorkOrder {
  id: number;
  uuid: string;
  clientId: number;
  profesionalId: number;
  date: string; // timestamp
  service: string;
  secondaryService?: string;
  title: string;
  hectares: number;
  amountUsd: number;
  status: WorkOrderStatus;
  campaign: string;
  fieldId?: number;
  fieldName: string;
  lotName: string;
  createdAt: string; // timestamp
  createdBy: number;
  deletedAt?: string; // timestamp
}
  
export interface Service {
  id: number;
  name: string;
  parentId: number | null;
}

export interface WorkOrderObservation {
  id: number;
  workOrderId: number;
  userId: number;
  text: string;
  displayName: string;
  role: UserRole;
  createdAt: string;  // timestamp
}
