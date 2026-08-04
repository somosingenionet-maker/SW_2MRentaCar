import { supabase } from '../lib/supabase';
import { rowToObj, objToRow } from '../lib/caseMap';
import { EmpresaConfig, DEFAULT_EMPRESA_CONFIG, setEmpresaConfigCache } from './mockData';

/** Carga la ficha de empresa (fila única id=1) desde Supabase y actualiza la caché. */
export async function loadEmpresaConfig(): Promise<EmpresaConfig> {
  const { data, error } = await supabase.from('empresa_config').select('*').eq('id', 1).single();
  if (error || !data) return DEFAULT_EMPRESA_CONFIG;
  const cfg = { ...DEFAULT_EMPRESA_CONFIG, ...rowToObj<EmpresaConfig>(data as Record<string, unknown>) };
  setEmpresaConfigCache(cfg);
  return cfg;
}

/** Guarda la ficha de empresa en Supabase (fila única id=1) y actualiza la caché. */
export async function saveEmpresaConfigDb(cfg: EmpresaConfig): Promise<void> {
  setEmpresaConfigCache(cfg);
  const row = { ...objToRow(cfg as unknown as Record<string, unknown>), id: 1 };
  const { error } = await supabase.from('empresa_config').upsert(row);
  if (error) throw error;
}
