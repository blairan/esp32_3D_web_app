// Runs on Node 24, using the same generator as the browser; never publishes firmware.
import {mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {buildHardwareSketch} from '../src/hardware/exportSketch.ts';
import {solutions} from '../src/program/solutions.ts';
import {unoSolution} from '../src/uno/content.ts';
import {targets,libraries} from '../src/hardware/targets.ts';
const board=process.argv[2];
if(!Object.hasOwn(targets,board))throw new Error('Usage: node --experimental-strip-types scripts/compile-sketches.mjs <uno-r3|esp32> [--install]');
const cli=process.env.ARDUINO_CLI||'arduino-cli',config=process.env.ARDUINO_CLI_CONFIG;
const run=(args)=>{const result=spawnSync(cli,[...args,'--additional-urls','https://espressif.github.io/arduino-esp32/package_esp32_index.json',...(config?['--config-file',config]:[])],{stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);};
if(process.argv.includes('--install')){
 run(['core','update-index']);
 run(['core','install',targets[board].core]);
 const needed=Object.entries(libraries).filter(([key])=>key!==(board==='esp32'?'servo':'espServo')).map(([,l])=>`${l.name}@${l.version}`);
 run(['lib','install','--no-deps',...needed]);
}
const root=resolve(process.env.SKETCH_OUTPUT||'/tmp/lab-arduino-sketches',board);let count=0;
for(const [lessonId,answer] of Object.entries(solutions)){
 const source=board==='uno-r3'?unoSolution(lessonId).code:answer.code;
 const sketch=buildHardwareSketch({boardId:board,lessonId,source}),folder=join(root,sketch.filename.slice(0,-4));mkdirSync(folder,{recursive:true});writeFileSync(join(folder,sketch.filename),sketch.code);
 console.log(`\n=== ${board} / ${lessonId} ===`);
 run(['compile','--fqbn',sketch.target.fqbn,'--warnings','all',folder]);count++;
}
console.log(`Compiled ${count} / ${count} sketches for ${board} (${targets[board].core})`);
