import { supabase } from './supabase';
import { ParkVehicle, ProductRow } from '../types';

const PAGE_SIZE = 1000;

// ─── PARQUE AUTOMOTOR ──────────────────────────────────────────────────────

export async function fetchParque(): Promise<ParkVehicle[]> {
  const all: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('parque_automotor')
      .select('*')
      .order('orden', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all.map(r => ({
    IDMODELO: r.id_modelo,
    MODELO: r.modelo,
    MODELO2: r.modelo2 || '',
    MARCA: r.marca,
    DESDE: r.desde,
    HASTA: r.hasta,
    Clasificacion: r.clasificacion,
    Parque: r.parque,
    Orden: r.orden,
  }));
}

export async function upsertParque(items: ParkVehicle[]): Promise<void> {
  const rows = items.map(v => ({
    id_modelo: Number(v.IDMODELO),
    modelo: v.MODELO || '',
    modelo2: v.MODELO2 || null,
    marca: v.MARCA || '',
    desde: v.DESDE || null,
    hasta: v.HASTA || null,
    clasificacion: v.Clasificacion || null,
    parque: v.Parque || null,
    orden: (v as any)['Nuevo Orden'] || v.Orden || null,
  }));

  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase
      .from('parque_automotor')
      .upsert(chunk, { onConflict: 'id_modelo' });
    if (error) throw new Error(error.message);
  }
}

// ─── PRODUCTOS ─────────────────────────────────────────────────────────────

export async function fetchRubros(): Promise<string[]> {
  const { data, error } = await supabase
    .from('productos')
    .select('nivel1');

  if (error) throw new Error(error.message);

  const unique = [...new Set((data || []).map((r: any) => r.nivel1 as string))]
    .filter(Boolean)
    .sort();
  return unique;
}

export async function fetchProductosByRubro(rubro: string): Promise<ProductRow[]> {
  const all: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('nivel1', rubro)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all.map(r => ({
    Stmvid: r.stmvid,
    'Nivel 1': r.nivel1,
    'Nivel 2': r.nivel2 || '',
    Proveedor: r.proveedor || '',
    Equivalencia: r.equivalencia || '',
    'Numero ': r.numero || '',
    Marca: r.marca || '',
    'Descripción': r.descripcion || '',
  }));
}

export async function uploadProductos(items: ProductRow[]): Promise<void> {
  // Detect all unique rubros in this upload to do a clean replace
  const rubros = [...new Set(items.map(p => p['Nivel 1'] || (p as any)['nivel1']).filter(Boolean))];

  if (rubros.length > 0) {
    const { error: delError } = await supabase
      .from('productos')
      .delete()
      .in('nivel1', rubros);
    if (delError) throw new Error(delError.message);
  }

  const rows = items.map(p => ({
    stmvid: Number(p.Stmvid),
    nivel1: p['Nivel 1'] || (p as any)['nivel1'] || '',
    nivel2: p['Nivel 2'] || (p as any)['nivel2'] || null,
    proveedor: String(p.Proveedor || ''),
    equivalencia: p.Equivalencia || null,
    numero: (p['Numero '] || (p as any).Numero) || null,
    marca: p.Marca || null,
    descripcion: p['Descripción'] || null,
  }));

  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase.from('productos').insert(chunk);
    if (error) throw new Error(error.message);
  }
}

// ─── DASHBOARD GLOBAL ──────────────────────────────────────────────────────

export async function fetchAllStmvidsByRubro(): Promise<Record<string, number[]>> {
  const all: { nivel1: string; stmvid: number }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('productos')
      .select('nivel1, stmvid')
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...(data as any[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // Group by nivel1, deduplicate stmvids with a Set
  const tempMap: Record<string, Set<number>> = {};
  all.forEach(r => {
    if (!tempMap[r.nivel1]) tempMap[r.nivel1] = new Set();
    tempMap[r.nivel1].add(Number(r.stmvid));
  });

  const result: Record<string, number[]> = {};
  Object.entries(tempMap).forEach(([key, set]) => {
    result[key] = Array.from(set);
  });

  return result;
}
