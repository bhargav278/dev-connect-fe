import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './lib/socket'; // initialise socket — connects if token exists, listens for auth changes
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { Toaster } from 'sonner';
import { router } from './router';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        richColors
        theme="dark"
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              'border border-white/10 bg-zinc-950/80 text-zinc-100 backdrop-blur-xl shadow-lg shadow-black/30 rounded-xl',
            description: 'text-zinc-300',
            actionButton: 'bg-white/10 text-white hover:bg-white/15 border border-white/10 rounded-lg',
            cancelButton: 'bg-white/5 text-zinc-200 hover:bg-white/10 border border-white/10 rounded-lg',
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
)
