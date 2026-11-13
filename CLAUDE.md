@AGENTS.md

# FitLoop — Development Guidelines

React Native · Expo 55 · TypeScript 5.9 · Custom Tab Navigation

---

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| Runtime | Expo (bare workflow, dev-client) | 55.x |
| Framework | React Native | 0.83.x |
| Language | TypeScript | 5.9.x (strict mode) |
| Navigation | Custom tab navigator (Context + Pressable) | — |
| Local DB | expo-sqlite | ~55.0.16 |
| Styling | Theme object + `StyleSheet` / inline `style` props | — |
| Fonts | Hanken Grotesk via `@expo-google-fonts/hanken-grotesk` | — |
| Icons | Custom SVG paths via `react-native-svg` (`src/components/Icon.tsx`) | — |
| State | Single React Context (`AppContext`) + `useState` | — |

Always check https://docs.expo.dev/versions/v55.0.0/ before using any Expo API.

---

## Styling — Theme System

This project does **not** use NativeWind or Tailwind. All styling is done via the `Theme` object from `src/theme.ts` consumed through `useApp().t`.

### Rules

1. **`t.*` tokens for all colours** — never hardcode hex values in component files.
2. **`AppText` and `AppTextInput` instead of RN primitives** — these wrappers automatically resolve Hanken Grotesk font families from `fontWeight`. Import from `src/components/Shared.tsx`.
3. **`StyleSheet.create` for static, reusable styles** — use inline `style={{}}` for dynamic values (e.g. values that depend on `t`).
4. **`useSafeAreaInsets()`** for top/bottom padding — never hardcode inset values.
5. **`Pressable` over `TouchableOpacity`** — consistent with the existing codebase.

### Theme tokens

```ts
t.bg          // screen background
t.surface     // card / bottom-sheet background
t.surface2    // secondary surface
t.elev        // elevated chip / input
t.elev2       // elevated + hovered
t.line        // border (default)
t.line2       // border (subtle)
t.text        // primary text
t.mut         // muted text (56% opacity)
t.mut2        // very muted text (36% opacity)
t.orange      // accent colour (user-configurable, default #FF5A2C)
t.orangeInk   // text on orange backgrounds
t.lime        // pop / highlight colour (user-configurable, default #C6FF3A)
t.limeSoft    // lime at low opacity (backgrounds)
t.limeInk     // lime for text on dark
t.onLime      // text/icon on lime background
t.danger      // destructive actions (#FF5470 dark, #E23A5C light)
t.bar         // tab bar background (semi-transparent)
t.name        // 'dark' | 'light'
```

### Approved patterns

```tsx
// Screen root
<View style={{ flex: 1, backgroundColor: t.bg }}>

// Card
<View style={{ backgroundColor: t.surface, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: t.line2 }}>

// Primary text
<Text style={{ fontSize: 30, fontWeight: '800', color: t.text, letterSpacing: -0.6 }}>

// Muted label
<Text style={{ fontSize: 12.5, fontWeight: '800', color: t.mut, letterSpacing: 0.3 }}>

// Accent button
<Pressable style={{ backgroundColor: t.orange, borderRadius: 16, paddingVertical: 14 }}>

// Danger / destructive
<Text style={{ color: t.danger }}>

// Chip / tag
<View style={{ backgroundColor: t.elev, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 10 }}>
```

---

## Project Structure

```
src/
  assets/              # Static images
  components/
    Icon.tsx           # SVG icon renderer — add new icons here
    Shared.tsx         # AppText, AppTextInput, Btn, Sheet, Toast, etc.
  screens/             # One file per full screen
  navigation/
    index.tsx          # CustomTabBar + TabNavigator
    screens/           # Legacy screen stubs (not used for new screens)
  context.tsx          # Single AppContext + AppProvider
  data.ts              # All domain types, pure helpers, seed data
  db.ts                # All SQLite operations (single file)
  theme.ts             # Theme type, makeTheme(), ACCENT_OPTIONS, POP_OPTIONS
  types.d.ts           # Global ambient type declarations
```

- One screen per file in `src/screens/`. Filename matches the exported component name.
- All domain types live in `src/data.ts`. Do not scatter type definitions across screen files.
- All DB functions live in `src/db.ts`. No raw SQL outside that file.
- New icons go in the `PATHS` record in `src/components/Icon.tsx`.

---

## Navigation

Navigation is **not** React Navigation's stack/tab API. It is a custom tab system driven by `activeTab` state in `AppContext`.

- Five tabs: **Home**, **Routines**, **Progress**, **History**, **Settings** — defined in `TABS` array in `src/navigation/index.tsx`.
- To navigate programmatically: `const { nav } = useApp(); nav('history');`
- Overlays (session, routine editor, onboarding) are `Modal` components rendered in `AppShell` in `src/App.tsx`.
- Do **not** introduce React Navigation stack navigators without discussion — the custom system is intentional.

---

## State Management

A single `AppContext` in `src/context.tsx` owns all app state.

- Access via `const { t, fmt, state, ... } = useApp();`
- `t` — the current `Theme` object
- `fmt` — a `FmtHelper` for unit-aware weight formatting
- `state` — `{ profile, routines, todayDay, override }`
- `recentHistory` — last 20 sessions, kept in memory
- All write operations (save/delete) call a DB function then update the relevant state slice immediately — no full reload.
- Do not add a second context. Extend `AppContextValue` in `context.tsx` if new shared state is needed.

---

## Data Model

All types are defined in `src/data.ts`:

```ts
Routine    — id, name, days (number[]), color, exercises (string[])
Session    — id, routineId, routineName, startedAt, endedAt, durationSec, exercises, volume, notes
SessionExercise — id, name, sets (SetEntry[])
SetEntry   — reps, kg  (always stored in kg regardless of display unit)
Measurement — id, at, weightKg, bodyFat (number | null)
BodyLog    — id, at, values (Partial<Record<BodyPart, number>>, always cm)
Profile    — name, age, gender, heightCm, weightKg
```

Rules:
- `uid()` from `src/data.ts` for all new IDs — wraps `Crypto.randomUUID()` from `expo-crypto`.
- All timestamps are **milliseconds** (`Date.now()`), not Unix seconds.
- Weight is always stored in **kg**. Convert to lbs for display using `fmt.w(kg)` or `fmt.wStr(kg)`.
- Volume = sum of `reps × kg` across all sets — computed via `sessionVolume()` from `src/data.ts`.

### SQLite schema (src/db.ts)

| Table | PK | Notes |
|---|---|---|
| `settings` | `key` TEXT | Key/value preferences |
| `routines` | `id` TEXT | Workout plans |
| `routine_exercises` | `id` TEXT | Ordered exercises per routine; CASCADE delete |
| `sessions` | `id` TEXT | Completed workouts; indexed on `started_at` |
| `session_exercises` | `id` TEXT | Exercises logged per session; CASCADE delete |
| `exercise_sets` | `id` TEXT | Individual sets (reps × kg); CASCADE delete |
| `measurements` | `id` TEXT | Body weight + body fat entries; indexed on `at` |
| `body_logs` | `id` TEXT | Body-measurement sessions; indexed on `at` |
| `body_log_values` | `(log_id, part)` | Circumference in cm per body part; CASCADE delete |

---

## Database Layer (`src/db.ts`)

- Single SQLite connection opened lazily via module-level `_db` singleton.
- Multi-step writes (e.g. save session → save exercises → save sets) use `withTransactionAsync`.
- No raw SQL strings outside `src/db.ts`.
- Schema is created once with `CREATE TABLE IF NOT EXISTS`; no versioned migrations yet — add them before any breaking schema change.

---

## TypeScript

- `strict: true` in `tsconfig.json` — never relax it.
- All props and return types must be explicitly typed.
- Use `type` for object shapes; `interface` only when extension is the intent.
- No `as any` or `// @ts-ignore`. Narrow types properly.
- DB row types must match the schema exactly — see `SessionRow` in `src/db.ts` as the reference pattern.

---

## Components & UI Patterns

- **`AppText` / `AppTextInput`** — always use these instead of `Text` / `TextInput` for Hanken Grotesk rendering.
- **`Btn`** — use for all tappable actions; supports `variant`: `primary | pop | soft | ghost | danger`.
- **`Sheet`** — bottom-sheet modal wrapper; use for action sheets and input forms.
- **`Icon`** — `<Icon name="check" size={20} color={t.text} sw={2} />`. Add new SVG paths to `PATHS` in `Icon.tsx`.
- **`Toast`** — triggered via `useApp().toast({ icon, msg, tone, action })`. Auto-dismisses after 2.4s (4.2s with action).
- `SafeAreaView` is not used directly — safe area is handled by `TabNavigator` (`paddingTop: insets.top`) and screen-level `ScrollView`/`View` inset adjustments.

### Delete confirmation

All destructive deletes must show a confirmation before calling the context action. Use the copy pattern:
```
"Delete [Name]? This cannot be undone."
```

---

## Unit Handling

- Display unit is `kg` or `lbs`, stored in settings and exposed as `fmt` from `useApp()`.
- Never store lbs in the DB — convert to kg before writing.
- `fmt.w(kg)` → display number; `fmt.wStr(kg)` → display string with unit label.
- Body circumferences are stored in **cm**; the display length unit follows the weight unit (kg → cm, lbs → in). Use `fmt.l(cm)` to display and `fmt.toCm(v)` before writing.
- The `LB = 2.20462` constant is in `src/data.ts`.

---

## Performance

- Keep `recentHistory` (last 20 sessions) in context for home screen — avoid DB reads on every render.
- Paginate history beyond 20 via `loadMoreSessions(limit, offset)` on scroll.
- Wrap expensive derived values in `useMemo`. Wrap callbacks passed as props in `useCallback`.
- Use `FlatList` for any list that can exceed ~20 items.
- Progress/strength chart data is loaded lazily on tab focus, not at app startup.

---

## Offline-First

All features work with no network connection. There are no network-dependent features in v1.0.

---

## Accessibility

- Every `Pressable` must have an `accessibilityLabel` and `accessibilityRole`.
- Minimum touch target: 44 × 44 pt — use `style={{ minHeight: 44, minWidth: 44 }}`.
- Do not rely on colour alone to convey state — pair with an icon or text label.

---

## Code Style

- Functional components only — no class components.
- One component per file; filename matches the exported component name.
- Extract a custom hook when a component contains more than one `useEffect` or the effect has non-trivial logic.
- No comments that describe *what* the code does. Only add a comment when the *why* is non-obvious.
- No `console.log` in committed code.

---

## Testing

- Unit tests for pure utility functions in `src/data.ts` (volume calc, uid, fmt helpers).
- Integration tests for DB functions using an in-memory SQLite instance — do not mock the database.

---

## Running the App

```bash
# Start Metro bundler (dev-client required)
npm start

# Run on Android (connected device or emulator)
npm run android

# Run on iOS (macOS + Xcode required)
npm run ios
```

Read Expo 55 docs for SDK-specific APIs: https://docs.expo.dev/versions/v55.0.0/
