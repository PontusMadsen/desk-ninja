# UART Protocol

Communication between Pi and ESP32 uses newline-delimited JSON over UART at 115200 baud, 8N1.

Each message is a single JSON object terminated by `\n`. No framing bytes, no length prefix — just JSON + newline.

## Pi → ESP32 (Commands)

### Set face state
```json
{"cmd":"face","state":"idle"}
```

### Set face state with auto-return to idle
```json
{"cmd":"face","state":"surprised","duration":2000}
```
After `duration` ms, the ESP32 automatically returns to `idle`.

### Display text on screen
```json
{"cmd":"text","content":"Hello world"}
```
Fallback for when TTS fails — renders text directly on the round display.

### Sync RTC
```json
{"cmd":"set_time","unix":1716000000}
```

### Health check
```json
{"cmd":"ping"}
```

## ESP32 → Pi (Events)

### Motion detected (IMU)
```json
{"event":"motion","magnitude":42}
```

### Touch event
```json
{"event":"touch","zone":"center","action":"tap"}
```

### Orientation events
```json
{"event":"pickup"}
{"event":"setdown"}
```

### Tilt
```json
{"event":"tilt","direction":"left","angle":25}
```

### Shake
```json
{"event":"shake"}
```

### Inactivity
```json
{"event":"idle"}
{"event":"long_idle"}
```

### RTC needs sync
```json
{"event":"request_time"}
```

### Health check response
```json
{"event":"pong"}
```

## Face States

| State | Description |
|-------|-------------|
| `idle` | Default resting face |
| `blinking` | Periodic blink animation |
| `talking` | Mouth movement during TTS playback |
| `surprised` | Wide eyes, open mouth |
| `happy` | Smile |
| `sad` | Downturned expression |
| `sleeping` | Closed eyes, Zzz |
| `focused` | Narrowed eyes |
| `confused` | Tilted expression, question mark |
| `looking_left` | Eyes shifted left |
| `looking_right` | Eyes shifted right |
| `tilt_left` | Face tilted left (follows physical tilt) |
| `tilt_right` | Face tilted right (follows physical tilt) |

## Transport Details

- **Baud rate:** 115200
- **Data bits:** 8
- **Parity:** None
- **Stop bits:** 1
- **Line ending:** `\n` (0x0A)
- **Encoding:** UTF-8
