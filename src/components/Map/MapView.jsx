import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Dimensions } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';

MapLibreGL.setAccessToken(null);

export default function MapView({ role = 'passenger' }) {
    const [destination, setDestination] = useState('');

    return (
        <View style={styles.container}>
            {/* ── BACKGROUND LAYER: Mobile Vector Native Canvas ── */}
            <MapLibreGL.MapView
                style={styles.mapCanvas}
                styleURL="https://demotiles.maplibre.org/style.json"
                logoEnabled={false}
            >
                <MapLibreGL.Camera
                    zoomLevel={13}
                    centerCoordinate={[125.6092, 7.0707]} // Centered on Davao City
                />
            </MapLibreGL.MapView>

            {/* ── FOREGROUND LAYER: Passenger Native UI Overlay ── */}
            {role === 'passenger' && (
                <View style={styles.floatingCard}>
                    <Text style={styles.cardTitle}>Where are you heading? 🚌</Text>
                    <Text style={styles.cardSubtitle}>Calculate real-time routes and bus fares</Text>

                    <View style={styles.inputWrapper}>
                        <Text style={styles.inputIcon}>📍</Text>
                        <TextInput
                            style={styles.inputField}
                            placeholder="Enter terminal or destination..."
                            placeholderTextColor="#64748b"
                            value={destination}
                            onChangeText={setDestination}
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.actionButton}
                        activeOpacity={0.8}
                        onPress={() => alert(`Calculating mobile route to: ${destination}`)}
                    >
                        <Text style={styles.actionButtonText}>Calculate Route</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ── FOREGROUND LAYER: Driver Native Status Overlay ── */}
            {role === 'driver' && (
                <View style={[styles.floatingCard, styles.driverCard]}>
                    <View style={styles.statusRow}>
                        <View style={styles.pulseDot} />
                        <Text style={styles.driverStatusText}>Broadcasting Live Coordinates</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: { flex: 1, position: 'relative', backgroundColor: '#0f172a' },
    mapCanvas: { ...StyleSheet.absoluteFillObject },
    floatingCard: {
        position: 'absolute',
        top: 50,
        left: width * 0.05,
        width: width * 0.9,
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 16,
        padding: 16,
        elevation: 10,
    },
    driverCard: { top: 'auto', bottom: 30, borderColor: '#10b981' },
    cardTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '700', marginBottom: 4 },
    cardSubtitle: { color: '#94a3b8', fontSize: 13, marginBottom: 16 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 48,
        marginBottom: 12,
    },
    inputIcon: { marginRight: 8, fontSize: 16 },
    inputField: { flex: 1, color: '#f1f5f9', fontSize: 15 },
    actionButton: { backgroundColor: '#38bdf8', height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    actionButtonText: { color: '#0f172a', fontSize: 15, fontWeight: '600' },
    statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
    driverStatusText: { color: '#f1f5f9', fontSize: 14, fontWeight: '600' },
});