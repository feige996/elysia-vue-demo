import type { Directive } from 'vue';
import { pinia } from '../store';
import { useAuthStore } from '../store/auth';

export const permissionDirective: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    const authStore = useAuthStore(pinia);
    const required = binding.value;
    if (!required) return;

    const codes = Array.isArray(required) ? required : [required];
    const allowed = codes.some((code) => authStore.hasPermission(code));
    if (!allowed) {
      el.style.display = 'none';
    }
  },
};
