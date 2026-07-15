import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, registerUser, googleLoginUser, getProfile } from '../services/api';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
};

// Ensures the custom SplashScreen (logo + red bg) is visible for at least
// this long, even when the token check resolves almost instantly (e.g. no
// saved token). Without this, isLoading can flip to false in a few ms and
// the splash appears to be skipped entirely.
const MIN_SPLASH_MS = 3000;

function waitRemaining(startedAt, minDuration = MIN_SPLASH_MS) {
  const elapsed = Date.now() - startedAt;
  const remaining = minDuration - elapsed;
  return remaining > 0 ? new Promise((resolve) => setTimeout(resolve, remaining)) : Promise.resolve();
}

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
    const startedAt = Date.now();
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const res = await getProfile();
        await waitRemaining(startedAt);
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user: res.data.data || res.data, token } });
      } else {
        await waitRemaining(startedAt);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch {
      await AsyncStorage.removeItem('token');
      await waitRemaining(startedAt);
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

  // NEW — logs in if the Google account already has one, registers automatically if not.
  const loginWithGoogle = async (idToken) => {
    const res = await googleLoginUser(idToken);
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
    <AuthContext.Provider value={{ ...state, login, register, loginWithGoogle, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);