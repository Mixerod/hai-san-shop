import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type CartItem = {
  id: string
  name: string
  price: number
  unit: string
  quantity: number
}

type CartStore = {
  items: CartItem[]
  add: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  remove: (id: string) => void
  updateQty: (id: string, quantity: number) => void
  clear: () => void
  total: () => number
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      setIsOpen: (open) => set({ isOpen: open }),

      add: (item) => set((state) => {
        const qty = item.quantity ?? 1
        const existing = state.items.find(i => i.id === item.id)
        let newItems
        if (existing) {
          newItems = state.items.map(i =>
            i.id === item.id ? { ...i, quantity: i.quantity + qty } : i
          )
        } else {
          newItems = [...state.items, { ...item, quantity: qty }]
        }
        return { items: newItems, isOpen: true }
      }), 

      remove: (id) => set((state) => ({
        items: state.items.filter(i => i.id !== id)
      })),

      updateQty: (id, quantity) => set((state) => ({
        items: state.items.map(i => i.id === id ? { ...i, quantity } : i)
      })),

      clear: () => set({ items: [] }),

      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { 
      name: 'cart-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
)