export interface BildeInnstilling {
  x: number;
  y: number;
  scale: number;
}

export interface Sted {
  id: string;
  mappe: string;
  tittel: string;
  land: string | null;
  by: string | null;
  sted: string | null;
  dato: string | null;
  beskrivelse: string | null;
  morsom_fakta: string | null;
  breddegrad: number | null;
  lengdegrad: number | null;
  rekkefolge: number | null;
  map_zoom?: number | null;
  forsidebilde: string | null;
  bilder: string[];
  bildeInnstillinger?: Record<string, BildeInnstilling>;
}
