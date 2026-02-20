
import React from 'react';
import * as XLSX from 'xlsx';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {

  const downloadTemplate = (type: 'products' | 'park') => {
    const wb = XLSX.utils.book_new();
    let data: any[] = [];
    let filename = '';

    if (type === 'products') {
      filename = 'Plantilla_Productos.xlsx';
      data = [
        {
          "Stmvid": "1234 (ID Modelo)",
          "Nivel 1": "AA",
          "Nivel 2": "Motor",
          "Proveedor": "1 (Premium)",
          "Equivalencia": "COD-123",
          "Numero": "PART-001",
          "Marca": "MarcaProducto",
          "Descripción": "Descripción del item"
        },
        {
          "Stmvid": "1234",
          "Nivel 1": "AA",
          "Nivel 2": "Frenos",
          "Proveedor": "3 (Económico)",
          "Equivalencia": "COD-456",
          "Numero": "PART-002",
          "Marca": "Generico",
          "Descripción": "Pastilla de freno"
        }
      ];
    } else {
      filename = 'Plantilla_Parque.xlsx';
      data = [
        {
          "IDMODELO": 99,
          "MODELO": "GOL G4 2006 - 2014",
          "MARCA": "VOLKSWAGEN",
          "DESDE": 2006,
          "HASTA": 2014,
          "Clasificacion": "AA",
          "Parque": 325000,
          "Orden": 1
        }
      ];
    }

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-slate-800 p-6 flex justify-between items-center shrink-0">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">📚</span> Guía de Uso & Plantillas
          </h3>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Left: Steps */}
            <div>
              <h4 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">🚀 Paso a Paso</h4>
              <ol className="space-y-4 text-slate-600 relative border-l-2 border-slate-200 ml-3 pl-6">
                <li className="relative">
                  <span className="absolute -left-[33px] top-0 w-8 h-8 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center font-bold border-2 border-white ring-2 ring-brand-50">1</span>
                  <strong>Prepara tus Archivos:</strong> Descarga las plantillas de la derecha para asegurar que tus Excel tengan el formato correcto.
                </li>
                <li className="relative">
                  <span className="absolute -left-[33px] top-0 w-8 h-8 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center font-bold border-2 border-white ring-2 ring-brand-50">2</span>
                  <strong>Carga de Productos:</strong> Sube tu Excel de inventario. El sistema validará las columnas "Nivel 1" y "Nivel 2".
                </li>
                <li className="relative">
                  <span className="absolute -left-[33px] top-0 w-8 h-8 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center font-bold border-2 border-white ring-2 ring-brand-50">3</span>
                  <strong>Análisis Automático:</strong> El sistema cruza tus productos con el Parque Automotor embebido (o uno nuevo que subas).
                </li>
                <li className="relative">
                  <span className="absolute -left-[33px] top-0 w-8 h-8 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center font-bold border-2 border-white ring-2 ring-brand-50">4</span>
                  <strong>Revisa la Política:</strong> Ve a la pestaña "Análisis de Política" para ver las sugerencias de la IA sobre qué productos faltan o sobran según la antigüedad del auto.
                </li>
              </ol>
            </div>

            {/* Right: Downloads & Info */}
            <div className="space-y-6">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h4 className="text-lg font-bold text-slate-800 mb-3">📥 Descargar Plantillas</h4>
                <p className="text-sm text-slate-500 mb-4">Usa estos archivos vacíos como base para completar tu información.</p>
                
                <div className="space-y-3">
                  <button 
                    onClick={() => downloadTemplate('products')}
                    className="w-full flex items-center justify-between p-3 bg-white border border-slate-300 hover:border-green-500 hover:text-green-700 hover:shadow-md rounded-lg transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-2 rounded group-hover:bg-green-200">📊</div>
                      <div className="text-left">
                        <div className="font-bold text-sm">Plantilla Productos</div>
                        <div className="text-xs text-slate-400">Campos: Stmvid, Nivel 1, Nivel 2...</div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </button>

                  <button 
                    onClick={() => downloadTemplate('park')}
                    className="w-full flex items-center justify-between p-3 bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-700 hover:shadow-md rounded-lg transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded group-hover:bg-blue-200">🚗</div>
                      <div className="text-left">
                        <div className="font-bold text-sm">Plantilla Parque</div>
                        <div className="text-xs text-slate-400">Campos: IDMODELO, MODELO, MARCA...</div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </button>
                </div>
              </div>

              <div className="bg-orange-50 p-5 rounded-xl border border-orange-100">
                <h4 className="text-sm font-bold text-orange-800 mb-2">💡 Tips Importantes</h4>
                <ul className="text-xs text-orange-700 space-y-1 list-disc ml-4">
                  <li>El campo <strong>Stmvid</strong> en productos debe coincidir con <strong>IDMODELO</strong> en parque para que crucen.</li>
                  <li>Las categorías de política (AA, A, B) vienen del archivo de Parque.</li>
                  <li>La calidad (Premium/Original) se detecta en base al nombre del Proveedor.</li>
                </ul>
              </div>
            </div>

          </div>
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-200 text-center">
          <button onClick={onClose} className="bg-slate-800 text-white px-8 py-2 rounded-lg font-bold hover:bg-slate-700 transition-colors">
            ¡Entendido!
          </button>
        </div>
      </div>
    </div>
  );
};
