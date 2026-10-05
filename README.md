# 🏎️ Neon Rush — Carreras Arcade 3D

Juego de carreras arcade en 3D con estética **synthwave/neón**, construido íntegramente con
**HTML5 + JavaScript + Three.js** (assets 100% procedurales: sin modelos ni texturas externas).

![stack](https://img.shields.io/badge/stack-Three.js%20%2B%20Vite-7c4dff) ![estado](https://img.shields.io/badge/estado-jugable%20de%20punta%20a%20punta-00e5ff)

## ▶️ Jugar

```bash
npm install
npm run dev        # abre http://localhost:5173
```

También: `npm run build` (bundle de producción) y `npm run smoke` (test de humo de física/IA sin navegador).

## 🎮 Modos de juego

- **Carrera Rápida** — elige piloto, coche y pista; corre contra 3 IA a las vueltas que configures.
- **Torneo (Copa Neón)** — 3 carreras consecutivas con puntuación `1º=10 · 2º=7 · 3º=5 · 4º=3`
  y pantalla de clasificación final con desempates. El progreso se guarda en `localStorage`.
- **Garaje** — 3 personajes con historia y modificadores propios × 3 coches con estadísticas
  distintas (Velocidad Máxima, Aceleración, Manejo, Peso). La combinación crea builds diferentes.

### Pilotos

| Piloto | Arquetipo | Efecto |
|---|---|---|
| Kai "Volt" | Corredor Veloz | +5% vel. máxima, −6% manejo |
| Mara "Muro" | Corredora Defensiva | +30% masa efectiva, resiste empujones, mejor salida |
| Ren "Eje" | Corredor Equilibrado | +2% a todo |

### Coches

| Coche | Vel. Máx | Acel | Manejo | Peso |
|---|---|---|---|---|
| Vector GT | ★★★ | ★★★ | ★★★ | Medio |
| Púlsar X | ★★★★★ | ★★★★ | ★★ | Ligero |
| Bastión | ★★ | ★★ | ★★★★ | Pesado |

### Pistas

1. **Circuito Skyline** — rápida, curvones amplios.
2. **Serpentina Ámbar** — técnica, doble horquilla interior.
3. **Autovía Fantasma** — mixta, chicane final.

Las 3 se generan proceduralmente a partir de puntos de control (spline Catmull-Rom →
malla de asfalto, bordes neón, waypoints, curvatura para la IA).

## 🕹️ Controles

| Acción | Teclado | Mando |
|---|---|---|
| Acelerar / Freno-MA | `W`/`↑` · `S`/`↓` | `RT` / `LT` |
| Dirección | `A`/`D` o `←`/`→` | Stick izquierdo |
| Derrape | `Espacio` / `Shift` | `A` |
| Navegar menús | Flechas + `Enter` | D-Pad/stick + `A` |
| Volver / Pausa | `Esc` | `B` / `Start` |

## 🏗️ Arquitectura

Ver **[`docs/PLAN_DE_ARQUITECTURA.md`](docs/PLAN_DE_ARQUITECTURA.md)** para el plan completo.

```
src/
├── core/       GameManager (bucle) · SceneManager (fades) · EventBus · InputManager (teclado+mando)
│               AudioManager (música/SFX procedurales WebAudio) · SaveManager (localStorage)
├── states/     Splash · MainMenu · Ajustes · Selección (personaje+coche con preview 3D)
│               Selección de pista · Intro torneo · Race · Resultados · Clasificación final
├── gameplay/   VehicleController (física arcade) · AIDriver (waypoints+curvatura+rubber-banding)
│               RaceManager (vueltas por checkpoints, ranking en vivo, cronómetro) · WaypointSystem
├── render/     TrackBuilder (pista procedural) · CarModels (coches low-poly) · SceneFactory
│               (cielo synthwave, sol, edificios) · CameraRig (persecución + FOV dinámico)
├── ui/         HUD (posición, vueltas, tiempos, velocímetro, minimapa) · MenuList · helpers DOM
└── data/       coches · personajes · pistas · rivales · torneo  (todo data-driven)
```

**Principios:** máquina de estados de escenas con fades; la UI (DOM) y el mundo 3D solo se
comunican por eventos; físicas arcade propias (sin motor de físicas pesado); todo el contenido
definido como datos en `src/data/`.

## ✅ Validación

- `npm run smoke` simula carreras completas en las 3 pistas (física, IA, vueltas, ranking) en Node.
- `npm run build` compila el bundle completo sin errores.
