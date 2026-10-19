<script setup lang="ts">
import { ChevronLeft, ChevronRight, RefreshCw, PawPrint, Settings as SettingsIcon } from 'lucide-vue-next';
import { useUpdaterStore } from '../stores/updater';
import { useBookingsStore } from '../stores/bookings';
import { usePetsStore } from '../stores/pets';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const props = defineProps<{
  currentDate: Date;
}>();

const emit = defineEmits<{
  (e: 'prev-month'): void;
  (e: 'next-month'): void;
  (e: 'go-today'): void;
  (e: 'open-pets'): void;
  (e: 'open-settings'): void;
}>();

const updaterStore = useUpdaterStore();
const bookingsStore = useBookingsStore();
const petsStore = usePetsStore();

function formatMonthYear(d: Date): string {
  const monthStr = format(d, 'LLLL', { locale: ru });
  const yearStr = format(d, 'yyyy');
  // Capitalize first letter of month
  return `${monthStr.charAt(0).toUpperCase() + monthStr.slice(1)} ${yearStr}`;
}
</script>

<template>
  <header class="bg-white/80 backdrop-blur-md border-b border-cat-100 sticky top-0 z-30 pt-safe px-4 pb-3 shadow-sm transition-all">
    <!-- Top Row: Logo & Quick actions -->
    <div class="flex items-center justify-between gap-2 max-w-lg mx-auto">
      <!-- App Brand -->
      <div class="flex items-center gap-2.5">
        <div class="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-cat-400 to-cat-200 p-0.5 shadow-cute transition-transform active:scale-95 flex items-center justify-center">
          <img src="/logo.svg" alt="Catlendar Logo" class="w-9 h-9 rounded-2xl object-contain drop-shadow" />
          <span class="absolute -bottom-1 -right-1 text-xs">✨</span>
        </div>
        <div>
          <div class="flex items-center gap-1.5">
            <h1 class="text-xl font-extrabold tracking-tight bg-gradient-to-r from-cat-600 via-cat-500 to-cat-400 bg-clip-text text-transparent">
              Catlendar
            </h1>
            <span class="px-1.5 py-0.5 text-[10px] font-bold bg-cat-100 text-cat-700 rounded-full border border-cat-200">
              v{{ updaterStore.currentVersion }}
            </span>
          </div>
          <p class="text-[11px] text-cat-700/80 font-medium leading-none mt-0.5">
            Уютная передержка питомцев
          </p>
        </div>
      </div>

      <!-- Action Icons (Update, Pets, Settings) -->
      <div class="flex items-center gap-1">
        <!-- Update button with alert badge -->
        <button
          @click="updaterStore.checkForUpdates(true)"
          title="Проверить обновления"
          class="relative p-2 rounded-xl text-cat-600 hover:text-cat-700 hover:bg-cat-100/60 active:scale-90 transition-all"
        >
          <RefreshCw class="w-5 h-5" :class="{ 'animate-spin': updaterStore.isChecking }" />
          <span
            v-if="updaterStore.hasUpdate"
            class="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-ping"
          />
          <span
            v-if="updaterStore.hasUpdate"
            class="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"
          />
        </button>

        <!-- Pets manager button -->
        <button
          @click="emit('open-pets')"
          title="Питомцы"
          class="p-2 rounded-xl text-cat-600 hover:text-cat-700 hover:bg-cat-100/60 active:scale-90 transition-all"
        >
          <PawPrint class="w-5 h-5" />
        </button>

        <!-- Settings button -->
        <button
          @click="emit('open-settings')"
          title="Настройки"
          class="p-2 rounded-xl text-cat-600 hover:text-cat-700 hover:bg-cat-100/60 active:scale-90 transition-all"
        >
          <SettingsIcon class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Month Navigation Bar -->
    <div class="flex items-center justify-between max-w-lg mx-auto mt-2.5 pt-2 border-t border-cat-100/70">
      <!-- Previous Month -->
      <button
        @click="emit('prev-month')"
        class="w-9 h-9 rounded-xl flex items-center justify-center bg-cat-50 border border-cat-100 text-cat-600 hover:bg-cat-100 active:scale-90 transition-all"
        aria-label="Предыдущий месяц"
      >
        <ChevronLeft class="w-5 h-5" />
      </button>

      <!-- Current Month and Quick-jump Today -->
      <div class="flex items-center gap-2">
        <h2 class="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
          {{ formatMonthYear(props.currentDate) }}
        </h2>
        <button
          @click="emit('go-today')"
          class="px-2.5 py-1 text-xs font-semibold rounded-full bg-cat-100 hover:bg-cat-200 text-cat-700 border border-cat-200 active:scale-95 transition-all shadow-sm"
        >
          Сегодня
        </button>
      </div>

      <!-- Next Month -->
      <button
        @click="emit('next-month')"
        class="w-9 h-9 rounded-xl flex items-center justify-center bg-cat-50 border border-cat-100 text-cat-600 hover:bg-cat-100 active:scale-90 transition-all"
        aria-label="Следующий месяц"
      >
        <ChevronRight class="w-5 h-5" />
      </button>
    </div>

    <!-- Active Pet Filter Bar (if filtered) -->
    <div v-if="bookingsStore.filterPetId" class="max-w-lg mx-auto mt-2 flex items-center justify-between bg-cat-100/80 px-3 py-1.5 rounded-xl border border-cat-200 text-xs">
      <div class="flex items-center gap-1.5">
        <span class="text-cat-600 font-medium">Фильтр:</span>
        <span class="font-bold text-cat-800">
          {{ petsStore.getPetById(bookingsStore.filterPetId)?.avatar }}
          {{ petsStore.getPetById(bookingsStore.filterPetId)?.name }}
        </span>
      </div>
      <button
        @click="bookingsStore.filterPetId = null"
        class="text-cat-600 hover:text-cat-900 underline font-semibold text-[11px]"
      >
        Сбросить
      </button>
    </div>
  </header>
</template>
