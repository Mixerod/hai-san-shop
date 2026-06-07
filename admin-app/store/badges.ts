import { create } from 'zustand';

interface BadgeState {
  pendingOrders: number;
  unreadChat: number;
  setBadges: (v: Partial<Pick<BadgeState, 'pendingOrders' | 'unreadChat'>>) => void;
}

export const useBadgeStore = create<BadgeState>((set) => ({
  pendingOrders: 0,
  unreadChat: 0,
  setBadges: (v) => set(v),
}));
