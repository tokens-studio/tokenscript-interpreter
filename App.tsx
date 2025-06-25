
import React from 'react';
import { InteractiveMode } from './components/InteractiveMode';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-gray-800 text-gray-100 flex flex-col items-center p-4">
      <header className="my-8 text-center">
        <h1 className="text-5xl font-bold text-sky-400 drop-shadow-lg">
          TokenScript Interpreter
        </h1>
        <p className="text-lg text-sky-200 mt-2">
          Interactively interpret TokenScript expressions.
        </p>
      </header>
      <InteractiveMode />
      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>&copy; 2024 TokenScript Interpreter. All rights reserved.</p>
        <p>Powered by React, TypeScript, and Tailwind CSS.</p>
      </footer>
    </div>
  );
};

export default App;
