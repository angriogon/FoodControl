# FoodControl 🌱

Web app (PWA) para iPhone para llevar el control diario de **lo que comes, bebes y entrenas**, con una mascota (**Brotín**) que crece y se personaliza a medida que mantienes buenos hábitos.

Diseño minimalista pensado para iOS: tipografías del sistema (SF Pro / New York), hojas inferiores con gesto de arrastre, barra de pestañas translúcida, safe areas (Dynamic Island y home indicator) y modo oscuro automático. Optimizada para iPhone Air (420×912 pt) y adaptada desde iPhone SE hasta los Pro Max.

## Funcionalidades

| Pestaña | Qué hace |
|---|---|
| **Inicio** | Saludo con la mascota, tareas del día (desayuno, comida, cena, agua, actividad, pesaje semanal), anillos de macros, peso y accesos rápidos. |
| **Diario** | Resumen de kcal (ingeridas / restantes / quemadas), macros, 4 comidas con objetivo propio, actividades, agua (vasos) y notas. Navegación por días (también futuros para planificar). |
| **Análisis** | Diario o por comida: análisis general, calidad de los alimentos, desglose de macros y de comidas, fuente principal de cada macro y sugerencias. |
| **Logros** | 19 logros con progreso (rachas, agua, calidad, proteína, fibra, actividad, peso…). Cada uno desbloquea un artículo para la mascota y +50 gemas. |
| **Mascota** | Nivel (le crece una hoja por nivel), estado de ánimo según tu día y armario: colores, gorros, gafas, complementos y escenarios. Algunos artículos se compran con gemas. |
| **Perfil** | Peso inicial/actual/objetivo, gráfica, IMC, resumen nutricional de 7 días, objetivos y copias de seguridad. |

**Añadir alimentos**: base local de 115 alimentos habituales en España (funciona sin conexión), búsqueda online en [Open Food Facts](https://world.openfoodfacts.org) (productos de supermercado con Nutri-Score), código de barras (introduciendo los dígitos), alimentos propios, recientes, *añadido rápido* de kcal y “copiar la comida de ayer”.

**Cálculo de objetivos**: Mifflin-St Jeor × factor de actividad, ± déficit/superávit según el ritmo semanal elegido (1 kg ≈ 7700 kcal), con un mínimo de seguridad. Macros y reparto por comidas configurables.

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
npm run icons      # regenera los PNG de iconos desde public/favicon.svg (requiere Playwright)
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

## Limitaciones conocidas

- iOS Safari no ofrece la API `BarcodeDetector`, por eso el código de barras se escribe a mano.
- Una web app no puede leer Apple Salud; los pasos/ejercicio se introducen manualmente (o copiando las kcal del reloj).
- Los valores nutricionales de la base local son aproximados (tablas tipo BEDCA/USDA) y la calidad A–E de esos alimentos es una estimación propia, no el Nutri-Score oficial. La información es orientativa y no sustituye a un profesional sanitario.
