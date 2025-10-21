
// Pour simulateur iOS: utiliser localhost
// Pour émulateur Android: utiliser 10.0.2.2 (alias localhost)
// Pour appareil physique (même réseau WiFi): utiliser 192.168.1.44 (IP locale)
// Pour appareil physique (4G/5G): utiliser ngrok
export const API_URL = 'http://localhost:3001';
export const BRIDGE_URL = 'http://localhost:3001';

// Alternative pour ngrok (téléphone physique en 4G/5G):
// ngrok http 3001
// Puis remplace par l'URL ngrok

console.log('✅ Config:', { API_URL, BRIDGE_URL });