import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err?.response?.data || err)
);

// ── Adapters: real backend field names -> shape existing screens/components expect ──
function adaptRestaurant(r) {
  return {
    _id: r._id,
    name: r.restaurantName,
    cuisine: r.cuisine?.length ? r.cuisine : (r.cuisineType ? [r.cuisineType] : []),
    rating: r.rating ?? 4.0,
    totalRatings: r.totalRatings ?? 0,
    deliveryTime: r.deliveryTime || '30-45 min',
    deliveryFee: r.deliveryFee ?? 0,
    minOrder: r.minOrder ?? 0,
    image: r.coverImageUrl || r.logoUrl || '',
    address: { street: r.address, city: r.city, pincode: r.pincode },
    isOpen: r.isOpenNow !== undefined ? r.isOpenNow : true,
    isVeg: false,
    offer: '',
    tags: r.tags || [],
    category: r.cuisineType || '',
  };
}

function adaptMenuItem(item) {
  return {
    _id: item._id,
    name: item.name,
    description: item.description,
    price: item.effectivePrice ?? item.price,
    category: typeof item.category === 'object' ? item.category?.name : item.category,
    image: item.images?.[0] || '',
    isVeg: item.foodType === 'veg',
    isAvailable: item.isAvailable,
    inStock: item.isAvailable !== false && item.stockStatus !== 'out_of_stock',
    isBestseller: item.isBestseller,
    rating: 4.0,
    addOns: item.addOns || [],
    variants: item.variants || [],
  };
}

// ── Auth ──────────────────────────────────────────────
export const loginUser = (data) => api.post('/auth/login', data);
export const registerUser = (data) => api.post('/auth/register', data);
export const getProfile = () => api.get('/auth/profile');
export const updateProfile = (data) => api.put('/auth/profile', data);

// ── Restaurants (now hitting the real public API) ──────
export const getRestaurants = async (params) => {
  const res = await api.get('/public/restaurants', { params });
  const list = (res.data.restaurants || []).map(adaptRestaurant);
  return { data: { success: true, data: list, total: list.length } };
};

export const getRestaurantById = async (id) => {
  const res = await api.get(`/public/restaurants/${id}/full`);
  return { data: { success: true, data: adaptRestaurant({ ...res.data.restaurant, isOpenNow: res.data.isOpenNow }) } };
};

export const searchRestaurants = async (query) => {
  const res = await api.get('/public/restaurants');
  const q = (query || '').toLowerCase();
  const list = (res.data.restaurants || [])
    .filter((r) => r.restaurantName?.toLowerCase().includes(q) || r.cuisineType?.toLowerCase().includes(q))
    .map(adaptRestaurant);
  return { data: { success: true, data: list } };
};

export const getRestaurantsByCategory = (category) => getRestaurants({ category });

// ── Menu — returns { data, grouped } directly (matches RestaurantScreen.js expectation) ──
export const getMenuByRestaurant = async (restaurantId) => {
  const res = await api.get(`/public/restaurants/${restaurantId}/full`);
  const menuSections = res.data.menu || [];
  const flatItems = [];
  const grouped = {};
  menuSections.forEach(({ category, items }) => {
    const adapted = items.map(adaptMenuItem);
    grouped[category.name] = adapted;
    flatItems.push(...adapted);
  });
  return { data: flatItems, grouped };
};

// ── Orders ────────────────────────────────────────────
export const placeOrder = (data) => api.post('/orders', data);
export const getOrderById = (id) => api.get(`/orders/${id}`);
export const getUserOrders = () => api.get('/orders/my-orders');
export const cancelOrder = (id) => api.put(`/orders/${id}/cancel`);

// ── Razorpay (online payment: upi / card / wallet) ─────
// Step 1: ask backend to create a Razorpay order for this amount (rupees).
export const createRazorpayOrder = (amount) => api.post('/orders/create-razorpay-order', { amount });
// Step 2: after the Razorpay checkout succeeds, send the payment result + the
// order details back so the backend can verify the signature and save the order.
export const verifyPaymentAndPlaceOrder = (data) => api.post('/orders/verify-payment', data);

// ── Address ───────────────────────────────────────────
export const getUserAddresses = () => api.get('/address');
export const addAddress = (data) => api.post('/address', data);
export const deleteAddress = (id) => api.delete(`/address/${id}`);
export const setDefaultAddress = (id) => api.put(`/address/${id}/default`);

// ── Reviews ───────────────────────────────────────────
export const addReview = (data) => api.post('/reviews', data);
export const getReviewsByRestaurant = (restaurantId) => api.get(`/reviews/${restaurantId}`);

export default api;