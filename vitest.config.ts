import { defineConfig } from 'vitest/config';

// Configuración propia de tests: sin el plugin PWA (no hace falta para probar la lógica)
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] }
});
