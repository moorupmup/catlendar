<script setup lang="ts">
import { Calendar, Clock, PawPrint } from 'lucide-vue-next';

defineProps<{
  activeTab: 'calendar' | 'history' | 'pets';
}>();

const emit = defineEmits<{
  (e: 'update:activeTab', tab: 'calendar' | 'history' | 'pets'): void;
}>();

const tabs = [
  { id: 'calendar', label: 'Календарь', icon: Calendar },
  { id: 'history', label: 'История', icon: Clock },
  { id: 'pets', label: 'Питомцы', icon: PawPrint },
] as const;
</script>

<template>
  <nav class="bg-white/95 backdrop-blur-md border-t border-cat-100 z-30 shrink-0 select-none shadow-[0_-2px_12px_rgba(255,112,150,0.06)]">
    <div class="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="emit('update:activeTab', tab.id)"
        class="flex-1 py-1 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 touch-manipulation focus:outline-none"
        :class="activeTab === tab.id
          ? 'text-cat-600 font-extrabold'
          : 'text-slate-400 hover:text-slate-600 font-semibold'"
      >
        <div
          class="px-4 py-1 rounded-full transition-all flex items-center justify-center"
          :class="activeTab === tab.id ? 'bg-cat-100/90 text-cat-600 shadow-2xs' : 'text-slate-400'"
        >
          <component
            :is="tab.icon"
            class="w-5 h-5 transition-transform"
            :class="activeTab === tab.id ? 'scale-105 stroke-[2.4]' : 'stroke-2'"
          />
        </div>
        <span class="text-[11px] tracking-tight leading-none">
          {{ tab.label }}
        </span>
      </button>
    </div>
  </nav>
</template>
