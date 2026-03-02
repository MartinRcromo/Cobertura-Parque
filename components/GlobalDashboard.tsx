import React, { useState, useEffect } from 'react';
import { ParkVehicle } from '../types';
import { fetchAllStmvidsByRubro } from '../services/dataService';

interface RubroStats {
  rubro: string;
  totalModelos: number;
  modelosCubiertos: number;
  modelosSinCobertura: number;
  porcentaje: number;
  porClasificacion: Record<string, {
    total: number;
    cubiertos: number;
    porcentaje: number;
  }>;
}

interface Props {
  parqueData: ParkVehicle[];
  onSelectRubro: (rubro: string) => void;
  rubroActivo: string;
}

export function GlobalDashboard({ parqueData, onSelectRubro, rubroActivo }: Props) {
  const [stats, setStats] = useState<RubroStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'rubro' | 'porcentaje' | 'cubiertos'>('rubro');

  useEffect(() => {
    if (parqueData.length === 0) return;
    loadStats();
  }, [parqueData]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const coverageByRubro = await fetchAllStmvidsByRubro();

      if (Object.keys(coverageByRubro).length === 0) {
        setStats([]);
        return;
      }

      const clasificaciones = ['AA', 'A', 'B', 'C'];
      const totalModelos = parqueData.length;

      const computed: RubroStats[] = Object.entries(coverageByRubro).map(([rubro, stmvids]) => {
        const stmvidSet = new Set(stmvids);

        const cubiertos = parqueData.filter(p => stmvidSet.has(Number(p.IDMODELO))).length;
        const sinCobertura = totalModelos - cubiertos;

        const porClasificacion: Record<string, { total: number; cubiertos: number; porcentaje: number }> = {};
        clasificaciones.forEach(cat => {
          const parqueCat = parqueData.filter(p => p.Clasificacion === cat);
          const cubCat = parqueCat.filter(p => stmvidSet.has(Number(p.IDMODELO))).length;
          porClasificacion[cat] = {
            total: parqueCat.length,
            cubiertos: cubCat,
            porcentaje: parqueCat.length > 0 ? Math.round(cubCat / parqueCat.length * 100) : 0,
          };
        });

        return {
          rubro,
          totalModelos,
          modelosCubiertos: cubiertos,
          modelosSinCobertura: sinCobertura,
          porcentaje: totalModelos > 0 ? Math.round(cubiertos / totalModelos * 100) : 0,
          porClasificacion,
        };
      });

      setStats(computed);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  const sorted = [...stats].sort((a, b) => {
    if (sortBy === 'rubro') return a.rubro.localeCompare(b.rubro);
    if (sortBy === 'porcentaje') return b.porcentaje - a.porcentaje;
    return b.modelosCubiertos - a.modelosCubiertos;
  });

  const totalGeneral = stats.reduce(
    (acc, s) => ({ cubiertos: Math.max(acc.cubiertos, s.modelosCubiertos), total: s.totalModelos }),
    { cubiertos: 0, total: 0 }
  );

  const getCoverageColor = (pct: number) => {
    if (pct >= 70) return 'text-green-600 bg-green-50';
    if (pct >= 40) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getBarColor = (pct: number) => {
    if (pct >= 70) return 'bg-green-500';
    if (pct >= 40) return 'bg-amber-400';
    return 'bg-red-400';
  };

  const getCatBadge = (cat: string) => {
    const base = 'px-1.5 py-0.5 rounded text-xs font-bold';
    if (cat === 'AA') return `${base} bg-purple-100 text-purple-700`;
    if (cat === 'A') return `${base} bg-blue-100 text-blue-700`;
    if (cat === 'B') return `${base} bg-cyan-100 text-cyan-700`;
    return `${base} bg-green-100 text-green-700`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-500 border-t-transparent" />
        <p className="text-slate-500 font-medium">Calculando cobertura global...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-semibold">Error al cargar el dashboard</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button onClick={loadStats} className="mt-3 text-sm text-red-600 underline hover:no-underline">
          Reintentar
        </button>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-300">
        <div className="bg-brand-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-700">Sin datos de productos</h3>
        <p className="text-slate-500 mt-2 max-w-sm mx-auto">
          Cargá al menos un archivo Excel de productos para ver el dashboard de cobertura global.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Categorías cargadas</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{stats.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total modelos parque</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{totalGeneral.total.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm bg-green-50/40">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Mejor cobertura</p>
          <p className="text-2xl font-bold text-green-700 mt-1">
            {stats.length > 0 ? `${Math.max(...stats.map(s => s.porcentaje))}%` : '-'}
          </p>
          <p className="text-xs text-green-600 mt-0.5 truncate">
            {stats.length > 0 ? [...stats].sort((a, b) => b.porcentaje - a.porcentaje)[0].rubro : '-'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm bg-red-50/40">
          <p className="text-xs text-red-500 font-medium uppercase tracking-wide">Menor cobertura</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {stats.length > 0 ? `${Math.min(...stats.map(s => s.porcentaje))}%` : '-'}
          </p>
          <p className="text-xs text-red-500 mt-0.5 truncate">
            {stats.length > 0 ? [...stats].sort((a, b) => a.porcentaje - b.porcentaje)[0].rubro : '-'}
          </p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800">Cobertura por Categoría</h2>
            <p className="text-xs text-slate-500 mt-0.5">Click en una categoría para ver el análisis detallado</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="rubro">Nombre</option>
              <option value="porcentaje">% Cobertura</option>
              <option value="cubiertos">Modelos cubiertos</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-3 text-left border-b min-w-[200px]">Categoría (Rubro)</th>
                <th className="px-4 py-3 text-center border-b min-w-[120px]">Cubiertos</th>
                <th className="px-4 py-3 text-center border-b min-w-[120px]">Sin cobertura</th>
                <th className="px-4 py-3 text-center border-b min-w-[180px]">% Total</th>
                {['AA', 'A', 'B', 'C'].map(cat => (
                  <th key={cat} className="px-3 py-3 text-center border-b min-w-[90px]">
                    <span className={getCatBadge(cat)}>{cat}</span>
                  </th>
                ))}
                <th className="px-4 py-3 text-center border-b">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map(s => (
                <tr
                  key={s.rubro}
                  className={`hover:bg-slate-50 transition-colors ${rubroActivo === s.rubro ? 'bg-brand-50/60 border-l-4 border-l-brand-500' : ''}`}
                >
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-800">{s.rubro}</span>
                    {rubroActivo === s.rubro && (
                      <span className="ml-2 text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                        activa
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="font-semibold text-green-700">{s.modelosCubiertos.toLocaleString()}</span>
                    <span className="text-slate-400 text-xs"> / {s.totalModelos.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`font-semibold ${s.modelosSinCobertura > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {s.modelosSinCobertura.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getBarColor(s.porcentaje)}`}
                          style={{ width: `${s.porcentaje}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg min-w-[44px] text-center ${getCoverageColor(s.porcentaje)}`}>
                        {s.porcentaje}%
                      </span>
                    </div>
                  </td>
                  {['AA', 'A', 'B', 'C'].map(cat => {
                    const d = s.porClasificacion[cat];
                    return (
                      <td key={cat} className="px-3 py-4 text-center">
                        {d && d.total > 0 ? (
                          <span className={`text-xs font-bold ${getCoverageColor(d.porcentaje)} px-2 py-1 rounded-lg`}>
                            {d.porcentaje}%
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => onSelectRubro(s.rubro)}
                      className="text-xs bg-brand-600 hover:bg-brand-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Analizar →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-6 text-xs text-slate-500">
          <span className="font-medium">Cobertura:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> ≥70% Buena
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> 40-69% Media
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> &lt;40% Baja
          </span>
        </div>
      </div>
    </div>
  );
}
