export interface ClientField {
  name: string;
  location: string;
}

export interface Client {
  id: string | number;
  name: string;
  email: string;
  phone: string;
  initials?: string;
  color?: string;
  lat?: number;
  lng?: number;
  fields?: (string | ClientField)[];
}
