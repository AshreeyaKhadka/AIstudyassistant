import React from 'react';
import AppRouter from './router/AppRouter';
import { GenerationProvider } from './context/GenerationContext';

function App() {
  return (
    <GenerationProvider>
      <AppRouter />
    </GenerationProvider>
  );
}

export default App;
