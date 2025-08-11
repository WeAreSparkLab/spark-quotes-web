// utils/mockAsyncStorage.ts

// This is a mock implementation of AsyncStorage for web preview/testing.
// In a real Expo project, you would typically use:
// import AsyncStorage from '@react-native-async-storage/async-storage';

export const mockAsyncStorage = {
    _data: {} as Record<string, string>,
    setItem: async (key: string, value: string) => {
        try {
            mockAsyncStorage._data[key] = value;
            // console.log(`Mock AsyncStorage: Set item '${key}' to '${value}'`);
            return Promise.resolve(null);
        } catch (e) {
            console.error("Mock AsyncStorage: Failed to set item.", e);
            return Promise.reject(e);
        }
    },
    getItem: async (key: string) => {
        try {
            const value = mockAsyncStorage._data[key] || null;
            // console.log(`Mock AsyncStorage: Got item '${key}' as '${value}'`);
            return Promise.resolve(value);
        } catch (e) {
            console.error("Mock AsyncStorage: Failed to get item.", e);
            return Promise.reject(e);
        }
    },
    removeItem: async (key: string) => {
        try {
            delete mockAsyncStorage._data[key];
            // console.log(`Mock AsyncStorage: Removed item '${key}'`);
            return Promise.resolve(null);
        } catch (e) {
            console.error("Mock AsyncStorage: Failed to remove item.", e);
            return Promise.reject(e);
        }
    }
};
