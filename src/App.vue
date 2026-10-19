<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Booking } from './types';
import AppHeader from './components/AppHeader.vue';
import CalendarMonth from './components/CalendarMonth.vue';
import BookingDetailsModal from './components/BookingDetailsModal.vue';
import BookingCreateModal from './components/BookingCreateModal.vue';
import PetModal from './components/PetModal.vue';
import SettingsModal from './components/SettingsModal.vue';
import UpdateModal from './components/UpdateModal.vue';
import { useUpdaterStore } from './stores/updater';
import { Plus } from 'lucide-vue-next';

const calendarRef = ref<InstanceType<typeof CalendarMonth> | null>(null);

const isDetailsOpen = ref(false);
const selectedBooking = ref<Booking | null>(null);

const isCreateOpen = ref(false);
const editingBooking = ref<Booking | null>(null);
const createInitialRange = ref<{ start: string; end: string } | null>(null);

const isPetsOpen = ref(false);
const isSettingsOpen = ref(false);

const updaterStore = useUpdaterStore();

function handleGoToday() {
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

onMounted(() => {
  // Silent check for updates in background
  updaterStore.checkForUpdates(false);
});
</script>

<template>
  <div class="h-screen bg-cat-50 flex flex-col text-slate-800 select-none overflow-hidden pb-safe">
    <!-- Header with fixed days of week -->
    <AppHeader
      @go-today="handleGoToday"
      @open-pets="isPetsOpen = true"
      @open-settings="isSettingsOpen = true"
    />

    <!-- Main Calendar Area: Continuous Vertical Month Stream -->
    <main class="flex-1 flex flex-col overflow-hidden relative">
      <CalendarMonth
        ref="calendarRef"
        @select-booking="openBookingDetails"
        @create-booking="handleCreateFromRange"
      />
    </main>

    <!-- Floating Action Button (FAB) to create booking manually -->
    <button
      @click="openManualCreate"
      class="fixed bottom-6 right-5 sm:right-8 z-20 w-12 h-12 rounded-xl bg-gradient-to-tr from-cat-500 to-cat-400 text-white shadow-cute-lg hover:shadow-xl active:scale-90 transition-all flex items-center justify-center border-2 border-white"
      title="Новая передержка"
    >
      <Plus class="w-6 h-6 stroke-[2.5]" />
    </button>

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
      :is-open="isPetsOpen"
      @close="isPetsOpen = false"
    />

    <SettingsModal
      :is-open="isSettingsOpen"
      @close="isSettingsOpen = false"
    />

    <UpdateModal />
  </div>
</template>
