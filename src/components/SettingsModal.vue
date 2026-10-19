<script setup lang="ts">
import { ref } from 'vue';
import { useUpdaterStore } from '../stores/updater';
import { useBookingsStore } from '../stores/bookings';
import { X, Settings, Github, Download, Upload, RefreshCw, ShieldCheck, Heart } from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const updaterStore = useUpdaterStore();
const bookingsStore = useBookingsStore();

const repoInput = ref(updaterStore.githubRepo);
const importText = ref('');
const showImportArea = ref(false);
const saveSuccess = ref(false);
const importMessage = ref<string | null>(null);

function saveRepo() {
  updaterStore.setGithubRepo(repoInput.value);
  saveSuccess.value = true;
  setTimeout(() => {
    saveSuccess.value = false;
  }, 2000);
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
    importMessage.value = 'Данные успешно импортированы!';
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
        class="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-cat-100 overflow-hidden max-h-[90vh] flex flex-col transform transition-all"
        @click.stop
      >
        <!-- Modal Top Bar -->
        <div class="px-5 pt-4 pb-3 border-b border-cat-100 flex items-center justify-between bg-gradient-to-r from-cat-50 via-white to-cat-50">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-cat-700 bg-cat-100 px-2.5 py-1 rounded-full border border-cat-200 flex items-center gap-1.5">
              <Settings class="w-3.5 h-3.5 text-cat-600" />
              <span>Настройки приложения</span>
            </span>
          </div>

          <button
            @click="emit('close')"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90 transition-all"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-5 overflow-y-auto space-y-4">
          <!-- Notification msg -->
          <div v-if="importMessage" class="p-3 rounded-2xl text-xs font-bold bg-cat-100 text-cat-700 border border-cat-200">
            {{ importMessage }}
          </div>

          <!-- Section 1: GitHub Repository & In-App Updates -->
          <div class="bg-white p-4 rounded-2xl border border-cat-100 shadow-cute space-y-3">
            <div class="flex items-center gap-2">
              <Github class="w-4 h-4 text-cat-600" />
              <h4 class="text-xs font-black text-slate-700 uppercase tracking-wider">
                Обновления через GitHub
              </h4>
            </div>

            <p class="text-xs text-slate-500 leading-relaxed font-medium">
              Приложение проверяет наличие новых версий APK в релизах вашего репозитория.
            </p>

            <div class="space-y-1.5">
              <label class="block text-[11px] font-bold text-slate-500">
                Репозиторий на GitHub (owner/repo):
              </label>
              <div class="flex gap-2">
                <input
                  v-model="repoInput"
                  type="text"
                  placeholder="напр., username/catlendar"
                  class="flex-1 bg-cat-50/50 border border-cat-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cat-400"
                />
                <button
                  @click="saveRepo"
                  class="px-3.5 py-2 rounded-xl bg-cat-100 text-cat-700 font-bold text-xs hover:bg-cat-200 border border-cat-200 transition-all"
                >
                  {{ saveSuccess ? 'Сохранено! ✓' : 'Сохранить' }}
                </button>
              </div>
            </div>

            <button
              @click="updaterStore.checkForUpdates(true)"
              class="w-full py-2.5 rounded-xl bg-cat-500 text-white font-bold text-xs hover:bg-cat-600 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': updaterStore.isChecking }" />
              <span>Проверить обновление сейчас</span>
            </button>
          </div>

          <!-- Section 2: Keystore & Static Signature Info -->
          <div class="bg-gradient-to-tr from-cream-50 to-cat-50/60 p-4 rounded-2xl border border-cat-200 space-y-2">
            <div class="flex items-center gap-2 text-cat-700 font-bold text-xs">
              <ShieldCheck class="w-4 h-4 text-emerald-600" />
              <span>Статичный ключ подписи Keystore</span>
            </div>
            <p class="text-[11px] text-slate-600 leading-relaxed font-medium">
              В проект включён постоянный релизный ключ подписи (<code class="bg-white/80 px-1 py-0.5 rounded border border-cat-200 text-cat-700">release.keystore</code>) и конфигурация в Gradle. Все билды на GitHub Actions имеют гарантированно одинаковую подпись, что позволяет обновлять приложение без ошибок совместимости.
            </p>
          </div>

          <!-- Section 3: Backup & Restore -->
          <div class="bg-white p-4 rounded-2xl border border-cat-100 shadow-cute space-y-3">
            <h4 class="text-xs font-black text-slate-700 uppercase tracking-wider">
              Резервная копия данных (JSON)
            </h4>

            <div class="grid grid-cols-2 gap-2">
              <button
                @click="handleExport"
                class="py-2.5 px-3 rounded-xl bg-cat-50 text-cat-700 border border-cat-200 font-bold text-xs hover:bg-cat-100 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Download class="w-3.5 h-3.5" />
                <span>Экспорт JSON</span>
              </button>

              <button
                @click="showImportArea = !showImportArea"
                class="py-2.5 px-3 rounded-xl bg-cat-50 text-cat-700 border border-cat-200 font-bold text-xs hover:bg-cat-100 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Upload class="w-3.5 h-3.5" />
                <span>Импорт JSON</span>
              </button>
            </div>

            <!-- Import input area -->
            <div v-if="showImportArea" class="space-y-2 pt-2 border-t border-cat-100">
              <textarea
                v-model="importText"
                rows="3"
                placeholder="Вставьте JSON резервной копии сюда..."
                class="w-full bg-cat-50/40 border border-cat-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-cat-400 font-mono"
              ></textarea>
              <button
                @click="handleImport"
                class="w-full py-2 rounded-xl bg-cat-500 text-white font-bold text-xs hover:bg-cat-600 transition-all"
              >
                Восстановить данные
              </button>
            </div>
          </div>
        </div>

        <!-- Bottom Bar -->
        <div class="p-4 border-t border-cat-100 bg-cat-50/50 flex items-center justify-between">
          <span class="text-[11px] text-cat-700 font-bold flex items-center gap-1">
            <span>Сделано с любовью</span>
            <Heart class="w-3 h-3 text-cat-500 fill-cat-500" />
            <span>к котикам</span>
          </span>
          <button
            @click="emit('close')"
            class="px-5 py-2 rounded-xl bg-white border border-cat-200 text-slate-700 text-xs font-bold hover:bg-cat-50 transition-all"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
