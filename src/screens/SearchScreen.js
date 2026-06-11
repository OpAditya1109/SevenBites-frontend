import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import { searchRestaurants } from '../services/api';
import RestaurantCard from '../components/RestaurantCard';
import { MOCK_RESTAURANTS } from './HomeScreen';

const RECENT_SEARCHES = ['Biryani', 'Pizza near me', 'Burger King', 'Chinese food'];
const TRENDING = ['🔥 Pani Puri', '🍕 Pizza', '🍛 Biryani', '🍔 Burger', '🥗 Salad', '🍰 Cake'];

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async (text) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchRestaurants(text);
      setResults(res.data.data || res.data);
    } catch {
      setResults(MOCK_RESTAURANTS.filter((r) =>
        r.name.toLowerCase().includes(text.toLowerCase()) ||
        r.cuisine.some((c) => c.toLowerCase().includes(text.toLowerCase()))
      ));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search restaurants, dishes..."
            value={query}
            onChangeText={handleSearch}
            autoFocus
            placeholderTextColor={COLORS.placeholder}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
              <Ionicons name="close-circle" size={18} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!searched ? (
        <View style={styles.content}>
          {/* Recent Searches */}
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          {RECENT_SEARCHES.map((s) => (
            <TouchableOpacity key={s} style={styles.recentItem} onPress={() => handleSearch(s)}>
              <Ionicons name="time-outline" size={16} color={COLORS.gray} />
              <Text style={styles.recentText}>{s}</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.gray} />
            </TouchableOpacity>
          ))}

          {/* Trending */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Trending</Text>
          <View style={styles.trendingGrid}>
            {TRENDING.map((t) => (
              <TouchableOpacity
                key={t}
                style={styles.trendingChip}
                onPress={() => handleSearch(t.split(' ')[1] || t)}
              >
                <Text style={styles.trendingText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <RestaurantCard
              restaurant={item}
              onPress={() => navigation.navigate('Restaurant', { restaurant: item })}
            />
          )}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : (
              <View style={styles.noResults}>
                <Text style={styles.noResultsEmoji}>🔍</Text>
                <Text style={styles.noResultsTitle}>No results for "{query}"</Text>
                <Text style={styles.noResultsSubtitle}>Try a different search term</Text>
              </View>
            )
          }
          contentContainerStyle={{ paddingTop: 8 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 12, height: 44, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.black },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.black, marginBottom: 12 },
  recentItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  recentText: { flex: 1, fontSize: 14, color: COLORS.darkGray },
  trendingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  trendingChip: { backgroundColor: COLORS.white, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  trendingText: { fontSize: 13, fontWeight: '600', color: COLORS.black },
  noResults: { alignItems: 'center', padding: 40, gap: 8, marginTop: 40 },
  noResultsEmoji: { fontSize: 48 },
  noResultsTitle: { fontSize: 18, fontWeight: '700', color: COLORS.black },
  noResultsSubtitle: { fontSize: 14, color: COLORS.gray },
});