// SignalRProvider.tsx - Context provider for SignalR
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSignalR, UseSignalROptions, UseSignalRReturn } from '@/hooks/useSignalR';

const SignalRContext = createContext<UseSignalRReturn | null>(null);

export interface SignalRProviderProps {
  children: ReactNode;
  options?: UseSignalROptions;
}

export const SignalRProvider: React.FC<SignalRProviderProps> = ({ children, options = {} }) => {
  const signalR = useSignalR(options);

  return (
    <SignalRContext.Provider value={signalR}>
      {children}
    </SignalRContext.Provider>
  );
};

export const useSignalRContext = (): UseSignalRReturn => {
  const context = useContext(SignalRContext);
  
  if (!context) {
    throw new Error('useSignalRContext must be used within a SignalRProvider');
  }
  
  return context;
};
