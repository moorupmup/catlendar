<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePetsStore, PASTEL_PET_COLORS } from '../stores/pets';
import { useBookingsStore } from '../stores/bookings';
import type { Pet, PetType } from '../types';
import {
  PawPrint,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Filter,
  Check,
  X,
  Eye,
  EyeOff,
} from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'go-calendar'): void;
}>();

const petsStore = usePetsStore();
const bookingsStore = useBookingsStore();

type PetTabFilter = 'active' | 'all' | 'hidden';
const currentFilter = ref<PetTabFilter>('active');

const displayedPets = computed(() => {
  if (currentFilter.value === 'active') return petsStore.activePets;
  if (currentFilter.value === 'hidden') return petsStore.hiddenPets;
  return petsStore.pets;
});

const isEditorOpen = ref(false);
const editingPetId = ref<string | null>(null);

const petName = ref('');
const petType = ref<PetType>('cat');
const petBreed = ref('');
const petAvatar = ref('🐱');
const petColor = ref(PASTEL_PET_COLORS[0].bg);
const petTextColor = ref(PASTEL_PET_COLORS[0].text);
const petNotes = ref('');
const petIsActive = ref(true);

const avatarOptions = ['🐱', '😸', '🐶', '🐕', '🐰', '🐹', '🦜', '🐾', '✨', '🦊', '🐼', '🐨'];

const petTypesList: { id: PetType; label: string }[] = [
  { id: 'cat', label: 'Кошка' },
  { id: 'dog', label: 'Собака' },
  { id: 'rabbit', label: 'Кролик' },
  { id: 'bird', label: 'Птица' },
  { id: 'other', label: 'Другое' },
];

function startCreate() {
  const nextColor = petsStore.getNextColor();
  petName.value = '';
  petType.value = 'cat';
  petBreed.value = '';
  petAvatar.value = '🐱';
  petColor.value = nextColor.bg;
  petTextColor.value = nextColor.text;
  petNotes.value = '';
  petIsActive.value = true;
  editingPetId.value = null;
  isEditorOpen.value = true;
}

function startEdit(pet: Pet) {
  petName.value = pet.name;
  petType.value = pet.type;
  petBreed.value = pet.breed || '';
  petAvatar.value = pet.avatar;
  petColor.value = pet.color;
  petTextColor.value = pet.textColor || '#2D1537';
  petNotes.value = pet.notes || '';
  petIsActive.value = pet.isActive !== false;
  editingPetId.value = pet.id;
  isEditorOpen.value = true;
}

function selectColor(color: { bg: string; text: string }) {
  petColor.value = color.bg;
  petTextColor.value = color.text;
}

function savePet() {
  if (!petName.value.trim()) return;

  if (editingPetId.value) {
    petsStore.updatePet(editingPetId.value, {
      name: petName.value.trim(),
      type: petType.value,
      breed: petBreed.value.trim(),
      avatar: petAvatar.value,
      color: petColor.value,
      textColor: petTextColor.value,
      notes: petNotes.value.trim(),
      isActive: petIsActive.value,
    });
  } else {
    petsStore.addPet({
      name: petName.value.trim(),
      type: petType.value,
      breed: petBreed.value.trim(),
      avatar: petAvatar.value,
      color: petColor.value,
      textColor: petTextColor.value,
      notes: petNotes.value.trim(),
      isActive: petIsActive.value,
    });
  }

  isEditorOpen.value = false;
  editingPetId.value = null;
}

function deletePet(pet: Pet) {
  const hasBookings = bookingsStore.bookings.some(b => b.petId === pet.id);
  const confirmMsg = hasBookings
    ? `У питомца ${pet.name} есть сохранённые бронирования передержки. Вы уверены, что хотите удалить его?`
    : `Удалить питомца ${pet.name}?`;

  if (confirm(confirmMsg)) {
    petsStore.deletePet(pet.id);
    if (bookingsStore.filterPetId === pet.id) {
      bookingsStore.filterPetId = null;
    }
  }
}

function viewInCalendar(pet: Pet) {
  bookingsStore.filterPetId = pet.id;
  emit('go-calendar');
}

function getPetBookingsCount(petId: string): number {
  return bookingsStore.bookings.filter(b => b.petId === petId).length;
}

function getPetTypeLabel(type: PetType): string {
  switch (type) {
    case 'cat': return 'Кошка';
    case 'dog': return 'Собака';
    case 'rabbit': return 'Кролик';
    case 'bird': return 'Птица';
    default: return 'Питомец';
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden bg-cat-50">
    <!-- Top Action Bar -->
    <div class="bg-white border-b border-cat-100 p-3 shrink-0 shadow-2xs">
      <div class="max-w-lg mx-auto flex items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-extrabold text-slate-800">
            Питомцы на передержке
          </h2>
          <p class="text-xs text-slate-500 font-medium">
            Всего: {{ petsStore.pets.length }} · Активных: {{ petsStore.activePets.length }}
          </p>
        </div>

        <button
          @click="startCreate"
          class="px-3 py-1.5 rounded-lg bg-cat-500 hover:bg-cat-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
        >
          <Plus class="w-4 h-4" />
          <span>Добавить</span>
        </button>
      </div>

      <!-- Filter tabs: Активные / Все / Скрытые -->
      <div class="max-w-lg mx-auto flex items-center gap-1.5 bg-cat-100/60 p-1 rounded-lg text-xs font-bold mt-2.5">
        <button
          @click="currentFilter = 'active'"
          class="flex-1 py-1 rounded-md transition-all text-center"
          :class="currentFilter === 'active' ? 'bg-white text-cat-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'"
        >
          Активные ({{ petsStore.activePets.length }})
        </button>
        <button
          @click="currentFilter = 'all'"
          class="flex-1 py-1 rounded-md transition-all text-center"
          :class="currentFilter === 'all' ? 'bg-white text-cat-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'"
        >
          Все ({{ petsStore.pets.length }})
        </button>
        <button
          @click="currentFilter = 'hidden'"
          class="flex-1 py-1 rounded-md transition-all text-center"
          :class="currentFilter === 'hidden' ? 'bg-white text-cat-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'"
        >
          Скрытые ({{ petsStore.hiddenPets.length }})
        </button>
      </div>

      <!-- Active Filter Banner (if filtered) -->
      <div
        v-if="bookingsStore.filterPetId"
        class="max-w-lg mx-auto mt-2.5 flex items-center justify-between bg-cat-100/90 px-3 py-1.5 rounded-lg border border-cat-200 text-xs"
      >
        <div class="flex items-center gap-1.5">
          <Filter class="w-3.5 h-3.5 text-cat-600" />
          <span class="text-cat-700 font-medium">В календаре включен фильтр:</span>
          <span class="font-extrabold text-cat-900">
            {{ petsStore.getPetById(bookingsStore.filterPetId)?.name }}
          </span>
        </div>
        <button
          @click="bookingsStore.filterPetId = null"
          class="text-xs font-bold text-cat-700 hover:text-cat-900 underline"
        >
          Сбросить
        </button>
      </div>
    </div>

    <!-- Scrollable Pets Cards Feed -->
    <div class="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 overscroll-contain pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <div class="max-w-lg mx-auto space-y-3">
        <!-- Empty State -->
        <div
          v-if="displayedPets.length === 0"
          class="bg-white rounded-xl border border-cat-100 p-8 text-center space-y-3 my-6 shadow-cute"
        >
          <div class="w-14 h-14 rounded-2xl bg-cat-100 text-cat-500 mx-auto flex items-center justify-center text-3xl">
            🐾
          </div>
          <div>
            <h4 class="text-sm font-extrabold text-slate-800">
              {{ currentFilter === 'hidden' ? 'Скрытых питомцев нет' : currentFilter === 'active' ? 'Нет активных питомцев' : 'Список питомцев пуст' }}
            </h4>
            <p class="text-xs text-slate-500 mt-1">
              {{ currentFilter === 'hidden'
                ? 'Вы можете скрыть питомца, чтобы он не загромождал список выбора при создании броней'
                : 'Добавьте первого питомца или включите ранее скрытого' }}
            </p>
          </div>
          <button
            v-if="currentFilter !== 'hidden'"
            @click="startCreate"
            class="px-4 py-2 rounded-lg bg-cat-500 hover:bg-cat-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
          >
            <Plus class="w-4 h-4" />
            <span>Добавить питомца</span>
          </button>
        </div>

        <!-- Pet Card -->
        <div
          v-for="pet in displayedPets"
          :key="pet.id"
          class="rounded-xl border border-cat-100 p-3.5 shadow-cute space-y-3 transition-all hover:border-cat-300"
          :class="[
            bookingsStore.filterPetId === pet.id ? 'ring-2 ring-cat-400' : '',
            pet.isActive === false ? 'opacity-80 border-dashed bg-slate-50/70' : 'bg-white'
          ]"
        >
          <div class="flex items-start justify-between gap-3">
            <!-- Left: Avatar + Details -->
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-xs shrink-0 border border-black/5"
                :style="{ backgroundColor: pet.color, color: pet.textColor || '#2D1537' }"
              >
                {{ pet.avatar }}
              </div>

              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="text-base font-extrabold text-slate-800 tracking-tight">
                    {{ pet.name }}
                  </h3>
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cat-100 text-cat-700 border border-cat-200">
                    {{ getPetTypeLabel(pet.type) }}
                  </span>
                  <span
                    v-if="pet.isActive === false"
                    class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200/80 text-slate-600 border border-slate-300"
                  >
                    Скрыт
                  </span>
                </div>
                <p v-if="pet.breed" class="text-xs text-slate-500 font-medium">
                  {{ pet.breed }}
                </p>
                <p class="text-[11px] text-slate-400 font-medium mt-0.5">
                  Бронирований: <strong class="text-slate-600">{{ getPetBookingsCount(pet.id) }}</strong>
                </p>
              </div>
            </div>

            <!-- Color Swatch Pin -->
            <div
              class="w-5 h-5 rounded-md border border-black/10 shrink-0 shadow-2xs"
              :style="{ backgroundColor: pet.color }"
              title="Цвет питомца в календаре"
            ></div>
          </div>

          <!-- Pet Notes (if any) -->
          <div
            v-if="pet.notes"
            class="bg-cat-50/70 p-2.5 rounded-lg border border-cat-100/80 text-xs text-slate-600 leading-relaxed font-medium"
          >
            {{ pet.notes }}
          </div>

          <!-- Bottom Action Buttons Row -->
          <div class="flex items-center justify-between pt-2 border-t border-cat-50 text-xs gap-2">
            <button
              @click="viewInCalendar(pet)"
              class="px-2.5 py-1.5 rounded-lg bg-cat-100 hover:bg-cat-200 text-cat-700 font-bold text-xs flex items-center gap-1.5 border border-cat-200 active:scale-95 transition-all"
              title="Показать события этого питомца в календаре"
            >
              <Calendar class="w-3.5 h-3.5 text-cat-600" />
              <span>В календарь</span>
            </button>

            <div class="flex items-center gap-1.5">
              <!-- Toggle Active / Hidden Quick Button -->
              <button
                @click="petsStore.togglePetActive(pet.id)"
                class="px-2.5 py-1.5 rounded-lg border active:scale-90 transition-all text-xs flex items-center gap-1 font-bold shadow-2xs"
                :class="pet.isActive !== false
                  ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 bg-white border-slate-200'
                  : 'text-cat-700 bg-cat-100 hover:bg-cat-200 border-cat-200'"
                :title="pet.isActive !== false ? 'Скрыть из быстрого выбора' : 'Вернуть в активные'"
              >
                <EyeOff v-if="pet.isActive !== false" class="w-3.5 h-3.5 text-slate-400" />
                <Eye v-else class="w-3.5 h-3.5 text-cat-600" />
                <span>{{ pet.isActive !== false ? 'Скрыть' : 'Включить' }}</span>
              </button>

              <button
                @click="startEdit(pet)"
                class="p-1.5 rounded-lg text-slate-500 hover:text-cat-700 hover:bg-cat-50 border border-transparent hover:border-cat-200 active:scale-90 transition-all"
                title="Редактировать"
              >
                <Edit2 class="w-4 h-4" />
              </button>
              <button
                @click="deletePet(pet)"
                class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 active:scale-90 transition-all"
                title="Удалить"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pet Create / Edit Modal Dialog -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isEditorOpen"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4"
        @click="isEditorOpen = false"
      >
        <div
          class="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-xl shadow-2xl border border-cat-100 overflow-hidden max-h-[90vh] flex flex-col transform transition-all"
          @click.stop
        >
          <!-- Editor Header -->
          <div class="px-5 pt-4 pb-3 border-b border-cat-100 flex items-center justify-between bg-gradient-to-r from-cat-50 via-white to-cat-50">
            <div class="flex items-center gap-2">
              <div class="p-2 rounded-lg bg-cat-100 text-cat-600">
                <PawPrint class="w-5 h-5" />
              </div>
              <div>
                <h3 class="text-base font-extrabold text-slate-800">
                  {{ editingPetId ? 'Редактировать питомца' : 'Новый питомец' }}
                </h3>
                <p class="text-xs text-slate-500 font-medium">
                  Настройте имя, аватар и цвет для календаря
                </p>
              </div>
            </div>

            <button
              @click="isEditorOpen = false"
              class="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90 transition-all"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Form Fields -->
          <div class="p-5 overflow-y-auto space-y-4">
            <!-- Name & Type -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="block text-xs font-bold text-slate-700">
                  Кличка *
                </label>
                <input
                  v-model="petName"
                  type="text"
                  placeholder="напр., Барсик"
                  class="w-full bg-cat-50/50 border border-cat-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cat-400"
                />
              </div>

              <div class="space-y-1">
                <label class="block text-xs font-bold text-slate-700">
                  Вид животного
                </label>
                <select
                  v-model="petType"
                  class="w-full bg-cat-50/50 border border-cat-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cat-400"
                >
                  <option v-for="t in petTypesList" :key="t.id" :value="t.id">
                    {{ t.label }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Breed -->
            <div class="space-y-1">
              <label class="block text-xs font-bold text-slate-700">
                Порода / Описание
              </label>
              <input
                v-model="petBreed"
                type="text"
                placeholder="напр., Шотландский вислоухий"
                class="w-full bg-cat-50/50 border border-cat-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-cat-400"
              />
            </div>

            <!-- Emoji Avatar Selection -->
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-700">
                Аватар питомца
              </label>
              <div class="flex items-center gap-2 flex-wrap">
                <button
                  v-for="emoji in avatarOptions"
                  :key="emoji"
                  type="button"
                  @click="petAvatar = emoji"
                  class="w-10 h-10 rounded-lg text-xl flex items-center justify-center border transition-all active:scale-95"
                  :class="petAvatar === emoji
                    ? 'border-cat-500 bg-cat-100 ring-2 ring-cat-300'
                    : 'border-cat-200 bg-white hover:bg-cat-50'"
                >
                  {{ emoji }}
                </button>
              </div>
            </div>

            <!-- Pastel Color Palette Selection -->
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-700">
                Цвет дней в календаре
              </label>
              <div class="grid grid-cols-5 gap-2">
                <button
                  v-for="c in PASTEL_PET_COLORS"
                  :key="c.bg"
                  type="button"
                  @click="selectColor(c)"
                  class="h-9 rounded-lg flex items-center justify-center border transition-all active:scale-95 shadow-2xs"
                  :style="{ backgroundColor: c.bg }"
                  :class="petColor === c.bg ? 'ring-2 ring-cat-600 border-white' : 'border-black/10 hover:opacity-90'"
                >
                  <Check v-if="petColor === c.bg" class="w-4 h-4 stroke-[3]" :style="{ color: c.text }" />
                </button>
              </div>
            </div>

            <!-- Notes -->
            <div class="space-y-1">
              <label class="block text-xs font-bold text-slate-700">
                Особенности (кормление, уход, привычки)
              </label>
              <textarea
                v-model="petNotes"
                rows="3"
                placeholder="Любимый корм, время выгула, лекарства..."
                class="w-full bg-cat-50/50 border border-cat-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-cat-400"
              ></textarea>
            </div>

            <!-- Active / Hidden Switch -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-cat-50/80 border border-cat-100">
              <div>
                <span class="block text-xs font-bold text-slate-800">Активный питомец</span>
                <span class="block text-[11px] text-slate-500">Отображать в быстром выборе при создании броней</span>
              </div>
              <button
                type="button"
                @click="petIsActive = !petIsActive"
                class="w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 focus:outline-none shrink-0"
                :class="petIsActive ? 'bg-cat-500' : 'bg-slate-300'"
              >
                <div
                  class="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform"
                  :class="petIsActive ? 'translate-x-5' : 'translate-x-0'"
                ></div>
              </button>
            </div>
          </div>

          <!-- Editor Footer -->
          <div class="p-4 border-t border-cat-100 bg-cat-50/50 flex gap-2 justify-end">
            <button
              @click="isEditorOpen = false"
              type="button"
              class="px-4 py-2 rounded-lg bg-white border border-cat-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all"
            >
              Отмена
            </button>
            <button
              @click="savePet"
              :disabled="!petName.trim()"
              type="button"
              class="px-5 py-2 rounded-lg bg-cat-500 hover:bg-cat-600 text-white font-bold text-xs transition-all disabled:opacity-50 shadow-xs active:scale-95"
            >
              {{ editingPetId ? 'Сохранить изменения' : 'Создать питомца' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
