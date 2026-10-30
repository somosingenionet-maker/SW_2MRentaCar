import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import RegistroPublico from './components/RegistroPublico.tsx';
import TallerMecanico from './components/TallerMecanico.tsx';
import './index.css';

// Dos enlaces abren una página pública aparte, sin login y sin cargar nada del backoffice:
//  · /?registro=<token>  el cliente rellena sus datos.
//  · /?taller=<token>    el mecánico ve y trabaja sus órdenes.
const params = new URLSearchParams(window.location.search);
const tokenRegistro = params.get('registro');
const tokenTaller = params.get('taller');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {tokenRegistro ? <RegistroPublico token={tokenRegistro} /> : tokenTaller ? <TallerMecanico token={tokenTaller} /> : <App />}
  </StrictMode>,
);
