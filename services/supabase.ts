import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Flag para detectar si las variables están configuradas
export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// createClient requiere una URL válida — usamos un placeholder cuando no hay config
// para que el módulo cargue sin crashear. Las llamadas a la API fallarán igual,
// pero el error se maneja en App.tsx mostrando una pantalla amigable.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
