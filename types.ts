
export interface ParkVehicle {
  IDMODELO: number;
  "Nuevo Orden"?: number;
  MODELO: string;
  MODELO2: string;
  MARCA: string;
  DESDE: number;
  HASTA: number;
  Clasificacion: string;
  Parque: number;
  Orden?: number;
  Falta?: string;
}

export interface ProductRow {
  Stmvid: string | number; // ID that links to IDMODELO
  rubro: string;
  subrubro?: string;
  Proveedor: string | number;
  Equivalencia?: string;
  "Numero "?: string;
  Numero?: string;
  Marca?: string;
  "Descripción"?: string;
  [key: string]: any; // Allow other columns from Excel
}

export interface TableStats {
  totalModelos: number;
  modelosCubiertos: number;
  modelosSinCubierta: number;
  porcentajeCobertura: string;
  totalProductos: number;
  coberturaPorCategoria: Record<string, { total: number; cubiertos: number; porcentaje: string }>;
}

export interface ProductDetailItem {
  equivalencia: string;
  numero: string;
  marca: string;
  proveedor: string | number;
  rubro: string;
  subrubro: string;
  descripcion: string;
}

export interface ModelCoverageData {
  contadores: Record<string, number>;
  productosDetalle: Record<string, ProductDetailItem[]>;
  categoria: string;
  orden: number;
  totalProductos: number;
  idModelo: number;
  modeloName: string;
}

export interface ProcessedData {
  datos: Record<string, Record<string, ModelCoverageData>>;
  columnas: string[];
  rubro: string[];
  subrubro: string[];
}

// --- New Types for Policy Analysis ---

export type QualityTier = 'ORIGINAL' | 'PREMIUM' | 'STANDARD';

export interface PolicyAction {
  type: 'ADD' | 'REMOVE' | 'EVAL' | 'DEV' | 'OK';
  text: string;
  team: string;
}

export interface AnalysisResult {
  idModelo: number;
  marca: string;
  modelo: string;
  anioHasta: number;
  segmento: string; // 'Antiguo', 'Moderno', 'Nuevo'
  mixActual: {
    original: number;
    premium: number;
    standard: number;
  };
  estado: 'OK' | 'WARNING' | 'CRITICAL';
  acciones: PolicyAction[];
}