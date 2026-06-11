import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, registerUser, getProfile } from '../services/api';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return { ...state, user: action.payload.user, token: action.payload.token, isAuthenticated: true, isLoading: false };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'UPDATE_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const res = await getProfile();
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user: res.data.data || res.data, token } });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch {
      await AsyncStorage.removeItem('token');
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (email, password) => {
    const res = await loginUser({ email, password });
    await AsyncStorage.setItem('token', res.data.token);
    dispatch({ type: 'LOGIN_SUCCESS', payload: res.data });
    return res.data;
  };

  const register = async (data) => {
    const res = await registerUser(data);
    await AsyncStorage.setItem('token', res.data.token);
    dispatch({ type: 'LOGIN_SUCCESS', payload: res.data });
    return res.data;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (user) => dispatch({ type: 'UPDATE_USER', payload: user });

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);