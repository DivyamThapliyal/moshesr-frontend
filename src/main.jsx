import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/index.css';
import App from './App';
import { ShellProvider } from './context/ShellContext';
import { ViewerProvider } from './context/ViewerContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ShellProvider>
        <ViewerProvider>
          <App />
        </ViewerProvider>
      </ShellProvider>
    </BrowserRouter>
  </StrictMode>,
);
