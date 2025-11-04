import { GridClient, GridEnvironment } from '@sqds/grid/native';
import Constants from 'expo-constants';

// Récupérer les variables d'environnement via expo-constants
const expoConfig = Constants.expoConfig?.extra || {};

export const GRID_API_KEY = expoConfig.EXPO_PUBLIC_GRID_API_KEY || '48b93dff-b385-4fcf-b62b-fe859fe381bd';
export const GRID_ENV = (expoConfig.EXPO_PUBLIC_GRID_ENV || 'production') as GridEnvironment;

let gridClientInstance: GridClient | null = null;

export const getGridClient = (): GridClient => {
  if (!gridClientInstance) {
    console.log('🔧 Initializing Grid Client with:', {
      apiKey: GRID_API_KEY ? '***' + GRID_API_KEY.slice(-4) : 'MISSING',
      environment: GRID_ENV
    });

    gridClientInstance = new GridClient({
      apiKey: GRID_API_KEY,
      environment: GRID_ENV,
    });
  }
  return gridClientInstance;
};
