import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    TextInput,
    Modal,
    Alert,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';

// ── Types ────────────────────────────────────────────────
interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    rating: number;
    reviews: number;
    emoji: string;
    category: string;
    unit?: string;
}

interface CartItem {
    product: Product;
    quantity: number;
}

// ── Mock Data ────────────────────────────────────────────
const PRODUCTS: Product[] = [
    { id: '1', name: 'Premium Car Wash Soap', description: 'pH-balanced formula, safe for all finishes', price: 24.99, rating: 4.8, reviews: 342, emoji: '🧴', category: 'Cleaning Solutions', unit: '1 Gallon' },
    { id: '2', name: 'Ceramic Coating Spray', description: 'Long-lasting protection, hydrophobic finish', price: 39.99, rating: 4.9, reviews: 523, emoji: '✨', category: 'Cleaning Solutions', unit: '16 oz' },
    { id: '3', name: 'Tire Shine Gel', description: 'Non-greasy formula, UV protection', price: 16.99, rating: 4.6, reviews: 287, emoji: '⚫', category: 'Cleaning Solutions', unit: '32 oz' },
    { id: '4', name: 'Glass Cleaner Pro', description: 'Streak-free shine, ammonia-free', price: 12.99, rating: 4.7, reviews: 456, emoji: '🪟', category: 'Cleaning Solutions', unit: '24 oz' },
    { id: '5', name: 'Interior Detailer Spray', description: 'All-surface cleaner, fresh scent', price: 18.99, rating: 4.5, reviews: 198, emoji: '🚗', category: 'Cleaning Solutions', unit: '20 oz' },
    { id: '6', name: 'Dual Action Polisher', description: 'Variable speed, ergonomic design', price: 159.99, rating: 4.9, reviews: 678, emoji: '🔧', category: 'Equipment' },
    { id: '7', name: 'Portable Pressure Washer', description: '2000 PSI, includes accessories', price: 249.99, rating: 4.8, reviews: 892, emoji: '💦', category: 'Equipment' },
    { id: '8', name: 'Wet/Dry Vacuum', description: '6.5 HP, 16 gallon capacity', price: 189.99, rating: 4.7, reviews: 445, emoji: '🌪️', category: 'Equipment' },
    { id: '9', name: 'Foam Cannon Pro', description: 'Adjustable spray pattern, fits most washers', price: 44.99, rating: 4.8, reviews: 734, emoji: '🫧', category: 'Equipment' },
    { id: '10', name: 'Microfiber Towel Set', description: '20-pack premium quality, ultra-soft', price: 34.99, rating: 4.9, reviews: 1234, emoji: '🧽', category: 'Tools & Accessories', unit: '20 pack' },
    { id: '11', name: 'Detailing Brush Kit', description: '10-piece set for all surfaces', price: 29.99, rating: 4.7, reviews: 567, emoji: '🖌️', category: 'Tools & Accessories', unit: '10 pieces' },
    { id: '12', name: 'Foam Applicator Pads', description: 'Contoured design, 6-pack', price: 14.99, rating: 4.6, reviews: 389, emoji: '🟡', category: 'Tools & Accessories', unit: '6 pack' },
    { id: '13', name: 'Wheel Brush Set', description: 'Long-reach design, soft bristles', price: 22.99, rating: 4.8, reviews: 445, emoji: '🪥', category: 'Tools & Accessories', unit: '3 pack' },
    { id: '14', name: 'Paint Sealant', description: '6-month protection, UV resistant', price: 49.99, rating: 4.9, reviews: 678, emoji: '🛡️', category: 'Protection Products', unit: '12 oz' },
    { id: '15', name: 'Leather Conditioner', description: 'Restores & protects, natural oils', price: 26.99, rating: 4.7, reviews: 423, emoji: '💺', category: 'Protection Products', unit: '16 oz' },
];

const CATEGORIES = [
    { key: 'All', icon: 'cube-outline' },
    { key: 'Cleaning Solutions', icon: 'water-outline' },
    { key: 'Equipment', icon: 'construct-outline' },
    { key: 'Tools & Accessories', icon: 'sparkles-outline' },
    { key: 'Protection Products', icon: 'shield-outline' },
];

// ── Main Component ───────────────────────────────────────
export default function Marketplace() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('marketplace');

    // ── Cart helpers ─────────────────────────────────────
    const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
    const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
    const shipping = subtotal >= 100 ? 0 : 9.99;
    const total = subtotal + shipping;

    const getQty = (id: string) => cart.find(i => i.product.id === id)?.quantity ?? 0;

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(i => i.product.id === product.id);
            if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { product, quantity: 1 }];
        });
    };

    const updateQty = (id: string, delta: number) => {
        setCart(prev =>
            prev
                .map(i => i.product.id === id ? { ...i, quantity: i.quantity + delta } : i)
                .filter(i => i.quantity > 0)
        );
    };

    const clearCart = () => setCart([]);

    const checkout = () => {
        if (cart.length === 0) { Alert.alert('Your cart is empty!'); return; }
        Alert.alert(
            'Order Placed!',
            `Total: $${total.toFixed(2)}\nYour supplies will be delivered in 2–3 business days.`,
            [{ text: 'OK', onPress: () => { clearCart(); setCartOpen(false); } }]
        );
    };

    // ── Filtered products ────────────────────────────────
    const filtered = useMemo(() => PRODUCTS.filter(p => {
        const matchCat = activeCategory === 'All' || p.category === activeCategory;
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.description.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    }), [search, activeCategory]);

    // ── Render product card ──────────────────────────────
    const renderProduct = (product: Product) => {
        const qty = getQty(product.id);
        return (
            <View key={product.id} style={[styles.productCard, { backgroundColor: colors.cardBackground, borderColor: colors.divider }]}>
                <View style={[styles.productImageBox, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.1)' : '#e0f4fd' }]}>
                    <Text style={styles.productEmoji}>{product.emoji}</Text>
                </View>
                <Text style={[styles.productName, { color: colors.textPrimary }]} numberOfLines={2}>{product.name}</Text>
                <Text style={[styles.productDesc, { color: colors.textSecondary }]} numberOfLines={2}>{product.description}</Text>
                {product.unit && <Text style={[styles.productUnit, { color: colors.accent }]}>{product.unit}</Text>}
                <View style={styles.ratingRow}>
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text style={[styles.ratingText, { color: colors.textPrimary }]}>{product.rating}</Text>
                    <Text style={[styles.reviewText, { color: colors.textSecondary }]}>({product.reviews})</Text>
                </View>
                <Text style={[styles.productPrice, { color: colors.accent }]}>${product.price.toFixed(2)}</Text>
                {qty === 0 ? (
                    <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.accent }]} onPress={() => addToCart(product)}>
                        <Ionicons name="cart-outline" size={14} color="#fff" />
                        <Text style={styles.addBtnText}> Add to Cart</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.qtyRow}>
                        <TouchableOpacity style={[styles.qtyMinus, { backgroundColor: colors.error }]} onPress={() => updateQty(product.id, -1)}>
                            <Ionicons name="remove" size={16} color="#fff" />
                        </TouchableOpacity>
                        <Text style={[styles.qtyText, { color: colors.textPrimary }]}>{qty}</Text>
                        <TouchableOpacity style={[styles.qtyPlus, { backgroundColor: colors.accent }]} onPress={() => updateQty(product.id, 1)}>
                            <Ionicons name="add" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

            {/* ── Header ── */}
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.divider }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Marketplace</Text>
                        <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Professional detailing supplies</Text>
                    </View>
                    <TouchableOpacity style={[styles.cartBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={() => setCartOpen(true)}>
                        <Ionicons name="cart-outline" size={22} color={colors.textPrimary} />
                        {cartCount > 0 && (
                            <View style={[styles.cartBadge, { backgroundColor: colors.error }]}>
                                <Text style={styles.cartBadgeText}>{cartCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={[styles.searchBar, { backgroundColor: colors.cardBackground, borderColor: colors.divider }]}>
                    <Ionicons name="search-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.textPrimary }]}
                        placeholder="Search products..."
                        placeholderTextColor={colors.textSecondary}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Categories ── */}
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Categories</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat.key}
                            style={[styles.categoryPill, { backgroundColor: colors.cardBackground, borderColor: colors.divider }, activeCategory === cat.key && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                            onPress={() => setActiveCategory(cat.key)}
                        >
                            <Ionicons
                                name={cat.icon as any}
                                size={14}
                                color={activeCategory === cat.key ? '#fff' : colors.textSecondary}
                            />
                            <Text style={[styles.categoryText, { color: colors.textSecondary }, activeCategory === cat.key && styles.categoryTextActive]}>
                                {' '}{cat.key}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* ── Products ── */}
                <View style={styles.productsHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Products</Text>
                    <Text style={[styles.productCount, { color: colors.textSecondary }]}>{filtered.length} items</Text>
                </View>

                {filtered.length === 0 ? (
                    <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground, borderColor: colors.divider }]}>
                        <Ionicons name="cube-outline" size={48} color={isDark ? '#444' : '#d1d5db'} />
                        <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No products found</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Try a different search or category</Text>
                    </View>
                ) : (
                    <View style={styles.productGrid}>
                        {filtered.map(renderProduct)}
                    </View>
                )}

                {/* ── Info Banner ── */}
                <View style={[styles.infoBanner, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.1)' : '#e0f4fd', borderColor: isDark ? 'rgba(12, 166, 232, 0.2)' : '#0ca6e8' }]}>
                    <Text style={styles.infoBannerEmoji}>🚚</Text>
                    <View style={styles.infoBannerText}>
                        <Text style={[styles.infoBannerTitle, { color: colors.accent }]}>Free Shipping</Text>
                        <Text style={[styles.infoBannerDesc, { color: colors.textSecondary }]}>
                            Orders over $100 ship free! 2–3 day delivery on all supplies.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* ── Cart Modal ── */}
            <Modal visible={cartOpen} animationType="slide" transparent onRequestClose={() => setCartOpen(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        {/* Modal Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
                            <View>
                                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Shopping Cart</Text>
                                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>{cartCount} item{cartCount !== 1 ? 's' : ''}</Text>
                            </View>
                            <TouchableOpacity style={[styles.modalClose, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]} onPress={() => setCartOpen(false)}>
                                <Ionicons name="close" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            {cart.length === 0 ? (
                                <View style={styles.emptyCart}>
                                    <Ionicons name="cart-outline" size={56} color={isDark ? '#444' : '#d1d5db'} />
                                    <Text style={[styles.emptyCartText, { color: colors.textSecondary }]}>Your cart is empty</Text>
                                    <TouchableOpacity style={[styles.continueBtn, { backgroundColor: colors.accent }]} onPress={() => setCartOpen(false)}>
                                        <Text style={styles.continueBtnText}>Continue Shopping</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    {cart.map(item => (
                                        <View key={item.product.id} style={[styles.cartItem, { backgroundColor: colors.cardBackground, borderColor: colors.divider }]}>
                                            <Text style={styles.cartItemEmoji}>{item.product.emoji}</Text>
                                            <View style={styles.cartItemInfo}>
                                                <Text style={[styles.cartItemName, { color: colors.textPrimary }]} numberOfLines={1}>{item.product.name}</Text>
                                                <Text style={[styles.cartItemPrice, { color: colors.textSecondary }]}>${item.product.price.toFixed(2)}</Text>
                                            </View>
                                            <View style={styles.qtyRow}>
                                                <TouchableOpacity style={[styles.qtyMinus, { backgroundColor: colors.error }]} onPress={() => updateQty(item.product.id, -1)}>
                                                    <Ionicons name="remove" size={14} color="#fff" />
                                                </TouchableOpacity>
                                                <Text style={[styles.qtyText, { color: colors.textPrimary }]}>{item.quantity}</Text>
                                                <TouchableOpacity style={[styles.qtyPlus, { backgroundColor: colors.accent }]} onPress={() => updateQty(item.product.id, 1)}>
                                                    <Ionicons name="add" size={14} color="#fff" />
                                                </TouchableOpacity>
                                            </View>
                                            <Text style={[styles.cartItemTotal, { color: colors.accent }]}>${(item.product.price * item.quantity).toFixed(2)}</Text>
                                        </View>
                                    ))}

                                    {/* Summary */}
                                    <View style={[styles.summaryBox, { backgroundColor: isDark ? 'rgba(12, 166, 232, 0.1)' : '#e0f4fd', borderColor: isDark ? 'rgba(12, 166, 232, 0.2)' : '#0ca6e8' }]}>
                                        <View style={styles.summaryRow}>
                                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                                            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>${subtotal.toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.summaryRow}>
                                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Shipping</Text>
                                            {shipping === 0
                                                ? <Text style={[styles.summaryValue, { color: colors.success }]}>FREE</Text>
                                                : <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>${shipping.toFixed(2)}</Text>
                                            }
                                        </View>
                                        <View style={[styles.summaryRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 8 }]}>
                                            <Text style={[styles.summaryTotal, { color: colors.textPrimary }]}>Total</Text>
                                            <Text style={[styles.summaryTotalValue, { color: colors.accent }]}>${total.toFixed(2)}</Text>
                                        </View>
                                    </View>

                                    {/* Actions */}
                                    <TouchableOpacity style={[styles.checkoutBtn, { backgroundColor: colors.accent }]} onPress={checkout}>
                                        <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.clearBtn, { borderColor: colors.error }]} onPress={clearCart}>
                                        <Text style={[styles.clearBtnText, { color: colors.error }]}>Clear Cart</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ── Bottom Navigation ── */}
            <View style={[styles.bottomNav, { backgroundColor: colors.cardBackground, borderTopColor: colors.divider }]}>
                {[
                    { key: 'home', icon: 'home-outline', label: 'Home' },
                    { key: 'jobs', icon: 'briefcase-outline', label: 'My Jobs' },
                    { key: 'earnings', icon: 'cash-outline', label: 'Earnings' },
                    { key: 'marketplace', icon: 'cart-outline', label: 'Shop' },
                    { key: 'profile', icon: 'person-outline', label: 'Profile' },
                ].map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={styles.navItem}
                        onPress={() => {
                            if (tab.key === 'home') router.push('/washer-home' as any);
                            else if (tab.key === 'jobs') router.push('/myjobs' as any);
                            else if (tab.key === 'profile') router.push('/profile' as any);
                            else setActiveTab(tab.key);
                        }}
                    >
                        <Ionicons name={tab.icon as any} size={22} color={activeTab === tab.key ? colors.accent : colors.textSecondary} />
                        <Text style={[styles.navLabel, { color: colors.textSecondary }, activeTab === tab.key && { color: colors.accent, fontWeight: '600' }]}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}      </View>
        </SafeAreaView>
    );
}

// ── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
    safe:               { flex: 1 },
    scroll:             { flex: 1 },
    scrollContent:      { paddingHorizontal: 16, paddingBottom: 100 },

    // Header
    header:             { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, borderBottomWidth: 1, zIndex: 10 },
    headerTop:          { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    backBtn:            { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    headerCenter:       { flex: 1 },
    headerTitle:        { fontSize: 18, fontWeight: '700' },
    headerSub:          { fontSize: 12 },
    cartBtn:            { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    cartBadge:          { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    cartBadgeText:      { color: '#fff', fontSize: 10, fontWeight: '700' },
    searchBar:          { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
    searchInput:        { flex: 1, fontSize: 14, padding: 0 },

    // Section
    sectionTitle:       { fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 10 },
    productCount:       { fontSize: 13, marginTop: 16 },
    productsHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

    // Categories
    categoryScroll:     { marginBottom: 4 },
    categoryPill:       { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1 },
    categoryPillActive: { },
    categoryText:       { fontSize: 13, fontWeight: '500' },
    categoryTextActive: { color: '#fff' },

    // Products
    productGrid:        { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    productCard:        { width: '48.5%', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, elevation: 2 },
    productImageBox:    { borderRadius: 12, height: 80, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    productEmoji:       { fontSize: 36 },
    productName:        { fontSize: 13, fontWeight: '700', marginBottom: 4 },
    productDesc:        { fontSize: 11, marginBottom: 4, lineHeight: 16 },
    productUnit:        { fontSize: 11, fontWeight: '600', marginBottom: 4 },
    ratingRow:          { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    ratingText:         { fontSize: 11, fontWeight: '600', marginLeft: 3 },
    reviewText:         { fontSize: 11, marginLeft: 2 },
    productPrice:       { fontSize: 16, fontWeight: '800', marginBottom: 8 },
    addBtn:             { flexDirection: 'row', borderRadius: 10, paddingVertical: 8, justifyContent: 'center', alignItems: 'center' },
    addBtnText:         { color: '#fff', fontSize: 12, fontWeight: '700' },
    qtyRow:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    qtyMinus:           { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    qtyPlus:            { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    qtyText:            { fontSize: 14, fontWeight: '700' },

    // Empty
    emptyCard:          { borderRadius: 16, padding: 32, alignItems: 'center', marginTop: 8, borderWidth: 1 },
    emptyTitle:         { fontSize: 16, fontWeight: '600', marginTop: 12 },
    emptySubtitle:      { fontSize: 13, marginTop: 4 },

    // Info Banner
    infoBanner:         { flexDirection: 'row', borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 8, marginBottom: 16, alignItems: 'center' },
    infoBannerEmoji:    { fontSize: 32, marginRight: 14 },
    infoBannerText:     { flex: 1 },
    infoBannerTitle:    { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    infoBannerDesc:     { fontSize: 12, lineHeight: 18 },

    // Modal
    modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalSheet:         { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: 30, borderTopWidth: 1 },
    modalHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
    modalTitle:         { fontSize: 18, fontWeight: '700' },
    modalSub:           { fontSize: 13, marginTop: 2 },
    modalClose:         { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    modalScroll:        { paddingHorizontal: 20 },
    emptyCart:          { alignItems: 'center', paddingVertical: 40 },
    emptyCartText:      { fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 20 },
    continueBtn:        { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28 },
    continueBtnText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
    cartItem:           { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1 },
    cartItemEmoji:      { fontSize: 28, marginRight: 10 },
    cartItemInfo:       { flex: 1 },
    cartItemName:       { fontSize: 13, fontWeight: '600' },
    cartItemPrice:      { fontSize: 12, marginTop: 2 },
    cartItemTotal:      { fontSize: 14, fontWeight: '700', marginLeft: 10 },
    summaryBox:         { borderRadius: 14, padding: 16, marginTop: 16, borderWidth: 1 },
    summaryRow:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    summaryLabel:       { fontSize: 14 },
    summaryValue:       { fontSize: 14, fontWeight: '600' },
    summaryTotal:       { fontSize: 15, fontWeight: '700' },
    summaryTotalValue:  { fontSize: 18, fontWeight: '800' },
    checkoutBtn:        { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
    checkoutBtnText:    { color: '#fff', fontSize: 15, fontWeight: '700' },
    clearBtn:           { borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
    clearBtnText:       { fontSize: 15, fontWeight: '600' },

    // Bottom Nav
    bottomNav:          { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, flexDirection: 'row', paddingBottom: 20, paddingTop: 10, elevation: 10 },
    navItem:            { flex: 1, alignItems: 'center', justifyContent: 'center' },
    navLabel:           { fontSize: 10, marginTop: 3, fontWeight: '500' },
    navLabelActive:     { },
  });