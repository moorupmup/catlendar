<script setup lang="ts">
import { PawPrint, Settings as SettingsIcon, Calendar as CalendarIcon } from 'lucide-vue-next';
import { useBookingsStore } from '../stores/bookings';
import { usePetsStore } from '../stores/pets';

const emit = defineEmits<{
  (e: 'go-today'): void;
  (e: 'open-pets'): void;
  (e: 'open-settings'): void;
}>();

const bookingsStore = useBookingsStore();
const petsStore = usePetsStore();

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
</script>

<template>
  <header class="bg-white/90 backdrop-blur-md border-b border-cat-100 sticky top-0 z-30 pt-safe px-3 sm:px-4 pb-2 shadow-xs transition-all">
    <!-- Top Row: Logo & Quick actions -->
    <div class="flex items-center justify-between gap-2 max-w-lg mx-auto">
      <!-- App Brand: Clean logo + name -->
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-cat-400 to-cat-200 p-0.5 shadow-cute transition-transform active:scale-95 flex items-center justify-center">
          <img src="/logo.svg" alt="Catlendar Logo" class="w-7 h-7 rounded-lg object-contain drop-shadow" />
        </div>
        <h1 class="text-xl font-black tracking-tight bg-gradient-to-r from-cat-600 via-cat-500 to-cat-400 bg-clip-text text-transparent">
          Catlendar
        </h1>
      </div>

      <!-- Action Icons (Today button, Pets, Settings) -->
      <div class="flex items-center gap-1.5">
        <!-- Quick Jump to Today -->
        <button
          @click="emit('go-today')"
          class="px-2.5 py-1.5 rounded-lg bg-cat-100 hover:bg-cat-200 text-cat-700 font-bold text-xs flex items-center gap-1 border border-cat-200 active:scale-95 transition-all shadow-2xs"
          title="Вернуться к сегодняшнему дню"
        >
          <CalendarIcon class="w-3.5 h-3.5 text-cat-500" />
          <span>Сегодня</span>
        </button>

        <!-- Pets manager button -->
        <button
          @click="emit('open-pets')"
          title="Питомцы"
          class="p-2 rounded-lg text-cat-600 hover:text-cat-700 hover:bg-cat-100/60 active:scale-90 transition-all"
        >
          <PawPrint class="w-4.5 h-4.5" />
        </button>

        <!-- Settings button -->
        <button
          @click="emit('open-settings')"
          title="Настройки"
          class="p-2 rounded-lg text-cat-600 hover:text-cat-700 hover:bg-cat-100/60 active:scale-90 transition-all"
        >
          <SettingsIcon class="w-4.5 h-4.5" />
        </button>
      </div>
    </div>

    <!-- Active Pet Filter Bar (if filtered) -->
    <div v-if="bookingsStore.filterPetId" class="max-w-lg mx-auto mt-2 flex items-center justify-between bg-cat-100/80 px-3 py-1.5 rounded-lg border border-cat-200 text-xs">
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

    <!-- Sticky Days of Week Header -->
    <div class="grid grid-cols-7 gap-1 sm:gap-1.5 max-w-lg mx-auto mt-2 text-center pt-1 border-t border-cat-100/60">
      <div
        v-for="(day, index) in weekDays"
        :key="day"
        class="text-[11px] sm:text-xs font-bold py-0.5 select-none"
        :class="index >= 5 ? 'text-cat-500 font-extrabold' : 'text-slate-400'"
      >
        {{ day }}
      </div>
    </div>
  </header>
</template>
