
import React from 'react';
import { ProductDetailItem } from '../types';
import { ImageGenerator } from './ImageGenerator';
import { VideoGenerator } from './VideoGenerator';

interface ProductModalProps {
  data: {
    marca: string;
    modelo: string;
    columna: string;
    productos: ProductDetailItem[];
  };
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ data, onClose }) => {
  // Extract category (Nivel 2) from the first product to use as context for the Detail Image
  const partName = data.productos.length > 0 ? data.productos[0].nivel2 : undefined;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-brand-600 p-6 flex justify-between items-start shrink-0">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">Detalle de Productos</h3>
            <div className="flex items-center gap-2 text-brand-100 text-sm">
              <span className="font-semibold bg-brand-700 px-2 py-0.5 rounded">{data.marca}</span>
              <span>›</span>
              <span className="font-medium">{data.modelo}</span>
              <span>›</span>
              <span className="opacity-80">{data.columna.replace('|', ' › ')}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-0 flex flex-col md:flex-row">
          
          {/* Left Panel: AI Visuals */}
          <div className="w-full md:w-1/3 bg-slate-50 p-6 border-r border-slate-200 overflow-y-auto custom-scrollbar">
             <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Visualización AI
             </h4>
             
             <ImageGenerator vehicleName={`${data.marca} ${data.modelo}`} partName={partName} />
             
             {/* Veo Video Generator */}
             {partName && (
               <VideoGenerator vehicleName={`${data.marca} ${data.modelo}`} partName={partName} />
             )}

             <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 border border-blue-100">
               <p className="font-semibold mb-1">🤖 Generado por Gemini & Veo</p>
               <p>Estas imágenes y videos son representaciones artísticas generadas en tiempo real.</p>
             </div>
          </div>

          {/* Right Panel: Table */}
          <div className="w-full md:w-2/3 overflow-y-auto bg-white custom-scrollbar">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 sticky top-0 shadow-sm z-10">
                <tr>
                    <th className="px-6 py-3 font-semibold border-b">#</th>
                    <th className="px-6 py-3 font-semibold border-b">Código</th>
                    <th className="px-6 py-3 font-semibold border-b">Categoría (N2)</th>
                    <th className="px-6 py-3 font-semibold border-b text-center">Prov.</th>
                    <th className="px-6 py-3 font-semibold border-b">Desc.</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {data.productos.map((p, i) => {
                    const esProv3 = Number(p.proveedor) === 3;
                    return (
                    <tr key={i} className={`hover:bg-slate-50 transition-colors ${esProv3 ? 'bg-orange-50/50' : ''}`}>
                        <td className="px-6 py-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                        <td className="px-6 py-3">
                        <div className="font-mono font-bold text-brand-600">{p.equivalencia}</div>
                        <div className="text-xs text-slate-500">{p.numero}</div>
                        </td>
                        <td className="px-6 py-3 text-slate-600 font-medium">{p.nivel2}</td>
                        <td className="px-6 py-3 text-center">
                        {esProv3 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                            {p.proveedor} ⚠️
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                            {p.proveedor}
                            </span>
                        )}
                        </td>
                        <td className="px-6 py-3 text-slate-600 max-w-xs truncate" title={p.descripcion}>
                        {p.descripcion}
                        </td>
                    </tr>
                    );
                })}
                </tbody>
            </table>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 text-right shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
