<script setup lang="ts">
import { ref, watch } from 'vue';
import { useUpdaterStore } from '../stores/updater';
import { useBookingsStore } from '../stores/bookings';
import {
  X,
  Settings,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  CheckCircle,
  Heart,
  AlertCircle,
  LayoutGrid,
  Moon,
} from 'lucide-vue-next';
import { getWidgetTheme, setWidgetTheme, type WidgetTheme } from '../services/widgetBridge';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const updaterStore = useUpdaterStore();
const bookingsStore = useBookingsStore();

const importText = ref('');
const showImportArea = ref(false);
const importMessage = ref<string | null>(null);
const checkedRecently = ref(false);

const selectedWidgetTheme = ref<WidgetTheme>('classic');

watch(
  () => props.isOpen,
  async (open) => {
    if (open) {
      selectedWidgetTheme.value = await getWidgetTheme();
    }
  },
  { immediate: true }
);

async function handleThemeChange(theme: WidgetTheme) {
  selectedWidgetTheme.value = theme;
  await setWidgetTheme(theme);
}

async function handleCheckUpdates() {
  checkedRecently.value = false;
  await updaterStore.checkForUpdates(true);
  checkedRecently.value = true;
}

function handleExport() {
  const json = bookingsStore.exportDataJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `catlendar-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleImport() {
  if (!importText.value.trim()) return;
  const ok = bookingsStore.importDataJSON(importText.value);
  if (ok) {
    importMessage.value = 'Данные успешно восстановлены! ✓';
    showImportArea.value = false;
    importText.value = '';
    setTimeout(() => {
      importMessage.value = null;
    }, 3000);
  } else {
    importMessage.value = 'Ошибка: некорректный формат JSON файла';
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
        class="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-xl shadow-2xl border border-cat-100 overflow-hidden max-h-[90vh] flex flex-col transform transition-all"
        @click.stop
      >
        <!-- Modal Top Bar -->
        <div class="px-5 pt-4 pb-3 border-b border-cat-100 flex items-center justify-between bg-gradient-to-r from-cat-50 via-white to-cat-50">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-cat-700 bg-cat-100 px-2.5 py-1 rounded-md border border-cat-200 flex items-center gap-1.5">
              <Settings class="w-3.5 h-3.5 text-cat-600" />
              <span>Настройки</span>
            </span>
          </div>

          <button
            @click="emit('close')"
            class="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90 transition-all"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-5 overflow-y-auto space-y-4">
          <!-- App Info & Clean Update Section -->
          <div class="bg-white p-4 rounded-xl border border-cat-100 shadow-cute space-y-3.5">
            <!-- App Identity: Logo, Title, Version -->
            <div class="flex items-center gap-3">
              <img
                src="/logo.svg"
                alt="Catlendar Logo"
                class="h-12 w-auto object-contain select-none"
              />
              <div>
                <h3 class="text-base font-extrabold text-slate-800 tracking-tight">
                  Catlendar
                </h3>
                <p class="text-xs text-slate-500 font-medium">
                  Текущая версия: v{{ updaterStore.currentVersion }}
                </p>
              </div>
            </div>

            <!-- New Version Message (shown if update is available) -->
            <div
              v-if="updaterStore.hasUpdate && updaterStore.latestRelease"
              class="bg-gradient-to-tr from-cat-50 to-cream-50 border border-cat-200 p-3.5 rounded-lg space-y-1.5"
            >
              <div class="flex items-center gap-1.5 text-xs font-black text-cat-700">
                <Sparkles class="w-4 h-4 text-cat-500" />
                <span>Доступно обновление: {{ updaterStore.latestRelease.tagName }}!</span>
              </div>
              <p v-if="updaterStore.latestRelease.body" class="text-[11px] text-slate-600 font-medium line-clamp-3 whitespace-pre-line">
                {{ updaterStore.latestRelease.body }}
              </p>
            </div>

            <!-- Status message if already up to date -->
            <div
              v-else-if="checkedRecently && !updaterStore.hasUpdate && !updaterStore.errorMessage"
              class="bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-lg text-xs font-bold flex items-center gap-2"
            >
              <CheckCircle class="w-4 h-4 text-emerald-600 shrink-0" />
              <span>У вас установлена последняя версия!</span>
            </div>

            <!-- Error message if check failed -->
            <div
              v-if="updaterStore.errorMessage"
              class="bg-red-50 border border-red-200 text-red-600 p-2.5 rounded-lg text-xs font-medium flex items-center gap-2"
            >
              <AlertCircle class="w-4 h-4 text-red-500 shrink-0" />
              <span>{{ updaterStore.errorMessage }}</span>
            </div>

            <!-- Action Button: "Обновить" if update available, otherwise "Проверить обновления" -->
            <div>
              <button
                v-if="updaterStore.hasUpdate"
                @click="updaterStore.downloadAndInstall"
                :disabled="updaterStore.isDownloading"
                class="w-full py-2.5 rounded-lg bg-cat-500 text-white font-bold text-xs hover:bg-cat-600 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
              >
                <Download class="w-4 h-4" :class="{ 'animate-bounce': updaterStore.isDownloading }" />
                <span>{{ updaterStore.isDownloading ? 'Загрузка обновления...' : 'Обновить' }}</span>
              </button>

              <button
                v-else
                @click="handleCheckUpdates"
                :disabled="updaterStore.isChecking"
                class="w-full py-2.5 rounded-lg bg-cat-100 text-cat-700 font-bold text-xs hover:bg-cat-200 active:scale-98 transition-all flex items-center justify-center gap-2 border border-cat-200 disabled:opacity-60"
              >
                <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': updaterStore.isChecking }" />
                <span>{{ updaterStore.isChecking ? 'Проверяем...' : 'Обновить' }}</span>
              </button>
            </div>
          </div>

          <!-- Section: Home Screen Widget Customization -->
          <div class="bg-white p-4 rounded-xl border border-cat-100 shadow-cute space-y-3">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-cat-100 flex items-center justify-center text-cat-600">
                <LayoutGrid class="w-4 h-4" />
              </div>
              <div>
                <h4 class="text-xs font-black text-slate-800">
                  Виджет на рабочий стол
                </h4>
                <p class="text-[11px] text-slate-500 font-medium">
                  Стиль оформления и эффекты стекла
                </p>
              </div>
            </div>

            <!-- Theme Choices (3 Cards) -->
            <div class="grid grid-cols-3 gap-2 pt-1">
              <!-- 1. Classic Light -->
              <button
                type="button"
                @click="handleThemeChange('classic')"
                class="p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center relative active:scale-95 touch-manipulation"
                :class="selectedWidgetTheme === 'classic'
                  ? 'border-cat-500 bg-cat-50/70 shadow-xs ring-2 ring-cat-300'
                  : 'border-slate-200 bg-white hover:border-cat-200'"
              >
                <!-- Mini Preview Box -->
                <div class="w-full h-8 rounded-lg bg-white border border-cat-200 flex items-center justify-center shadow-2xs gap-1">
                  <span class="w-2.5 h-2.5 rounded-full bg-cat-400"></span>
                  <span class="w-2.5 h-2.5 rounded-full bg-amber-300"></span>
                </div>
                <span class="text-[11px] font-bold text-slate-700 leading-tight">Светлый</span>
                <span class="text-[9px] text-slate-400">Классика</span>
              </button>

              <!-- 2. Glass Light -->
              <button
                type="button"
                @click="handleThemeChange('glass_light')"
                class="p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center relative active:scale-95 touch-manipulation"
                :class="selectedWidgetTheme === 'glass_light'
                  ? 'border-cat-500 bg-cat-50/70 shadow-xs ring-2 ring-cat-300'
                  : 'border-slate-200 bg-white hover:border-cat-200'"
              >
                <!-- Mini Preview Box -->
                <div class="w-full h-8 rounded-lg bg-gradient-to-br from-rose-100/90 via-white/80 to-sky-100/90 border border-white/80 flex items-center justify-center shadow-2xs">
                  <Sparkles class="w-3.5 h-3.5 text-cat-500" />
                </div>
                <span class="text-[11px] font-bold text-slate-700 leading-tight">Светлое</span>
                <span class="text-[9px] text-cat-600 font-semibold">Стекло</span>
              </button>

              <!-- 3. Glass Dark -->
              <button
                type="button"
                @click="handleThemeChange('glass_dark')"
                class="p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center relative active:scale-95 touch-manipulation"
                :class="selectedWidgetTheme === 'glass_dark'
                  ? 'border-cat-500 bg-cat-50/70 shadow-xs ring-2 ring-cat-300'
                  : 'border-slate-200 bg-white hover:border-cat-200'"
              >
                <!-- Mini Preview Box -->
                <div class="w-full h-8 rounded-lg bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-white/20 flex items-center justify-center shadow-2xs">
                  <Moon class="w-3.5 h-3.5 text-cat-300" />
                </div>
                <span class="text-[11px] font-bold text-slate-700 leading-tight">Тёмное</span>
                <span class="text-[9px] text-indigo-500 font-semibold">Стекло</span>
              </button>
            </div>

            <!-- Helpful Widget Tips -->
            <div class="text-[11px] text-slate-500 bg-cat-50/40 p-2.5 rounded-lg border border-cat-100 space-y-1">
              <p class="flex items-start gap-1">
                <span class="text-cat-500">✨</span>
                <span>Виджет можно свободно сжимать на рабочем столе от <b>2×2</b> до полного экрана.</span>
              </p>
              <p class="flex items-start gap-1">
                <span class="text-cat-500">🔄</span>
                <span>Тему можно переключать прямо на самом виджете по кнопке в верхнем правом углу.</span>
              </p>
            </div>
          </div>

          <!-- Section: Backup & Restore (JSON) -->
          <div class="bg-white p-3.5 rounded-xl border border-cat-100 shadow-cute space-y-3">
            <h4 class="text-xs font-black text-slate-700 uppercase tracking-wider">
              Резервная копия данных
            </h4>

            <div v-if="importMessage" class="p-2.5 rounded-lg text-xs font-bold bg-cat-100 text-cat-700 border border-cat-200">
              {{ importMessage }}
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button
                @click="handleExport"
                class="py-2.5 px-3 rounded-lg bg-cat-50 text-cat-700 border border-cat-200 font-bold text-xs hover:bg-cat-100 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Download class="w-3.5 h-3.5" />
                <span>Экспорт JSON</span>
              </button>

              <button
                @click="showImportArea = !showImportArea"
                class="py-2.5 px-3 rounded-lg bg-cat-50 text-cat-700 border border-cat-200 font-bold text-xs hover:bg-cat-100 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Upload class="w-3.5 h-3.5" />
                <span>Импорт JSON</span>
              </button>
            </div>

            <!-- Import textarea -->
            <div v-if="showImportArea" class="space-y-2 pt-2 border-t border-cat-100">
              <textarea
                v-model="importText"
                rows="3"
                placeholder="Вставьте JSON резервной копии..."
                class="w-full bg-cat-50/40 border border-cat-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-cat-400 font-mono"
              ></textarea>
              <button
                @click="handleImport"
                class="w-full py-2 rounded-lg bg-cat-500 text-white font-bold text-xs hover:bg-cat-600 transition-all"
              >
                Восстановить данные
              </button>
            </div>
          </div>
        </div>

        <!-- Bottom Bar -->
        <div class="p-4 border-t border-cat-100 bg-cat-50/50 flex items-center justify-between pb-[max(1rem,env(safe-area-inset-bottom,16px))]">
          <span class="text-[11px] text-cat-700 font-bold flex items-center gap-1">
            <span>Сделано с любовью</span>
            <Heart class="w-3 h-3 text-cat-500 fill-cat-500" />
            <span>к котикам</span>
          </span>
          <button
            @click="emit('close')"
            class="px-4 py-2 rounded-lg bg-white border border-cat-200 text-slate-700 text-xs font-bold hover:bg-cat-50 transition-all"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
