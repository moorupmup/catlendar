<script setup lang="ts">
import { useUpdaterStore } from '../stores/updater';
import { X, Download, CheckCircle, AlertCircle, RefreshCw, Sparkles } from 'lucide-vue-next';

const updaterStore = useUpdaterStore();
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
      v-if="updaterStore.isModalOpen"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4"
      @click="updaterStore.closeModal"
    >
      <div
        class="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-cat-100 overflow-hidden flex flex-col transform transition-all"
        @click.stop
      >
        <!-- Modal Top Bar -->
        <div class="px-5 pt-4 pb-3 border-b border-cat-100 flex items-center justify-between bg-gradient-to-r from-cat-50 via-white to-cat-50">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-cat-700 bg-cat-100 px-2.5 py-1 rounded-full border border-cat-200 flex items-center gap-1.5">
              <RefreshCw class="w-3.5 h-3.5 text-cat-600" :class="{ 'animate-spin': updaterStore.isChecking }" />
              <span>Обновление приложения</span>
            </span>
          </div>

          <button
            @click="updaterStore.closeModal"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-90 transition-all"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-5 space-y-4">
          <!-- Error alert -->
          <div v-if="updaterStore.errorMessage" class="bg-red-50 text-red-600 border border-red-200 p-3.5 rounded-2xl text-xs flex items-start gap-2.5">
            <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
            <div class="space-y-1">
              <span class="font-bold block">Внимание</span>
              <p>{{ updaterStore.errorMessage }}</p>
            </div>
          </div>

          <!-- Checking state -->
          <div v-if="updaterStore.isChecking" class="py-8 text-center space-y-3">
            <div class="w-12 h-12 mx-auto rounded-2xl bg-cat-100 flex items-center justify-center text-cat-600">
              <RefreshCw class="w-6 h-6 animate-spin" />
            </div>
            <p class="text-xs font-bold text-slate-700">Проверяем GitHub Releases...</p>
          </div>

          <!-- Update Available State -->
          <div v-else-if="updaterStore.hasUpdate && updaterStore.latestRelease" class="space-y-4">
            <div class="bg-gradient-to-tr from-cat-50 to-cream-50 p-4 rounded-2xl border border-cat-200 flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cat-500 to-cat-400 text-white flex items-center justify-center shadow-cute">
                <Sparkles class="w-6 h-6" />
              </div>
              <div>
                <span class="text-[10px] uppercase tracking-wider font-extrabold text-cat-600">Найдена новая версия!</span>
                <h4 class="text-base font-black text-slate-800">
                  {{ updaterStore.latestRelease.tagName }}
                </h4>
                <p class="text-[11px] text-slate-500 font-medium">
                  Текущая: v{{ updaterStore.currentVersion }}
                </p>
              </div>
            </div>

            <!-- Release Notes -->
            <div class="bg-white rounded-2xl p-3.5 border border-cat-100 shadow-cute text-xs space-y-1 max-h-40 overflow-y-auto">
              <span class="font-extrabold text-slate-700 block">Что нового в обновлении:</span>
              <div class="text-slate-600 whitespace-pre-line leading-relaxed font-medium">
                {{ updaterStore.latestRelease.body }}
              </div>
            </div>

            <!-- Download Button -->
            <button
              @click="updaterStore.downloadAndInstall"
              :disabled="updaterStore.isDownloading"
              class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cat-500 to-cat-400 text-white text-xs font-black shadow-cute hover:shadow-cute-lg active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download class="w-4 h-4" :class="{ 'animate-bounce': updaterStore.isDownloading }" />
              <span>
                {{ updaterStore.isDownloading ? 'Загрузка и запуск обновления...' : 'Скачать и установить обновление' }}
              </span>
            </button>
          </div>

          <!-- Already Latest Version -->
          <div v-else-if="!updaterStore.errorMessage" class="py-6 text-center space-y-3">
            <div class="w-14 h-14 mx-auto rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <CheckCircle class="w-7 h-7" />
            </div>
            <div>
              <h4 class="text-sm font-extrabold text-slate-800">У вас самая свежая версия!</h4>
              <p class="text-xs text-slate-500 mt-0.5">Catlendar v{{ updaterStore.currentVersion }}</p>
            </div>
          </div>
        </div>

        <!-- Bottom Bar -->
        <div class="p-4 border-t border-cat-100 bg-cat-50/50 flex items-center justify-between">
          <span class="text-[10px] text-slate-400 truncate max-w-[200px]">
            Репозиторий: {{ updaterStore.githubRepo }}
          </span>
          <button
            @click="updaterStore.closeModal"
            class="px-4 py-2 rounded-xl bg-white border border-cat-200 text-slate-600 text-xs font-bold hover:bg-cat-50 transition-all"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
