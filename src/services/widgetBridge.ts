import { registerPlugin, Capacitor } from '@capacitor/core';
import type { Booking, Pet } from '../types';

interface WidgetBridgePlugin {
  updateWidgetData(options: { data: string }): Promise<void>;
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
