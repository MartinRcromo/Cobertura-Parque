
import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { ParkVehicle, ProductRow, AnalysisResult, QualityTier, PolicyAction } from '../types';

interface PolicyAnalyzerProps {
  parque: ParkVehicle[];
  products: ProductRow[];
  productsByModelId: Record<number, ProductRow[]>;
}

export const PolicyAnalyzer: React.FC<PolicyAnalyzerProps> = ({ parque, productsByModelId }) => {
  const [filtroSegmento, setFiltroSegmento] = useState<string | null>(null);

  // --- 1. Helper: Determine Quality ---
  const classifyQuality = (proveedor: string | number): QualityTier => {
    const pStr = String(proveedor).toUpperCase();
    if (pStr.includes('ORIGINAL') || pStr.includes('OEM')) return 'ORIGINAL';
    if (['1', '2', 'BOSCH', 'SKF', 'VALEO'].includes(pStr)) return 'PREMIUM';
    if (['3', '4', 'GENERIC'].includes(pStr)) return 'STANDARD';
    return 'STANDARD';
  };

  // --- 2. Helper: Create Action Object ---
  const createAction = (type: PolicyAction['type'], text: string): PolicyAction => {
    let team = 'General';
    if (type === 'ADD') team = 'Compras / Comex';
    else if (type === 'REMOVE') team = 'Ventas / Productos';
    else if (type === 'EVAL') team = 'Ventas / Comercial';
    else if (type === 'DEV') team = 'Desarrollo / Productos';
    else if (type === 'OK') team = '-';
    
    return { type, text, team };
  };

  // --- 3. The "AI" Analysis Engine ---
  const analysisResults = useMemo<AnalysisResult[]>(() => {
    const targetModels = parque.filter(m => m.Clasificacion === 'AA');
    
    return targetModels.map(modelo => {
      const year = modelo.HASTA;
      const products = productsByModelId[modelo.IDMODELO] || [];
      
      let original = 0;
      let premium = 0;
      let standard = 0;

      products.forEach(p => {
        const quality = classifyQuality(p.Proveedor);
        if (quality === 'ORIGINAL') original++;
        else if (quality === 'PREMIUM') premium++;
        else standard++;
      });

      const acciones: PolicyAction[] = [];
      let estado: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
      let segmento = '';

      if (year <= 2000) {
        segmento = 'Antiguo';
        if (standard === 0 && premium === 0 && original === 0) {
          acciones.push(createAction('DEV', 'Desarrollar opción Económica'));
          estado = 'CRITICAL';
        } else if (standard === 0 && premium > 0) {
          acciones.push(createAction('EVAL', 'Evaluar alt. Estándar (Costo)'));
          estado = 'WARNING';
        } else if (premium > 0 && standard > 0) {
          acciones.push(createAction('REMOVE', 'Descontinuar Premium (Baja Rot.)'));
          estado = 'WARNING';
        }

      } else if (year <= 2015) {
        segmento = 'Moderno';
        const hasPremium = premium > 0 || original > 0;
        const hasStandard = standard > 0;

        if (!hasPremium && !hasStandard) {
          acciones.push(createAction('ADD', 'Sin Cobertura: Buscar Prov.'));
          estado = 'CRITICAL';
        } else if (!hasPremium) {
          acciones.push(createAction('ADD', 'Agregar opción Premium'));
          estado = 'WARNING';
        } else if (!hasStandard) {
          acciones.push(createAction('ADD', 'Agregar opción Estándar'));
          estado = 'WARNING'; 
        }

      } else {
        segmento = 'Nuevo';
        if (premium === 0 && original === 0) {
          acciones.push(createAction('ADD', 'Falta línea Premium/Original'));
          estado = 'CRITICAL';
        } else if (standard > 0) {
          acciones.push(createAction('REMOVE', 'Eliminar Estándar (Riesgo Marca)'));
          estado = 'WARNING';
        }
      }

      if (acciones.length === 0) acciones.push(createAction('OK', 'Mix Correcto'));

      return {
        idModelo: modelo.IDMODELO,
        marca: modelo.MARCA,
        modelo: modelo.MODELO,
        anioHasta: year,
        segmento,
        mixActual: { original, premium, standard },
        estado,
        acciones
      };
    }).sort((a, b) => {
        const score = (s: string) => s === 'CRITICAL' ? 3 : s === 'WARNING' ? 2 : 1;
        return score(b.estado) - score(a.estado);
    });
  }, [parque, productsByModelId]);

  const filteredResults = useMemo(() => {
    if (!filtroSegmento) return analysisResults;
    return analysisResults.filter(r => r.segmento === filtroSegmento);
  }, [analysisResults, filtroSegmento]);

  const handleExport = () => {
    const dataToExport = filteredResults.map(r => ({
      Marca: r.marca,
      Modelo: r.modelo,
      'Año Fin': r.anioHasta,
      Segmento: r.segmento,
      Estado: r.estado,
      'Cant. Original': r.mixActual.original,
      'Cant. Premium': r.mixActual.premium,
      'Cant. Standard': r.mixActual.standard,
      'Acciones Sugeridas': r.acciones.map(a => `[${a.type}] ${a.text} (${a.team})`).join(' | ')
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analisis_Politica");
    XLSX.writeFile(wb, `Analisis_Politica_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- Styles Helper ---
  const getCardStyle = (seg: string, colorBase: string) => {
    const isSelected = filtroSegmento === seg;
    const isOtherSelected = filtroSegmento && !isSelected;
    let base = `bg-${colorBase}-50 border border-${colorBase}-200 rounded-xl p-5 relative overflow-hidden transition-all cursor-pointer select-none`;
    if (isSelected) base += ` ring-4 ring-${colorBase}-200 shadow-lg scale-[1.02]`;
    else if (isOtherSelected) base += ` opacity-50 hover:opacity-80 grayscale-[0.5]`;
    else base += ` hover:shadow-md hover:scale-[1.01]`;
    return base;
  };

  const renderActionTag = (action: PolicyAction) => {
    const styles: Record<string, string> = {
        ADD: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        REMOVE: 'bg-rose-100 text-rose-800 border-rose-200',
        EVAL: 'bg-amber-100 text-amber-800 border-amber-200',
        DEV: 'bg-violet-100 text-violet-800 border-violet-200',
        OK: 'bg-slate-100 text-slate-600 border-slate-200'
    };
    const icons: Record<string, string> = {
        ADD: '➕', REMOVE: '❌', EVAL: '🔍', DEV: '⚙️', OK: '✅'
    };
    
    return (
        <div className="flex flex-col gap-1 mb-2 last:mb-0">
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold border ${styles[action.type] || styles.OK}`}>
                <span className="mr-1.5">{icons[action.type]}</span>
                {action.text}
            </span>
            {action.type !== 'OK' && (
                <span className="text-[10px] text-slate-400 font-medium ml-1 flex items-center gap-1">
                    👤 {action.team}
                </span>
            )}
        </div>
    );
  };

  const toggleSegmento = (seg: string) => {
    setFiltroSegmento(prev => prev === seg ? null : seg);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. HEADER & EXPORT */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Motor de Análisis de Política (AI)</h2>
          <p className="text-slate-500">Evaluando cumplimiento de reglas de negocio para Categoría AA</p>
        </div>
        <button
          onClick={handleExport}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 shadow-sm transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Exportar Resultados
        </button>
      </div>

      {/* 2. POLICY VISUALIZATION RULES (Interactive) */}
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* VINTAGE SEGMENT */}
        <div onClick={() => toggleSegmento('Antiguo')} className={getCardStyle('Antiguo', 'amber')}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-100 rounded-full opacity-50"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-200 rounded-lg text-amber-800">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-amber-900 text-lg">Antiguo</h3>
                <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Hasta 2000</span>
              </div>
            </div>
            <ul className="text-sm text-amber-800 space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-xs">🎯</span> Ideal: <strong>Solo Calidad Standard</strong>
              </li>
              <li className="flex items-start gap-2 opacity-80">
                <span className="mt-1 text-xs">ℹ️</span> Premium aceptable solo si no hay opción económica.
              </li>
            </ul>
            {filtroSegmento === 'Antiguo' && (
                <div className="mt-3 text-xs font-bold text-amber-600 bg-white/50 px-2 py-1 rounded inline-block">Filtro Activo</div>
            )}
          </div>
        </div>

        {/* MODERN SEGMENT */}
        <div onClick={() => toggleSegmento('Moderno')} className={getCardStyle('Moderno', 'sky')}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-sky-100 rounded-full opacity-50"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-sky-200 rounded-lg text-sky-800">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 4h1m-1 4h1m4-4h1m-1 4h1" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-sky-900 text-lg">Moderno</h3>
                <span className="text-xs font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">2001 - 2015</span>
              </div>
            </div>
            <ul className="text-sm text-sky-800 space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-xs">🎯</span> Ideal: <strong>Mix Completo</strong>
              </li>
              <li className="flex items-start gap-2 opacity-80">
                <span className="mt-1 text-xs">ℹ️</span> Debe tener opción Premium Y opción Standard.
              </li>
            </ul>
            {filtroSegmento === 'Moderno' && (
                <div className="mt-3 text-xs font-bold text-sky-600 bg-white/50 px-2 py-1 rounded inline-block">Filtro Activo</div>
            )}
          </div>
        </div>

        {/* NEW SEGMENT */}
        <div onClick={() => toggleSegmento('Nuevo')} className={getCardStyle('Nuevo', 'purple')}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-100 rounded-full opacity-50"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-200 rounded-lg text-purple-800">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-purple-900 text-lg">Nuevo</h3>
                <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">2016 - 2025</span>
              </div>
            </div>
            <ul className="text-sm text-purple-800 space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-xs">🎯</span> Ideal: <strong>Premium / Original</strong>
              </li>
              <li className="flex items-start gap-2 opacity-80">
                <span className="mt-1 text-xs">ℹ️</span> Evitar calidad Standard para proteger imagen.
              </li>
            </ul>
            {filtroSegmento === 'Nuevo' && (
                <div className="mt-3 text-xs font-bold text-purple-600 bg-white/50 px-2 py-1 rounded inline-block">Filtro Activo</div>
            )}
          </div>
        </div>
      </div>

      {/* 3. QUALITY LEGEND */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Leyenda de Calidad (Detectada por Proveedor)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-600"></div>
            <span className="text-sm font-medium text-slate-700">Original</span>
            <span className="text-xs text-slate-500">(Nombres con "ORIGINAL", "OEM")</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <span className="text-sm font-medium text-slate-700">Premium</span>
            <span className="text-xs text-slate-500">(Prov: 1, 2, BOSCH, SKF, VALEO)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-sm font-medium text-slate-700">Standard</span>
            <span className="text-xs text-slate-500">(Prov: 3, 4, GENERIC, Otros)</span>
          </div>
        </div>
      </div>

      {/* 4. RESULTS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {filtroSegmento && (
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 text-sm text-slate-600 flex justify-between items-center">
                <span>Mostrando modelos del segmento: <strong>{filtroSegmento}</strong> ({filteredResults.length})</span>
                <button onClick={() => setFiltroSegmento(null)} className="text-xs text-blue-600 hover:underline">Mostrar Todos</button>
            </div>
        )}
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
            <tr>
              <th className="px-6 py-3">Modelo</th>
              <th className="px-6 py-3 text-center">Año Fin</th>
              <th className="px-6 py-3 text-center">Segmento</th>
              <th className="px-6 py-3 text-center">Mix Actual (Orig/Prem/Std)</th>
              <th className="px-6 py-3 text-center">Estado</th>
              <th className="px-6 py-3">Acciones Sugeridas & Equipo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredResults.map((row) => (
              <tr key={row.idModelo} className="hover:bg-slate-50">
                <td className="px-6 py-3">
                  <div className="font-bold text-slate-700">{row.modelo}</div>
                  <div className="text-xs text-slate-500">{row.marca}</div>
                </td>
                <td className="px-6 py-3 text-center text-slate-600">{row.anioHasta}</td>
                <td className="px-6 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    row.segmento === 'Antiguo' ? 'bg-amber-100 text-amber-800' :
                    row.segmento === 'Moderno' ? 'bg-sky-100 text-sky-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {row.segmento}
                  </span>
                </td>
                <td className="px-6 py-3 text-center">
                  <div className="flex items-center justify-center gap-1 font-mono text-xs">
                    <span className={`px-1.5 py-0.5 rounded ${row.mixActual.original > 0 ? 'bg-purple-100 text-purple-700 font-bold' : 'bg-slate-100 text-slate-400'}`}>{row.mixActual.original}</span>
                    <span className="text-slate-300">/</span>
                    <span className={`px-1.5 py-0.5 rounded ${row.mixActual.premium > 0 ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-slate-100 text-slate-400'}`}>{row.mixActual.premium}</span>
                    <span className="text-slate-300">/</span>
                    <span className={`px-1.5 py-0.5 rounded ${row.mixActual.standard > 0 ? 'bg-amber-100 text-amber-700 font-bold' : 'bg-slate-100 text-slate-400'}`}>{row.mixActual.standard}</span>
                  </div>
                </td>
                <td className="px-6 py-3 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    row.estado === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                    row.estado === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {row.estado === 'CRITICAL' ? '⚠️ CRÍTICO' : row.estado === 'WARNING' ? '⚡ ATENCIÓN' : '✅ OK'}
                  </span>
                </td>
                <td className="px-6 py-3">
                  {row.acciones.map((acc, i) => (
                    <React.Fragment key={i}>
                        {renderActionTag(acc)}
                    </React.Fragment>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
