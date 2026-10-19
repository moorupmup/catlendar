<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isBefore,
  startOfDay,
  parseISO,
  isWithinInterval,
} from 'date-fns';
import { useBookingsStore } from '../stores/bookings';
import { usePetsStore } from '../stores/pets';
import type { Booking, Pet, CalendarDay, CalendarDayBooking } from '../types';
import { Plus, CalendarPlus, X, CheckCircle2, AlertCircle } from 'lucide-vue-next';

const props = defineProps<{
  currentDate: Date;
}>();

const emit = defineEmits<{
  (e: 'select-booking', booking: Booking): void;
  (e: 'create-booking', range: { start: string; end: string }): void;
}>();

const bookingsStore = useBookingsStore();
const petsStore = usePetsStore();

// Tooltip state for 1st tap
const activeTooltip = ref<{
  booking: Booking;
  pet: Pet;
  dayString: string;
  x: number;
  y: number;
} | null>(null);

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// Calculate all days to render in the month grid (including padding days from previous/next months)
const calendarDays = computed<CalendarDay[]>(() => {
  const monthStart = startOfMonth(props.currentDate);
  const monthEnd = endOfMonth(props.currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const rawDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const activeBookings = bookingsStore.filteredBookings;

  // Track vertical slot assignments so overlapping bookings stay in consistent rows across days
  // We sort bookings by startDate to give stable top-to-bottom slots
  const sortedBookings = [...activeBookings].sort((a, b) => a.startDate.localeCompare(b.startDate));

  return rawDays.map(date => {
    const dateString = format(date, 'yyyy-MM-dd');
    const dayStart = startOfDay(date);

    // Find all bookings that cover this day
    const dayBookings: CalendarDayBooking[] = [];

    sortedBookings.forEach((b, index) => {
      const bStart = startOfDay(parseISO(b.startDate));
      const bEnd = startOfDay(parseISO(b.endDate));

      if (isWithinInterval(dayStart, { start: bStart, end: bEnd })) {
        const pet = petsStore.getPetById(b.petId) || {
          id: b.petId,
          name: 'Питомец',
          type: 'cat',
          color: '#FFCCD8',
          avatar: '🐾',
        };

        const isStart = dateString === b.startDate;
        const isEnd = dateString === b.endDate;
        const isMiddle = !isStart && !isEnd;

        dayBookings.push({
          booking: b,
          pet,
          isStart,
          isEnd,
          isMiddle,
          rowSlot: index % 3, // keep within visible max chips
        });
      }
    });

    return {
      date,
      dateString,
      dayNumber: date.getDate(),
      isCurrentMonth: isSameMonth(date, props.currentDate),
      isToday: isToday(date),
      isPast: isBefore(dayStart, startOfDay(new Date())),
      bookings: dayBookings,
    };
  });
});

// Selection range checks
function isDaySelectedStart(dateStr: string): boolean {
  return bookingsStore.selectionStart === dateStr;
}

function isDaySelectedEnd(dateStr: string): boolean {
  return bookingsStore.selectionEnd === dateStr;
}

function isDayInSelectedRange(dateStr: string): boolean {
  if (!bookingsStore.selectionStart || !bookingsStore.selectionEnd) return false;
  return dateStr >= bookingsStore.selectionStart && dateStr <= bookingsStore.selectionEnd;
}

// Calculate days in selected range
const selectedDaysCount = computed(() => {
  if (!bookingsStore.selectionStart) return 0;
  if (!bookingsStore.selectionEnd) return 1;
  const start = parseISO(bookingsStore.selectionStart);
  const end = parseISO(bookingsStore.selectionEnd);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
});

// Handling clicks on a day cell
function handleDayClick(day: CalendarDay, event: MouseEvent) {
  // If clicking on an empty area, handle date range selection
  if (day.bookings.length === 0) {
    activeTooltip.value = null;
    bookingsStore.handleDateClick(day.dateString);
    return;
  }

  // If there are bookings on this day and tooltip is open for the same day, close it or advance
  if (activeTooltip.value && activeTooltip.value.dayString === day.dateString) {
    // Second click on the same day with tooltip open -> open details modal!
    emit('select-booking', activeTooltip.value.booking);
    activeTooltip.value = null;
    return;
  }

  // Otherwise, if day has exactly 1 booking, show tooltip for it
  const targetBooking = day.bookings[0];
  showTooltipForBooking(targetBooking.booking, targetBooking.pet, day.dateString, event);
}

// Handle clicking on a specific booking bar chip
function handleBookingClick(dayBooking: CalendarDayBooking, dayString: string, event: MouseEvent) {
  event.stopPropagation();

  // If tooltip already open for this exact booking -> 2nd tap opens detailed screen!
  if (activeTooltip.value && activeTooltip.value.booking.id === dayBooking.booking.id) {
    emit('select-booking', dayBooking.booking);
    activeTooltip.value = null;
    return;
  }

  // 1st tap: Show tooltip with nickname, avatar, dates and prepayment status
  showTooltipForBooking(dayBooking.booking, dayBooking.pet, dayString, event);
}

function showTooltipForBooking(booking: Booking, pet: Pet, dayString: string, event: MouseEvent) {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();

  activeTooltip.value = {
    booking,
    pet,
    dayString,
    x: Math.min(Math.max(16, rect.left + rect.width / 2), window.innerWidth - 180),
    y: Math.max(70, rect.top - 8),
  };
}

function closeTooltip() {
  activeTooltip.value = null;
}

function openDetailedFromTooltip() {
  if (activeTooltip.value) {
    emit('select-booking', activeTooltip.value.booking);
    activeTooltip.value = null;
  }
}

function confirmCreateBooking() {
  if (bookingsStore.selectionStart) {
    const start = bookingsStore.selectionStart;
    const end = bookingsStore.selectionEnd || bookingsStore.selectionStart;
    emit('create-booking', { start, end });
  }
}
</script>

<template>
  <div class="flex flex-col flex-1 max-w-lg mx-auto w-full px-2 sm:px-4 py-2 relative pb-28" @click="closeTooltip">
    <!-- Days of week Header -->
    <div class="grid grid-cols-7 gap-1 mb-1 text-center">
      <div
        v-for="(day, index) in weekDays"
        :key="day"
        class="text-xs font-bold py-1"
        :class="index >= 5 ? 'text-cat-500 font-extrabold' : 'text-slate-500'"
      >
        {{ day }}
      </div>
    </div>

    <!-- Calendar Month Grid -->
    <div class="grid grid-cols-7 gap-1 sm:gap-1.5 flex-1 bg-white/70 p-1.5 sm:p-2 rounded-3xl border border-cat-100 shadow-cute">
      <div
        v-for="day in calendarDays"
        :key="day.dateString"
        @click="(e) => handleDayClick(day, e)"
        class="relative min-h-[64px] sm:min-h-[76px] rounded-2xl flex flex-col p-1 transition-all select-none cursor-pointer border"
        :class="[
          // Current vs adjacent months
          day.isCurrentMonth ? 'bg-white' : 'bg-cat-50/40 text-slate-300 opacity-60',
          // Selected range styling
          isDayInSelectedRange(day.dateString)
            ? 'bg-cat-100/90 border-cat-400 shadow-inner'
            : isDaySelectedStart(day.dateString) || isDaySelectedEnd(day.dateString)
              ? 'bg-cat-200 border-cat-500 ring-2 ring-cat-400'
              : 'border-cat-50 hover:border-cat-200 hover:bg-cat-50/60',
        ]"
      >
        <!-- Day Number Header -->
        <div class="flex items-center justify-between mb-0.5">
          <span
            class="w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full transition-transform"
            :class="[
              day.isToday
                ? 'bg-cat-500 text-white shadow-cute scale-105 font-black ring-2 ring-cat-200'
                : day.isCurrentMonth
                  ? 'text-slate-700'
                  : 'text-slate-400'
            ]"
          >
            {{ day.dayNumber }}
          </span>

          <!-- Tiny paw icon for today -->
          <span v-if="day.isToday" class="text-[10px] text-cat-500">🐾</span>
        </div>

        <!-- Bookings Bar Slots (Continuous Range Bars) -->
        <div class="flex flex-col gap-1 mt-0.5 flex-1 overflow-hidden">
          <div
            v-for="bDay in day.bookings.slice(0, 3)"
            :key="bDay.booking.id"
            @click="(e) => handleBookingClick(bDay, day.dateString, e)"
            class="h-5 text-[10px] font-bold flex items-center px-1 transition-all shadow-xs cursor-pointer select-none truncate"
            :style="{
              backgroundColor: bDay.pet.color,
              color: bDay.pet.textColor || '#2D1537',
            }"
            :class="[
              // Start day cap
              bDay.isStart ? 'rounded-l-lg ml-0.5 font-extrabold shadow-sm' : '-ml-1',
              // End day cap
              bDay.isEnd ? 'rounded-r-lg mr-0.5' : '-mr-1',
              // Active highlight if tooltip is showing for this booking
              activeTooltip?.booking.id === bDay.booking.id ? 'ring-2 ring-cat-600 scale-105 z-10' : '',
            ]"
            :title="`${bDay.pet.name} (${bDay.booking.startDate} — ${bDay.booking.endDate})`"
          >
            <!-- Show pet avatar and name on start date or on Monday wrap-around -->
            <span v-if="bDay.isStart || day.date.getDay() === 1" class="flex items-center gap-0.5 truncate">
              <span class="text-[11px] leading-none">{{ bDay.pet.avatar }}</span>
              <span class="truncate tracking-tight">{{ bDay.pet.name }}</span>
            </span>
            <!-- Simple colored strip dot on middle/end days to keep it clean -->
            <span v-else class="w-1.5 h-1.5 rounded-full opacity-60" :style="{ backgroundColor: bDay.pet.textColor || '#2D1537' }"></span>
          </div>

          <!-- Indicator if more than 3 bookings on a day -->
          <span v-if="day.bookings.length > 3" class="text-[9px] font-bold text-cat-600 text-center leading-none">
            +{{ day.bookings.length - 3 }} еще
          </span>
        </div>
      </div>
    </div>

    <!-- 1st Tap Tooltip: Cute Floating Popover with Nickname & Prepayment -->
    <transition
      enter-active-class="transition duration-150 ease-out transform"
      enter-from-class="opacity-0 scale-90 translate-y-1"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in transform"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-90"
    >
      <div
        v-if="activeTooltip"
        @click.stop="openDetailedFromTooltip"
        class="fixed z-40 bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-cute-lg border border-cat-200 cursor-pointer max-w-[210px] transform -translate-x-1/2 -translate-y-full hover:scale-105 transition-all"
        :style="{ left: `${activeTooltip.x}px`, top: `${activeTooltip.y}px` }"
      >
        <!-- Arrow pointing down -->
        <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-cat-200 rotate-45"></div>

        <div class="flex items-center gap-2 mb-1">
          <div
            class="w-7 h-7 rounded-xl flex items-center justify-center text-sm shadow-inner"
            :style="{ backgroundColor: activeTooltip.pet.color }"
          >
            {{ activeTooltip.pet.avatar }}
          </div>
          <div class="truncate">
            <h4 class="text-xs font-extrabold text-slate-800 truncate">
              {{ activeTooltip.pet.name }}
            </h4>
            <span class="text-[10px] text-slate-500 block truncate">
              {{ activeTooltip.pet.breed || 'Питомец' }}
            </span>
          </div>
        </div>

        <div class="text-[11px] text-slate-600 bg-cat-50/70 p-1.5 rounded-lg border border-cat-100 mb-1.5 space-y-0.5">
          <div class="flex justify-between">
            <span class="text-slate-400">Сроки:</span>
            <span class="font-semibold text-slate-700">
              {{ activeTooltip.booking.startDate.slice(5) }} — {{ activeTooltip.booking.endDate.slice(5) }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-400">Оплата:</span>
            <span
              class="font-bold flex items-center gap-0.5"
              :class="activeTooltip.booking.isPaidInFull ? 'text-emerald-600' : 'text-amber-600'"
            >
              <CheckCircle2 v-if="activeTooltip.booking.isPaidInFull" class="w-3 h-3" />
              <AlertCircle v-else class="w-3 h-3" />
              {{ activeTooltip.booking.isPaidInFull ? 'Оплачено' : `Аванс ${activeTooltip.booking.prepayment} ₽` }}
            </span>
          </div>
        </div>

        <div class="flex items-center justify-center gap-1 text-[10px] font-bold text-cat-600 animate-pulse">
          <span>Нажмите для деталей</span>
          <span>→</span>
        </div>
      </div>
    </transition>

    <!-- Floating Selection Action Bar (Appears when user selects dates to create new booking) -->
    <transition
      enter-active-class="transition duration-200 ease-out transform"
      enter-from-class="opacity-0 translate-y-8"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in transform"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-8"
    >
      <div
        v-if="bookingsStore.selectionStart"
        class="fixed bottom-6 inset-x-4 max-w-md mx-auto z-30 bg-white/95 backdrop-blur-md rounded-3xl p-3.5 shadow-cute-lg border border-cat-200 flex items-center justify-between gap-3"
      >
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-2xl bg-cat-100 flex items-center justify-center text-cat-600">
            <CalendarPlus class="w-5 h-5" />
          </div>
          <div>
            <h4 class="text-xs font-bold text-slate-700">
              Выбран период ({{ selectedDaysCount }} дн.):
            </h4>
            <p class="text-sm font-extrabold text-cat-700">
              {{ bookingsStore.selectionStart }}
              <span v-if="bookingsStore.selectionEnd"> → {{ bookingsStore.selectionEnd }}</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <button
            @click="bookingsStore.clearSelection"
            class="p-2 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            title="Сбросить выбор"
          >
            <X class="w-5 h-5" />
          </button>
          <button
            @click="confirmCreateBooking"
            class="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cat-500 to-cat-400 text-white text-xs font-bold shadow-cute hover:shadow-cute-lg active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Plus class="w-4 h-4 stroke-[3]" />
            <span>Оформить</span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>
