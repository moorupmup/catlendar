import { registerPlugin, Capacitor } from '@capacitor/core';
import type { Booking, Pet } from '../types';

export type WidgetTheme = 'classic' | 'glass_light' | 'glass_dark';

interface WidgetBridgePlugin {
  updateWidgetData(options: { data: string }): Promise<void>;
  setWidgetTheme(options: { theme: string }): Promise<void>;
  getWidgetTheme(): Promise<{ theme: string }>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');

/**
 * Synchronizes current bookings and pet styling with the native Android widget.
 * If bookings or pets are not provided, loads the latest saved state from localStorage.
 */
export async function syncWidgetData(bookings?: Booking[], pets?: Pet[]) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    let currentBookings = bookings;
    if (!currentBookings) {
      const bStr = localStorage.getItem('catlendar_bookings');
      currentBookings = bStr ? JSON.parse(bStr) : [];
    }

    let currentPets = pets;
    if (!currentPets) {
      const pStr = localStorage.getItem('catlendar_pets');
      currentPets = pStr ? JSON.parse(pStr) : [];
    }

    const payload = {
      bookings: (currentBookings || []).map(b => {
        const pet = (currentPets || []).find(p => p.id === b.petId);
        return {
          startDate: b.startDate,
          endDate: b.endDate,
          color: pet?.color || '#FFCCD8',
          textColor: pet?.textColor || '#2D1537',
        };
      }),
    };

    await WidgetBridge.updateWidgetData({ data: JSON.stringify(payload) });
  } catch (err) {
    console.warn('Failed to sync widget data:', err);
  }
}

/**
 * Sets widget background theme ('classic' | 'glass_light' | 'glass_dark').
 */
export async function setWidgetTheme(theme: WidgetTheme) {
  localStorage.setItem('catlendar_widget_theme', theme);
  if (!Capacitor.isNativePlatform()) return;
  try {
    await WidgetBridge.setWidgetTheme({ theme });
  } catch (err) {
    console.warn('Failed to set widget theme:', err);
  }
}

/**
 * Reads the active widget theme.
 */
export async function getWidgetTheme(): Promise<WidgetTheme> {
  const local = (localStorage.getItem('catlendar_widget_theme') as WidgetTheme) || 'classic';
  if (!Capacitor.isNativePlatform()) return local;
  try {
    const res = await WidgetBridge.getWidgetTheme();
    if (res?.theme) {
      localStorage.setItem('catlendar_widget_theme', res.theme);
      return res.theme as WidgetTheme;
    }
  } catch (err) {
    console.warn('Failed to get widget theme:', err);
  }
  return local;
}
