import axios from 'axios';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../utils/constants';

// BASE_URL is like "http://host:5001/api" — the socket server lives at the root, not under /api
const SOCKET_URL = BASE_URL.replace(/\/api\/?$/, '');
let socketInstance = null;

// One shared socket for the app session. Call connectOrderSocket() when a screen
// needs live pushes (e.g. order tracking) and disconnectOrderSocket() on unmount.
export const connectOrderSocket = () => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, { transports: ['websocket'], autoConnect: true });
  } else if (!socketInstance.connected) {
    socketInstance.connect();
  }
  return socketInstance;
};

export const disconnectOrderSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
  }
};

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
    // NEW — exact restaurant coordinates, needed for distance-based delivery ETA on Cart screen
    latitude: r.latitude ?? null,
    longitude: r.longitude ?? null,
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

// Combined search — hits the backend's /search route which matches BOTH restaurants
// (name/cuisine/tags) AND individual dishes (menu item name) in one call.
// Returns { restaurants: [...], menuItems: [...] }, each menu item carrying its
// parent restaurant (already adapted) so a dish result can navigate straight to
// the RestaurantScreen the same way a RestaurantCard does.
export const searchAll = async (query) => {
  const q = (query || '').trim();
  if (q.length < 2) return { restaurants: [], menuItems: [] };

  const res = await api.get('/public/restaurants/search', { params: { q } });

  const restaurants = (res.data.restaurants || []).map(adaptRestaurant);
  const menuItems = (res.data.menuItems || [])
    .filter((item) => item.restaurant) // safety: backend already drops these, but just in case
    .map((item) => ({
      ...adaptMenuItem(item),
      restaurant: adaptRestaurant(item.restaurant),
    }));

  return { restaurants, menuItems };
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
// Every review the logged-in user has written — used for the Profile screen's Rating stat.
export const getMyReviews = () => api.get('/reviews/mine');

// ── Coupons ───────────────────────────────────────────
// "View all coupons" list — every live coupon annotated with eligibility for this cart.
export const getActiveCoupons = (restaurantId, orderValue) =>
  api.get('/coupons', { params: { restaurantId, orderValue } });
// Validates + applies a single coupon code against the current cart.
export const applyCoupon = (code, restaurantId, orderValue) =>
  api.post('/coupons/apply', { code, restaurantId, orderValue });

// ── Delivery ETA ──────────────────────────────────────
// Distance-based delivery estimate using the restaurant's exact saved location
// vs the customer's exact address pin (both lat/lng).
export const getDeliveryEstimate = (restaurantId, lat, lng) =>
  api.get(`/public/restaurants/${restaurantId}/delivery-estimate`, { params: { lat, lng } });

export default api;