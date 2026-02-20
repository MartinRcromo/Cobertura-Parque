
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { PARQUE_EMBEBIDO } from './constants';
import { readExcelFile } from './services/excelService';
import { ParkVehicle, ProductRow, ProcessedData, TableStats, ModelCoverageData } from './types';
import { StatsCards } from './components/StatsCards';
import { Filters } from './components/Filters';
import { ProductModal } from './components/Modal';
import { PolicyAnalyzer } from './components/PolicyAnalyzer';
import { HelpModal } from './components/HelpModal';
import { VoiceAssistant } from './components/VoiceAssistant'; // Import VoiceAssistant

// Interface for the new Task system
interface TaskItem {
  text: string;
  team: string;
  date: string;
}

function App() {
  const [hasKey, setHasKey] = useState(false); // New state for API Key check
  const [productosData, setProductosData] = useState<ProductRow[] | null>(null);
  const [parqueData, setParqueData] = useState<ParkVehicle[]>(PARQUE_EMBEBIDO);
  const [filtroCategoria, setFiltroCategoria] = useState('TODOS');
  const [filtroMarca, setFiltroMarca] = useState('TODOS');
  const [excluirProveedor3, setExcluirProveedor3] = useState(false);
  
  // Navigation State
  const [vistaActual, setVistaActual] = useState<'CON_COBERTURA' | 'SIN_COBERTURA' | 'ANALISIS_POLITICA'>('CON_COBERTURA');
  
  const [mostrarNivel1, setMostrarNivel1] = useState(true);
  const [mostrarNivel2, setMostrarNivel2] = useState(true);
  const [loading, setLoading] = useState(false);
  const [modalProductos, setModalProductos] = useState<any>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showTeamsConfig, setShowTeamsConfig] = useState(false);
  const [availableTeams, setAvailableTeams] = useState(['Ventas', 'Compras', 'Producto', 'Logística']);
  
  // --- New State for Model Tasks (Rich Comments) ---
  const [modelTasks, setModelTasks] = useState<Record<string, TaskItem>>({});
  const [editingModelKey, setEditingModelKey] = useState<string | null>(null);
  const [newTaskData, setNewTaskData] = useState<{text: string, team: string}>({ text: '', team: 'Ventas' });
  
  const tablaRef = useRef<HTMLDivElement>(null);

  // --- API Key Check Effect & Load Data ---
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        try {
          const has = await window.aistudio.hasSelectedApiKey();
          setHasKey(has);
        } catch (e) {
          console.error("Error checking API key:", e);
          setHasKey(false);
        }
      } else {
        setHasKey(true); 
      }
    };
    checkKey();

    // Load stored data
    const storedTeams = localStorage.getItem('cromosol_teams');
    if (storedTeams) setAvailableTeams(JSON.parse(storedTeams));

    const storedModelTasks = localStorage.getItem('cromosol_model_tasks');
    if (storedModelTasks) setModelTasks(JSON.parse(storedModelTasks));
  }, []);

  const handleConnectApiKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasKey(true);
      } catch (e) {
        console.error("Error selecting key:", e);
        alert("Hubo un error al seleccionar la llave. Por favor intente nuevamente.");
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'productos' | 'parque') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      if (tipo === 'productos') {
        const data = await readExcelFile<ProductRow>(file);
        if (!data[0]['Nivel 1'] || !data[0]['Nivel 2']) {
          alert('⚠️ El archivo debe tener columnas "Nivel 1" y "Nivel 2"');
          return;
        }
        setProductosData(data);
      } else {
        const data = await readExcelFile<ParkVehicle>(file);
        setParqueData(data);
      }
    } catch (error) {
      alert('Error reading file: ' + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  // --- Task Management Functions ---
  const startEditingModelTask = (modelName: string) => {
    const existing = modelTasks[modelName];
    setNewTaskData({ 
        text: existing?.text || '', 
        team: existing?.team || availableTeams[0] || 'Ventas' 
    });
    setEditingModelKey(modelName);
  };

  const saveModelTask = (modelName: string) => {
    if (!newTaskData.text.trim()) {
        // If empty, remove the task
        const updated = { ...modelTasks };
        delete updated[modelName];
        setModelTasks(updated);
        localStorage.setItem('cromosol_model_tasks', JSON.stringify(updated));
    } else {
        const updated = { 
            ...modelTasks, 
            [modelName]: { 
                text: newTaskData.text, 
                team: newTaskData.team, 
                date: new Date().toLocaleDateString() 
            } 
        };
        setModelTasks(updated);
        localStorage.setItem('cromosol_model_tasks', JSON.stringify(updated));
    }
    setEditingModelKey(null);
  };

  const cancelEditingModelTask = () => {
    setEditingModelKey(null);
  };

  const exportTasksReport = () => {
    // Merge product tasks (if any stored separately) and model tasks if needed
    // For now, let's export Model Tasks
    if (Object.keys(modelTasks).length === 0) { alert('No hay tareas de modelos guardadas.'); return; }
    
    const data = Object.entries(modelTasks).map(([model, t]) => {
        const task = t as TaskItem;
        return { 
            Modelo: model, 
            Tarea: task.text, 
            Equipo: task.team, 
            Fecha: task.date 
        };
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tareas_Modelos");
    XLSX.writeFile(wb, "Reporte_Tareas_Modelos.xlsx");
  };

  // Function to export the full Coverage Table
  const exportCoverageTable = (data: ProcessedData | null) => {
      if (!data || !data.datos) return;
      
      const rows: any[] = [];
      const sortedBrands = Object.keys(data.datos).sort();
      
      sortedBrands.forEach(marca => {
          const modelsObj = data.datos[marca];
          const models = Object.values(modelsObj).sort((a, b) => (a.orden || 999) - (b.orden || 999));
          
          models.forEach((m: ModelCoverageData) => {
              const row: any = {
                  Marca: marca,
                  Modelo: m.modeloName, // Ensure we have model name access
              };
              
              // Add dynamic columns
              data.columnas.forEach(c => {
                  const colName = c.replace('|', ' ');
                  row[colName] = m.contadores[c] || 0;
              });
              
              row['Total Productos'] = m.totalProductos;
              
              const task = modelTasks[m.modeloName]; // Ensure correct key
              row['Comentarios Estratégicos'] = task ? `[${task.team}] ${task.text} (${task.date})` : '';
              
              rows.push(row);
          });
      });
      
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cobertura_Completa");
      XLSX.writeFile(wb, `Tabla_Cobertura_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const productosFiltrados = useMemo(() => {
    if (!productosData) return null;
    return excluirProveedor3 
      ? productosData.filter(p => Number(p.Proveedor) !== 3)
      : productosData;
  }, [productosData, excluirProveedor3]);

  const nivelesDetectados = useMemo(() => {
    if (!productosFiltrados) return { nivel1: [], nivel2: [] };

    const n1 = new Set<string>();
    const n2 = new Set<string>();

    productosFiltrados.forEach(p => {
      if (p['Nivel 1']) n1.add(p['Nivel 1']);
      if (p['Nivel 2']) n2.add(p['Nivel 2']);
    });

    const nivel1 = Array.from(n1).sort((a, b) => {
      const orden: Record<string, number> = { 'AA': 1, 'A': 2, 'B': 3, 'C': 4 };
      return (orden[a] || 99) - (orden[b] || 99) || a.localeCompare(b);
    });

    const nivel2 = Array.from(n2).sort();

    return { nivel1, nivel2 };
  }, [productosFiltrados]);

  const processedData = useMemo(() => {
    if (!productosFiltrados || !parqueData) return null;

    const idsConProductos = new Set<number>();
    // Pre-process products for faster lookup
    const productsByModelId: Record<number, ProductRow[]> = {};

    productosFiltrados.forEach(p => {
      const id = Number(p.Stmvid);
      if (!isNaN(id)) {
        idsConProductos.add(id);
        if (!productsByModelId[id]) productsByModelId[id] = [];
        productsByModelId[id].push(p);
      }
    });

    const conCobertura: ParkVehicle[] = [];
    const sinCobertura: ParkVehicle[] = [];

    parqueData.forEach(modelo => {
      const id = Number(modelo.IDMODELO);
      if (idsConProductos.has(id)) {
        conCobertura.push(modelo);
      } else {
        sinCobertura.push(modelo);
      }
    });

    return { conCobertura, sinCobertura, productsByModelId };
  }, [productosFiltrados, parqueData]);

  const estadisticas = useMemo<TableStats | null>(() => {
    if (!processedData || !productosFiltrados) return null;

    const { conCobertura, sinCobertura } = processedData;
    const total = parqueData.length;

    const porCat: Record<string, any> = {};
    ['AA', 'A', 'B', 'C'].forEach(cat => {
      const t = parqueData.filter(p => p.Clasificacion === cat).length;
      const c = conCobertura.filter(p => p.Clasificacion === cat).length;
      porCat[cat] = {
        total: t,
        cubiertos: c,
        porcentaje: t > 0 ? (c / t * 100).toFixed(1) : "0.0"
      };
    });

    return {
      totalModelos: total,
      modelosCubiertos: conCobertura.length,
      modelosSinCubierta: sinCobertura.length,
      porcentajeCobertura: total > 0 ? ((conCobertura.length / total) * 100).toFixed(1) : "0.0",
      totalProductos: productosFiltrados.length,
      coberturaPorCategoria: porCat
    };
  }, [processedData, parqueData, productosFiltrados]);

  const datosTabla = useMemo<ProcessedData | null>(() => {
    if (!processedData || !nivelesDetectados) return null;

    const { conCobertura, productsByModelId } = processedData;
    const { nivel1, nivel2 } = nivelesDetectados;

    let filtrados = conCobertura;
    if (filtroCategoria !== 'TODOS') {
      filtrados = filtrados.filter(p => p.Clasificacion === filtroCategoria);
    }
    if (filtroMarca !== 'TODOS') {
      filtrados = filtrados.filter(p => p.MARCA === filtroMarca);
    }

    // Determine columns based on toggles
    let columnas: string[] = [];
    if (mostrarNivel1 && mostrarNivel2) {
      nivel1.forEach(n1 => {
        nivel2.forEach(n2 => {
          columnas.push(`${n1}|${n2}`);
        });
      });
    } else if (mostrarNivel1) {
      columnas = nivel1.map(n1 => `${n1}|ALL`);
    } else if (mostrarNivel2) {
      columnas = nivel2.map(n2 => `ALL|${n2}`);
    } else {
      columnas = ['ALL|ALL'];
    }

    const resultado: Record<string, any> = {};
    
    filtrados.forEach(modelo => {
      const marca = modelo.MARCA;
      const nombre = modelo.MODELO;
      const id = Number(modelo.IDMODELO);
      
      if (!resultado[marca]) resultado[marca] = {};

      const contadores: Record<string, number> = {};
      const detalles: Record<string, any[]> = {};
      
      // Initialize
      columnas.forEach(col => {
        contadores[col] = 0;
        detalles[col] = [];
      });

      const modeloProductos = productsByModelId[id] || [];

      modeloProductos.forEach(prod => {
        const n1 = prod['Nivel 1'];
        const n2 = prod['Nivel 2'];
        
        // Determine key based on toggles
        let keys: string[] = [];
        if (mostrarNivel1 && mostrarNivel2) {
          keys = [`${n1}|${n2}`];
        } else if (mostrarNivel1) {
          keys = [`${n1}|ALL`];
        } else if (mostrarNivel2) {
          keys = [`ALL|${n2}`];
        } else {
          keys = ['ALL|ALL'];
        }
        
        keys.forEach(key => {
          if (contadores[key] !== undefined) {
            contadores[key]++;
            detalles[key].push({
              equivalencia: prod.Equivalencia,
              numero: prod['Numero '] || prod.Numero,
              marca: prod.Marca,
              proveedor: prod.Proveedor,
              nivel1: n1,
              nivel2: n2,
              descripcion: prod['Descripción'] || ''
            });
          }
        });
      });

      const total = Object.values(contadores).reduce((a, b) => a + b, 0);

      resultado[marca][nombre] = {
        contadores,
        productosDetalle: detalles,
        categoria: modelo.Clasificacion,
        orden: modelo["Nuevo Orden"] || modelo.Orden || 999,
        totalProductos: total,
        idModelo: id,
        modeloName: nombre // Store name explicitly for easier access
      };
    });

    return { datos: resultado, columnas, nivel1, nivel2 };
  }, [processedData, nivelesDetectados, filtroCategoria, filtroMarca, mostrarNivel1, mostrarNivel2]);

  const marcasDisponibles = useMemo(() => {
    if (!parqueData) return [];
    return [...new Set(parqueData.map(p => p.MARCA))].filter(Boolean).sort();
  }, [parqueData]);

  // Scroll logic
  const scrollTabla = (direccion: 'izq' | 'der') => {
    if (tablaRef.current) {
      const scroll = direccion === 'izq' ? -400 : 400;
      tablaRef.current.scrollBy({ left: scroll, behavior: 'smooth' });
    }
  };

  // --- Render Login Screen if Key not present ---
  if (!hasKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
          <div className="bg-brand-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Bienvenido al Analizador</h1>
          <p className="text-slate-500 mb-8">Para utilizar las funciones de Inteligencia Artificial (Imágenes, Video y Voz), es necesario conectar tu cuenta de Google AI.</p>
          
          <button 
            onClick={handleConnectApiKey}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all hover:scale-105 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Conectar Google AI API
          </button>
          
          <p className="mt-6 text-xs text-slate-400">
            Debes seleccionar un proyecto pago para usar las funciones de Veo Video Generation. 
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-brand-600 ml-1">Ver documentación de facturación</a>
          </p>
        </div>
      </div>
    );
  }

  // --- Main App Render ---
  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-full mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-brand-600 text-white p-2 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Cromosol Park Analyzer <span className="text-brand-500 text-sm font-normal ml-2">v6.1</span></h1>
              <p className="text-xs text-slate-500">Parque Automotor: {parqueData.length} modelos</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            
            <button 
              onClick={() => setShowHelp(true)}
              className="text-slate-600 hover:text-brand-600 font-semibold text-sm flex items-center gap-2 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Ayuda & Templates
            </button>

            {/* File Inputs (Hidden styling) */}
            <div className="flex gap-2">
              <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                <input type="file" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, 'productos')} className="hidden" />
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                {productosData ? `Productos (${productosData.length})` : 'Cargar Productos'}
              </label>
              <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                <input type="file" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, 'parque')} className="hidden" />
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Actualizar Parque
              </label>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-full mx-auto px-6 py-8">
        
        {/* Loading State */}
        {loading && (
          <div className="fixed inset-0 bg-white/80 z-50 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-brand-500 border-t-transparent"></div>
              <p className="mt-4 text-brand-600 font-semibold">Procesando datos...</p>
            </div>
          </div>
        )}

        {!productosData && (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-300">
            <div className="bg-brand-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-700">Comienza cargando tu archivo de productos</h3>
            <p className="text-slate-500 mt-2 max-w-md mx-auto mb-6">El sistema cruzará automáticamente tu inventario con la base de datos del parque automotor embebido.</p>
            <button 
              onClick={() => setShowHelp(true)}
              className="text-brand-600 font-semibold hover:underline"
            >
              ¿Necesitas ayuda o las plantillas? Haz clic aquí
            </button>
          </div>
        )}

        {productosData && processedData && (
          <>
            {/* Stats */}
            <StatsCards stats={estadisticas} />

            {/* Navigation Tabs */}
            <div className="flex gap-4 mb-4 border-b border-slate-200 justify-between items-center">
              <div className="flex gap-4">
                <button
                    onClick={() => setVistaActual('CON_COBERTURA')}
                    className={`pb-3 px-2 font-semibold text-sm transition-colors relative ${
                    vistaActual === 'CON_COBERTURA' 
                        ? 'text-brand-600' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Modelos Con Cobertura
                    {vistaActual === 'CON_COBERTURA' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setVistaActual('SIN_COBERTURA')}
                    className={`pb-3 px-2 font-semibold text-sm transition-colors relative ${
                    vistaActual === 'SIN_COBERTURA' 
                        ? 'text-red-600' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Faltantes (Oportunidades)
                    {vistaActual === 'SIN_COBERTURA' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setVistaActual('ANALISIS_POLITICA')}
                    className={`pb-3 px-2 font-semibold text-sm transition-colors relative flex items-center gap-2 ${
                    vistaActual === 'ANALISIS_POLITICA' 
                        ? 'text-purple-600' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Análisis de Política (AI)
                    {vistaActual === 'ANALISIS_POLITICA' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full"></div>}
                </button>
              </div>

              {vistaActual === 'CON_COBERTURA' && (
                <div className="flex gap-2">
                    <button 
                        onClick={exportTasksReport} 
                        className="bg-white border border-slate-300 hover:border-brand-500 text-slate-700 hover:text-brand-600 px-4 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-2 shadow-sm"
                    >
                        📋 Reporte Tareas
                    </button>
                    <button 
                        onClick={() => exportCoverageTable(datosTabla)} 
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg shadow-sm font-bold text-xs flex items-center gap-2"
                    >
                        📥 Descargar Tabla
                    </button>
                </div>
              )}
            </div>

            {/* VIEW: Policy Analysis */}
            {vistaActual === 'ANALISIS_POLITICA' ? (
                <PolicyAnalyzer 
                    parque={parqueData} 
                    products={productosData}
                    productsByModelId={processedData.productsByModelId}
                />
            ) : (
                /* VIEW: Tables */
                <>
                    {/* Filters (Only for tables) */}
                    <Filters 
                    filtroCategoria={filtroCategoria}
                    setFiltroCategoria={setFiltroCategoria}
                    filtroMarca={filtroMarca}
                    setFiltroMarca={setFiltroMarca}
                    excluirProveedor3={excluirProveedor3}
                    setExcluirProveedor3={setExcluirProveedor3}
                    marcasDisponibles={marcasDisponibles}
                    nivel1={nivelesDetectados.nivel1}
                    nivel2={nivelesDetectados.nivel2}
                    mostrarNivel1={mostrarNivel1}
                    setMostrarNivel1={setMostrarNivel1}
                    mostrarNivel2={mostrarNivel2}
                    setMostrarNivel2={setMostrarNivel2}
                    />

                    {/* Main Table Area */}
                    <div className="relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    
                    {/* Table Navigation Overlay */}
                    {vistaActual === 'CON_COBERTURA' && (
                        <div className="absolute top-2 right-2 z-20 flex gap-2">
                        <button onClick={() => scrollTabla('izq')} className="p-2 bg-white/90 hover:bg-white shadow border rounded-full text-slate-600 hover:text-brand-600 transition-all">◀</button>
                        <button onClick={() => scrollTabla('der')} className="p-2 bg-white/90 hover:bg-white shadow border rounded-full text-slate-600 hover:text-brand-600 transition-all">▶</button>
                        </div>
                    )}

                    <div 
                        ref={tablaRef}
                        className="overflow-x-auto custom-scrollbar" 
                        style={{ maxHeight: '65vh' }}
                    >
                        {vistaActual === 'CON_COBERTURA' && datosTabla ? (
                        <table className="min-w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 bg-slate-50 sticky left-0 z-20 border-b border-r min-w-[150px]">Marca</th>
                                <th className="px-4 py-3 bg-slate-50 sticky left-[150px] z-20 border-b border-r min-w-[280px]">Modelo</th>
                                <th className="px-4 py-3 bg-slate-50 border-b text-center w-16">Cat.</th>
                                {datosTabla.columnas.map(col => {
                                const [n1, n2] = col.split('|');
                                return (
                                    <th key={col} className="px-2 py-3 border-b text-center min-w-[100px] whitespace-nowrap">
                                    <div className="text-xs text-brand-600 font-bold">{n1 === 'ALL' ? '' : n1}</div>
                                    <div className="text-xs text-slate-500 font-normal">{n2 === 'ALL' ? 'Total' : n2}</div>
                                    </th>
                                );
                                })}
                                <th className="px-4 py-3 bg-slate-50 border-b text-center">Total</th>
                                <th className="px-4 py-3 bg-slate-50 border-b text-center min-w-[200px]">Comentarios / Tareas</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                            {Object.keys(datosTabla.datos).sort().map(marca => {
                                const modelos = datosTabla.datos[marca];
                                const modelosOrd = Object.entries(modelos).sort((a, b) => (a[1] as ModelCoverageData).orden - (b[1] as ModelCoverageData).orden);
                                
                                return (
                                <React.Fragment key={marca}>
                                    {modelosOrd.map(([nombre, infoRaw], idx) => {
                                    const info = infoRaw as ModelCoverageData;
                                    const task = modelTasks[nombre];
                                    const isEditing = editingModelKey === nombre;
                                    
                                    return (
                                        <tr key={`${marca}-${nombre}`} className="hover:bg-slate-50 transition-colors">
                                        {idx === 0 && (
                                            <td rowSpan={modelosOrd.length} className="px-4 py-3 bg-white sticky left-0 z-10 border-r align-top font-bold text-slate-700">
                                            {marca}
                                            </td>
                                        )}
                                        <td className="px-4 py-3 sticky left-[150px] bg-white z-10 border-r text-slate-600 border-l-0">
                                            {nombre}
                                        </td>
                                        <td className="px-2 py-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                            info.categoria === 'AA' ? 'bg-purple-100 text-purple-700' :
                                            info.categoria === 'A' ? 'bg-blue-100 text-blue-700' :
                                            info.categoria === 'B' ? 'bg-cyan-100 text-cyan-700' :
                                            'bg-green-100 text-green-700'
                                            }`}>
                                            {info.categoria}
                                            </span>
                                        </td>
                                        {datosTabla.columnas.map(col => {
                                            const cant = info.contadores[col];
                                            return (
                                            <td key={col} className="px-2 py-3 text-center border-l border-slate-50">
                                                {cant > 0 ? (
                                                <button
                                                    onClick={() => setModalProductos({
                                                    marca,
                                                    modelo: nombre,
                                                    columna: col,
                                                    productos: info.productosDetalle[col]
                                                    })}
                                                    className="bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold px-3 py-1 rounded-md transition-colors min-w-[2rem]"
                                                >
                                                    {cant}
                                                </button>
                                                ) : (
                                                <span className="text-slate-200 text-xs">•</span>
                                                )}
                                            </td>
                                            );
                                        })}
                                        <td className="px-4 py-3 text-center font-bold text-slate-800 bg-slate-50/50">
                                            {info.totalProductos}
                                        </td>
                                        {/* Strategic Comments Column */}
                                        <td className="px-4 py-3 relative border-l">
                                            {isEditing ? (
                                                <div className="absolute right-4 top-2 z-50 bg-white p-3 border rounded-xl shadow-2xl min-w-[250px] animate-in fade-in zoom-in-95 duration-200">
                                                    <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase">Editar Tarea Modelo</h4>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Escribe una tarea o nota..." 
                                                        className="border p-2 text-sm rounded w-full mb-2 focus:ring-2 focus:ring-brand-500 outline-none" 
                                                        value={newTaskData.text} 
                                                        onChange={e=>setNewTaskData({...newTaskData, text:e.target.value})} 
                                                        autoFocus 
                                                    />
                                                    <div className="flex gap-2 mb-2">
                                                        <select 
                                                            className="border p-2 text-xs rounded bg-slate-50 flex-1 outline-none" 
                                                            value={newTaskData.team} 
                                                            onChange={e=>setNewTaskData({...newTaskData, team:e.target.value})}
                                                        >
                                                            {availableTeams.map(t => <option key={t} value={t}>{t}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={()=>saveModelTask(nombre)} 
                                                            className="bg-green-500 text-white px-3 py-1.5 rounded text-xs flex-1 hover:bg-green-600 font-bold"
                                                        >
                                                            Guardar
                                                        </button>
                                                        <button 
                                                            onClick={cancelEditingModelTask} 
                                                            className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-xs flex-1 hover:bg-slate-300 font-bold"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                task ? (
                                                    <div 
                                                        onClick={() => startEditingModelTask(nombre)} 
                                                        className="cursor-pointer bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs hover:bg-yellow-100 transition-colors group relative"
                                                    >
                                                        <div className="font-bold text-yellow-800 mb-1">{task.text}</div>
                                                        <div className="flex justify-between items-center text-[10px] text-yellow-600/80 font-medium">
                                                            <span className="bg-yellow-100 px-1.5 py-0.5 rounded">{task.team}</span>
                                                            <span>{task.date}</span>
                                                        </div>
                                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            ✏️
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-center">
                                                        <button 
                                                            onClick={() => startEditingModelTask(nombre)} 
                                                            className="text-slate-300 hover:text-brand-600 p-1.5 rounded-full hover:bg-brand-50 transition-all transform hover:scale-110" 
                                                            title="Agregar Tarea Estratégica"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                        </td>
                                        </tr>
                                    );
                                    })}
                                </React.Fragment>
                                );
                            })}
                            </tbody>
                        </table>
                        ) : (
                        // Sin Cobertura Table
                        <table className="min-w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 border-b">Marca</th>
                                <th className="px-6 py-3 border-b">Modelo</th>
                                <th className="px-6 py-3 border-b text-center">Clasificación</th>
                                <th className="px-6 py-3 border-b text-center">Año Desde</th>
                                <th className="px-6 py-3 border-b text-center">Año Hasta</th>
                                <th className="px-6 py-3 border-b text-center">Parque (Unidades)</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                            {processedData.sinCobertura
                                .filter(m => (filtroCategoria === 'TODOS' || m.Clasificacion === filtroCategoria) && (filtroMarca === 'TODOS' || m.MARCA === filtroMarca))
                                .sort((a, b) => (a.Orden || 9999) - (b.Orden || 9999))
                                .map((modelo, idx) => (
                                <tr key={idx} className="hover:bg-red-50/30 transition-colors">
                                <td className="px-6 py-3 font-medium text-slate-700">{modelo.MARCA}</td>
                                <td className="px-6 py-3 text-slate-600">{modelo.MODELO}</td>
                                <td className="px-6 py-3 text-center">
                                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-600">
                                    {modelo.Clasificacion}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-center text-slate-500">{modelo.DESDE}</td>
                                <td className="px-6 py-3 text-center text-slate-500">{modelo.HASTA}</td>
                                <td className="px-6 py-3 text-center font-mono text-slate-600">
                                    {modelo.Parque ? modelo.Parque.toLocaleString() : '-'}
                                </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        )}
                    </div>
                    </div>
                </>
            )}
          </>
        )}

        {/* Modal */}
        {modalProductos && (
          <ProductModal data={modalProductos} onClose={() => setModalProductos(null)} />
        )}

        {/* Help Modal */}
        {showHelp && (
          <HelpModal onClose={() => setShowHelp(false)} />
        )}

        {/* Floating Voice Assistant */}
        <VoiceAssistant />
      </main>
    </div>
  );
}

export default App;