export interface ClientField {
  id?: string;
  name: string;
  lat?: number;
  lng?: number;
  lots: string[];
}

export interface Client {
  id: string;
  name: string;
  businessName?: string;
  cuit?: string;
  ivaCondition?: string;
  email: string;
  phone?: string;
  fields?: ClientField[];
  createdAt?: string;
}
