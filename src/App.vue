<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { App as CapApp } from '@capacitor/app';
import type { Booking } from './types';
import AppHeader from './components/AppHeader.vue';
import CalendarMonth from './components/CalendarMonth.vue';
import TimelineView from './components/TimelineView.vue';
import PetsView from './components/PetsView.vue';
import BottomNav from './components/BottomNav.vue';
import BookingDetailsModal from './components/BookingDetailsModal.vue';
import BookingCreateModal from './components/BookingCreateModal.vue';
import PetModal from './components/PetModal.vue';
import SettingsModal from './components/SettingsModal.vue';
import UpdateModal from './components/UpdateModal.vue';
import { useUpdaterStore } from './stores/updater';
import { useBookingsStore } from './stores/bookings';
import { syncWidgetData } from './services/widgetBridge';
import { Plus } from 'lucide-vue-next';

const activeTab = ref<'calendar' | 'history' | 'pets'>('calendar');
const calendarRef = ref<InstanceType<typeof CalendarMonth> | null>(null);
const petModalRef = ref<InstanceType<typeof PetModal> | null>(null);

const isDetailsOpen = ref(false);
const selectedBooking = ref<Booking | null>(null);

const isCreateOpen = ref(false);
const editingBooking = ref<Booking | null>(null);
const createInitialRange = ref<{ start: string; end: string } | null>(null);

const isPetsOpen = ref(false);
const isSettingsOpen = ref(false);

const updaterStore = useUpdaterStore();
const bookingsStore = useBookingsStore();

const showExitPrompt = ref(false);
let exitPromptTimeout: any = null;
let lastBackPressTime = 0;

function handleGoToday() {
  if (activeTab.value !== 'calendar') {
    activeTab.value = 'calendar';
  }
  calendarRef.value?.scrollToToday(true);
}

// 2nd tap action: open booking details modal
function openBookingDetails(booking: Booking) {
  selectedBooking.value = booking;
  isDetailsOpen.value = true;
}

// Open create modal with selected range from calendar
function handleCreateFromRange(range: { start: string; end: string }) {
  editingBooking.value = null;
  createInitialRange.value = range;
  isCreateOpen.value = true;
}

// Open edit from details modal
function handleEditBooking(booking: Booking) {
  isDetailsOpen.value = false;
  editingBooking.value = booking;
  createInitialRange.value = { start: booking.startDate, end: booking.endDate };
  isCreateOpen.value = true;
}

// Open create without range (FAB +)
function openManualCreate() {
  editingBooking.value = null;
  createInitialRange.value = null;
  isCreateOpen.value = true;
}

function handleOpenCreatePet() {
  isPetsOpen.value = true;
}

// Android Hardware Back button & Desktop Escape key handler
function handleHardwareBack() {
  // 1. UpdateModal
  if (updaterStore.isModalOpen) {
    updaterStore.closeModal();
    return;
  }

  // 2. BookingDetailsModal
  if (isDetailsOpen.value) {
    isDetailsOpen.value = false;
    return;
  }

  // 3. BookingCreateModal
  if (isCreateOpen.value) {
    isCreateOpen.value = false;
    return;
  }

  // 4. PetModal (check if sub-screen is open first)
  if (isPetsOpen.value) {
    if (petModalRef.value?.handleBack()) {
      return;
    }
    isPetsOpen.value = false;
    return;
  }

  // 5. SettingsModal
  if (isSettingsOpen.value) {
    isSettingsOpen.value = false;
    return;
  }

  // 6. Calendar internal actions (close day tooltip or clear date selection range)
  if (activeTab.value === 'calendar' && calendarRef.value?.handleBack()) {
    return;
  }

  // 7. Non-calendar tab ('history' or 'pets') -> navigate back to 'calendar'
  if (activeTab.value !== 'calendar') {
    activeTab.value = 'calendar';
    return;
  }

  // 8. Root level (on 'calendar' tab with no modals or selection):
  // Double-tap back within 2 seconds to gracefully exit
  const now = Date.now();
  if (now - lastBackPressTime < 2000) {
    CapApp.exitApp();
  } else {
    lastBackPressTime = now;
    showExitPrompt.value = true;
    clearTimeout(exitPromptTimeout);
    exitPromptTimeout = setTimeout(() => {
      showExitPrompt.value = false;
    }, 2000);
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleHardwareBack();
  }
}

let backListener: { remove: () => void } | null = null;

onMounted(async () => {
  // Sync widget on app startup
  syncWidgetData();

  // Silent check for updates in background
  updaterStore.checkForUpdates(false);

  // Android hardware back button listener via Capacitor App plugin
  try {
    backListener = await CapApp.addListener('backButton', () => {
      handleHardwareBack();
    });
  } catch (err) {
    console.warn('Capacitor backButton not available in current environment', err);
  }

  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  backListener?.remove();
  window.removeEventListener('keydown', onKeydown);
  clearTimeout(exitPromptTimeout);
});
</script>

<template>
  <div class="h-screen bg-cat-50 flex flex-col text-slate-800 select-none overflow-hidden">
    <!-- Header with logo, actions, and conditional days of week -->
    <AppHeader
      :active-tab="activeTab"
      @go-today="handleGoToday"
      @open-settings="isSettingsOpen = true"
    />

    <!-- Main Screens View Area (tabs switched smoothly, state preserved) -->
    <main class="flex-1 flex flex-col overflow-hidden relative">
      <!-- 1. Calendar Screen -->
      <CalendarMonth
        v-show="activeTab === 'calendar'"
        ref="calendarRef"
        @select-booking="openBookingDetails"
        @create-booking="handleCreateFromRange"
      />

      <!-- 2. Timeline History Screen -->
      <TimelineView
        v-show="activeTab === 'history'"
        @select-booking="openBookingDetails"
        @create-booking="openManualCreate"
      />

      <!-- 3. Pets Management Screen -->
      <PetsView
        v-show="activeTab === 'pets'"
        @go-calendar="activeTab = 'calendar'"
      />
    </main>

    <!-- Floating Action Button (FAB) to create booking manually (on Calendar & History tabs) -->
    <transition
      enter-active-class="transition duration-200 ease-out transform"
      enter-from-class="opacity-0 scale-75"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in transform"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-75"
    >
      <button
        v-if="activeTab !== 'pets' && !bookingsStore.selectionStart"
        @click="openManualCreate"
        class="fixed bottom-[calc(4.5rem+max(0.6rem,env(safe-area-inset-bottom,0px)))] right-4 sm:right-6 z-30 w-12 h-12 rounded-xl bg-gradient-to-tr from-cat-500 to-cat-400 text-white shadow-cute-lg hover:shadow-xl active:scale-90 transition-all flex items-center justify-center border-2 border-white"
        title="Новая передержка"
      >
        <Plus class="w-6 h-6 stroke-[2.5]" />
      </button>
    </transition>

    <!-- Bottom Navigation Bar (Calendar / History / Pets) -->
    <BottomNav v-model:active-tab="activeTab" />

    <!-- Modals -->
    <BookingDetailsModal
      :is-open="isDetailsOpen"
      :booking="selectedBooking"
      @close="isDetailsOpen = false"
      @edit="handleEditBooking"
      @deleted="isDetailsOpen = false"
    />

    <BookingCreateModal
      :is-open="isCreateOpen"
      :initial-range="createInitialRange"
      :editing-booking="editingBooking"
      @close="isCreateOpen = false"
      @open-create-pet="handleOpenCreatePet"
    />

    <PetModal
      ref="petModalRef"
      :is-open="isPetsOpen"
      @close="isPetsOpen = false"
    />

    <SettingsModal
      :is-open="isSettingsOpen"
      @close="isSettingsOpen = false"
    />

    <UpdateModal />

    <!-- Exit App Confirmation Toast (shown on 1st back press at root screen) -->
    <transition
      enter-active-class="transition duration-200 ease-out transform"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in transform"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="showExitPrompt"
        class="fixed bottom-[calc(5rem+max(0.6rem,env(safe-area-inset-bottom,0px)))] inset-x-0 mx-auto w-fit z-50 px-4 py-2 bg-slate-900/90 text-white text-xs font-bold rounded-full shadow-cute-lg backdrop-blur-md flex items-center gap-2 pointer-events-none"
      >
        <span>🐾</span>
        <span>Нажмите «Назад» ещё раз для выхода</span>
      </div>
    </transition>
  </div>
</template>
