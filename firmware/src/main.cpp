/*
 * Little Gamers Ninja — Streaming Display
 * ESP32-S3 as dumb JPEG display, Pi streams frames over UART
 * Protocol: JSON commands + binary JPEG streaming at 921600 baud
 */
#include <Arduino.h>
#include <Wire.h>
#include "driver/spi_master.h"
#include "esp_lcd_panel_ops.h"
#include "esp_lcd_panel_rgb.h"
#include <TJpg_Decoder.h>

#define I2C_SDA_PIN   15
#define I2C_SCL_PIN   7
#define TCA9554_ADDR  0x20
#define LCD_MOSI_PIN  1
#define LCD_CLK_PIN   2
#define BL_PIN        6
#define LCD_W         480
#define LCD_H         480

#define EXIO_LCD_RST  0x01
#define EXIO_TP_RST   0x02
#define EXIO_LCD_CS   0x04
#define EXIO_BUZZER   0x80

#define UART_BAUD     921600
#define JPEG_BUF_SIZE (256 * 1024)

// --- TCA9554 ---
static uint8_t tca = 0;
void tca_w(uint8_t v) { tca=v; Wire.beginTransmission(TCA9554_ADDR); Wire.write(0x01); Wire.write(v); Wire.endTransmission(); }
void tca_s(uint8_t b, bool h) { if(h) tca|=b; else tca&=~b; tca_w(tca); }

// --- ST7701S SPI ---
static spi_device_handle_t spi_h = NULL;
void lc(uint8_t c) { spi_transaction_t t={}; t.cmd=0; t.addr=c; spi_device_transmit(spi_h,&t); }
void ld(uint8_t d) { spi_transaction_t t={}; t.cmd=1; t.addr=d; spi_device_transmit(spi_h,&t); }

void st7701s_init() {
  spi_bus_config_t bc={}; bc.mosi_io_num=LCD_MOSI_PIN; bc.miso_io_num=-1; bc.sclk_io_num=LCD_CLK_PIN; bc.quadwp_io_num=-1; bc.quadhd_io_num=-1; bc.max_transfer_sz=64;
  spi_bus_initialize(SPI2_HOST, &bc, SPI_DMA_CH_AUTO);
  spi_device_interface_config_t dc={}; dc.command_bits=1; dc.address_bits=8; dc.mode=SPI_MODE0; dc.clock_speed_hz=40000000; dc.spics_io_num=-1; dc.queue_size=1;
  spi_bus_add_device(SPI2_HOST, &dc, &spi_h);

  tca_s(EXIO_LCD_RST,false); delay(10); tca_s(EXIO_LCD_RST,true); delay(50);
  tca_s(EXIO_LCD_CS,false); delay(10);

  lc(0xFF);ld(0x77);ld(0x01);ld(0x00);ld(0x00);ld(0x10);
  lc(0xC0);ld(0x3B);ld(0x00); lc(0xC1);ld(0x0B);ld(0x02); lc(0xC2);ld(0x07);ld(0x02); lc(0xCC);ld(0x10); lc(0xCD);ld(0x08);
  lc(0xB0);ld(0x00);ld(0x11);ld(0x16);ld(0x0e);ld(0x11);ld(0x06);ld(0x05);ld(0x09);ld(0x08);ld(0x21);ld(0x06);ld(0x13);ld(0x10);ld(0x29);ld(0x31);ld(0x18);
  lc(0xB1);ld(0x00);ld(0x11);ld(0x16);ld(0x0e);ld(0x11);ld(0x07);ld(0x05);ld(0x09);ld(0x09);ld(0x21);ld(0x05);ld(0x13);ld(0x11);ld(0x2a);ld(0x31);ld(0x18);
  lc(0xFF);ld(0x77);ld(0x01);ld(0x00);ld(0x00);ld(0x11);
  lc(0xB0);ld(0x6d);lc(0xB1);ld(0x37);lc(0xB2);ld(0x81);lc(0xB3);ld(0x80);lc(0xB5);ld(0x43);lc(0xB7);ld(0x85);lc(0xB8);ld(0x20);
  lc(0xC1);ld(0x78);lc(0xC2);ld(0x78);lc(0xD0);ld(0x88);
  lc(0xE0);ld(0x00);ld(0x00);ld(0x02);
  lc(0xE1);ld(0x03);ld(0xA0);ld(0x00);ld(0x00);ld(0x04);ld(0xA0);ld(0x00);ld(0x00);ld(0x00);ld(0x20);ld(0x20);
  lc(0xE2);ld(0x00);ld(0x00);ld(0x00);ld(0x00);ld(0x00);ld(0x00);ld(0x00);ld(0x00);ld(0x00);ld(0x00);ld(0x00);ld(0x00);ld(0x00);
  lc(0xE3);ld(0x00);ld(0x00);ld(0x11);ld(0x00);lc(0xE4);ld(0x22);ld(0x00);
  lc(0xE5);ld(0x05);ld(0xEC);ld(0xA0);ld(0xA0);ld(0x07);ld(0xEE);ld(0xA0);ld(0xA0);ld(0x00);ld(0x00);ld(0x00);ld(0x00);ld(0x00);ld(0x00);ld(0x00);ld(0x00);
  lc(0xE6);ld(0x00);ld(0x00);ld(0x11);ld(0x00);lc(0xE7);ld(0x22);ld(0x00);
  lc(0xE8);ld(0x06);ld(0xED);ld(0xA0);ld(0xA0);ld(0x08);ld(0xEF);ld(0xA0);ld(0xA0);ld(0x00);ld(0x00);ld(0x00);ld(0x00);ld(0x00);ld(0x00);ld(0x00);ld(0x00);
  lc(0xEB);ld(0x00);ld(0x00);ld(0x40);ld(0x40);ld(0x00);ld(0x00);ld(0x00);
  lc(0xED);ld(0xFF);ld(0xFF);ld(0xFF);ld(0xBA);ld(0x0A);ld(0xBF);ld(0x45);ld(0xFF);ld(0xFF);ld(0x54);ld(0xFB);ld(0xA0);ld(0xAB);ld(0xFF);ld(0xFF);ld(0xFF);
  lc(0xEF);ld(0x10);ld(0x0D);ld(0x04);ld(0x08);ld(0x3F);ld(0x1F);
  lc(0xFF);ld(0x77);ld(0x01);ld(0x00);ld(0x00);ld(0x13);lc(0xEF);ld(0x08);
  lc(0xFF);ld(0x77);ld(0x01);ld(0x00);ld(0x00);ld(0x00);
  lc(0x36);ld(0x00);lc(0x3A);ld(0x66);
  lc(0x11); vTaskDelay(pdMS_TO_TICKS(480));
  lc(0x20); vTaskDelay(pdMS_TO_TICKS(120));
  lc(0x29);
  tca_s(EXIO_LCD_CS,true); delay(10);
  Serial0.println("[LCD] ST7701S ok");
}

// --- RGB Panel ---
static esp_lcd_panel_handle_t ph = NULL;

void rgb_init() {
  esp_lcd_rgb_panel_config_t c = {};
  c.clk_src = LCD_CLK_SRC_PLL160M;
  c.timings.pclk_hz = 16000000;
  c.timings.h_res = LCD_W; c.timings.v_res = LCD_H;
  c.timings.hsync_pulse_width=8; c.timings.hsync_back_porch=10; c.timings.hsync_front_porch=50;
  c.timings.vsync_pulse_width=3; c.timings.vsync_back_porch=8; c.timings.vsync_front_porch=8;
  c.data_width = 16;
  c.psram_trans_align = 64;
  c.hsync_gpio_num=38; c.vsync_gpio_num=39; c.de_gpio_num=40; c.pclk_gpio_num=41; c.disp_gpio_num=-1;
  c.data_gpio_nums[0]=5;  c.data_gpio_nums[1]=45; c.data_gpio_nums[2]=48; c.data_gpio_nums[3]=47;
  c.data_gpio_nums[4]=21; c.data_gpio_nums[5]=14; c.data_gpio_nums[6]=13; c.data_gpio_nums[7]=12;
  c.data_gpio_nums[8]=11; c.data_gpio_nums[9]=10; c.data_gpio_nums[10]=9; c.data_gpio_nums[11]=46;
  c.data_gpio_nums[12]=3; c.data_gpio_nums[13]=8; c.data_gpio_nums[14]=18; c.data_gpio_nums[15]=17;
  c.flags.fb_in_psram = 1;
  esp_err_t e = esp_lcd_new_rgb_panel(&c, &ph);
  Serial0.printf("[LCD] rgb: %s\n", esp_err_to_name(e));
  if(e!=ESP_OK) return;
  esp_lcd_panel_reset(ph);
  esp_lcd_panel_init(ph);
  Serial0.println("[LCD] rgb ok");
}

// --- JPEG decode to small buffer, scale to full screen, blit ---
static uint16_t* frame_buf = NULL;   // 480x480 output buffer
static uint16_t* decode_buf = NULL;  // small buffer for JPEG decode
static uint8_t* jpeg_buf = NULL;
static bool streaming = false;
static uint16_t img_w = 0, img_h = 0;

bool jpeg_output(int16_t x, int16_t y, uint16_t w, uint16_t h, uint16_t *bitmap) {
  if(!decode_buf || img_w == 0) return false;
  for(int j = 0; j < h; j++) {
    memcpy(&decode_buf[(y + j) * img_w + x], &bitmap[j * w], w * 2);
  }
  return true;
}

// Nearest-neighbor scale from decode_buf to frame_buf
void scale_to_screen() {
  if(!decode_buf || !frame_buf || img_w == 0 || img_h == 0) return;
  for(int dy = 0; dy < LCD_H; dy++) {
    int sy = dy * img_h / LCD_H;
    const uint16_t* src_row = &decode_buf[sy * img_w];
    uint16_t* dst_row = &frame_buf[dy * LCD_W];
    for(int dx = 0; dx < LCD_W; dx++) {
      dst_row[dx] = src_row[dx * img_w / LCD_W];
    }
  }
}

void display_jpeg(uint8_t* data, uint32_t size) {
  if(!frame_buf || !decode_buf || !ph) return;

  // Auto-detect image size on first frame
  if(img_w == 0) {
    TJpgDec.getJpgSize(&img_w, &img_h, data, size);
    Serial0.printf("[JPEG] img=%dx%d -> scale to %dx%d\n", img_w, img_h, LCD_W, LCD_H);
  }

  TJpgDec.drawJpg(0, 0, data, size);
  scale_to_screen();
  esp_lcd_panel_draw_bitmap(ph, 0, 0, LCD_W, LCD_H, frame_buf);
}

// --- Binary streaming protocol ---
// Pi sends: [0xFF][uint32_t size LE][JPEG data bytes]
// ESP32 displays and sends back 'K' when ready for next frame
// Pi sends: [0x00] to exit streaming mode

void stream_loop() {
  unsigned long last_data = millis();
  while(streaming) {
    // Wait for sync byte with timeout — reboot if no data for 10 seconds
    while(!Serial0.available()) {
      yield();
      if(millis() - last_data > 10000) {
        Serial0.println("{\"event\":\"stream_timeout\"}");
        streaming = false;
        return;
      }
    }
    last_data = millis();
    uint8_t sync = Serial0.read();

    if(sync == 0x00) {
      // Exit streaming mode
      streaming = false;
      Serial0.println("{\"event\":\"stream_end\"}");
      return;
    }

    if(sync != 0xFF) continue; // skip garbage

    // Read 4-byte size (little-endian)
    uint8_t sz[4];
    size_t got = 0;
    unsigned long t = millis();
    while(got < 4 && millis() - t < 1000) {
      if(Serial0.available()) sz[got++] = Serial0.read();
    }
    if(got < 4) continue;

    uint32_t size = sz[0] | (sz[1] << 8) | (sz[2] << 16) | (sz[3] << 24);
    if(size == 0 || size > JPEG_BUF_SIZE) continue;

    // Read JPEG data
    uint32_t received = 0;
    t = millis();
    while(received < size && millis() - t < 2000) {
      int avail = Serial0.available();
      if(avail > 0) {
        int toRead = min((int)(size - received), avail);
        Serial0.readBytes(jpeg_buf + received, toRead);
        received += toRead;
        t = millis();
      }
    }

    if(received == size) {
      display_jpeg(jpeg_buf, size);
      Serial0.write('K'); // ready for next frame
    }
  }
}

// --- UART command handler (JSON mode) ---
String ub = "";

void hcmd(const String& l) {
  // Simple command parsing without ArduinoJson
  if(l.indexOf("\"ping\"") >= 0) {
    Serial0.println("{\"event\":\"pong\"}");
  }
  else if(l.indexOf("\"stream\"") >= 0) {
    Serial0.println("{\"event\":\"stream_start\"}");
    Serial0.flush();
    streaming = true;
    stream_loop();
  }
  else if(l.indexOf("\"buzz\"") >= 0) {
    tca_s(EXIO_BUZZER,true); delay(50); tca_s(EXIO_BUZZER,false);
    Serial0.println("{\"event\":\"buzz_ack\"}");
  }
  else if(l.indexOf("\"frame\"") >= 0) {
    // Single JPEG frame: {"cmd":"frame","size":12345}
    // Followed by raw JPEG bytes
    int idx = l.indexOf("\"size\":");
    if(idx < 0) return;
    uint32_t size = l.substring(idx + 7).toInt();
    if(size == 0 || size > JPEG_BUF_SIZE) return;

    Serial0.println("{\"event\":\"ready\"}");
    Serial0.flush();

    uint32_t received = 0;
    unsigned long t = millis();
    while(received < size && millis() - t < 5000) {
      int avail = Serial0.available();
      if(avail > 0) {
        int toRead = min((int)(size - received), avail);
        Serial0.readBytes(jpeg_buf + received, toRead);
        received += toRead;
        t = millis();
      }
    }

    if(received == size) {
      display_jpeg(jpeg_buf, size);
      Serial0.println("{\"event\":\"ok\"}");
    }
  }
}

void setup() {
  Serial.begin(115200);
  Serial0.setRxBufferSize(32768); // 32KB buffer for JPEG frames
  Serial0.begin(UART_BAUD);
  delay(500);
  Serial0.println("\n=== Ninja Stream Display ===");

  // I2C + TCA9554
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN, 400000);
  Wire.beginTransmission(TCA9554_ADDR); Wire.write(0x03); Wire.write(0x00); Wire.endTransmission();
  tca = EXIO_LCD_RST | EXIO_TP_RST | EXIO_LCD_CS;
  tca_w(tca);
  Serial0.println("[TCA] ok");

  // LCD
  st7701s_init();
  pinMode(BL_PIN, OUTPUT); digitalWrite(BL_PIN, HIGH);
  Serial0.println("[BL] on");
  rgb_init();

  // JPEG buffers in PSRAM
  TJpgDec.setJpgScale(1);
  TJpgDec.setCallback(jpeg_output);
  frame_buf = (uint16_t*)ps_malloc(LCD_W * LCD_H * 2);           // 450KB
  decode_buf = (uint16_t*)ps_malloc(320 * 320 * 2);              // 200KB max decode size
  jpeg_buf = (uint8_t*)ps_malloc(JPEG_BUF_SIZE);
  if(frame_buf) memset(frame_buf, 0, LCD_W * LCD_H * 2);
  if(decode_buf) memset(decode_buf, 0, 320 * 320 * 2);
  Serial0.printf("[MEM] frame=%s decode=%s jpeg=%s\n", frame_buf ? "ok" : "FAIL", decode_buf ? "ok" : "FAIL", jpeg_buf ? "ok" : "FAIL");

  // Black screen
  if(ph && frame_buf) {
    esp_lcd_panel_draw_bitmap(ph, 0, 0, LCD_W, LCD_H, frame_buf);
  }

  // Boot beep
  tca_s(EXIO_BUZZER, true); delay(50); tca_s(EXIO_BUZZER, false);

  Serial0.println("{\"event\":\"boot\",\"lcd\":true,\"stream\":true}");
  Serial0.println("=== READY ===");
}

void loop() {
  // JSON command mode
  while(Serial0.available()) {
    char c = Serial0.read();
    if(c == '\n') {
      ub.trim();
      if(ub.length() > 0) hcmd(ub);
      ub = "";
    } else if(c != '\r' && c != '\0') {
      ub += c;
    }
  }
}
