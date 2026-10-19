import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import type { ReleaseInfo } from '../types';

export const useUpdaterStore = defineStore('updater', () => {
  const currentVersion = ref('1.0.0');
  const githubRepo = ref(localStorage.getItem('catlendar_github_repo') || 'catlendar/catlendar');
  
  const isChecking = ref(false);
  const isDownloading = ref(false);
  const downloadProgress = ref(0);
  const errorMessage = ref<string | null>(null);
  const latestRelease = ref<ReleaseInfo | null>(null);
  const hasUpdate = ref(false);
  const isModalOpen = ref(false);

  // Compare semantic versions (e.g. 1.0.1 > 1.0.0)
  function compareVersions(v1: string, v2: string): number {
    const clean1 = v1.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    const clean2 = v2.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    const maxLen = Math.max(clean1.length, clean2.length);

    for (let i = 0; i < maxLen; i++) {
      const num1 = clean1[i] || 0;
      const num2 = clean2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }

  function setGithubRepo(repo: string) {
    githubRepo.value = repo.trim().replace(/^https?:\/\/github\.com\//, '');
    localStorage.setItem('catlendar_github_repo', githubRepo.value);
  }

  async function checkForUpdates(manual = false): Promise<boolean> {
    isChecking.value = true;
    errorMessage.value = null;

    try {
      const cleanRepo = githubRepo.value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
      if (!cleanRepo || !cleanRepo.includes('/')) {
        if (manual) {
          errorMessage.value = 'Укажите репозиторий в формате "владелец/репозиторий" в настройках.';
          isModalOpen.value = true;
        }
        return false;
      }

      const response = await fetch(`https://api.github.com/repos/${cleanRepo}/releases/latest`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          if (manual) {
            errorMessage.value = 'Релизы в репозитории пока не найдены. Создайте первый релиз на GitHub.';
            isModalOpen.value = true;
          }
          return false;
        }
        throw new Error(`Ошибка GitHub API: HTTP ${response.status}`);
      }

      const data = await response.json();
      const tagName = data.tag_name || '';
      
      // Look for .apk file in release assets
      const apkAsset = Array.isArray(data.assets) 
        ? data.assets.find((a: any) => a.name && a.name.toLowerCase().endsWith('.apk')) 
        : null;

      const isNewer = compareVersions(tagName, currentVersion.value) > 0;

      latestRelease.value = {
        tagName,
        name: data.name || tagName,
        body: data.body || 'Нет описания изменений',
        publishedAt: data.published_at || '',
        apkDownloadUrl: apkAsset ? apkAsset.browser_download_url : undefined,
        apkName: apkAsset ? apkAsset.name : undefined,
        hasUpdate: isNewer,
      };

      hasUpdate.value = isNewer;

      if (isNewer || manual) {
        isModalOpen.value = true;
      }

      return isNewer;
    } catch (err: any) {
      console.warn('Update check failed:', err);
      if (manual) {
        errorMessage.value = err.message || 'Не удалось проверить наличие обновлений';
        isModalOpen.value = true;
      }
      return false;
    } finally {
      isChecking.value = false;
    }
  }

  async function downloadAndInstall() {
    if (!latestRelease.value?.apkDownloadUrl) {
      errorMessage.value = 'APK-файл не найден в прикрепленных файлах релиза на GitHub';
      return;
    }

    const apkUrl = latestRelease.value.apkDownloadUrl;
    const fileName = latestRelease.value.apkName || 'catlendar-update.apk';

    isDownloading.value = true;
    errorMessage.value = null;

    try {
      if (Capacitor.isNativePlatform()) {
        // Native Android execution: download file to device Cache
        const downloadResult = await Filesystem.downloadFile({
          url: apkUrl,
          path: fileName,
          directory: Directory.Cache,
          progress: true,
        });

        // Trigger Android package installer via FileOpener intent
        if (downloadResult.path) {
          await FileOpener.open({
            filePath: downloadResult.path,
            contentType: 'application/vnd.android.package-archive',
          });
        }
      } else {
        // In Web/Desktop preview: open direct download link in browser
        window.open(apkUrl, '_blank');
      }
    } catch (err: any) {
      console.error('Download / Install failed:', err);
      errorMessage.value = `Ошибка установки: ${err.message || err}`;
    } finally {
      isDownloading.value = false;
    }
  }

  function closeModal() {
    isModalOpen.value = false;
    errorMessage.value = null;
  }

  return {
    currentVersion,
    githubRepo,
    isChecking,
    isDownloading,
    downloadProgress,
    errorMessage,
    latestRelease,
    hasUpdate,
    isModalOpen,
    setGithubRepo,
    checkForUpdates,
    downloadAndInstall,
    closeModal,
  };
});
