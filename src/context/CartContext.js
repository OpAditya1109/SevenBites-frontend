import React, { createContext, useContext, useReducer } from 'react';

const CartContext = createContext();

const initialState = {
  items: [],
  restaurantId: null,
  restaurantName: '',
  totalItems: 0,
  totalPrice: 0,
};

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { item, restaurantId, restaurantName } = action.payload;

      // Different restaurant — clear cart
      if (state.restaurantId && state.restaurantId !== restaurantId) {
        const items = [{ ...item, quantity: 1 }];
        return { ...state, items, restaurantId, restaurantName, totalItems: 1, totalPrice: item.price };
      }

      const existing = state.items.find((i) => i._id === item._id);
      let items;
      if (existing) {
        items = state.items.map((i) =>
          i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        items = [...state.items, { ...item, quantity: 1 }];
      }

      return {
        ...state,
        items,
        restaurantId,
        restaurantName,
        totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
        totalPrice: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      };
    }

    case 'REMOVE_ITEM': {
      const existing = state.items.find((i) => i._id === action.payload);
      let items;
      if (existing?.quantity > 1) {
        items = state.items.map((i) =>
          i._id === action.payload ? { ...i, quantity: i.quantity - 1 } : i
        );
      } else {
        items = state.items.filter((i) => i._id !== action.payload);
      }

      return {
        ...state,
        items,
        restaurantId: items.length === 0 ? null : state.restaurantId,
        restaurantName: items.length === 0 ? '' : state.restaurantName,
        totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
        totalPrice: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      };
    }

    case 'CLEAR_CART':
      return initialState;

    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const addItem = (item, restaurantId, restaurantName) =>
    dispatch({ type: 'ADD_ITEM', payload: { item, restaurantId, restaurantName } });

  const removeItem = (itemId) => dispatch({ type: 'REMOVE_ITEM', payload: itemId });

  const clearCart = () => dispatch({ type: 'CLEAR_CART' });

  const getItemQuantity = (itemId) =>
    state.items.find((i) => i._id === itemId)?.quantity || 0;

  return (
    <CartContext.Provider value={{ ...state, addItem, removeItem, clearCart, getItemQuantity }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);