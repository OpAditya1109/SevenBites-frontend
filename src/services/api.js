import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err?.response?.data || err)
);

// ── Auth ──────────────────────────────────────────────
export const loginUser = (data) => api.post('/auth/login', data);
export const registerUser = (data) => api.post('/auth/register', data);
export const getProfile = () => api.get('/auth/profile');
export const updateProfile = (data) => api.put('/auth/profile', data);

// ── Restaurants ───────────────────────────────────────
export const getRestaurants = (params) => api.get('/restaurants', { params });
export const getRestaurantById = (id) => api.get(`/restaurants/${id}`);
export const searchRestaurants = (query) => api.get('/restaurants/search', { params: { q: query } });
export const getRestaurantsByCategory = (category) =>
  api.get('/restaurants', { params: { category } });

// ── Menu ──────────────────────────────────────────────
export const getMenuByRestaurant = (restaurantId) =>
  api.get(`/menu/${restaurantId}`);

// ── Orders ────────────────────────────────────────────
export const placeOrder = (data) => api.post('/orders', data);
export const getOrderById = (id) => api.get(`/orders/${id}`);
export const getUserOrders = () => api.get('/orders/my-orders');
export const cancelOrder = (id) => api.put(`/orders/${id}/cancel`);

// ── Address ───────────────────────────────────────────
export const getUserAddresses = () => api.get('/address');
export const addAddress = (data) => api.post('/address', data);
export const deleteAddress = (id) => api.delete(`/address/${id}`);
export const setDefaultAddress = (id) => api.put(`/address/${id}/default`);

// ── Reviews ───────────────────────────────────────────
export const addReview = (data) => api.post('/reviews', data);
export const getReviewsByRestaurant = (restaurantId) =>
  api.get(`/reviews/${restaurantId}`);

export default api;