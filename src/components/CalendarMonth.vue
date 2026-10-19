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
import type { Booking, Pet, CalendarDay } from '../types';
import { Plus, CalendarPlus, X, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-vue-next';

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

// Calculate all days to render in the month grid
const calendarDays = computed<CalendarDay[]>(() => {
  const monthStart = startOfMonth(props.currentDate);
  const monthEnd = endOfMonth(props.currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const rawDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const activeBookings = bookingsStore.filteredBookings;

  return rawDays.map(date => {
    const dateString = format(date, 'yyyy-MM-dd');
    const dayStart = startOfDay(date);

    // Strictly 1 pet at home at a time! Find the booking covering this day
    const booking = activeBookings.find(b => {
      const bStart = startOfDay(parseISO(b.startDate));
      const bEnd = startOfDay(parseISO(b.endDate));
      return isWithinInterval(dayStart, { start: bStart, end: bEnd });
    });

    let pet: Pet | undefined;
    let isStart = false;
    let isEnd = false;

    if (booking) {
      pet = petsStore.getPetById(booking.petId) || {
        id: booking.petId,
        name: 'Питомец',
        type: 'cat',
        color: '#FFD6A5',
        textColor: '#693B00',
        avatar: '🐾',
      };
      isStart = dateString === booking.startDate;
      isEnd = dateString === booking.endDate;
    }

    return {
      date,
      dateString,
      dayNumber: date.getDate(),
      isCurrentMonth: isSameMonth(date, props.currentDate),
      isToday: isToday(date),
      isPast: isBefore(dayStart, startOfDay(new Date())),
      booking,
      pet,
      isStart,
      isEnd,
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
  // If clicking on an empty unbooked day -> selection mode for new booking
  if (!day.booking || !day.pet) {
    activeTooltip.value = null;
    bookingsStore.handleDateClick(day.dateString);
    return;
  }

  // If clicked on an already booked day:
  // If tooltip already open for this exact booking -> 2nd tap opens detailed screen!
  if (activeTooltip.value && activeTooltip.value.booking.id === day.booking.id) {
    emit('select-booking', day.booking);
    activeTooltip.value = null;
    return;
  }

  // 1st tap: Show cute tooltip
  showTooltipForBooking(day.booking, day.pet, day.dateString, event);
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
    <div class="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1 text-center">
      <div
        v-for="(day, index) in weekDays"
        :key="day"
        class="text-xs font-bold py-1 select-none"
        :class="index >= 5 ? 'text-cat-500 font-extrabold' : 'text-slate-500'"
      >
        {{ day }}
      </div>
    </div>

    <!-- Calendar Month Grid (Equal Aspect Ratio Squares) -->
    <div class="grid grid-cols-7 gap-1 sm:gap-1.5 bg-white/70 p-1.5 sm:p-2.5 rounded-3xl border border-cat-100 shadow-cute">
      <div
        v-for="day in calendarDays"
        :key="day.dateString"
        @click="(e) => handleDayClick(day, e)"
        class="aspect-square rounded-xl sm:rounded-2xl flex flex-col justify-between p-1 sm:p-1.5 transition-all select-none cursor-pointer border relative overflow-hidden group shadow-xs active:scale-95"
        :style="day.booking && day.pet ? {
          backgroundColor: day.pet.color,
          borderColor: day.pet.color,
          color: day.pet.textColor || '#2D1537',
        } : {}"
        :class="[
          // When day has booking: fully colored square
          day.booking && day.pet
            ? 'shadow-sm font-bold ring-offset-1'
            : // Free day: within selection range
              isDayInSelectedRange(day.dateString)
              ? 'bg-cat-200 border-cat-400 text-cat-800 shadow-inner ring-2 ring-cat-300'
              : isDaySelectedStart(day.dateString) || isDaySelectedEnd(day.dateString)
                ? 'bg-cat-300 border-cat-500 text-white font-black ring-2 ring-cat-400'
                : // Unbooked regular day
                  day.isCurrentMonth
                    ? 'bg-white border-cat-100/70 text-slate-700 hover:border-cat-300 hover:bg-cat-50/50'
                    : 'bg-cat-50/40 border-cat-50 text-slate-300 opacity-50',
          // Active ring if tooltip open for this day
          activeTooltip?.dayString === day.dateString ? 'ring-2 ring-cat-600 scale-102 z-10' : '',
        ]"
      >
        <!-- Top bar: Day Number & Indicators -->
        <div class="flex items-center justify-between w-full leading-none">
          <span
            class="w-5 h-5 sm:w-5.5 sm:h-5.5 flex items-center justify-center text-[11px] sm:text-xs font-black rounded-full transition-transform"
            :class="[
              day.isToday && !day.booking
                ? 'bg-cat-500 text-white shadow-xs scale-105'
                : day.isToday && day.booking
                  ? 'bg-black/20 text-current'
                  : ''
            ]"
          >
            {{ day.dayNumber }}
          </span>

          <!-- Check-in / Check-out badge or Paw on today -->
          <span v-if="day.isStart" class="text-[9px] font-black uppercase tracking-tighter opacity-80 bg-black/10 px-1 py-0.5 rounded">
            заезд
          </span>
          <span v-else-if="day.isEnd" class="text-[9px] font-black uppercase tracking-tighter opacity-80 bg-black/10 px-1 py-0.5 rounded">
            выезд
          </span>
          <span v-else-if="day.isToday" class="text-[10px] text-cat-500">🐾</span>
        </div>

        <!-- Center: Pet Avatar (if booked) or Selection Marker -->
        <div class="flex flex-col items-center justify-center flex-1 my-0.5 pointer-events-none">
          <!-- Booked Pet Avatar -->
          <template v-if="day.booking && day.pet">
            <span class="text-base sm:text-xl drop-shadow-xs leading-none transform group-hover:scale-110 transition-transform">
              {{ day.pet.avatar }}
            </span>
          </template>

          <!-- Free day in selection mode -->
          <template v-else-if="isDaySelectedStart(day.dateString) || isDaySelectedEnd(day.dateString)">
            <span class="text-xs sm:text-sm font-black text-cat-600">✓</span>
          </template>

          <!-- Subtle plus icon on hover for free days -->
          <template v-else-if="day.isCurrentMonth">
            <span class="text-[10px] text-cat-300 opacity-0 group-hover:opacity-100 transition-opacity">
              +
            </span>
          </template>
        </div>

        <!-- Bottom: Pet Name (strictly single pet!) -->
        <div class="w-full text-center pointer-events-none">
          <p
            v-if="day.booking && day.pet"
            class="text-[9px] sm:text-[10px] font-extrabold truncate w-full leading-tight tracking-tight"
          >
            {{ day.pet.name }}
          </p>
          <span v-else class="h-2.5 block"></span>
        </div>
      </div>
    </div>

    <!-- Selection Conflict Warning Banner -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="bookingsStore.selectionConflictError"
        class="mt-2 bg-amber-50 border border-amber-300 text-amber-900 p-2.5 rounded-2xl text-xs flex items-center justify-between gap-2 shadow-sm"
      >
        <div class="flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0" />
          <span class="font-bold">{{ bookingsStore.selectionConflictError }}</span>
        </div>
        <button
          @click="bookingsStore.selectionConflictError = null"
          class="text-amber-600 hover:text-amber-800 p-1"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>
    </transition>

    <!-- 1st Tap Tooltip: Floating Popover with Nickname & Prepayment -->
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
        class="fixed z-40 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-cute-lg border border-cat-200 cursor-pointer max-w-[210px] transform -translate-x-1/2 -translate-y-full hover:scale-105 transition-all"
        :style="{ left: `${activeTooltip.x}px`, top: `${activeTooltip.y}px` }"
      >
        <!-- Arrow pointing down -->
        <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-cat-200 rotate-45"></div>

        <div class="flex items-center gap-2 mb-1.5">
          <div
            class="w-8 h-8 rounded-xl flex items-center justify-center text-base shadow-inner border border-white"
            :style="{ backgroundColor: activeTooltip.pet.color }"
          >
            {{ activeTooltip.pet.avatar }}
          </div>
          <div class="truncate">
            <h4 class="text-xs font-black text-slate-800 truncate">
              {{ activeTooltip.pet.name }}
            </h4>
            <span class="text-[10px] text-slate-500 block truncate">
              {{ activeTooltip.pet.breed || 'Питомец' }}
            </span>
          </div>
        </div>

        <div class="text-[11px] text-slate-600 bg-cat-50/70 p-2 rounded-xl border border-cat-100 mb-1.5 space-y-0.5">
          <div class="flex justify-between">
            <span class="text-slate-400">Сроки:</span>
            <span class="font-bold text-slate-800">
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
