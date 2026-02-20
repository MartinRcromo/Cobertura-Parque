import React from 'react';
import { TableStats } from '../types';

interface StatsCardsProps {
  stats: TableStats | null;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {/* Summary Cards */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="text-sm font-medium text-slate-500 mb-1">Total Modelos</div>
        <div className="text-2xl font-bold text-slate-800">{stats.totalModelos}</div>
        <div className="text-xs text-slate-400 mt-1">Parque Automotor</div>
      </div>

      <div className="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm">
        <div className="text-sm font-medium text-green-600 mb-1">Cubiertos</div>
        <div className="text-2xl font-bold text-green-700">{stats.modelosCubiertos}</div>
        <div className="text-xs font-semibold text-green-600 mt-1">{stats.porcentajeCobertura}% Cobertura</div>
      </div>

      <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm">
        <div className="text-sm font-medium text-red-600 mb-1">Sin Cobertura</div>
        <div className="text-2xl font-bold text-red-700">{stats.modelosSinCubierta}</div>
        <div className="text-xs font-semibold text-red-600 mt-1">{(100 - Number(stats.porcentajeCobertura)).toFixed(1)}% Faltante</div>
      </div>

      {/* Category Breakdown */}
      {['AA', 'A', 'B'].map((cat) => {
        const data = stats.coberturaPorCategoria[cat];
        const colorClass = cat === 'AA' ? 'text-purple-600 bg-purple-50 border-purple-100' :
                           cat === 'A' ? 'text-blue-600 bg-blue-50 border-blue-100' :
                           'text-cyan-600 bg-cyan-50 border-cyan-100';
        
        return (
          <div key={cat} className={`p-4 rounded-xl border shadow-sm ${colorClass}`}>
            <div className="text-sm font-medium opacity-80 mb-1">Cat. {cat}</div>
            <div className="text-2xl font-bold">{data?.cubiertos || 0}</div>
            <div className="text-xs font-medium opacity-70 mt-1">{data?.porcentaje || 0}% de {data?.total}</div>
          </div>
        );
      })}
    </div>
  );
};