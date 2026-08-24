'use client';

import { create } from 'zustand';

export interface QueueTicket {
  id?: string;
  queueNumber: string;
  status: string;
  deviceCategory?: string;
  deviceBrand?: string;
  customerName?: string;
}

interface QueueBoardState {
  board: {
    ELECTRICAL: QueueTicket[];
    ELECTRONICS: QueueTicket[];
    AUTOMOTIVE: QueueTicket[];
    KITCHEN: QueueTicket[];
  };
  centerId: string | null;
  loading: boolean;
}

interface QueueBoardActions {
  setQueueBoard: (board: QueueBoardState['board']) => void;
  updateTicket: (queueNumber: string, data: Partial<QueueTicket>) => void;
  addTicket: (trade: keyof QueueBoardState['board'], ticket: QueueTicket) => void;
  setCenterId: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useQueueStore = create<QueueBoardState & QueueBoardActions>((set, get) => ({
  board: {
    ELECTRICAL: [],
    ELECTRONICS: [],
    AUTOMOTIVE: [],
    KITCHEN: [],
  },
  centerId: null,
  loading: false,

  setQueueBoard: (board) => set({ board }),

  updateTicket: (queueNumber, data) => {
    const { board } = get();
    const updated = { ...board };
    (Object.keys(updated) as Array<keyof typeof updated>).forEach((trade) => {
      updated[trade] = updated[trade].map((t) =>
        t.queueNumber === queueNumber ? { ...t, ...data } : t
      );
    });
    set({ board: updated });
  },

  addTicket: (trade, ticket) => {
    const { board } = get();
    set({ board: { ...board, [trade]: [...board[trade], ticket] } });
  },

  setCenterId: (id) => set({ centerId: id }),
  setLoading: (loading) => set({ loading }),
}));
