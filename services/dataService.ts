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
    .select('rubro');

  if (error) throw new Error(error.message);

  const unique = [...new Set((data || []).map((r: any) => r.rubro as string))]
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
      .eq('rubro', rubro)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all.map(r => ({
    Stmvid: r.stmvid,
    rubro: r.rubro,
    subrubro: r.subrubro || '',
    Proveedor: r.proveedor || '',
    Equivalencia: r.equivalencia || '',
    'Numero ': r.numero || '',
    Marca: r.marca || '',
    'Descripción': r.descripcion || '',
  }));
}

export async function uploadProductos(items: ProductRow[], replaceAll = false): Promise<void> {
  if (replaceAll) {
    const { error: delError } = await supabase
      .from('productos')
      .delete()
      .not('stmvid', 'is', null);
    if (delError) throw new Error(delError.message);
  } else {
    const rubros = [...new Set(items.map(p => p.rubro).filter(Boolean))];
    if (rubros.length > 0) {
      const { error: delError } = await supabase
        .from('productos')
        .delete()
        .in('rubro', rubros);
      if (delError) throw new Error(delError.message);
    }
  }

  const rows = items.map(p => ({
    stmvid: Number(p.Stmvid),
    rubro: p.rubro || '',
    subrubro: p.subrubro || null,
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
  const all: { rubro: string; stmvid: number }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('productos')
      .select('rubro, stmvid')
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...(data as any[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const tempMap: Record<string, Set<number>> = {};
  all.forEach(r => {
    if (!tempMap[r.rubro]) tempMap[r.rubro] = new Set();
    tempMap[r.rubro].add(Number(r.stmvid));
  });

  const result: Record<string, number[]> = {};
  Object.entries(tempMap).forEach(([key, set]) => {
    result[key] = Array.from(set);
  });

  return result;
}
