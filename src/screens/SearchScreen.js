import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import { searchAll } from '../services/api';
import RestaurantCard from '../components/RestaurantCard';
import { AppLoader, LOADING_MESSAGES } from '../components/AppLoader';

const RECENT_SEARCHES = ['Biryani', 'Pizza near me', 'Burger King', 'Chinese food'];
const TRENDING = ['🔥 Pani Puri', '🍕 Pizza', '🍛 Biryani', '🍔 Burger', '🥗 Salad', '🍰 Cake'];

const isImageUrl = (val) => typeof val === 'string' && /^https?:\/\//.test(val);

function DishResultRow({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.dishRow} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.dishImageWrap}>
        {isImageUrl(item.image) ? (
          <Image source={{ uri: item.image }} style={styles.dishImage} resizeMode="cover" />
        ) : (
          <Text style={styles.dishEmoji}>🍽️</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.dishName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.dishRestaurant} numberOfLines={1}>{item.restaurant?.name}</Text>
        <Text style={styles.dishPrice}>₹{item.price}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.darkTextSecondary} />
    </TouchableOpacity>
  );
}

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);

  const runSearch = useCallback(async (text) => {
    if (text.trim().length < 2) {
      setRestaurants([]);
      setDishes([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { restaurants: r, menuItems: d } = await searchAll(text);
      setRestaurants(r);
      setDishes(d);
    } catch {
      setRestaurants([]);
      setDishes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeText = useCallback((text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(text), 350);
  }, [runSearch]);

  const handleQuickSearch = useCallback((text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch(text);
  }, [runSearch]);

  const clearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery('');
    setRestaurants([]);
    setDishes([]);
    setSearched(false);
  };

  const openRestaurant = (restaurant) => navigation.navigate('Restaurant', { restaurant });

  const hasResults = restaurants.length > 0 || dishes.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.darkTextSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search restaurants, dishes..."
            value={query}
            onChangeText={handleChangeText}
            autoFocus
            placeholderTextColor={COLORS.darkTextSecondary}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={18} color={COLORS.darkTextSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!searched ? (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          {RECENT_SEARCHES.map((s) => (
            <TouchableOpacity key={s} style={styles.recentItem} onPress={() => handleQuickSearch(s)}>
              <Ionicons name="time-outline" size={16} color={COLORS.darkTextSecondary} />
              <Text style={styles.recentText}>{s}</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.darkTextSecondary} />
            </TouchableOpacity>
          ))}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Trending</Text>
          <View style={styles.trendingGrid}>
            {TRENDING.map((t) => (
              <TouchableOpacity key={t} style={styles.trendingChip} onPress={() => handleQuickSearch(t.split(' ')[1] || t)}>
                <Text style={styles.trendingText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : loading ? (
        <AppLoader messages={LOADING_MESSAGES.search} />
      ) : !hasResults ? (
        <View style={styles.noResults}>
          <Ionicons name="search-outline" size={48} color={COLORS.darkTextSecondary} />
          <Text style={styles.noResultsTitle}>No results for "{query}"</Text>
          <Text style={styles.noResultsSubtitle}>Try a different search term</Text>
        </View>
      ) : (
        <FlatList
          data={[]}
          keyExtractor={() => 'x'}
          renderItem={null}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
          ListHeaderComponent={
            <View>
              {restaurants.length > 0 && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={styles.resultsSectionTitle}>Restaurants ({restaurants.length})</Text>
                  {restaurants.map((r) => (
                    <RestaurantCard key={r._id} restaurant={r} onPress={() => openRestaurant(r)} />
                  ))}
                </View>
              )}

              {dishes.length > 0 && (
                <View>
                  <Text style={styles.resultsSectionTitle}>Dishes ({dishes.length})</Text>
                  {dishes.map((d) => (
                    <DishResultRow key={d._id} item={d} onPress={() => openRestaurant(d.restaurant)} />
                  ))}
                </View>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.darkBg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.darkBg, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.darkCard, borderRadius: 12, paddingHorizontal: 12, height: 44, gap: 8, borderWidth: 1, borderColor: COLORS.darkBorder },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.white },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white, marginBottom: 12 },
  resultsSectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.white, paddingHorizontal: 16, marginBottom: 10, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  recentItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder },
  recentText: { flex: 1, fontSize: 14, color: COLORS.darkTextSecondary },
  trendingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  trendingChip: { backgroundColor: COLORS.darkCard, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.darkBorder },
  trendingText: { fontSize: 13, fontWeight: '600', color: COLORS.white },
  noResults: { alignItems: 'center', padding: 40, gap: 8, marginTop: 40 },
  noResultsTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  noResultsSubtitle: { fontSize: 14, color: COLORS.darkTextSecondary },

  dishRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.darkCard, marginHorizontal: 16, marginBottom: 10,
    borderRadius: 12, padding: 10, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  dishImageWrap: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', backgroundColor: COLORS.darkCardAlt, alignItems: 'center', justifyContent: 'center' },
  dishImage: { width: '100%', height: '100%' },
  dishEmoji: { fontSize: 24 },
  dishName: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  dishRestaurant: { fontSize: 12, color: COLORS.darkTextSecondary, marginTop: 2 },
  dishPrice: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginTop: 3 },
});