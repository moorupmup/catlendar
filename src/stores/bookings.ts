import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Booking } from '../types';
import { format } from 'date-fns';

function generateInitialBookings(): Booking[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  // Non-overlapping demo dates (strictly 1 pet at home at a time)
  // Period 1: days 2..6 (Персик)
  const d1 = new Date(y, m, 2);
  const d2 = new Date(y, m, 6);
  // Period 2: days 8..14 (Луна)
  const d3 = new Date(y, m, 8);
  const d4 = new Date(y, m, 14);
  // Period 3: days 17..23 (Майло)
  const d5 = new Date(y, m, 17);
  const d6 = new Date(y, m, 23);

  return [
    {
      id: 'book-1',
      petId: 'pet-1', // Персик
      startDate: format(d1, 'yyyy-MM-dd'),
      endDate: format(d2, 'yyyy-MM-dd'),
      dailyRate: 900,
      totalAmount: 4500,
      prepayment: 4500,
      isPaidInFull: true,
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
      totalAmount: 7000,
      prepayment: 3500,
      isPaidInFull: false,
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
  const selectionConflictError = ref<string | null>(null);

  // Active filter by pet ID (null = all pets)
  const filterPetId = ref<string | null>(null);

  // Check if a list of bookings has any mutual overlaps
  function hasAnyOverlaps(list: Booking[]): boolean {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.startDate <= b.endDate && a.endDate >= b.startDate) {
          return true;
        }
      }
    }
    return false;
  }

  function init() {
    const saved = localStorage.getItem('catlendar_bookings');
    const version = localStorage.getItem('catlendar_data_version');

    if (saved && version === '2.0') {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && !hasAnyOverlaps(parsed)) {
          bookings.value = parsed;
          return;
        }
      } catch (e) {
        console.warn('Resetting corrupt bookings data');
      }
    }

    // Default or migrate to single-pet non-overlapping data
    bookings.value = generateInitialBookings();
    localStorage.setItem('catlendar_data_version', '2.0');
    save();
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

  // Find booking on a specific date (strictly only 1 can exist!)
  function getBookingForDate(dateStr: string): Booking | undefined {
    return bookings.value.find(b => b.startDate <= dateStr && b.endDate >= dateStr);
  }

  // Check if an interval [startDate, endDate] conflicts with any existing booking
  function findConflictingBooking(startDate: string, endDate: string, excludeBookingId?: string): Booking | undefined {
    return bookings.value.find(b => {
      if (excludeBookingId && b.id === excludeBookingId) return false;
      // Overlap condition: start1 <= end2 AND end1 >= start2
      return b.startDate <= endDate && b.endDate >= startDate;
    });
  }

  function addBooking(bookingData: Omit<Booking, 'id' | 'createdAt'>): Booking {
    // Enforce strictly 1 pet at home at a time
    const conflict = findConflictingBooking(bookingData.startDate, bookingData.endDate);
    if (conflict) {
      throw new Error(`В этот период (${conflict.startDate} — ${conflict.endDate}) уже забронирована передержка! Одновременно может проживать только один питомец.`);
    }

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
    if (idx === -1) return;

    const current = bookings.value[idx];
    const targetStart = updates.startDate || current.startDate;
    const targetEnd = updates.endDate || current.endDate;

    const conflict = findConflictingBooking(targetStart, targetEnd, id);
    if (conflict) {
      throw new Error(`Пересечение дат с существующей передержкой (${conflict.startDate} — ${conflict.endDate})! Одновременно может быть только один питомец.`);
    }

    bookings.value[idx] = { ...current, ...updates };
    save();
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

  // Selection range management on free days
  function handleDateClick(dateStr: string) {
    selectionConflictError.value = null;

    // Check if the clicked date is already booked
    if (getBookingForDate(dateStr)) {
      return;
    }

    if (!selectionStart.value || (selectionStart.value && selectionEnd.value)) {
      // First click: start new range
      selectionStart.value = dateStr;
      selectionEnd.value = null;
    } else {
      // Second click: finish range
      const rangeStart = dateStr < selectionStart.value ? dateStr : selectionStart.value;
      const rangeEnd = dateStr < selectionStart.value ? selectionStart.value : dateStr;

      // Crucial: check if there is any booked day between rangeStart and rangeEnd
      const conflict = findConflictingBooking(rangeStart, rangeEnd);
      if (conflict) {
        selectionConflictError.value = `Диапазон пересекает занятые даты (${conflict.startDate} — ${conflict.endDate})! Выберите свободный интервал.`;
        // Reset selection start to the newly clicked date
        selectionStart.value = dateStr;
        selectionEnd.value = null;
      } else {
        selectionStart.value = rangeStart;
        selectionEnd.value = rangeEnd;
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
    selectionConflictError.value = null;
  }

  // Export / Import
  function exportDataJSON(): string {
    return JSON.stringify({
      version: '2.0',
      bookings: bookings.value,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  function importDataJSON(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.bookings)) {
        if (hasAnyOverlaps(data.bookings)) {
          alert('Ошибка: в импортируемом файле есть пересекающиеся передержки на один день!');
          return false;
        }
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
    selectionConflictError,
    getBookingById,
    getBookingForDate,
    findConflictingBooking,
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
