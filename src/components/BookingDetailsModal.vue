<script setup lang="ts">
import { computed } from 'vue';
import type { Booking } from '../types';
import { usePetsStore } from '../stores/pets';
import { useBookingsStore } from '../stores/bookings';
import confetti from 'canvas-confetti';
import {
  X,
  Phone,
  Send,
  MessageCircle,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  Trash2,
  Edit3,
  User,
} from 'lucide-vue-next';

const props = defineProps<{
  booking: Booking | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'edit', booking: Booking): void;
  (e: 'deleted'): void;
}>();

const petsStore = usePetsStore();
const bookingsStore = useBookingsStore();

const pet = computed(() => {
  if (!props.booking) return null;
  return petsStore.getPetById(props.booking.petId);
});

// Calculate duration in days
const daysCount = computed(() => {
  if (!props.booking) return 0;
  const start = new Date(props.booking.startDate);
  const end = new Date(props.booking.endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
});

// Remaining amount to pay
const remainingAmount = computed(() => {
  if (!props.booking) return 0;
  return Math.max(0, props.booking.totalAmount - (props.booking.prepayment || 0));
});

function toggleFullPayment() {
  if (props.booking) {
    bookingsStore.togglePaidInFull(props.booking.id);
    if (props.booking.isPaidInFull) {
      // Launch cute celebratory confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#FF477E', '#FFB4A2', '#B7E4C7', '#A0C4FF', '#FFCCD8']
      });
    }
  }
}

function handleDelete() {
  if (!props.booking) return;
  if (confirm(`Вы уверены, что хотите удалить передержку для ${pet.value?.name || 'питомца'}?`)) {
    bookingsStore.deleteBooking(props.booking.id);
    emit('deleted');
    emit('close');
  }
}

function openEdit() {
  if (props.booking) {
    emit('edit', props.booking);
  }
}

// Clean phone for tel link
function cleanPhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, '');
}

// Clean phone for WhatsApp link
function cleanWhatsapp(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
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
      v-if="isOpen && booking"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4"
      @click="emit('close')"
    >
      <!-- Bottom Sheet Modal Container -->
      <div
        class="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-xl shadow-2xl border border-cat-100 overflow-hidden max-h-[92vh] flex flex-col transform transition-all"
        @click.stop
      >
        <!-- Modal Top Bar -->
        <div class="px-5 pt-4 pb-3 border-b border-cat-100 flex items-center justify-between bg-gradient-to-r from-cat-50 via-white to-cat-50">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-cat-600 bg-cat-100 px-2 py-0.5 rounded-md border border-cat-200">
              🐾 Детали передержки
            </span>
          </div>

          <div class="flex items-center gap-1">
            <button
              @click="openEdit"
              class="p-2 rounded-lg text-slate-500 hover:text-cat-600 hover:bg-cat-50 active:scale-90 transition-all"
              title="Редактировать"
            >
              <Edit3 class="w-4 h-4" />
            </button>
            <button
              @click="handleDelete"
              class="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 active:scale-90 transition-all"
              title="Удалить"
            >
              <Trash2 class="w-4 h-4" />
            </button>
            <button
              @click="emit('close')"
              class="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90 transition-all ml-1"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Scrollable Content -->
        <div class="p-5 overflow-y-auto space-y-4">
          <!-- Pet Profile Header Card -->
          <div
            class="p-3.5 rounded-xl border flex items-center gap-3 relative overflow-hidden"
            :style="{
              backgroundColor: pet?.color ? `${pet.color}30` : '#FFF5F7',
              borderColor: pet?.color || '#FFCCD8'
            }"
          >
            <div
              class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-white"
              :style="{ backgroundColor: pet?.color || '#FFE6EC' }"
            >
              {{ pet?.avatar || '🐾' }}
            </div>

            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h3 class="text-base font-black text-slate-800">
                  {{ pet?.name || 'Питомец' }}
                </h3>
                <span
                  class="w-2.5 h-2.5 rounded-full"
                  :style="{ backgroundColor: pet?.color || '#FF477E' }"
                  :title="`Цвет на календаре`"
                />
              </div>
              <p class="text-xs text-slate-500 font-medium">
                {{ pet?.breed || 'Вид не указан' }}
              </p>
              <p v-if="pet?.notes" class="text-xs text-slate-600 mt-0.5 italic line-clamp-2">
                «{{ pet.notes }}»
              </p>
            </div>
          </div>

          <!-- Dates & Duration Card -->
          <div class="bg-cat-50/60 rounded-xl p-3.5 border border-cat-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-cat-200/70 text-cat-700 flex items-center justify-center">
                <Calendar class="w-4.5 h-4.5" />
              </div>
              <div>
                <span class="text-[10px] font-bold text-cat-600 uppercase tracking-wider block">Сроки пребывания</span>
                <p class="text-xs font-extrabold text-slate-800">
                  {{ booking.startDate }} → {{ booking.endDate }}
                </p>
              </div>
            </div>
            <div class="text-right">
              <span class="text-xs font-black text-cat-700 bg-white px-2 py-0.5 rounded-md border border-cat-200 shadow-xs">
                {{ daysCount }} дн.
              </span>
            </div>
          </div>

          <!-- Financial Card: Rate, Total, Prepayment, Remaining -->
          <div class="bg-white rounded-xl p-3.5 border border-cat-100 shadow-cute space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <CreditCard class="w-4 h-4 text-cat-500" />
                <h4 class="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Расчёт стоимости
                </h4>
              </div>

              <!-- Paid badge -->
              <span
                class="px-2 py-0.5 text-xs font-bold rounded-md flex items-center gap-1"
                :class="booking.isPaidInFull ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'"
              >
                <CheckCircle v-if="booking.isPaidInFull" class="w-3.5 h-3.5" />
                <Clock v-else class="w-3.5 h-3.5" />
                {{ booking.isPaidInFull ? 'Оплачено' : 'Частично' }}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs">
              <div class="bg-cat-50/50 p-2 rounded-lg border border-cat-100/60">
                <span class="text-slate-400 block mb-0.5 text-[11px]">Тариф в сутки</span>
                <span class="font-extrabold text-slate-800 text-xs">{{ booking.dailyRate }} ₽</span>
              </div>
              <div class="bg-cat-50/50 p-2 rounded-lg border border-cat-100/60">
                <span class="text-slate-400 block mb-0.5 text-[11px]">Общая стоимость</span>
                <span class="font-extrabold text-slate-800 text-xs">{{ booking.totalAmount }} ₽</span>
              </div>
              <div class="bg-cat-50/50 p-2 rounded-lg border border-cat-100/60">
                <span class="text-slate-400 block mb-0.5 text-[11px]">Внесена предоплата</span>
                <span class="font-extrabold text-emerald-700 text-xs">{{ booking.prepayment || 0 }} ₽</span>
              </div>
              <div class="bg-cat-50/50 p-2 rounded-lg border border-cat-100/60">
                <span class="text-slate-400 block mb-0.5 text-[11px]">Остаток к доплате</span>
                <span class="font-extrabold text-xs" :class="remainingAmount > 0 ? 'text-cat-600' : 'text-slate-500'">
                  {{ remainingAmount }} ₽
                </span>
              </div>
            </div>

            <!-- Quick toggle full payment button -->
            <button
              @click="toggleFullPayment"
              class="w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border"
              :class="booking.isPaidInFull
                ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 active:scale-95'"
            >
              <CheckCircle class="w-4 h-4" />
              <span>{{ booking.isPaidInFull ? 'Снять отметку об оплате' : 'Отметить полностью оплаченным ✨' }}</span>
            </button>
          </div>

          <!-- Owner Profile & Quick Contacts -->
          <div class="bg-white rounded-xl p-3.5 border border-cat-100 shadow-cute space-y-3">
            <div class="flex items-center gap-2">
              <User class="w-4 h-4 text-cat-500" />
              <h4 class="text-xs font-black text-slate-700 uppercase tracking-wider">
                Хозяин питомца
              </h4>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <h5 class="text-sm font-extrabold text-slate-800">
                  {{ booking.owner?.name || 'Имя не указано' }}
                </h5>
                <p class="text-xs text-slate-500 font-medium">
                  {{ booking.owner?.phone || 'Телефон не указан' }}
                </p>
              </div>

              <!-- Quick Action Contact Buttons -->
              <div class="flex items-center gap-1.5">
                <!-- Phone Call -->
                <a
                  v-if="booking.owner?.phone"
                  :href="`tel:${cleanPhone(booking.owner.phone)}`"
                  class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 active:scale-90 transition-all"
                  title="Позвонить"
                >
                  <Phone class="w-3.5 h-3.5" />
                </a>

                <!-- WhatsApp -->
                <a
                  v-if="booking.owner?.whatsapp || booking.owner?.phone"
                  :href="`https://wa.me/${cleanWhatsapp(booking.owner.whatsapp || booking.owner.phone)}`"
                  target="_blank"
                  class="w-8 h-8 rounded-lg bg-green-50 text-green-600 border border-green-200 flex items-center justify-center hover:bg-green-100 active:scale-90 transition-all"
                  title="WhatsApp"
                >
                  <MessageCircle class="w-3.5 h-3.5" />
                </a>

                <!-- Telegram -->
                <a
                  v-if="booking.owner?.telegram"
                  :href="`https://t.me/${booking.owner.telegram.replace('@', '')}`"
                  target="_blank"
                  class="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center hover:bg-sky-100 active:scale-90 transition-all"
                  title="Telegram"
                >
                  <Send class="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div v-if="booking.owner?.notes" class="text-xs text-slate-500 bg-cat-50/50 p-2.5 rounded-lg border border-cat-100/50">
              <span class="font-bold text-slate-600 block mb-0.5">Примечание владельца:</span>
              {{ booking.owner.notes }}
            </div>
          </div>

          <!-- Booking Notes -->
          <div v-if="booking.notes" class="bg-amber-50/60 rounded-xl p-3 border border-amber-200/60 text-xs text-amber-900">
            <span class="font-bold block mb-1">🐾 Памятка по передержке:</span>
            {{ booking.notes }}
          </div>
        </div>

        <!-- Bottom Bar -->
        <div class="p-4 border-t border-cat-100 bg-cat-50/50 flex items-center justify-end">
          <button
            @click="emit('close')"
            class="px-4 py-2 rounded-lg bg-white border border-cat-200 text-slate-700 text-xs font-bold shadow-xs hover:bg-cat-50 active:scale-95 transition-all"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
