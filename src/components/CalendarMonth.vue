<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isToday,
  isBefore,
  startOfDay,
  parseISO,
  isWithinInterval,
  addMonths,
  getDay,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { useBookingsStore } from '../stores/bookings';
import { usePetsStore } from '../stores/pets';
import type { Booking, Pet } from '../types';
import { Plus, CalendarPlus, X, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-vue-next';

interface MonthData {
  id: string;
  year: number;
  monthIndex: number;
  date: Date;
  title: string;
  isCurrentMonth: boolean;
  paddingStart: number; // empty spacer cells before 1st day of month (0 for Mon, 6 for Sun)
  days: MonthDay[];
}

interface MonthDay {
  date: Date;
  dateString: string;
  dayNumber: number;
  isToday: boolean;
  isPast: boolean;
  booking?: Booking;
  pet?: Pet;
  isStart?: boolean;
  isEnd?: boolean;
}

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
  left: number;
  top: number;
  arrowLeft: number;
  placement: 'above' | 'below';
} | null>(null);

// Generate vertical stream of months: 4 months in past to 14 months ahead (19 months)
const monthsList = computed<MonthData[]>(() => {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const activeBookings = bookingsStore.filteredBookings;
  const list: MonthData[] = [];

  for (let offset = -4; offset <= 14; offset++) {
    const monthDate = addMonths(currentMonthStart, offset);
    const mStart = startOfMonth(monthDate);
    const mEnd = endOfMonth(monthDate);

    // Padding offset (Monday = 0 ... Sunday = 6)
    const rawDayOfWeek = getDay(mStart); // Sunday is 0, Monday is 1
    const paddingStart = (rawDayOfWeek + 6) % 7; // Convert to Mon=0, Sun=6

    const daysInterval = eachDayOfInterval({ start: mStart, end: mEnd });

    const monthDays: MonthDay[] = daysInterval.map(date => {
      const dateString = format(date, 'yyyy-MM-dd');
      const dayStart = startOfDay(date);

      // Strictly 1 pet at a time
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
        isToday: isToday(date),
        isPast: isBefore(dayStart, startOfDay(now)),
        booking,
        pet,
        isStart,
        isEnd,
      };
    });

    const monthName = format(mStart, 'LLLL', { locale: ru });
    const formattedTitle = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${format(mStart, 'yyyy')}`;
    const id = `month-${format(mStart, 'yyyy-MM')}`;

    list.push({
      id,
      year: mStart.getFullYear(),
      monthIndex: mStart.getMonth(),
      date: mStart,
      title: formattedTitle,
      isCurrentMonth: offset === 0,
      paddingStart,
      days: monthDays,
    });
  }

  return list;
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

const selectedDaysCount = computed(() => {
  if (!bookingsStore.selectionStart) return 0;
  if (!bookingsStore.selectionEnd) return 1;
  const start = parseISO(bookingsStore.selectionStart);
  const end = parseISO(bookingsStore.selectionEnd);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
});

// Handling clicks on a day cell
function handleDayClick(day: MonthDay, event: MouseEvent) {
  // If a tooltip is already open:
  if (activeTooltip.value) {
    // If clicked on the exact same active day -> 2nd tap opens detailed screen!
    if (activeTooltip.value.dayString === day.dateString) {
      if (day.booking) {
        emit('select-booking', day.booking);
      }
      activeTooltip.value = null;
      return;
    }

    // If clicked ANY other day while tooltip is open:
    // First dismiss the tooltip, do NOT select dates or open another tooltip!
    activeTooltip.value = null;
    return;
  }

  // If clicking on an unbooked day -> selection mode for new booking
  if (!day.booking || !day.pet) {
    bookingsStore.handleDateClick(day.dateString);
    return;
  }

  // 1st tap on booked day: Show cute tooltip
  showTooltipForBooking(day.booking, day.pet, day.dateString, event);
}

const tooltipRef = ref<HTMLElement | null>(null);

function handleGlobalCaptureClick(e: MouseEvent) {
  if (!activeTooltip.value) return;

  const target = e.target as Node | null;
  if (!target) return;

  // 1. If clicked inside the tooltip itself -> allow tooltip to handle it
  if (tooltipRef.value && (tooltipRef.value === target || tooltipRef.value.contains(target))) {
    return;
  }

  // 2. If clicked inside the currently active day cell -> allow day cell to handle it
  const activeDayEl = document.querySelector(`[data-day="${activeTooltip.value.dayString}"]`);
  if (activeDayEl && (activeDayEl === target || activeDayEl.contains(target))) {
    return;
  }

  // 3. Any click outside tooltip or active day:
  // Intercept and swallow the event so other actions (date selection, buttons) are NOT triggered
  e.stopPropagation();
  e.preventDefault();
  closeTooltip();
}

watch(activeTooltip, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    // Tooltip just opened: attach capture listener on next tick to avoid catching the opening click
    setTimeout(() => {
      if (activeTooltip.value) {
        window.addEventListener('click', handleGlobalCaptureClick, { capture: true });
      }
    }, 0);
  } else if (!newVal && oldVal) {
    // Tooltip closed: detach capture listener
    window.removeEventListener('click', handleGlobalCaptureClick, { capture: true });
  }
});

onUnmounted(() => {
  window.removeEventListener('click', handleGlobalCaptureClick, { capture: true });
});

function showTooltipForBooking(booking: Booking, pet: Pet, dayString: string, event: MouseEvent) {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();

  const tooltipWidth = 230;
  const pad = 12;
  const cellCenterX = rect.left + rect.width / 2;

  // Clamp horizontal position so tooltip stays within viewport
  const desiredLeft = cellCenterX - tooltipWidth / 2;
  const minLeft = pad;
  const maxLeft = Math.max(pad, window.innerWidth - tooltipWidth - pad);
  const left = Math.max(minLeft, Math.min(desiredLeft, maxLeft));

  // Arrow position relative to the tooltip box
  const arrowLeft = Math.max(20, Math.min(cellCenterX - left, tooltipWidth - 20));

  // Determine vertical placement: above cell if space >= 220px, otherwise below cell
  const isAbove = rect.top >= 220;
  const placement = isAbove ? 'above' : 'below';
  const top = isAbove ? Math.round(rect.top - 8) : Math.round(rect.bottom + 8);

  activeTooltip.value = {
    booking,
    pet,
    dayString,
    left,
    top,
    arrowLeft,
    placement,
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

// Scroll to today's month
function scrollToToday(smooth = true) {
  nextTick(() => {
    const currentId = `month-${format(new Date(), 'yyyy-MM')}`;
    const el = document.getElementById(currentId);
    if (el) {
      el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    }
  });
}

onMounted(() => {
  // Initial jump to current month
  setTimeout(() => {
    scrollToToday(false);
  }, 100);
});

function handleBack(): boolean {
  if (activeTooltip.value) {
    activeTooltip.value = null;
    return true;
  }
  if (bookingsStore.selectionStart) {
    bookingsStore.clearSelection();
    return true;
  }
  return false;
}

defineExpose({
  scrollToToday,
  handleBack,
});
</script>

<template>
  <div
    class="flex-1 overflow-y-auto overscroll-contain scroll-smooth px-2 sm:px-4 py-3 relative pb-32"
    @click="closeTooltip"
    @scroll.passive="closeTooltip"
  >
    <div class="max-w-lg mx-auto space-y-6">
      <!-- Month Sections in Vertical Continuous Slider / Stream -->
      <section
        v-for="m in monthsList"
        :key="m.id"
        :id="m.id"
        class="bg-white/90 p-2 sm:p-2.5 rounded-xl border border-cat-100 shadow-cute scroll-mt-28 transition-all"
      >
        <!-- Month Header Banner -->
        <div class="flex items-center justify-between px-1.5 pt-0.5 pb-2 mb-1 border-b border-cat-100/60">
          <div class="flex items-center gap-2">
            <h3 class="text-sm sm:text-base font-black text-slate-800 tracking-tight">
              {{ m.title }}
            </h3>
            <span
              v-if="m.isCurrentMonth"
              class="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-cat-100 text-cat-700 border border-cat-200"
            >
              Текущий месяц
            </span>
          </div>
          <span class="text-xs text-slate-400 font-bold">
            {{ m.days.length }} дн.
          </span>
        </div>

        <!-- Month Grid: 7 columns, crisp aspect-square days -->
        <div class="grid grid-cols-7 gap-1 sm:gap-1.5">
          <!-- Empty Spacer cells before day 1 -->
          <div
            v-for="spacer in m.paddingStart"
            :key="`spacer-${m.id}-${spacer}`"
            class="aspect-square rounded-lg bg-cat-50/20 border border-transparent opacity-20 pointer-events-none"
          />

          <!-- Actual Month Days -->
          <div
            v-for="day in m.days"
            :key="day.dateString"
            :data-day="day.dateString"
            @click.stop="handleDayClick(day, $event)"
            class="aspect-square rounded-lg flex flex-col justify-between p-1 transition-all select-none cursor-pointer border relative overflow-hidden group shadow-2xs active:scale-95"
            :style="day.booking && day.pet ? {
              backgroundColor: day.pet.color,
              borderColor: day.pet.color,
              color: day.pet.textColor || '#2D1537',
            } : {}"
            :class="[
              // Booked Day: Entirely colored square
              day.booking && day.pet
                ? 'shadow-xs font-bold'
                : // Free day: within selection range
                  isDayInSelectedRange(day.dateString)
                  ? 'bg-cat-200 border-cat-400 text-cat-800 shadow-inner ring-2 ring-cat-300'
                  : isDaySelectedStart(day.dateString) || isDaySelectedEnd(day.dateString)
                    ? 'bg-cat-300 border-cat-500 text-white font-black ring-2 ring-cat-400'
                    : // Normal unbooked day
                      'bg-white border-cat-100/70 text-slate-700 hover:border-cat-300 hover:bg-cat-50/50',
              // Active ring if tooltip open for this day
              activeTooltip?.dayString === day.dateString ? 'ring-2 ring-cat-600 scale-102 z-10' : '',
            ]"
          >
            <!-- Top: Day Number (left, lighter weight) & Avatar Emoji (right) -->
            <div class="flex items-center justify-between w-full leading-none">
              <span
                class="transition-transform"
                :class="[
                  day.isToday && !day.booking
                    ? 'w-4.5 h-4.5 flex items-center justify-center bg-cat-500 text-white rounded shadow-xs text-[10px] font-bold'
                    : day.isToday && day.booking
                      ? 'px-1 py-0.5 bg-black/20 text-current rounded text-[10px] font-bold'
                      : day.booking
                        ? 'text-[10.5px] sm:text-[11px] font-semibold opacity-75'
                        : 'text-[11px] sm:text-xs font-semibold text-slate-600'
                ]"
              >
                {{ day.dayNumber }}
              </span>

              <!-- Top-right: Pet Avatar Emoji (compact and cute) -->
              <span
                v-if="day.booking && day.pet"
                class="text-[11px] sm:text-xs drop-shadow-2xs leading-none transform group-hover:scale-110 transition-transform"
                :title="day.pet.name"
              >
                {{ day.pet.avatar }}
              </span>
              <span v-else-if="day.isToday" class="text-[9px] text-cat-500">🐾</span>
            </div>

            <!-- Center: Pet Nickname (Bold font-black, visually dominant over day number) -->
            <div
              class="flex flex-col items-center justify-center flex-1 pointer-events-none w-full px-0.5"
              :class="(day.isStart || day.isEnd) ? 'pb-2' : ''"
            >
              <template v-if="day.booking && day.pet">
                <p
                  class="text-[9.5px] sm:text-[10.5px] font-black truncate w-full text-center leading-tight tracking-tighter"
                >
                  {{ day.pet.name }}
                </p>
              </template>

              <template v-else-if="isDaySelectedStart(day.dateString) || isDaySelectedEnd(day.dateString)">
                <span class="text-xs font-black text-cat-600">✓</span>
              </template>

              <template v-else>
                <span class="text-[9px] text-cat-300 opacity-0 group-hover:opacity-100 transition-opacity">
                  +
                </span>
              </template>
            </div>

            <!-- Bottom: Pinned check-in / check-out ribbon (zero clipping!) -->
            <div
              v-if="day.booking && (day.isStart || day.isEnd)"
              class="absolute bottom-0 inset-x-0 bg-black/15 text-[7.5px] sm:text-[8px] font-black uppercase tracking-wider text-center py-0.5 leading-none pointer-events-none select-none"
            >
              {{ day.isStart && day.isEnd ? '1 день' : day.isStart ? 'Въезд' : 'Выезд' }}
            </div>
          </div>
        </div>
      </section>
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
        class="fixed top-28 inset-x-4 max-w-md mx-auto z-40 bg-amber-50 border border-amber-300 text-amber-900 p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-cute-lg"
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

    <!-- 1st Tap Tooltip: Cute Floating Popover with Nickname & Prepayment -->
    <transition
      enter-active-class="transition duration-150 ease-out transform"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in transform"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        ref="tooltipRef"
        v-if="activeTooltip"
        @click.stop="openDetailedFromTooltip"
        class="fixed z-40 bg-white/95 backdrop-blur-md rounded-xl p-3 shadow-cute-lg border border-cat-200 cursor-pointer w-[230px] hover:scale-102 transition-all select-none"
        :class="activeTooltip.placement === 'above' ? '-translate-y-full' : 'translate-y-0'"
        :style="{ left: `${activeTooltip.left}px`, top: `${activeTooltip.top}px` }"
      >
        <!-- Dynamic Arrow pointing to the exact day cell center -->
        <div
          v-if="activeTooltip.placement === 'above'"
          class="absolute -bottom-2 w-3.5 h-3.5 bg-white border-b border-r border-cat-200"
          :style="{ left: `${activeTooltip.arrowLeft}px`, transform: 'translateX(-50%) rotate(45deg)' }"
        />
        <div
          v-else
          class="absolute -top-2 w-3.5 h-3.5 bg-white border-t border-l border-cat-200"
          :style="{ left: `${activeTooltip.arrowLeft}px`, transform: 'translateX(-50%) rotate(45deg)' }"
        />

        <div class="flex items-center gap-2 mb-1.5">
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center text-base shadow-inner border border-white shrink-0"
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

        <div class="text-[11px] text-slate-600 bg-cat-50/70 p-2 rounded-lg border border-cat-100 mb-1.5 space-y-0.5">
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

        <div class="flex items-center justify-center gap-1 text-[10px] font-bold text-cat-600">
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
        class="fixed bottom-6 inset-x-4 max-w-md mx-auto z-30 bg-white/95 backdrop-blur-md rounded-xl p-3 shadow-cute-lg border border-cat-200 flex items-center justify-between gap-3"
      >
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-lg bg-cat-100 flex items-center justify-center text-cat-600">
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
            class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            title="Сбросить выбор"
          >
            <X class="w-5 h-5" />
          </button>
          <button
            @click="confirmCreateBooking"
            class="px-4 py-2 rounded-lg bg-gradient-to-r from-cat-500 to-cat-400 text-white text-xs font-bold shadow-cute hover:shadow-cute-lg active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Plus class="w-4 h-4 stroke-[3]" />
            <span>Оформить</span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>
