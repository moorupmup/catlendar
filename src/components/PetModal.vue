<script setup lang="ts">
import { ref } from 'vue';
import type { Pet, PetType } from '../types';
import { usePetsStore, PASTEL_PET_COLORS } from '../stores/pets';
import { useBookingsStore } from '../stores/bookings';
import { X, Plus, Trash2, Edit2, Check, Filter, PawPrint, Eye, EyeOff } from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const petsStore = usePetsStore();
const bookingsStore = useBookingsStore();

const isCreating = ref(false);
const editingPetId = ref<string | null>(null);

const petName = ref('');
const petType = ref<PetType>('cat');
const petBreed = ref('');
const petAvatar = ref('🐱');
const petColor = ref(PASTEL_PET_COLORS[0].bg);
const petTextColor = ref(PASTEL_PET_COLORS[0].text);
const petNotes = ref('');
const petIsActive = ref(true);

const avatarOptions = ['🐱', '😸', '🐶', '🐕', '🐰', '🐹', '🦜', '🐾', '✨'];

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
  isCreating.value = true;
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
  isCreating.value = true;
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

  isCreating.value = false;
  editingPetId.value = null;
}

function toggleFilter(petId: string) {
  if (bookingsStore.filterPetId === petId) {
    bookingsStore.filterPetId = null;
  } else {
    bookingsStore.filterPetId = petId;
  }
}

function removePet(pet: Pet) {
  if (confirm(`Удалить питомца ${pet.name}?`)) {
    petsStore.deletePet(pet.id);
  }
}

function handleBack(): boolean {
  if (isCreating.value) {
    isCreating.value = false;
    return true;
  }
  return false;
}

defineExpose({
  handleBack,
});
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
        class="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-xl shadow-2xl border border-cat-100 overflow-hidden max-h-[90vh] flex flex-col transform transition-all"
        @click.stop
      >
        <!-- Modal Top Bar -->
        <div class="px-5 pt-4 pb-3 border-b border-cat-100 flex items-center justify-between bg-gradient-to-r from-cat-50 via-white to-cat-50">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-cat-700 bg-cat-100 px-2 py-0.5 rounded-md border border-cat-200 flex items-center gap-1.5">
              <PawPrint class="w-3.5 h-3.5 text-cat-600" />
              <span>Наши питомцы</span>
            </span>
          </div>

          <div class="flex items-center gap-1">
            <button
              v-if="!isCreating"
              @click="startCreate"
              class="px-3 py-1.5 rounded-lg bg-cat-500 text-white text-xs font-bold hover:bg-cat-600 active:scale-95 transition-all flex items-center gap-1 shadow-xs"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>Добавить</span>
            </button>
            <button
              @click="emit('close')"
              class="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90 transition-all ml-1"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Create/Edit Form Sub-screen -->
        <div v-if="isCreating" class="p-5 overflow-y-auto space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-cat-100">
            <h4 class="text-sm font-extrabold text-slate-800">
              {{ editingPetId ? 'Редактировать питомца' : 'Новый хвостик' }}
            </h4>
            <button
              @click="isCreating = false"
              class="text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Назад к списку
            </button>
          </div>

          <!-- Avatar Emoji picker -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 mb-1.5">Иконка питомца</label>
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="emoji in avatarOptions"
                :key="emoji"
                type="button"
                @click="petAvatar = emoji"
                class="w-10 h-10 rounded-xl text-xl flex items-center justify-center border-2 transition-all"
                :class="petAvatar === emoji ? 'border-cat-500 bg-cat-100 scale-110 shadow-xs' : 'border-cat-100 bg-white hover:bg-cat-50'"
              >
                {{ emoji }}
              </button>
            </div>
          </div>

          <!-- Pastel Color picker for calendar bar -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 mb-1.5">
              Цвет полоски на календаре
            </label>
            <div class="grid grid-cols-5 gap-2">
              <button
                v-for="c in PASTEL_PET_COLORS"
                :key="c.bg"
                type="button"
                @click="selectColor(c)"
                class="h-8 rounded-xl border flex items-center justify-center text-xs font-black transition-all shadow-xs"
                :style="{ backgroundColor: c.bg, color: c.text, borderColor: petColor === c.bg ? '#FF477E' : 'transparent' }"
                :class="petColor === c.bg ? 'ring-2 ring-cat-500 scale-105' : 'opacity-80 hover:opacity-100'"
              >
                <Check v-if="petColor === c.bg" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Name & Breed -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-500 mb-1">Кличка *</label>
              <input
                v-model="petName"
                type="text"
                placeholder="напр., Барсик"
                class="w-full bg-cat-50/40 border border-cat-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cat-400"
              />
            </div>
            <div>
              <label class="block text-[11px] font-bold text-slate-500 mb-1">Порода / вид</label>
              <input
                v-model="petBreed"
                type="text"
                placeholder="напр., Шотландец"
                class="w-full bg-cat-50/40 border border-cat-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-cat-400"
              />
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-[11px] font-bold text-slate-500 mb-1">Особенности, рацион, привычки</label>
            <textarea
              v-model="petNotes"
              rows="2"
              placeholder="Что любит, чего боится, расписание кормления..."
              class="w-full bg-cat-50/40 border border-cat-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-cat-400 resize-none"
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

          <div class="flex justify-end gap-2 pt-2 pb-[max(1rem,env(safe-area-inset-bottom,16px))]">
            <button
              @click="isCreating = false"
              class="px-4 py-2 rounded-xl bg-white border border-cat-200 text-xs font-bold text-slate-600"
            >
              Отмена
            </button>
            <button
              @click="savePet"
              class="px-5 py-2 rounded-xl bg-cat-500 text-white text-xs font-bold hover:bg-cat-600 shadow-cute"
            >
              {{ editingPetId ? 'Сохранить' : 'Добавить питомца' }}
            </button>
          </div>
        </div>

        <!-- Pets List -->
        <div v-else class="p-5 overflow-y-auto space-y-2.5">
          <div
            v-for="pet in petsStore.pets"
            :key="pet.id"
            class="p-3 rounded-xl border flex items-center justify-between gap-3 transition-all"
            :class="pet.isActive === false ? 'opacity-80 border-dashed' : ''"
            :style="{ backgroundColor: `${pet.color}25`, borderColor: pet.color }"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-inner border border-white shrink-0"
                :style="{ backgroundColor: pet.color }"
              >
                {{ pet.avatar }}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="text-sm font-extrabold text-slate-800">{{ pet.name }}</h4>
                  <span
                    v-if="pet.isActive === false"
                    class="text-[9px] font-bold text-slate-500 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200 leading-none"
                  >
                    скрыт
                  </span>
                  <span
                    v-else
                    class="w-2.5 h-2.5 rounded-full"
                    :style="{ backgroundColor: pet.color }"
                  />
                </div>
                <p class="text-[11px] text-slate-500">{{ pet.breed || 'Питомец' }}</p>
                <p v-if="pet.notes" class="text-[10px] text-slate-600 mt-0.5 line-clamp-1 italic">
                  «{{ pet.notes }}»
                </p>
              </div>
            </div>

            <!-- Pet Actions: Active Toggle, Filter on calendar, Edit, Delete -->
            <div class="flex items-center gap-1 shrink-0">
              <button
                @click="petsStore.togglePetActive(pet.id)"
                class="p-2 rounded-lg border transition-all text-xs flex items-center gap-1"
                :class="pet.isActive !== false ? 'bg-white text-slate-400 border-cat-200 hover:text-slate-600 hover:bg-cat-50' : 'bg-cat-100 text-cat-700 border-cat-200 font-bold'"
                :title="pet.isActive !== false ? 'Скрыть из быстрого выбора' : 'Включить в активные'"
              >
                <EyeOff v-if="pet.isActive !== false" class="w-3.5 h-3.5" />
                <Eye v-else class="w-3.5 h-3.5" />
              </button>
              <button
                @click="toggleFilter(pet.id)"
                class="p-2 rounded-lg border transition-all text-xs flex items-center gap-1"
                :class="bookingsStore.filterPetId === pet.id ? 'bg-cat-500 text-white border-cat-500 font-bold' : 'bg-white text-slate-600 border-cat-200 hover:bg-cat-50'"
                title="Фильтр на календаре"
              >
                <Filter class="w-3.5 h-3.5" />
              </button>
              <button
                @click="startEdit(pet)"
                class="p-2 rounded-lg bg-white text-slate-600 border border-cat-200 hover:bg-cat-50 transition-all"
                title="Редактировать"
              >
                <Edit2 class="w-3.5 h-3.5" />
              </button>
              <button
                @click="removePet(pet)"
                class="p-2 rounded-lg bg-white text-slate-400 border border-cat-200 hover:text-red-500 hover:bg-red-50 transition-all"
                title="Удалить"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div v-if="petsStore.pets.length === 0" class="text-center py-8 text-slate-400 text-xs">
            Нет добавленных питомцев. Нажмите «Добавить», чтобы создать первого!
          </div>
        </div>

        <!-- Bottom Bar -->
        <div class="p-4 border-t border-cat-100 bg-cat-50/50 flex items-center justify-end pb-[max(1rem,env(safe-area-inset-bottom,16px))]">
          <button
            @click="emit('close')"
            class="px-4 py-2 rounded-lg bg-white border border-cat-200 text-slate-700 text-xs font-bold shadow-xs hover:bg-cat-50 active:scale-95 transition-all"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
