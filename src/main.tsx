import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import RegistroPublico from './components/RegistroPublico.tsx';
import './index.css';

// El enlace de autorregistro que recibe el cliente (/?registro=<token>) abre
// una página pública aparte: sin login y sin cargar nada del backoffice.
const tokenRegistro = new URLSearchParams(window.location.search).get('registro');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {tokenRegistro ? <RegistroPublico token={tokenRegistro} /> : <App />}
  </StrictMode>,
);
