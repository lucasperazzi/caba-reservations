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
}

export interface UserInfo {
  uid: number;
  name: string;
  email: string;
}

export interface Paquete {
  id: number;
  nombre: string; // "MAP-XXXXX"
  descripcion: string; // tipo de paquete
  producto: string | null;
  estado: "active" | "completed" | "cancelled" | "draft" | "expired";
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
  historial: Paquete[];
}
