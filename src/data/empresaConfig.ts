// Acceso seguro a localStorage: devuelve el valor por defecto si la clave
// no existe o si el JSON almacenado está corrupto.
const getLocalStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage`, err);
    return defaultValue;
  }
};

const setLocalStorageItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing ${key} to localStorage`, err);
  }
};

export interface EmpresaConfig {
  nombre: string;
  tagline: string;
  razonSocial: string;
  nif: string;
  direccionFiscal: string;
  correo: string;
  telefono: string;
  web: string;
  ciudad: string;
  pais: string;
  brandColor: string;
  logoBase64: string;
}

export const DEFAULT_EMPRESA_CONFIG: EmpresaConfig = {
  nombre: '2M Rent a Car',
  tagline: 'Alquiler de vehículos y taller mecánico',
  razonSocial: 'Two M Rent a Car SL',
  nif: 'B13712658',
  direccionFiscal: 'Camí de Son Gotleu, 8 bajos',
  correo: 'info@2mrentacar.es',
  telefono: '(+34) 633 47 48 87',
  web: 'www.2mrentacar.es',
  ciudad: 'Palma (Illes Balears)',
  pais: 'España',
  brandColor: '#C38DD6',
  logoBase64: '',
};

// Caché en memoria de la configuración de empresa. Se siembra desde
// localStorage/valores por defecto (acceso síncrono inmediato) y se actualiza
// con lo que llega de Supabase al arrancar (ver data/empresaDb.ts).
let empresaCache: EmpresaConfig = {
  ...DEFAULT_EMPRESA_CONFIG,
  ...getLocalStorageItem<Partial<EmpresaConfig>>('ingenio_empresa_config', DEFAULT_EMPRESA_CONFIG),
};

export const getEmpresaConfig = (): EmpresaConfig => empresaCache;

/** Actualiza la caché local (y localStorage como respaldo). No toca Supabase. */
export const setEmpresaConfigCache = (data: EmpresaConfig) => {
  empresaCache = { ...DEFAULT_EMPRESA_CONFIG, ...data };
  setLocalStorageItem('ingenio_empresa_config', empresaCache);
};
