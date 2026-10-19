import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Booking } from '../types';
import { format } from 'date-fns';

function generateInitialBookings(): Booking[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  // Create demo dates for current month
  const d1 = new Date(y, m, 3);
  const d2 = new Date(y, m, 9);
  const d3 = new Date(y, m, 7);
  const d4 = new Date(y, m, 14);
  const d5 = new Date(y, m, 18);
  const d6 = new Date(y, m, 24);

  return [
    {
      id: 'book-1',
      petId: 'pet-1', // Персик
      startDate: format(d1, 'yyyy-MM-dd'),
      endDate: format(d2, 'yyyy-MM-dd'),
      dailyRate: 900,
      totalAmount: 6300,
      prepayment: 3000,
      isPaidInFull: false,
      owner: {
        name: 'Анна Смирнова',
        phone: '+7 (999) 123-45-67',
        telegram: 'anna_smirnova',
        whatsapp: '+79991234567',
        notes: 'Уезжает в командировку в Казань.',
      },
      notes: 'Любит спать на подоконнике, чесать пузико нельзя.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'book-2',
      petId: 'pet-2', // Луна
      startDate: format(d3, 'yyyy-MM-dd'),
      endDate: format(d4, 'yyyy-MM-dd'),
      dailyRate: 1000,
      totalAmount: 8000,
      prepayment: 8000,
      isPaidInFull: true,
      owner: {
        name: 'Михаил Котов',
        phone: '+7 (921) 987-65-43',
        telegram: 'mikhail_k',
        whatsapp: '+79219876543',
        notes: 'Привезет свой лоток и домик.',
      },
      notes: 'Давать влажный корм строго в 19:00.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'book-3',
      petId: 'pet-3', // Майло
      startDate: format(d5, 'yyyy-MM-dd'),
      endDate: format(d6, 'yyyy-MM-dd'),
      dailyRate: 1500,
      totalAmount: 10500,
      prepayment: 5000,
      isPaidInFull: false,
      owner: {
        name: 'Елена Кузнецова',
        phone: '+7 (916) 456-78-90',
        telegram: 'elena_kuz',
        whatsapp: '+79164567890',
        notes: 'Передержка на время отпуска.',
      },
      notes: 'Мыть лапы после каждой прогулки специальной пенкой.',
      createdAt: new Date().toISOString(),
    }
  ];
}

export const useBookingsStore = defineStore('bookings', () => {
  const bookings = ref<Booking[]>([]);
  
  // Selection state for creating new bookings by clicking calendar dates
  const selectionStart = ref<string | null>(null);
  const selectionEnd = ref<string | null>(null);

  // Active filter by pet ID (null = all pets)
  const filterPetId = ref<string | null>(null);

  function init() {
    const saved = localStorage.getItem('catlendar_bookings');
    if (saved) {
      try {
        bookings.value = JSON.parse(saved);
      } catch (e) {
        bookings.value = generateInitialBookings();
      }
    } else {
      bookings.value = generateInitialBookings();
      save();
    }
  }

  function save() {
    localStorage.setItem('catlendar_bookings', JSON.stringify(bookings.value));
  }

  const filteredBookings = computed(() => {
    if (!filterPetId.value) return bookings.value;
    return bookings.value.filter(b => b.petId === filterPetId.value);
  });

  function getBookingById(id: string): Booking | undefined {
    return bookings.value.find(b => b.id === id);
  }

  function addBooking(bookingData: Omit<Booking, 'id' | 'createdAt'>): Booking {
    const newBooking: Booking = {
      ...bookingData,
      id: `booking-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    bookings.value.push(newBooking);
    save();
    clearSelection();
    return newBooking;
  }

  function updateBooking(id: string, updates: Partial<Booking>) {
    const idx = bookings.value.findIndex(b => b.id === id);
    if (idx !== -1) {
      bookings.value[idx] = { ...bookings.value[idx], ...updates };
      save();
    }
  }

  function deleteBooking(id: string) {
    bookings.value = bookings.value.filter(b => b.id !== id);
    save();
  }

  function togglePaidInFull(id: string) {
    const booking = getBookingById(id);
    if (booking) {
      booking.isPaidInFull = !booking.isPaidInFull;
      if (booking.isPaidInFull) {
        booking.prepayment = booking.totalAmount;
      }
      save();
    }
  }

  // Selection range management
  function handleDateClick(dateStr: string) {
    if (!selectionStart.value || (selectionStart.value && selectionEnd.value)) {
      // First click: start new range
      selectionStart.value = dateStr;
      selectionEnd.value = null;
    } else {
      // Second click: finish range
      if (dateStr < selectionStart.value) {
        selectionEnd.value = selectionStart.value;
        selectionStart.value = dateStr;
      } else {
        selectionEnd.value = dateStr;
      }
    }
  }

  function setDirectRange(start: string, end: string) {
    selectionStart.value = start;
    selectionEnd.value = end;
  }

  function clearSelection() {
    selectionStart.value = null;
    selectionEnd.value = null;
  }

  // Export / Import
  function exportDataJSON(): string {
    return JSON.stringify({
      bookings: bookings.value,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  function importDataJSON(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.bookings)) {
        bookings.value = data.bookings;
        save();
        return true;
      }
    } catch (e) {
      console.error('Failed to import JSON', e);
    }
    return false;
  }

  init();

  return {
    bookings,
    filteredBookings,
    filterPetId,
    selectionStart,
    selectionEnd,
    getBookingById,
    addBooking,
    updateBooking,
    deleteBooking,
    togglePaidInFull,
    handleDateClick,
    setDirectRange,
    clearSelection,
    exportDataJSON,
    importDataJSON,
  };
});
