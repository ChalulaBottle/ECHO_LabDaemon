# Capability flags

Each board's `board.h` declares these. They're consumed in two places:

1. **`caps.cpp`** — copies them into the `BoardCaps` instance so shared
   code (`ui.cpp`, `main.cpp`) can query them at runtime via
   `board_caps()`.
2. **The per-board source files** — `#if BOARD_HAS_*` lets the linker
   dead-strip entire functions on boards that don't need them.

Keep the two in sync. The pattern in `caps.cpp` does this for you:
```c
.button_count = (uint8_t)(1 + BOARD_HAS_SECONDARY_BUTTON),
.has_rotation = (bool)BOARD_HAS_ROTATION,
```

## The flags

| Macro                          | Default | What it gates |
|--------------------------------|---------|---------------|
| `BOARD_HAS_SECONDARY_BUTTON`   | 0       | A second physical button (HID Shift+Tab on the reference ports). `caps.button_count = 1 + this`. UI uses `caps.button_count >= 2` to decide whether to poll/handle the secondary button — there is no `#ifdef` in shared code. |
| `BOARD_HAS_ROTATION`           | 0       | IMU-driven auto-rotation via CPU strip transformation in `display_hal_draw_bitmap`. When 0, `display_hal_tick` is a no-op and the rotation buffer in `display.cpp` doesn't get allocated. |
| `BOARD_HAS_IMU`                | 0       | Whether the accelerometer is populated and initialized. Distinct from `BOARD_HAS_ROTATION` — the AMOLED-1.8 has the QMI8658 (so `HAS_IMU=1`) but the kit's enclosure mounts the panel at a fixed orientation, so rotation is off. |
| `BOARD_HAS_BATTERY`            | 0       | Whether PMU battery measurement is meaningful on this board. UI hides the battery indicator when false. |
| `BOARD_HAS_IO_EXPANDER`        | 0       | Whether an IO expander gates display / touch reset lines. Doesn't directly gate any code path — but signals to the porter that `board_init()` must release the expander before `display_hal_init()`. |

## BoardCaps fields with no macro

Two trailing `BoardCaps` fields (`firmware/src/hal/board_caps.h`) have no `BOARD_HAS_*` macro behind
them. A board's `caps.cpp` sets them by name, and a board that leaves one out gets false.

| Field                | Default | What it means |
|----------------------|---------|---------------|
| `pwr_toggles_stats`  | false   | PWR tap cycles creature, usage and the live page (`ui_cycle_screens`), not a toggle between two screens. Since increment 2 every board's PWR tap does this (`main.cpp`, `pwr_act`), so shared code no longer reads the field; `waveshare_lcd_4` still sets it. |
| `fixed_brightness`   | false   | The panel's brightness cannot be set. The cmd message's `bright` then answers `"no"`, and its `status` report gives `br` as -1 (`cmd.cpp`, `cmd_run` and `send_status`). False on every board today: the AMOLED panels take a level, lcd_154 dims its backlight by PWM and lcd_4 through its CH32. The TCA9554 revisions of lcd_4 (V1 to V3) can only switch the backlight on and off, but which expander a board has is found at boot while this field is fixed at build time, so they count as adjustable. |

## Build-flag macros

`BOARD_HAS_PSRAM` is set as a `-D` build flag in `platformio.ini` (not in `board.h`) on chips with external PSRAM wired up. Shared code (`main.cpp`, `splash.cpp`) and per-board display drivers use it to choose between `MALLOC_CAP_SPIRAM` (large buffers) and `MALLOC_CAP_INTERNAL` (small buffers, partial-render LVGL, splash canvas capped at ~80 KB, screenshot capture disabled). New ESP32-C6 / ESP32-C3 ports must leave this undefined.

## Future capabilities

Add a new flag when:

- A shared-code decision currently uses `if (caps.has_<thing>)` and
  you want to extend it (e.g. add `BOARD_HAS_HAPTIC` for vibration
  feedback).
- A per-board file conditionally compiles a block of code (e.g.
  audio amp init under `BOARD_HAS_AUDIO`).

Don't add a flag for a one-off detail. If only one board cares about it
and shared code never queries it, leave it as a constant in that board's
`board.h` and use it only in that board's `.cpp` files.
