import { Client as DBClient } from './database';

export interface ClientField {
  name: string;
  lat?: number;
  lng?: number;
  lots: string[];
}

export interface Client extends Omit<DBClient, 'ivaConditionId'> {
  // Mapping DB types to frontend needs
  initials?: string;
  color?: string;
  lat?: number;
  lng?: number;
  fields?: ClientField[];
  ivaCondition: 'Responsable Inscripto' | 'Monotributista'; // For backward compatibility in UI
}
