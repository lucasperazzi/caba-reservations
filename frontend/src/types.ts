export type Sede = "bucarelli" | "centro" | "otro";
export type OccupancyLevel = "green" | "orange" | "red";

export interface Turno {
  id: number;
  nombre: string;
  sede: Sede;
  inicio: string;
  fin: string;
  cuposMax: number;
  cuposLibres: number;
  ocupados: number;
  nivel: OccupancyLevel;
}

export interface MiTurno {
  registrationId: number;
  estado: "open" | "done" | "cancel";
  create_date: string;
  evento: { id: number; nombre: string };
  /** Hora argentina "YYYY-MM-DDTHH:mm:ss" — disponible para generar .ics */
  inicio?: string;
  fin?: string;
}

export interface UserInfo {
  uid: number;
  name: string;
  email: string;
  username?: string;
  puedeReservar?: boolean;
  phone?: string;
  mobile?: string;
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
  countryId?: number;
  state?: string;
  stateId?: number;
  vat?: string;
  idCategory?: string;
  idCategoryId?: number;
  idNumber?: string;
  firstname?: string;
  lastname?: string;
  healthInsurance?: string;
  healthInsuranceNumber?: string;
  healthInsuranceEmergencyPhone?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  birthdate?: string;
  image?: string;
}

export interface Profile {
  partnerId: number;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  mobile: string;
  street: string;
  city: string;
  zip: string;
  countryId: number | null;
  country: string;
  stateId: number | null;
  state: string;
  vat: string;
  idCategoryId: number | null;
  idCategory: string;
  idNumber: string;
  healthInsurance: string;
  healthInsuranceNumber: string;
  healthInsuranceEmergencyPhone: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  birthdate: string;
}

export interface Country {
  id: number;
  name: string;
}

export interface State {
  id: number;
  name: string;
  code: string;
}

export interface Paquete {
  id: number;
  nombre: string; // "MAP-XXXXX"
  descripcion: string; // tipo de paquete
  producto: string | null;
  estado: "active" | "completed" | "cancelled" | "draft" | "expired" | "pending";
  estadoLabel: string;
  creditosTotales: number;
  creditosDisponibles: number;
  fechaInicio: string;
  fechaFin: string;
  duracionDias: number;
  fechaCreacion: string;
  reservas: number;
}

export interface PaquetesData {
  activos: Paquete[];
  pendientes: Paquete[];
  historial: Paquete[];
}
