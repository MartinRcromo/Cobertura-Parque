import React from 'react';

interface FiltersProps {
  filtroCategoria: string;
  setFiltroCategoria: (val: string) => void;
  filtroMarca: string;
  setFiltroMarca: (val: string) => void;
  excluirProveedor3: boolean;
  setExcluirProveedor3: (val: boolean) => void;
  marcasDisponibles: string[];
  nivel1: string[];
  nivel2: string[];
  mostrarNivel1: boolean;
  setMostrarNivel1: (val: boolean) => void;
  mostrarNivel2: boolean;
  setMostrarNivel2: (val: boolean) => void;
}

export const Filters: React.FC<FiltersProps> = ({
  filtroCategoria,
  setFiltroCategoria,
  filtroMarca,
  setFiltroMarca,
  excluirProveedor3,
  setExcluirProveedor3,
  marcasDisponibles,
  nivel1,
  nivel2,
  mostrarNivel1,
  setMostrarNivel1,
  mostrarNivel2,
  setMostrarNivel2
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          Filtros y Configuración
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Marca Filter */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Marca</label>
          <select
            value={filtroMarca}
            onChange={(e) => setFiltroMarca(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-shadow outline-none"
          >
            <option value="TODOS">Todas las marcas</option>
            {marcasDisponibles.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</label>
          <div className="flex flex-wrap gap-2">
            {['TODOS', 'AA', 'A', 'B', 'C'].map(cat => (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filtroCategoria === cat
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Level Toggles */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Niveles Visibles</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={mostrarNivel1}
                  onChange={(e) => setMostrarNivel1(e.target.checked)}
                />
                <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-brand-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </div>
              <span className="text-sm text-slate-700 group-hover:text-slate-900">Rubro</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={mostrarNivel2}
                  onChange={(e) => setMostrarNivel2(e.target.checked)}
                />
                <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-brand-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </div>
              <span className="text-sm text-slate-700 group-hover:text-slate-900">Subrubro</span>
            </label>
          </div>
          {nivel1.length > 0 && <div className="text-xs text-slate-400 mt-1 truncate">Ej: {nivel1.slice(0,3).join(', ')}...</div>}
        </div>

        {/* Special Filter */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Opciones Avanzadas</label>
          <label className="flex items-center gap-3 p-2.5 rounded-lg border border-orange-200 bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors">
            <input
              type="checkbox"
              checked={excluirProveedor3}
              onChange={(e) => setExcluirProveedor3(e.target.checked)}
              className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
            />
            <span className="text-sm font-medium text-orange-800">Excluir Proveedor 3 (A Eliminar)</span>
          </label>
        </div>
      </div>
    </div>
  );
};