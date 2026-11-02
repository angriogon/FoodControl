# FoodControl 🌱

Web app (PWA) para iPhone para llevar el control diario de **lo que comes, bebes y entrenas**, con una mascota que eliges entre 6 especies (brote, gatito, panda, pollito, conejito y dino) y que se personaliza a medida que mantienes buenos hábitos.

Diseño blanco y minimalista al estilo de las apps de Apple: tipografía del sistema (SF Pro), títulos grandes, listas agrupadas, hojas inferiores con gesto de arrastre, barra de pestañas translúcida y safe areas (Dynamic Island y home indicator). Optimizada para iPhone Air (420×912 pt) y adaptada desde iPhone SE hasta los Pro Max.

## Funcionalidades

| Pestaña | Qué hace |
|---|---|
| **Inicio** | Saludo con la mascota, tareas del día (desayuno, comida, cena, agua, actividad, pesaje semanal), anillos de macros, peso y accesos rápidos. |
| **Diario** | Resumen de kcal (ingeridas / restantes / quemadas), macros, 4 comidas con objetivo propio, actividades, agua (vasos) y notas. Navegación por días (también futuros para planificar). |
| **Análisis** | Diario o por comida: análisis general, calidad de los alimentos, desglose de macros y de comidas, fuente principal de cada macro y sugerencias. |
| **Recetario** | **Menús** (comidas completas que se añaden de un toque, con deshacer, o ajustando antes qué incluir y la cantidad ×0,5–×2) y **platos** (recetas con ingredientes, raciones y peso cocinado opcional). 22 recetas españolas “de la casa” que puedes copiar y adaptar. Desde el Diario, “Guardar como menú” convierte cualquier comida registrada en menú. |
| **Logros** (dentro de Mascota) | 62 logros en 18 series por niveles (racha, días, semanas constantes, variedad, agua, calidad, equilibrio, proteína, fibra, actividad, horas de ejercicio, peso…), pensados para meses y años: los primeros llegan en semanas y los últimos exigen hasta 1000 días. Dan de 100 a 4000 gemas y muchos desbloquean artículos exclusivos. |
| **Mascota** | 6 especies, nivel (curva progresiva: ~nivel 18 tras un año) y armario con 133 artículos en 8 zonas: cabeza, cara, cuello, ropa, mano, compañero, color (incluidos degradados) y fondo. Rarezas Común / Raro / Épico / Legendario / Exclusivo de logro; cada artículo se previsualiza puesto. |
| **Perfil** | **Tendencia de peso** (media móvil que filtra los vaivenes de líquidos), ritmo real en kg/semana, proyección hacia el objetivo, IMC, resumen nutricional de 7 días, objetivos y copias de seguridad. |
| **Objetivo adaptativo** | Cada semana calcula tu **gasto real** con lo que comes (solo días completos) y la recta de tus pesajes de las últimas 5 semanas (1 kg ≈ 7.700 kcal) y **ajusta el objetivo solo**: como máximo ±150 kcal por semana, sin bajar de los mínimos de seguridad, sin contar dos veces el ejercicio. Aviso en Inicio con *Deshacer*, historial y opción de excluir días mal registrados. Se pausa si fijas un objetivo manual. |

**Añadir alimentos**: base local de 350 alimentos y platos habituales en España (funciona sin conexión), búsqueda online en [Open Food Facts](https://world.openfoodfacts.org) (productos de supermercado con Nutri-Score), **escáner de código de barras con la cámara** (lector propio en WebAssembly, sin conexión una vez usado), menús, platos, alimentos propios, recientes, *añadido rápido* de kcal, “copiar la comida de ayer” y **sugerencias “lo de siempre”** según la hora (combinaciones que repites y menús de esa comida).

**Cálculo de objetivos**: Mifflin-St Jeor × factor de actividad, ± déficit/superávit según el ritmo semanal elegido (1 kg ≈ 7700 kcal), con un mínimo de seguridad. Macros y reparto por comidas configurables.

## Accesibilidad

- **Tamaño de texto**: sigue el de iOS (Dynamic Type) o se fija en la app (Normal / Grande / Muy grande). Toda la interfaz está en `rem`, así que escalan también botones, anillos y gráficos.
- **Zoom bloqueado** (pellizco y doble toque) a petición; el ajuste de tamaño de texto lo sustituye.
- **Tema** claro, oscuro o automático, y opción de **contraste aumentado**.
- Compatible con **VoiceOver**: anillos y barras anuncian su valor, botones de icono con etiqueta, controles segmentados y comidas plegables con estado (`aria-pressed`, `aria-expanded`).
- Áreas táctiles de 44 pt, textos secundarios con contraste ≥ 4,5:1 y respeto a “Reducir movimiento”.

## Dónde se guardan los datos

Los datos se guardan **solo en el iPhone**, en IndexedDB (con copia espejo en localStorage). No hay servidor ni cuentas.

Para que no se pierdan:

1. **Instala la app**: Safari → Compartir → *Añadir a pantalla de inicio*. Las web apps instaladas están exentas del borrado automático de 7 días que Safari aplica a las webs sin uso. La app además pide almacenamiento persistente (`navigator.storage.persist()`).
2. **Haz copias**: Perfil → *Datos y copia de seguridad* → *Exportar copia*. Se abre la hoja de compartir de iOS para guardar el JSON en **iCloud Drive**. La app te avisa si llevas 7 días sin copia.
3. Ojo: Safari y la app instalada tienen **almacenamientos separados**. Usa siempre la app instalada.

### ¿Y en la nube?

| Opción | Ventajas | Inconvenientes |
|---|---|---|
| **Local + copia en iCloud** (actual) | Gratis, privado, sin cuentas, funciona sin conexión | La copia es manual |
| **Supabase / Firebase** | Sincronización automática y multidispositivo | Requiere cuenta/login, backend y gestionar datos de salud de forma segura (RGPD) |
| **App nativa con CloudKit** | Sincronización iCloud transparente | Requiere Xcode, Mac y cuenta de desarrollador (99 €/año) |

Para un uso personal en un solo iPhone, local + copia periódica es lo más sencillo y robusto. La arquitectura (un único documento de estado) permite añadir sincronización con Supabase más adelante sin rehacer la app.

## Desarrollo

Requisitos: Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173/FoodControl/ (también accesible desde el iPhone en la misma red)
npm run build      # genera dist/
npm run preview    # sirve la build
npm test           # tests de la lógica (objetivo adaptativo, tendencia de peso)
npm run icons      # regenera los PNG de iconos desde icons-src/*.svg (requiere Playwright)
```

Stack: React 19 + TypeScript + Vite + vite-plugin-pwa (service worker, offline) + idb-keyval. Sin librerías de UI: iconos, gráficas y mascota son SVG propios.

```
src/
  lib/          lógica pura: nutrición, alimentos, actividades (MET), gamificación, mascota, almacenamiento, Open Food Facts
  store/        estado global (useSyncExternalStore) + valores por defecto y migración
  components/   UI reutilizable: Sheet, Ring, Mascot, TabBar, Toast, iconos
  screens/      pantallas y hojas
```

Las **gemas no se guardan como contador**: se calculan a partir del historial. Así no se pueden “farmear” añadiendo y borrando comidas, y el saldo es idéntico tras restaurar una copia.

## Publicar en GitHub Pages

1. En el repositorio: **Settings → Pages → Source: GitHub Actions**.
2. Haz merge a `main`: el workflow `.github/workflows/deploy.yml` compila y publica en `https://<usuario>.github.io/FoodControl/`.
3. Abre esa URL en Safari del iPhone y añádela a la pantalla de inicio.

## Seguridad

- Sin servidor, cuentas ni claves: los datos no salen del iPhone salvo la búsqueda de productos (Open Food Facts), que solo envía el texto buscado al pulsar el botón.
- **Copias de seguridad tratadas como no fiables**: al restaurar, cada campo se valida (tipo, rango y valores permitidos); un archivo dañado o manipulado no puede bloquear la app. Límite de 20 MB.
- **Pantalla de recuperación**: si algo falla al dibujar la interfaz, en vez de quedarse en blanco permite guardar una copia, reintentar o empezar de cero.
- **Content Security Policy** en la versión publicada: solo se ejecuta el código de la app y solo se conecta a `world.openfoodfacts.org`.
- **Base de datos propia** (`foodcontrol`) en IndexedDB, separada de la genérica, porque todas las webs de `angriogon.github.io` comparten origen y almacenamiento.
- Dependencias fijadas a versión exacta; las que se ejecutan en el iPhone no tienen vulnerabilidades conocidas (`npm audit --omit=dev`). Las avisadas en `workbox-build` solo se usan al compilar.

## Limitaciones conocidas

- iOS Safari no ofrece la API `BarcodeDetector`, por eso el código de barras se escribe a mano.
- Una web app no puede leer Apple Salud; los pasos/ejercicio se introducen manualmente (o copiando las kcal del reloj).
- Los valores nutricionales de la base local son aproximados (tablas tipo BEDCA/USDA) y la calidad A–E de esos alimentos es una estimación propia, no el Nutri-Score oficial. La información es orientativa y no sustituye a un profesional sanitario.
