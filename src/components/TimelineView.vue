<script setup lang="ts">
import { ref, computed } from 'vue';
import { useBookingsStore } from '../stores/bookings';
import { usePetsStore } from '../stores/pets';
import type { Booking, Pet } from '../types';
import {
  parseISO,
  format,
  isToday,
  isBefore,
  startOfDay,
  differenceInDays,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  LogIn,
  LogOut,
  Phone,
  MessageCircle,
  Send,
  Calendar,
  Search,
  CheckCircle2,
  Plus,
} from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'select-booking', booking: Booking): void;
  (e: 'create-booking'): void;
}>();

const bookingsStore = useBookingsStore();
const petsStore = usePetsStore();

type TimelineFilter = 'upcoming' | 'all' | 'past';
const currentFilter = ref<TimelineFilter>('upcoming');
const searchQuery = ref('');

export interface TimelineEvent {
  id: string;
  type: 'check-in' | 'check-out';
  dateStr: string;
  date: Date;
  booking: Booking;
  pet: Pet | undefined;
  durationDays: number;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
}

// Generate check-in and check-out events from all bookings
const allEvents = computed<TimelineEvent[]>(() => {
  const events: TimelineEvent[] = [];
  const today = startOfDay(new Date());

  for (const booking of bookingsStore.bookings) {
    const pet = petsStore.getPetById(booking.petId);
    const startDate = parseISO(booking.startDate);
    const endDate = parseISO(booking.endDate);
    const duration = differenceInDays(endDate, startDate) + 1;

    // 1. Check-in Event
    events.push({
      id: `${booking.id}-in`,
      type: 'check-in',
      dateStr: booking.startDate,
      date: startDate,
      booking,
      pet,
      durationDays: duration,
      isToday: isToday(startDate),
      isPast: isBefore(startDate, today),
      isFuture: !isBefore(startDate, today) && !isToday(startDate),
    });

    // 2. Check-out Event
    events.push({
      id: `${booking.id}-out`,
      type: 'check-out',
      dateStr: booking.endDate,
      date: endDate,
      booking,
      pet,
      durationDays: duration,
      isToday: isToday(endDate),
      isPast: isBefore(endDate, today),
      isFuture: !isBefore(endDate, today) && !isToday(endDate),
    });
  }

  // Sort chronologically ascending
  return events.sort((a, b) => {
    const timeDiff = a.date.getTime() - b.date.getTime();
    if (timeDiff !== 0) return timeDiff;
    // Check-in comes before check-out on the same day
    return a.type === 'check-in' ? -1 : 1;
  });
});

// Filter events by filter tabs & search
const filteredEvents = computed(() => {
  let list = allEvents.value;

  // Filter tab
  if (currentFilter.value === 'upcoming') {
    list = list.filter(e => e.isToday || e.isFuture);
  } else if (currentFilter.value === 'past') {
    list = list.filter(e => e.isPast);
  }

  // Pet store active filter (if filtered from pet list)
  if (bookingsStore.filterPetId) {
    list = list.filter(e => e.booking.petId === bookingsStore.filterPetId);
  }

  // Text search
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter(e => {
      const petName = e.pet?.name.toLowerCase() || '';
      const ownerName = e.booking.owner.name.toLowerCase();
      const phone = e.booking.owner.phone.toLowerCase();
      return petName.includes(q) || ownerName.includes(q) || phone.includes(q);
    });
  }

  return list;
});

function formatDayNumber(date: Date): string {
  return format(date, 'd');
}

function formatMonthShort(date: Date): string {
  return format(date, 'MMM', { locale: ru }).replace('.', '');
}

function formatWeekday(date: Date): string {
  return format(date, 'EEEEEE', { locale: ru });
}

function formatFullDateRange(startStr: string, endStr: string): string {
  const s = parseISO(startStr);
  const e = parseISO(endStr);
  const sDay = format(s, 'd MMM', { locale: ru });
  const eDay = format(e, 'd MMM', { locale: ru });
  return `${sDay} — ${eDay}`;
}

function getBalance(booking: Booking): number {
  return Math.max(0, booking.totalAmount - booking.prepayment);
}
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden bg-cat-50">
    <!-- Top Filter Controls Bar -->
    <div class="bg-white border-b border-cat-100 p-3 shrink-0 shadow-2xs">
      <div class="max-w-lg mx-auto space-y-2.5">
        <!-- Search input -->
        <div class="relative">
          <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Поиск по кличке или хозяину..."
            class="w-full bg-cat-50/60 border border-cat-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-cat-400 placeholder:text-slate-400"
          />
        </div>

        <!-- Filter tabs: Предстоящие / Все / Прошедшие -->
        <div class="flex items-center gap-1.5 bg-cat-100/60 p-1 rounded-lg text-xs font-bold">
          <button
            @click="currentFilter = 'upcoming'"
            class="flex-1 py-1 rounded-md transition-all text-center"
            :class="currentFilter === 'upcoming' ? 'bg-white text-cat-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'"
          >
            Предстоящие
          </button>
          <button
            @click="currentFilter = 'all'"
            class="flex-1 py-1 rounded-md transition-all text-center"
            :class="currentFilter === 'all' ? 'bg-white text-cat-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'"
          >
            Все ({{ allEvents.length }})
          </button>
          <button
            @click="currentFilter = 'past'"
            class="flex-1 py-1 rounded-md transition-all text-center"
            :class="currentFilter === 'past' ? 'bg-white text-cat-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'"
          >
            Прошедшие
          </button>
        </div>
      </div>
    </div>

    <!-- Timeline Scrollable Feed -->
    <div class="flex-1 overflow-y-auto px-3 sm:px-4 py-4 overscroll-contain">
      <div class="max-w-lg mx-auto">
        <!-- Empty State -->
        <div
          v-if="filteredEvents.length === 0"
          class="bg-white rounded-xl border border-cat-100 p-8 text-center space-y-3 my-6 shadow-cute"
        >
          <div class="w-14 h-14 rounded-2xl bg-cat-100 text-cat-500 mx-auto flex items-center justify-center text-2xl">
            📅
          </div>
          <div>
            <h4 class="text-sm font-extrabold text-slate-800">
              Событий не найдено
            </h4>
            <p class="text-xs text-slate-500 mt-1">
              {{ searchQuery ? 'Попробуйте изменить поисковый запрос' : 'В этом разделе пока нет въездов или выездов' }}
            </p>
          </div>
          <button
            @click="emit('create-booking')"
            class="px-4 py-2 rounded-lg bg-cat-500 hover:bg-cat-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
          >
            <Plus class="w-4 h-4" />
            <span>Запланировать передержку</span>
          </button>
        </div>

        <!-- Timeline Items List -->
        <div v-else class="relative space-y-4 before:absolute before:top-6 before:bottom-6 before:left-[23px] before:w-0.5 before:bg-cat-200 before:z-0">
          <div
            v-for="item in filteredEvents"
            :key="item.id"
            @click="emit('select-booking', item.booking)"
            class="relative z-10 flex items-start gap-3 group cursor-pointer"
          >
            <!-- Left Date Cube & Icon Column -->
            <div class="shrink-0 flex flex-col items-center w-12">
              <!-- Date Cube (True square cube: 48x48px, rounded-lg) -->
              <div
                class="w-12 h-12 rounded-lg flex flex-col items-center justify-center border text-center transition-all shadow-2xs shrink-0 select-none"
                :class="item.isToday
                  ? 'bg-cat-500 border-cat-600 text-white shadow-cute'
                  : 'bg-white border-cat-200 text-slate-700 hover:border-cat-300'"
              >
                <span class="text-base font-black leading-none">
                  {{ formatDayNumber(item.date) }}
                </span>
                <span
                  class="text-[9.5px] font-black uppercase tracking-tight leading-none mt-0.5"
                  :class="item.isToday ? 'text-cat-100' : 'text-slate-400'"
                >
                  {{ formatMonthShort(item.date) }}
                </span>
                <span
                  class="text-[8px] font-extrabold uppercase leading-none mt-0.5"
                  :class="item.isToday ? 'text-cat-200' : 'text-slate-400/80'"
                >
                  {{ formatWeekday(item.date) }}
                </span>
              </div>

              <!-- Node Icon on the vertical line -->
              <div
                class="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center mt-2 shadow-2xs transition-transform group-hover:scale-110 shrink-0"
                :class="item.type === 'check-in'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-amber-500 text-white'"
                :title="item.type === 'check-in' ? 'Въезд' : 'Выезд'"
              >
                <LogIn v-if="item.type === 'check-in'" class="w-3 h-3 stroke-[2.5]" />
                <LogOut v-else class="w-3 h-3 stroke-[2.5]" />
              </div>
            </div>

            <!-- Right: Content Card -->
            <div
              class="flex-1 bg-white rounded-xl border border-cat-100 p-3 shadow-cute hover:border-cat-300 transition-all active:scale-[0.99] space-y-2.5"
              :class="{ 'ring-2 ring-cat-400/40': item.isToday }"
            >
              <!-- Event Header: Description + Today Badge (No redundant badges!) -->
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h4 class="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 leading-snug">
                    <span>{{ item.type === 'check-in' ? 'Въезжает' : 'Выезжает' }}</span>
                    <span class="text-cat-600">{{ item.pet?.name || 'Питомец' }}</span>
                    <span v-if="item.pet" class="text-xs">{{ item.pet.avatar }}</span>
                  </h4>
                  <p class="text-xs text-slate-500 font-medium mt-0.5">
                    <span class="text-slate-400">Хозяин(ка):</span>
                    <span class="font-bold text-slate-700 ml-1">{{ item.booking.owner.name }}</span>
                  </p>
                </div>

                <!-- "Сегодня" indicator pill -->
                <span
                  v-if="item.isToday"
                  class="px-2 py-0.5 rounded-md text-[10px] font-black bg-cat-500 text-white shrink-0 animate-pulse shadow-2xs"
                >
                  Сегодня!
                </span>
              </div>

              <!-- Contacts Quick Row -->
              <div class="flex items-center gap-2 pt-1 border-t border-cat-50 text-xs">
                <!-- Phone Call Link -->
                <a
                  v-if="item.booking.owner.phone"
                  :href="`tel:${item.booking.owner.phone}`"
                  @click.stop
                  class="inline-flex items-center gap-1 text-[11px] font-bold text-cat-700 hover:text-cat-800 bg-cat-50 px-2 py-1 rounded-md border border-cat-100 active:scale-95 transition-all"
                  title="Позвонить хозяину"
                >
                  <Phone class="w-3 h-3 text-cat-500" />
                  <span>{{ item.booking.owner.phone }}</span>
                </a>

                <!-- WhatsApp -->
                <a
                  v-if="item.booking.owner.whatsapp"
                  :href="`https://wa.me/${item.booking.owner.whatsapp.replace(/\D/g, '')}`"
                  target="_blank"
                  @click.stop
                  class="p-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 transition-all"
                  title="Написать в WhatsApp"
                >
                  <MessageCircle class="w-3.5 h-3.5" />
                </a>

                <!-- Telegram -->
                <a
                  v-if="item.booking.owner.telegram"
                  :href="`https://t.me/${item.booking.owner.telegram.replace('@', '')}`"
                  target="_blank"
                  @click.stop
                  class="p-1 rounded-md bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-100 transition-all"
                  title="Написать в Telegram"
                >
                  <Send class="w-3.5 h-3.5" />
                </a>
              </div>

              <!-- Booking Summary / Financial Info Footer -->
              <div class="flex items-center justify-between pt-1.5 border-t border-cat-50 text-[11px] text-slate-500 font-medium">
                <!-- Stay Period -->
                <div class="flex items-center gap-1">
                  <Calendar class="w-3 h-3 text-slate-400" />
                  <span>{{ formatFullDateRange(item.booking.startDate, item.booking.endDate) }}</span>
                  <span class="text-slate-400">({{ item.durationDays }} дн.)</span>
                </div>

                <!-- Financial Status (Prepayment or Balance) -->
                <div>
                  <span v-if="item.type === 'check-in'" class="font-bold text-cat-700">
                    Предоплата: {{ item.booking.prepayment.toLocaleString('ru-RU') }} ₽
                  </span>
                  <span v-else-if="getBalance(item.booking) > 0" class="font-bold text-amber-700">
                    К доплате: {{ getBalance(item.booking).toLocaleString('ru-RU') }} ₽
                  </span>
                  <span v-else class="font-bold text-emerald-600 inline-flex items-center gap-0.5">
                    <CheckCircle2 class="w-3 h-3 inline" />
                    <span>Оплачено ✓</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
