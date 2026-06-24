export interface ClientField {
  id?: string;
  name: string;
  lat?: number;
  lng?: number;
  lots: string[];
}

export interface Client {
  id: number;
  name: string;
  businessName?: string;
  cuit?: string;
  ivaCondition?: string;
  email: string;
  phone?: string;
  fields?: ClientField[];
  setupPending?: boolean;
  hasStations?: boolean;
  hasSprayMonitor?: boolean;
  notificationEmails?: string;
  isTest?: boolean;
  createdAt?: string;
}
