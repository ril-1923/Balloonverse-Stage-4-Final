import { create } from 'zustand';

export interface Notice {
  id: number;
  kind: 'mission' | 'achievement' | 'info';
  title: string;
  body: string;
}

interface NotificationState {
  items: Notice[];
  push: (n: Omit<Notice, 'id'>) => void;
  dismiss: (id: number) => void;
  clear: () => void;
}

let nextId = 1;

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  push: (n) => set((s) => ({ items: [...s.items, { ...n, id: nextId++ }].slice(-4) })),
  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  clear: () => set({ items: [] }),
}));
