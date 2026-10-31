import type {BoardId} from '../boards/types.ts';
export const targets = {
 'uno-r3': {label:'Arduino UNO R3', fqbn:'arduino:avr:uno', core:'arduino:avr@1.8.8', slug:'uno_r3'},
 esp32: {label:'ESP32 Dev Module · DevKitC / WROOM-32E', fqbn:'esp32:esp32:esp32', core:'esp32:esp32@3.3.12', slug:'esp32'},
} satisfies Record<BoardId,{label:string;fqbn:string;core:string;slug:string}>;
export const libraries = {
 servo:{name:'Servo',version:'1.3.0',header:'Servo.h'},
 espServo:{name:'ESP32Servo',version:'3.2.1',header:'ESP32Servo.h'},
 dht:{name:'DHT sensor library',version:'1.4.7',header:'DHT.h'},
 sensor:{name:'Adafruit Unified Sensor',version:'1.1.15'},
 gfx:{name:'Adafruit GFX Library',version:'1.13.0',header:'Adafruit_GFX.h'},
 oled:{name:'Adafruit SSD1306',version:'2.5.17',header:'Adafruit_SSD1306.h'},
 bus:{name:'Adafruit BusIO',version:'1.17.4'},
 digits:{name:'TM1637',version:'1.2.0',header:'TM1637Display.h'},
} as const;
export type Library = {name:string;version:string;header?:string};
