
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from './services/supabase';
import {
  fetchParque,
  fetchRubros,
  fetchProductosByRubro,
  uploadProductos,
  upsertParque,
} from './services/dataService';
import { PARQUE_EMBEBIDO } from './constants';
import { readExcelFile } from './services/excelService';
import { ParkVehicle, ProductRow, ProcessedData, TableStats, ModelCoverageData } from './types';
import { StatsCards } from './components/StatsCards';
import { Filters } from './components/Filters';
import { ProductModal } from './components/Modal';
import { PolicyAnalyzer } from './components/PolicyAnalyzer';
import { HelpModal } from './components/HelpModal';
import { LoginScreen } from './components/LoginScreen';
import { GlobalDashboard } from './components/GlobalDashboard';

interface TaskItem {
  text: string;
  team: string;
  date: string;
}

type Vista = 'DASHBOARD' | 'CON_COBERTURA' | 'SIN_COBERTURA' | 'ANALISIS_POLITICA';

function App() {
  // ── Auth ────────────────────────────────────────────────────────────────
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // ── Data ─────────────────────────────────────────────────────────────────
  const [productosData, setProductosData] = useState<ProductRow[] | null>(null);
  const [parqueData, setParqueData] = useState<ParkVehicle[]>(PARQUE_EMBEBIDO);
  const [rubrosList, setRubrosList] = useState<string[]>([]);
  const [rubroSeleccionado, setRubroSeleccionado] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<string>('');

  // ── Filters ───────────────────────────────────────────────────────────────
  const [filtroCategoria, setFiltroCategoria] = useState('TODOS');
  const [filtroMarca, setFiltroMarca] = useState('TODOS');
  const [excluirProveedor3, setExcluirProveedor3] = useState(false);
  const [mostrarNivel1, setMostrarNivel1] = useState(true);
  const [mostrarNivel2, setMostrarNivel2] = useState(true);

  // ── Navigation ───────────────────────────────────────────────────────────
  const [vistaActual, setVistaActual] = useState<Vista>('DASHBOARD');

  // ── UI State ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [modalProductos, setModalProductos] = useState<any>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [availableTeams, setAvailableTeams] = useState(['Ventas', 'Compras', 'Producto', 'Logística']);
  const [modelTasks, setModelTasks] = useState<Record<string, TaskItem>>({});
  const [editingModelKey, setEditingModelKey] = useState<string | null>(null);
  const [newTaskData, setNewTaskData] = useState<{ text: string; team: string }>({ text: '', team: 'Ventas' });

  const tablaRef = useRef<HTMLDivElement>(null);

  // ── Auth Effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setProductosData(null);
        setRubrosList([]);
        setRubroSeleccionado('');
        setParqueData(PARQUE_EMBEBIDO);
      }
    });

    // Load stored local prefs
    const storedTeams = localStorage.getItem('cromosol_teams');
    if (storedTeams) setAvailableTeams(JSON.parse(storedTeams));
    const storedTasks = localStorage.getItem('cromosol_model_tasks');
    if (storedTasks) setModelTasks(JSON.parse(storedTasks));

    return () => subscription.unsubscribe();
  }, []);

  // ── Load data on login ────────────────────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      // Parque from Supabase (fallback to embedded if empty)
      const parque = await fetchParque();
      if (parque.length > 0) setParqueData(parque);

      // Rubros list
      const rubros = await fetchRubros();
      setRubrosList(rubros);

      // Auto-load first rubro
      if (rubros.length > 0) {
        setRubroSeleccionado(rubros[0]);
        const prods = await fetchProductosByRubro(rubros[0]);
        setProductosData(prods.length > 0 ? prods : null);
      }
    } catch (err: any) {
      console.error('Error loading initial data:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) loadInitialData();
  }, [session, loadInitialData]);

  // ── Rubro change ──────────────────────────────────────────────────────────
  const handleRubroChange = async (rubro: string) => {
    if (rubro === rubroSeleccionado) return;
    setRubroSeleccionado(rubro);
    setLoading(true);
    setFiltroCategoria('TODOS');
    setFiltroMarca('TODOS');
    try {
      const prods = await fetchProductosByRubro(rubro);
      setProductosData(prods.length > 0 ? prods : null);
      setVistaActual('CON_COBERTURA');
    } catch (err: any) {
      console.error('Error fetching productos:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── File Upload ───────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'productos' | 'parque') => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow re-upload of same file

    setLoading(true);
    setUploadStatus('Leyendo archivo...');
    try {
      if (tipo === 'productos') {
        const data = await readExcelFile<ProductRow>(file);
        const n1key = data[0]?.['Nivel 1'] ? 'Nivel 1' : 'nivel1';
        const n2key = data[0]?.['Nivel 2'] ? 'Nivel 2' : 'nivel2';
        if (!data[0]?.[n1key] || !data[0]?.[n2key]) {
          alert('⚠️ El archivo debe tener columnas "Nivel 1" (o "nivel1") y "Nivel 2" (o "nivel2")');
          return;
        }
        setUploadStatus('Guardando en Supabase...');
        await uploadProductos(data);
        setProductosData(data);

        const rubros = await fetchRubros();
        setRubrosList(rubros);

        const firstRubro = data[0]?.[n1key] as string;
        if (firstRubro) setRubroSeleccionado(firstRubro);

        setUploadStatus(`✅ ${data.length} productos guardados`);
      } else {
        const data = await readExcelFile<ParkVehicle>(file);
        setUploadStatus('Guardando parque en Supabase...');
        await upsertParque(data);
        setParqueData(data);
        setUploadStatus(`✅ ${data.length} modelos de parque actualizados`);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
      setUploadStatus('');
    } finally {
      setLoading(false);
      setTimeout(() => setUploadStatus(''), 4000);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ── Task Management ───────────────────────────────────────────────────────
  const startEditingModelTask = (modelName: string) => {
    const existing = modelTasks[modelName];
    setNewTaskData({ text: existing?.text || '', team: existing?.team || availableTeams[0] || 'Ventas' });
    setEditingModelKey(modelName);
  };

  const saveModelTask = (modelName: string) => {
    const updated = { ...modelTasks };
    if (!newTaskData.text.trim()) {
      delete updated[modelName];
    } else {
      updated[modelName] = { text: newTaskData.text, team: newTaskData.team, date: new Date().toLocaleDateString() };
    }
    setModelTasks(updated);
    localStorage.setItem('cromosol_model_tasks', JSON.stringify(updated));
    setEditingModelKey(null);
  };

  const cancelEditingModelTask = () => setEditingModelKey(null);

  // ── Exports ───────────────────────────────────────────────────────────────
  const exportTasksReport = () => {
    if (Object.keys(modelTasks).length === 0) { alert('No hay tareas guardadas.'); return; }
    const data = Object.entries(modelTasks).map(([model, t]) => ({
      Modelo: model, Tarea: (t as TaskItem).text, Equipo: (t as TaskItem).team, Fecha: (t as TaskItem).date,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tareas_Modelos');
    XLSX.writeFile(wb, 'Reporte_Tareas_Modelos.xlsx');
  };

  const exportCoverageTable = (data: ProcessedData | null) => {
    if (!data?.datos) return;
    const rows: any[] = [];
    Object.keys(data.datos).sort().forEach(marca => {
      const models = Object.values(data.datos[marca]).sort((a, b) => (a.orden || 999) - (b.orden || 999));
      models.forEach((m: ModelCoverageData) => {
        const row: any = { Marca: marca, Modelo: m.modeloName };
        data.columnas.forEach(c => { row[c.replace('|', ' ')] = m.contadores[c] || 0; });
        row['Total Productos'] = m.totalProductos;
        const task = modelTasks[m.modeloName];
        row['Comentarios'] = task ? `[${task.team}] ${task.text} (${task.date})` : '';
        rows.push(row);
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cobertura_Completa');
    XLSX.writeFile(wb, `Tabla_Cobertura_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ── Computed Data ─────────────────────────────────────────────────────────
  const productosFiltrados = useMemo(() => {
    if (!productosData) return null;
    return excluirProveedor3 ? productosData.filter(p => Number(p.Proveedor) !== 3) : productosData;
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
    return { nivel1, nivel2: Array.from(n2).sort() };
  }, [productosFiltrados]);

  const processedData = useMemo(() => {
    if (!productosFiltrados || !parqueData) return null;
    const idsConProductos = new Set<number>();
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
      (idsConProductos.has(id) ? conCobertura : sinCobertura).push(modelo);
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
      porCat[cat] = { total: t, cubiertos: c, porcentaje: t > 0 ? (c / t * 100).toFixed(1) : '0.0' };
    });
    return {
      totalModelos: total,
      modelosCubiertos: conCobertura.length,
      modelosSinCubierta: sinCobertura.length,
      porcentajeCobertura: total > 0 ? ((conCobertura.length / total) * 100).toFixed(1) : '0.0',
      totalProductos: productosFiltrados.length,
      coberturaPorCategoria: porCat,
    };
  }, [processedData, parqueData, productosFiltrados]);

  const datosTabla = useMemo<ProcessedData | null>(() => {
    if (!processedData || !nivelesDetectados) return null;
    const { conCobertura, productsByModelId } = processedData;
    const { nivel1, nivel2 } = nivelesDetectados;

    let filtrados = conCobertura;
    if (filtroCategoria !== 'TODOS') filtrados = filtrados.filter(p => p.Clasificacion === filtroCategoria);
    if (filtroMarca !== 'TODOS') filtrados = filtrados.filter(p => p.MARCA === filtroMarca);

    let columnas: string[] = [];
    if (mostrarNivel1 && mostrarNivel2) {
      nivel1.forEach(n1 => nivel2.forEach(n2 => columnas.push(`${n1}|${n2}`)));
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
      columnas.forEach(col => { contadores[col] = 0; detalles[col] = []; });

      (productsByModelId[id] || []).forEach(prod => {
        const n1 = prod['Nivel 1'];
        const n2 = prod['Nivel 2'];
        let keys: string[] = [];
        if (mostrarNivel1 && mostrarNivel2) keys = [`${n1}|${n2}`];
        else if (mostrarNivel1) keys = [`${n1}|ALL`];
        else if (mostrarNivel2) keys = [`ALL|${n2}`];
        else keys = ['ALL|ALL'];
        keys.forEach(key => {
          if (contadores[key] !== undefined) {
            contadores[key]++;
            detalles[key].push({
              equivalencia: prod.Equivalencia,
              numero: prod['Numero '] || (prod as any).Numero,
              marca: prod.Marca,
              proveedor: prod.Proveedor,
              nivel1: n1,
              nivel2: n2,
              descripcion: prod['Descripción'] || '',
            });
          }
        });
      });

      resultado[marca][nombre] = {
        contadores,
        productosDetalle: detalles,
        categoria: modelo.Clasificacion,
        orden: (modelo as any)['Nuevo Orden'] || modelo.Orden || 999,
        totalProductos: Object.values(contadores).reduce((a, b) => a + b, 0),
        idModelo: id,
        modeloName: nombre,
      };
    });

    return { datos: resultado, columnas, nivel1, nivel2 };
  }, [processedData, nivelesDetectados, filtroCategoria, filtroMarca, mostrarNivel1, mostrarNivel2]);

  const marcasDisponibles = useMemo(
    () => [...new Set(parqueData.map(p => p.MARCA))].filter(Boolean).sort(),
    [parqueData]
  );

  const scrollTabla = (dir: 'izq' | 'der') => {
    tablaRef.current?.scrollBy({ left: dir === 'izq' ? -400 : 400, behavior: 'smooth' });
  };

  // ── Render: Supabase no configurado ──────────────────────────────────────
  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-200 text-center">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Faltan variables de entorno</h1>
          <p className="text-slate-500 text-sm mb-4">
            La app necesita las credenciales de Supabase para funcionar.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 text-left text-xs font-mono text-slate-600 space-y-1 mb-4">
            <div className="text-red-500 font-bold">Variables requeridas en Netlify:</div>
            <div>VITE_SUPABASE_URL</div>
            <div>VITE_SUPABASE_ANON_KEY</div>
          </div>
          <p className="text-xs text-slate-400">
            Netlify → Site configuration → Environment variables → Add, luego triggeá un nuevo deploy.
          </p>
        </div>
      </div>
    );
  }

  // ── Render: Auth Loading ──────────────────────────────────────────────────
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-indigo-700 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
          <p className="text-white font-bold text-lg">Conectando con Supabase...</p>
          <p className="text-indigo-200 text-sm">v7.1 · Supabase Edition</p>
        </div>
      </div>
    );
  }

  // ── Render: Login ─────────────────────────────────────────────────────────
  if (!session) return <LoginScreen />;

  // ── Render: Main App ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-12">
      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-full mx-auto px-6 py-3 flex justify-between items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="bg-brand-600 text-white p-2 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">
                Cromosol Park Analyzer
                <span className="text-indigo-600 text-xs font-bold ml-2 bg-indigo-50 px-2 py-0.5 rounded-full">v7.1 · Supabase</span>
              </h1>
              <p className="text-xs text-slate-400">{parqueData.length.toLocaleString()} modelos en parque</p>
            </div>
          </div>

          {/* Rubro selector */}
          {rubrosList.length > 0 && (
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <label className="text-xs font-semibold text-slate-500 flex-shrink-0">Categoría:</label>
              <select
                value={rubroSeleccionado}
                onChange={e => handleRubroChange(e.target.value)}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
              >
                {rubrosList.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}

          {/* Upload status */}
          {uploadStatus && (
            <div className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg flex-shrink-0">
              {uploadStatus}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowHelp(true)}
              className="text-slate-500 hover:text-brand-600 font-medium text-xs flex items-center gap-1.5 hover:bg-slate-50 px-2 py-2 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Ayuda
            </button>

            {/* File upload buttons */}
            <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5">
              <input type="file" accept=".xlsx,.xls" onChange={e => handleFileUpload(e, 'productos')} className="hidden" />
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {productosData ? `Productos (${productosData.length.toLocaleString()})` : 'Cargar Productos'}
            </label>

            <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5">
              <input type="file" accept=".xlsx,.xls" onChange={e => handleFileUpload(e, 'parque')} className="hidden" />
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar Parque
            </label>

            {/* User / Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <span className="text-xs text-slate-500 hidden sm:block truncate max-w-[140px]">
                {session.user.email}
              </span>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-full mx-auto px-6 py-6">

        {/* Loading overlay */}
        {loading && (
          <div className="fixed inset-0 bg-white/80 z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-14 w-14 border-4 border-brand-500 border-t-transparent" />
              <p className="text-brand-600 font-semibold">Procesando datos...</p>
            </div>
          </div>
        )}

        {/* ── Navigation Tabs ── */}
        <div className="flex gap-1 mb-6 border-b border-slate-200 justify-between items-end">
          <div className="flex gap-1">
            {/* Dashboard tab */}
            <button
              onClick={() => setVistaActual('DASHBOARD')}
              className={`pb-3 px-3 font-semibold text-sm transition-colors relative flex items-center gap-1.5 ${
                vistaActual === 'DASHBOARD' ? 'text-brand-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Dashboard Global
              {vistaActual === 'DASHBOARD' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-600 rounded-t-full" />}
            </button>

            <button
              onClick={() => setVistaActual('CON_COBERTURA')}
              className={`pb-3 px-3 font-semibold text-sm transition-colors relative ${
                vistaActual === 'CON_COBERTURA' ? 'text-brand-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Con Cobertura
              {vistaActual === 'CON_COBERTURA' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-600 rounded-t-full" />}
            </button>

            <button
              onClick={() => setVistaActual('SIN_COBERTURA')}
              className={`pb-3 px-3 font-semibold text-sm transition-colors relative ${
                vistaActual === 'SIN_COBERTURA' ? 'text-red-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Faltantes (Oportunidades)
              {vistaActual === 'SIN_COBERTURA' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-t-full" />}
            </button>

            <button
              onClick={() => setVistaActual('ANALISIS_POLITICA')}
              className={`pb-3 px-3 font-semibold text-sm transition-colors relative flex items-center gap-1.5 ${
                vistaActual === 'ANALISIS_POLITICA' ? 'text-purple-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Análisis de Política (AI)
              {vistaActual === 'ANALISIS_POLITICA' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full" />}
            </button>
          </div>

          {vistaActual === 'CON_COBERTURA' && (
            <div className="flex gap-2 pb-2">
              <button onClick={exportTasksReport} className="bg-white border border-slate-300 hover:border-brand-500 text-slate-700 hover:text-brand-600 px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-sm">
                📋 Reporte Tareas
              </button>
              <button onClick={() => exportCoverageTable(datosTabla)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg shadow-sm font-bold text-xs flex items-center gap-1.5">
                📥 Descargar Tabla
              </button>
            </div>
          )}
        </div>

        {/* ── VIEW: Dashboard Global ── */}
        {vistaActual === 'DASHBOARD' && (
          <GlobalDashboard
            parqueData={parqueData}
            rubroActivo={rubroSeleccionado}
            onSelectRubro={rubro => {
              handleRubroChange(rubro);
            }}
          />
        )}

        {/* ── VIEWS that need product data ── */}
        {vistaActual !== 'DASHBOARD' && (
          <>
            {/* Empty state */}
            {!productosData && (
              <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-300">
                <div className="bg-brand-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-700">Sin productos cargados para esta categoría</h3>
                <p className="text-slate-500 mt-2 max-w-md mx-auto mb-4">
                  {rubrosList.length === 0
                    ? 'Cargá tu primer archivo Excel de productos para comenzar.'
                    : `Seleccioná una categoría con datos o cargá un nuevo Excel de productos.`}
                </p>
                <button onClick={() => setShowHelp(true)} className="text-brand-600 font-semibold hover:underline text-sm">
                  ¿Necesitás ayuda o las plantillas? Hacé click aquí
                </button>
              </div>
            )}

            {productosData && processedData && (
              <>
                {/* Stats */}
                <StatsCards stats={estadisticas} />

                {/* Policy Analysis */}
                {vistaActual === 'ANALISIS_POLITICA' ? (
                  <PolicyAnalyzer
                    parque={parqueData}
                    products={productosData}
                    productsByModelId={processedData.productsByModelId}
                  />
                ) : (
                  <>
                    {/* Filters */}
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

                    {/* Table */}
                    <div className="relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      {vistaActual === 'CON_COBERTURA' && (
                        <div className="absolute top-2 right-2 z-20 flex gap-2">
                          <button onClick={() => scrollTabla('izq')} className="p-2 bg-white/90 hover:bg-white shadow border rounded-full text-slate-600 hover:text-brand-600">◀</button>
                          <button onClick={() => scrollTabla('der')} className="p-2 bg-white/90 hover:bg-white shadow border rounded-full text-slate-600 hover:text-brand-600">▶</button>
                        </div>
                      )}

                      <div ref={tablaRef} className="overflow-x-auto custom-scrollbar" style={{ maxHeight: '65vh' }}>
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
                                const modelosOrd = Object.entries(modelos).sort(
                                  (a, b) => (a[1] as ModelCoverageData).orden - (b[1] as ModelCoverageData).orden
                                );
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
                                          <td className="px-4 py-3 sticky left-[150px] bg-white z-10 border-r text-slate-600">{nombre}</td>
                                          <td className="px-2 py-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                              info.categoria === 'AA' ? 'bg-purple-100 text-purple-700' :
                                              info.categoria === 'A' ? 'bg-blue-100 text-blue-700' :
                                              info.categoria === 'B' ? 'bg-cyan-100 text-cyan-700' :
                                              'bg-green-100 text-green-700'
                                            }`}>{info.categoria}</span>
                                          </td>
                                          {datosTabla.columnas.map(col => {
                                            const cant = info.contadores[col];
                                            return (
                                              <td key={col} className="px-2 py-3 text-center border-l border-slate-50">
                                                {cant > 0 ? (
                                                  <button
                                                    onClick={() => setModalProductos({ marca, modelo: nombre, columna: col, productos: info.productosDetalle[col] })}
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
                                          <td className="px-4 py-3 text-center font-bold text-slate-800 bg-slate-50/50">{info.totalProductos}</td>
                                          <td className="px-4 py-3 relative border-l">
                                            {isEditing ? (
                                              <div className="absolute right-4 top-2 z-50 bg-white p-3 border rounded-xl shadow-2xl min-w-[250px]">
                                                <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase">Editar Tarea</h4>
                                                <input
                                                  type="text"
                                                  placeholder="Escribe una tarea o nota..."
                                                  className="border p-2 text-sm rounded w-full mb-2 focus:ring-2 focus:ring-brand-500 outline-none"
                                                  value={newTaskData.text}
                                                  onChange={e => setNewTaskData({ ...newTaskData, text: e.target.value })}
                                                  autoFocus
                                                />
                                                <div className="flex gap-2 mb-2">
                                                  <select
                                                    className="border p-2 text-xs rounded bg-slate-50 flex-1 outline-none"
                                                    value={newTaskData.team}
                                                    onChange={e => setNewTaskData({ ...newTaskData, team: e.target.value })}
                                                  >
                                                    {availableTeams.map(t => <option key={t} value={t}>{t}</option>)}
                                                  </select>
                                                </div>
                                                <div className="flex gap-2">
                                                  <button onClick={() => saveModelTask(nombre)} className="bg-green-500 text-white px-3 py-1.5 rounded text-xs flex-1 hover:bg-green-600 font-bold">Guardar</button>
                                                  <button onClick={cancelEditingModelTask} className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-xs flex-1 hover:bg-slate-300 font-bold">Cancelar</button>
                                                </div>
                                              </div>
                                            ) : task ? (
                                              <div onClick={() => startEditingModelTask(nombre)} className="cursor-pointer bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs hover:bg-yellow-100 transition-colors group relative">
                                                <div className="font-bold text-yellow-800 mb-1">{task.text}</div>
                                                <div className="flex justify-between items-center text-[10px] text-yellow-600/80 font-medium">
                                                  <span className="bg-yellow-100 px-1.5 py-0.5 rounded">{task.team}</span>
                                                  <span>{task.date}</span>
                                                </div>
                                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100">✏️</div>
                                              </div>
                                            ) : (
                                              <div className="flex justify-center">
                                                <button onClick={() => startEditingModelTask(nombre)} className="text-slate-300 hover:text-brand-600 p-1.5 rounded-full hover:bg-brand-50 transition-all" title="Agregar Tarea">
                                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                  </svg>
                                                </button>
                                              </div>
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
                          // Sin Cobertura
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
                                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-600">{modelo.Clasificacion}</span>
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
          </>
        )}

        {/* Modals */}
        {modalProductos && <ProductModal data={modalProductos} onClose={() => setModalProductos(null)} />}
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      </main>
    </div>
  );
}

export default App;
