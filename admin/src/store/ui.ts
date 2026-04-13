import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

const THEME_MODE_KEY = 'admin_theme_mode';
const THEME_COLOR_KEY = 'admin_theme_color';

export const useUiStore = defineStore('ui', () => {
  const themeMode = ref<'light' | 'dark'>(
    (localStorage.getItem(THEME_MODE_KEY) as 'light' | 'dark' | null) ?? 'light',
  );
  const primaryColor = ref(
    localStorage.getItem(THEME_COLOR_KEY) || '#18a058',
  );

  const isDarkMode = computed(() => themeMode.value === 'dark');

  const toggleThemeMode = () => {
    themeMode.value = isDarkMode.value ? 'light' : 'dark';
    localStorage.setItem(THEME_MODE_KEY, themeMode.value);
  };

  const setPrimaryColor = (color: string) => {
    primaryColor.value = color;
    localStorage.setItem(THEME_COLOR_KEY, color);
  };

  return {
    themeMode,
    primaryColor,
    isDarkMode,
    toggleThemeMode,
    setPrimaryColor,
  };
});
