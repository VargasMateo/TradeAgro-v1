export interface ClientField {
  name: string;
  lat?: number;
  lng?: number;
  lots: string[];
}

export interface Client {
  id: string | number;
  name: string; // Nombre Completo
  businessName?: string; // Razón Social
  cuit: string;
  ivaCondition: 'Responsable Inscripto' | 'Monotributista';
  email: string;
  phone: string;
  initials?: string;
  color?: string;
  lat?: number;
  lng?: number;
  fields?: ClientField[];
}
