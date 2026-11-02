import { useEffect, useRef, type InputHTMLAttributes } from 'react';

/** Campo de importe en euros: admite céntimos y, al salir del campo o al cargar, lo muestra siempre con 2 decimales (45 → 45.00). */
export function InputPrecio(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'step'>) {
  const ref = useRef<HTMLInputElement>(null);
  const formatear = () => {
    const el = ref.current;
    if (el && el.value !== '' && Number.isFinite(Number(el.value))) el.value = Number(el.value).toFixed(2);
  };
  useEffect(() => { if (document.activeElement !== ref.current) formatear(); }, [props.value]);
  return <input inputMode="decimal" min="0" {...props} ref={ref} type="number" step="0.01" onBlur={e => { formatear(); props.onBlur?.(e); }} />;
}
