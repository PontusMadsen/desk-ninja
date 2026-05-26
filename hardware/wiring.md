# Wiring Guide — Current Setup

## Overview

Single 4-wire connection between Pi and ESP32 carries both power and UART.
Audio input via INMP441 I2S mic. Audio output via headphone jack (USB speaker when available).

## Pi 4 ↔ ESP32-S3 (Power + UART via Header #12)

Using the Waveshare ESP32-S3-Touch-LCD-2.1 **12-pin GPIO header (#12)**:

| ESP32 Header #12 | Pi 4 Physical Pin | Pi GPIO (BCM) |
|-------------------|-------------------|---------------|
| VBus (5V)         | Pin 2             | 5V power      |
| GND               | Pin 6             | GND           |
| TXD (GPIO43)      | Pin 10            | GPIO15 (RXD)  |
| RXD (GPIO44)      | Pin 8             | GPIO14 (TXD)  |

**Important:** TX↔RX crossover — ESP32 TX goes to Pi RX, and vice versa.

**Note:** The old setup used UART header #17 (4-pin SH1.0) + separate USB-C power. The current setup uses header #12 which carries both 5V power and UART in one cable — no USB-C needed.

## INMP441 I2S Microphone → Pi

| INMP441 | Pi 4 Physical Pin | Pi GPIO (BCM) |
|---------|-------------------|---------------|
| VDD     | Pin 1             | 3.3V power    |
| GND     | Pin 9             | GND           |
| L/R     | Pin 14            | GND (left ch) |
| WS      | Pin 35            | GPIO19        |
| SCK     | Pin 12            | GPIO18        |
| SD      | Pin 38            | GPIO20        |

**Note:** GND and L/R are both connected to ground pins. L/R tied to GND = left channel output. The mic is currently upside down (sound hole facing PCB) — works but sensitivity is reduced. Resolder later for better pickup.

## Audio Output

Currently using the Pi's **3.5mm headphone jack** (card 0) via a splitter cable to external speakers. Volume is low due to the unamplified headphone output.

**Planned:** USB speaker (ordered) will replace the headphone jack setup.

**Removed:** MAX98357A I2S amplifier — had issues with the SD pin voltage divider and I2S overlay compatibility. May revisit later.

## Pi /boot/firmware/config.txt Audio Config

```
dtparam=audio=on
dtparam=i2s=on
dtoverlay=miniuart-bt
dtoverlay=googlevoicehat-soundcard
```

- `miniuart-bt` — moves Bluetooth to mini UART, gives PL011 (full UART) to GPIO14/15
- `googlevoicehat-soundcard` — I2S overlay for INMP441 mic (capture on card 1)

## Pin Summary

| Pi Pin | Used By |
|--------|---------|
| 1      | INMP441 VDD (3.3V) |
| 2      | ESP32 VBus (5V power) |
| 6      | ESP32 GND |
| 8      | ESP32 RXD (Pi TXD) |
| 9      | INMP441 GND |
| 10     | ESP32 TXD (Pi RXD) |
| 12     | INMP441 SCK (I2S BCLK) |
| 14     | INMP441 L/R (GND) |
| 35     | INMP441 WS (I2S LRCLK) |
| 38     | INMP441 SD (I2S DOUT) |
