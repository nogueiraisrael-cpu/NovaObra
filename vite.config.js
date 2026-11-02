import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração mínima do Vite. Não precisa de mais nada para o padrão desta skill.
export default defineConfig({
  plugins: [react()],
  build: {
    // Decidido em 01/11/2026: com o @supabase/supabase-js o app chega a ~540 kB
    // (~150 kB comprimido, o que de fato vai pela rede). Dividir em pedaços não
    // diminui o total baixado. Se passar de 650 kB, é sinal de peso novo: investigue.
    chunkSizeWarningLimit: 650,
  },
})
