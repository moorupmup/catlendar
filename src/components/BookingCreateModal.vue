<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Booking } from '../types';
import { usePetsStore } from '../stores/pets';
import { useBookingsStore } from '../stores/bookings';
import { X, Calendar, User, CreditCard, Sparkles, Plus, AlertCircle } from 'lucide-vue-next';
import confetti from 'canvas-confetti';

const props = defineProps<{
  isOpen: boolean;
  initialRange?: { start: string; end: string } | null;
  editingBooking?: Booking | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved', booking: Booking): void;
  (e: 'open-create-pet'): void;
}>();

const petsStore = usePetsStore();
const bookingsStore = useBookingsStore();

const petId = ref('');
const startDate = ref('');
const endDate = ref('');
const dailyRate = ref(1000);
const totalAmount = ref(1000);
const prepayment = ref(0);
const isPaidInFull = ref(false);

const ownerName = ref('');
const ownerPhone = ref('');
const ownerTelegram = ref('');
const ownerWhatsapp = ref('');
const notes = ref('');

const errorMessage = ref<string | null>(null);

// Watch for initialRange or editingBooking when opening modal
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      errorMessage.value = null;
      if (props.editingBooking) {
        // Edit mode
        petId.value = props.editingBooking.petId;
        startDate.value = props.editingBooking.startDate;
        endDate.value = props.editingBooking.endDate;
        dailyRate.value = props.editingBooking.dailyRate;
        totalAmount.value = props.editingBooking.totalAmount;
        prepayment.value = props.editingBooking.prepayment;
        isPaidInFull.value = props.editingBooking.isPaidInFull;

        ownerName.value = props.editingBooking.owner?.name || '';
        ownerPhone.value = props.editingBooking.owner?.phone || '';
        ownerTelegram.value = props.editingBooking.owner?.telegram || '';
        ownerWhatsapp.value = props.editingBooking.owner?.whatsapp || '';
        notes.value = props.editingBooking.notes || '';
      } else {
        // Create mode
        petId.value = petsStore.pets.length > 0 ? petsStore.pets[0].id : '';
        startDate.value = props.initialRange?.start || new Date().toISOString().slice(0, 10);
        endDate.value = props.initialRange?.end || startDate.value;
        dailyRate.value = 1000;
        recalculateTotal();
        prepayment.value = 0;
        isPaidInFull.value = false;

        ownerName.value = '';
        ownerPhone.value = '';
        ownerTelegram.value = '';
        ownerWhatsapp.value = '';
        notes.value = '';
      }
    }
  },
  { immediate: true }
);

// Calculate days duration
const durationDays = computed(() => {
  if (!startDate.value || !endDate.value) return 1;
  const start = new Date(startDate.value);
  const end = new Date(endDate.value);
  if (end < start) return 1;
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
});

function recalculateTotal() {
  totalAmount.value = durationDays.value * (dailyRate.value || 0);
  if (isPaidInFull.value) {
    prepayment.value = totalAmount.value;
  }
}

watch([startDate, endDate, dailyRate], () => {
  recalculateTotal();
});

watch(isPaidInFull, (val) => {
  if (val) {
    prepayment.value = totalAmount.value;
  }
});

function handleSave() {
  if (!petId.value) {
    errorMessage.value = 'Пожалуйста, выберите питомца';
    return;
  }
  if (!startDate.value || !endDate.value) {
    errorMessage.value = 'Укажите даты передержки';
    return;
  }
  if (endDate.value < startDate.value) {
    errorMessage.value = 'Дата окончания не может быть раньше даты начала';
    return;
  }
  if (!ownerName.value.trim()) {
    errorMessage.value = 'Укажите имя владельца';
    return;
  }

  // Validate no overlapping bookings (strictly 1 pet at home at a time)
  const conflict = bookingsStore.findConflictingBooking(startDate.value, endDate.value, props.editingBooking?.id);
  if (conflict) {
    const conflictingPet = petsStore.getPetById(conflict.petId)?.name || 'другой питомец';
    errorMessage.value = `В эти даты (${conflict.startDate} — ${conflict.endDate}) уже живет ${conflictingPet}! Одновременно дома может находиться только один питомец.`;
    return;
  }

  const bookingPayload = {
    petId: petId.value,
    startDate: startDate.value,
    endDate: endDate.value,
    dailyRate: Number(dailyRate.value) || 0,
    totalAmount: Number(totalAmount.value) || 0,
    prepayment: Number(prepayment.value) || 0,
    isPaidInFull: isPaidInFull.value || Number(prepayment.value) >= Number(totalAmount.value),
    owner: {
      name: ownerName.value.trim(),
      phone: ownerPhone.value.trim(),
      telegram: ownerTelegram.value.trim(),
      whatsapp: ownerWhatsapp.value.trim(),
    },
    notes: notes.value.trim(),
  };

  try {
    let savedBooking: Booking;
    if (props.editingBooking) {
      bookingsStore.updateBooking(props.editingBooking.id, bookingPayload);
      savedBooking = { ...props.editingBooking, ...bookingPayload };
    } else {
      savedBooking = bookingsStore.addBooking(bookingPayload);
      // Launch cute celebratory confetti
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#FF477E', '#FFB4A2', '#B7E4C7', '#A0C4FF']
      });
    }

    emit('saved', savedBooking);
    emit('close');
  } catch (err: any) {
    errorMessage.value = err.message || 'Ошибка сохранения брони';
  }
}
</script>

<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4"
      @click="emit('close')"
    >
      <div
        class="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-cat-100 overflow-hidden max-h-[92vh] flex flex-col transform transition-all"
        @click.stop
      >
        <!-- Modal Top Bar -->
        <div class="px-5 pt-4 pb-3 border-b border-cat-100 flex items-center justify-between bg-gradient-to-r from-cat-50 via-white to-cat-50">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-cat-700 bg-cat-100 px-2.5 py-1 rounded-full border border-cat-200">
              {{ editingBooking ? '✏️ Редактирование брони' : '🐾 Новая передержка' }}
            </span>
          </div>

          <button
            @click="emit('close')"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90 transition-all"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Form Body -->
        <div class="p-5 overflow-y-auto space-y-4">
          <!-- Error alert -->
          <div v-if="errorMessage" class="bg-red-50 text-red-600 border border-red-200 p-3 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Section 1: Choose Pet -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-black text-slate-700 uppercase tracking-wider">
                Выберите питомца
              </label>
              <button
                type="button"
                @click="emit('open-create-pet')"
                class="text-xs font-bold text-cat-600 hover:text-cat-700 flex items-center gap-1 active:scale-95 transition-all"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>+ Добавить нового</span>
              </button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div
                v-for="p in petsStore.pets"
                :key="p.id"
                @click="petId = p.id"
                class="p-2.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center select-none"
                :class="petId === p.id ? 'border-cat-500 bg-cat-50 shadow-cute scale-102 font-extrabold' : 'border-cat-100 hover:border-cat-200 bg-white'"
                :style="petId === p.id ? { borderColor: p.color } : {}"
              >
                <span class="text-2xl mb-1">{{ p.avatar }}</span>
                <span class="text-xs text-slate-800 font-bold truncate max-w-full">{{ p.name }}</span>
                <span class="text-[10px] text-slate-400 truncate max-w-full">{{ p.breed || 'Питомец' }}</span>
              </div>
            </div>
          </div>

          <!-- Section 2: Dates -->
          <div class="bg-cat-50/50 p-3.5 rounded-2xl border border-cat-100 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar class="w-3.5 h-3.5 text-cat-500" />
                Сроки передержки
              </span>
              <span class="text-xs font-bold text-cat-700 bg-white px-2 py-0.5 rounded-lg border border-cat-200">
                Всего: {{ durationDays }} дн.
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-1">Дата заезда</label>
                <input
                  v-model="startDate"
                  type="date"
                  class="w-full bg-white border border-cat-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cat-400"
                />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-1">Дата выезда</label>
                <input
                  v-model="endDate"
                  type="date"
                  class="w-full bg-white border border-cat-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cat-400"
                />
              </div>
            </div>
          </div>

          <!-- Section 3: Finances -->
          <div class="bg-cat-50/50 p-3.5 rounded-2xl border border-cat-100 space-y-3">
            <span class="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard class="w-3.5 h-3.5 text-cat-500" />
              Финансы и предоплата
            </span>

            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-1">В сутки (₽)</label>
                <input
                  v-model.number="dailyRate"
                  type="number"
                  min="0"
                  step="50"
                  class="w-full bg-white border border-cat-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cat-400"
                />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-1">Итого (₽)</label>
                <input
                  v-model.number="totalAmount"
                  type="number"
                  min="0"
                  class="w-full bg-white border border-cat-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-cat-400"
                />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-1">Внесённая предоплата (₽)</label>
                <input
                  v-model.number="prepayment"
                  type="number"
                  min="0"
                  class="w-full bg-white border border-cat-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div class="flex items-end">
                <label class="w-full flex items-center gap-2 p-2 rounded-xl bg-white border border-cat-200 cursor-pointer select-none">
                  <input
                    v-model="isPaidInFull"
                    type="checkbox"
                    class="rounded text-cat-500 focus:ring-cat-400 w-4 h-4"
                  />
                  <span class="text-xs font-bold text-slate-700">Оплачено 100%</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Section 4: Owner Info -->
          <div class="bg-white p-3.5 rounded-2xl border border-cat-100 shadow-cute space-y-3">
            <span class="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User class="w-3.5 h-3.5 text-cat-500" />
              Контакты владельца
            </span>

            <div>
              <label class="block text-[11px] font-bold text-slate-500 mb-1">Имя владельца *</label>
              <input
                v-model="ownerName"
                type="text"
                placeholder="например, Дарья"
                class="w-full bg-cat-50/40 border border-cat-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cat-400"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-1">Телефон</label>
                <input
                  v-model="ownerPhone"
                  type="tel"
                  placeholder="+7 (999) 000-00-00"
                  class="w-full bg-cat-50/40 border border-cat-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-cat-400"
                />
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-500 mb-1">Telegram (@username)</label>
                <input
                  v-model="ownerTelegram"
                  type="text"
                  placeholder="@username"
                  class="w-full bg-cat-50/40 border border-cat-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-cat-400"
                />
              </div>
            </div>
          </div>

          <!-- Section 5: Notes -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 mb-1">Особые отметки по передержке</label>
            <textarea
              v-model="notes"
              rows="2"
              placeholder="Особенности ухода, время кормления, игрушки..."
              class="w-full bg-cat-50/40 border border-cat-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-cat-400 resize-none"
            ></textarea>
          </div>
        </div>

        <!-- Bottom Actions -->
        <div class="p-4 border-t border-cat-100 bg-cat-50/50 flex items-center justify-end gap-2">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2.5 rounded-2xl bg-white border border-cat-200 text-slate-600 text-xs font-bold hover:bg-cat-50 active:scale-95 transition-all"
          >
            Отмена
          </button>
          <button
            type="button"
            @click="handleSave"
            class="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cat-500 to-cat-400 text-white text-xs font-bold shadow-cute hover:shadow-cute-lg active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Sparkles class="w-3.5 h-3.5" />
            <span>{{ editingBooking ? 'Сохранить изменения' : 'Создать бронь' }}</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
