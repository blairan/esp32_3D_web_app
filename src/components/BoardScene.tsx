import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { pins, pinById } from '../board';
import { createCircuitScene } from './circuitScene';
import type { CircuitWire } from '../circuit';

interface SceneProps {
  selectedId: string; resetKey: number; simple: boolean;
  zoomCommand: { direction: 1 | -1; sequence: number } | null;
  onSelect: (id: string) => void;
  accent:string;flow:boolean;reducedMotion:boolean;
  lesson?: { wires: CircuitWire[]; lit: boolean; pending: string | null;playing:boolean };
}
export default function BoardScene({ selectedId, resetKey, simple, zoomCommand, onSelect, lesson, accent, flow, reducedMotion }: SceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ select: (id: string) => void; reset: () => void; simplify: (value: boolean) => void; zoom: (direction: 1 | -1) => void; setAccent:(value:string)=>void;setEffects:()=>void;circuit?: ReturnType<typeof createCircuitScene> } | null>(null);
  const selectCallback = useRef(onSelect);
  const initialSelected = useRef(selectedId);
  const currentLesson = useRef(lesson);
  const appearanceRef=useRef({accent,flow,reducedMotion,simple});
  const lessonMode = Boolean(lesson);
  const currentSimple = useRef(simple);
  const [sceneVersion, setSceneVersion] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => { selectCallback.current = onSelect; }, [onSelect]);

  useEffect(() => {
    currentLesson.current = lesson;
    const container = host.current!;
    setStatus('loading');
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { setStatus('error'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .95;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-label', 'ESP32 開發板 3D 模型，拖曳旋轉、右鍵或 Shift 加拖曳平移、捲動縮放；亦可使用下方接腳清單選取');
    container.appendChild(canvas);
    const scene = new THREE.Scene();
    let environment:THREE.WebGLRenderTarget|null=null;
    try{const room=new RoomEnvironment();const generator=new THREE.PMREMGenerator(renderer);environment=generator.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.42;room.dispose();generator.dispose();}catch{/* Basic lighting remains usable on limited GPUs. */}
    const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 800);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !appearanceRef.current.reducedMotion;
    controls.dampingFactor = 0.09;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    controls.minDistance = lessonMode ? 75 : 58;
    controls.maxDistance = lessonMode ? 320 : 190;
    controls.rotateSpeed = 0.65;
    controls.zoomSpeed = 0.8;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x59676c, 1.9));
    const light = new THREE.DirectionalLight(0xffffff, 2.8); light.position.set(-35, 50, 80); scene.add(light);
    const rim = new THREE.DirectionalLight(0xc3d9eb, 2); rim.position.set(60, -20, 5); scene.add(rim);
    const model = new THREE.Group(); scene.add(model);
    const dark = new THREE.MeshStandardMaterial({ color: 0x181e23, roughness: 0.68 });
    const pcb = new THREE.MeshStandardMaterial({ color: 0x111b2a, roughness: 0.72, metalness: 0.15 });
    const silver = new THREE.MeshStandardMaterial({ color: 0xbfc8cb, metalness: 0.72, roughness: 0.36 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xcaa851, metalness: 0.72, roughness: 0.28 });
    const white = new THREE.MeshStandardMaterial({ color: 0xd5dbd6, roughness: 0.65 });
    const textures: THREE.Texture[] = [];
    const materials: THREE.Material[] = [dark, pcb, silver, gold, white];
    function box(w: number, h: number, depth: number, x: number, y: number, z: number, mat: THREE.Material) {
      const mesh = new THREE.Mesh((w>=4&&h>=4&&depth>=1?new RoundedBoxGeometry(w,h,depth,2,Math.min(.35,depth/3)):new THREE.BoxGeometry(w,h,depth)), mat); mesh.position.set(x, y, z); model.add(mesh); return mesh;
    }
    function label(text: string, width: number, height: number, x: number, y: number, z: number, color = '#e2e7dd', font = 36) {
      const c = document.createElement('canvas'); c.width = 512; c.height = 128;
      const ctx = c.getContext('2d')!; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `600 ${Math.max(font, 92)}px Arial, sans-serif`;
      const measured = ctx.measureText(text).width;
      if (measured > 475) ctx.font = `600 ${Math.floor(Math.max(font, 92) * 475 / measured)}px Arial, sans-serif`;
      ctx.fillText(text, 256, 64);
      const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
      const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide }); materials.push(mat);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat); mesh.position.set(x, y, z); model.add(mesh); return mesh;
    }
    // Intentionally simplified teaching geometry. Exact mechanical dimensions remain unverified.
    box(27.9, 48.2, 1.3, 0, 0, 0, pcb);
    const surface=document.createElement('canvas');surface.width=512;surface.height=1024;const surfaceContext=surface.getContext('2d')!;
    surfaceContext.fillStyle='#0b111b';surfaceContext.fillRect(0,0,512,1024);
    let seed=7;for(let index=0;index<5000;index++){seed=(seed*16807)%2147483647;const x=seed%512;seed=(seed*16807)%2147483647;const y=seed%1024;surfaceContext.fillStyle=index%2?'#142031':'#09121f';surfaceContext.fillRect(x,y,1,1);}
    surfaceContext.strokeStyle='#2f4155';surfaceContext.lineWidth=1.5;surfaceContext.globalAlpha=.45;
    for(let index=0;index<18;index++){const y=35+index*54;surfaceContext.beginPath();surfaceContext.moveTo(35,y);surfaceContext.lineTo(105+(index%3)*16,y);surfaceContext.lineTo(142,y+20);surfaceContext.lineTo(142,y+38);surfaceContext.stroke();surfaceContext.beginPath();surfaceContext.moveTo(477,y);surfaceContext.lineTo(415-(index%3)*16,y);surfaceContext.lineTo(370,y+16);surfaceContext.stroke();}
    const surfaceTexture=new THREE.CanvasTexture(surface);surfaceTexture.colorSpace=THREE.SRGBColorSpace;textures.push(surfaceTexture);
    const surfaceMaterial=new THREE.MeshStandardMaterial({map:surfaceTexture,roughness:.78,metalness:.15});materials.push(surfaceMaterial);
    const topSurface=new THREE.Mesh(new THREE.PlaneGeometry(27.4,47.7),surfaceMaterial);topSurface.position.z=.657;model.add(topSurface);
    const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;const shadowContext=shadowCanvas.getContext('2d')!;
    const gradient=shadowContext.createRadialGradient(64,64,18,64,64,64);gradient.addColorStop(0,'rgba(22,34,52,.22)');gradient.addColorStop(1,'rgba(22,34,52,0)');shadowContext.fillStyle=gradient;shadowContext.fillRect(0,0,128,128);
    const shadowTexture=new THREE.CanvasTexture(shadowCanvas);textures.push(shadowTexture);const shadowMaterial=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false});materials.push(shadowMaterial);
    const shadow=new THREE.Mesh(new THREE.PlaneGeometry(42,68),shadowMaterial);shadow.position.set(1,-1,-4);model.add(shadow);
    box(18, 25.5, 1, 0, 13.4, 1, dark);
    box(16.6, 17.9, 2.3, 0, 9.2, 2.1, silver);
    label('ESP32-WROOM-32E', 15, 2, 0, 11.1, 3.28, '#4c585b', 36);
    label('ESP32', 10, 2.8, 0, 7.5, 3.29, '#596365', 62);
    label('INTERACTIVE LAB', 12, 1.4, 0, 3.6, 3.3, '#657174', 32);
    // Antenna trace: a visual teaching cue, not an RF design.
    for (let i = 0; i < 6; i++) {
      box(2.1, 0.22, 0.06, -5.5 + i * 2.1, i % 2 ? 24.4 : 21.5, 1.55, gold);
      box(0.22, 2.9, 0.06, -4.45 + i * 2.1, 22.95, 1.55, gold);
    }
    const details = new THREE.Group(); model.add(details);
    for (let i = 0; i < 18; i++) {
      const component = box(i % 3 ? 1.2 : 2.3, i % 3 ? 2.2 : 1.1, 0.7, -7.4 + (i % 6) * 2.9, -3.2 - Math.floor(i / 6) * 3.4, 1.05, i % 3 ? dark : silver);
      details.attach(component);
    }
    box(5.4, 5.4, 1.1, 0, -11.3, 1.25, dark);
    box(6.6, 5.7, 2.2, 4, -17.7, 1.8, dark);
    label('UART', 5.2, 1.3, 4, -17.5, 2.93, '#bfc3c1', 38);
    for (const [x, name] of [[-8.1, 'EN'], [8.1, 'BOOT']] as const) {
      box(4, 4, 1.3, x, -21.1, 1.2, silver);
      const button = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.6, 20), dark);
      button.rotation.x = Math.PI / 2; button.position.set(x, -21.1, 2.1); model.add(button);
      label(name, 5, 1.2, x, -18.1, 0.72, '#e2e7dd', 38);
    }
    box(7.8, 6, 3, 0, -24, 2, silver);
    box(6, 0.08, 1.5, 0, -27.04, 2, dark);
    const ledMaterial = new THREE.MeshStandardMaterial({ color: 0xeab960, emissive: 0x9f5512, emissiveIntensity: 0.45 }); materials.push(ledMaterial);
    box(1.2, 1.5, 0.7, -5.2, -16.7, 1, ledMaterial);
    label('PWR', 4, 1, -6.3, -14.9, 0.73, '#c9d2c7', 34);
    // Every physical pin has its own object, material and enlarged pick area.
    const hitboxes: THREE.Mesh[] = [];
    const pinMeshes = new Map<string, THREE.Mesh>();
    const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }); materials.push(hitMat);
    for (const pin of pins) {
      box(1.8, 2.1, 1.8, pin.x, pin.y, 1.3, dark);
      const mat = gold.clone(); materials.push(mat);
      const shaft = box(0.68, 0.68, 5, pin.x, pin.y, 0.65, mat); pinMeshes.set(pin.pinId, shaft);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.14, 6, 16), gold); ring.position.set(pin.x, pin.y, 0.72); model.add(ring);
      const hitbox = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.35, 5.8), hitMat); hitbox.position.set(pin.x, pin.y, 1); hitbox.userData.pinId = pin.pinId; model.add(hitbox); hitboxes.push(hitbox);
      label(pin.silkscreen, 3.7, 1.4, pin.x + (pin.header === 'J2' ? 2.8 : -2.8), pin.y, 0.74, '#e1e6db', 42);
    }
    const highlightMat = new THREE.MeshBasicMaterial({ color: appearanceRef.current.accent, transparent: true, opacity: 0.9, depthTest: false }); materials.push(highlightMat);
    const highlight = new THREE.Mesh(new THREE.TorusGeometry(1.14, 0.25, 8, 32), highlightMat); highlight.renderOrder = 5; model.add(highlight);
    const glowMat = new THREE.MeshBasicMaterial({ color: appearanceRef.current.accent, transparent: true, opacity: 0.15, depthWrite: false, depthTest: false }); materials.push(glowMat);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(2, 32), glowMat); glow.renderOrder = 4; model.add(glow);
    let alive = true, contextAvailable = true, frame = 0, dirty=true, lastDraw=0;
    let selectedAccent=appearanceRef.current.accent,selectedPinId=initialSelected.current,defaultView=true;
    controls.addEventListener('start',()=>{defaultView=false;});
    function render(now:number) {
      frame=0;if(!alive||!contextAvailable||document.hidden)return;
      const circuit=api.current?.circuit,animating=circuit?.needsAnimation()??false;
      // Decorative flow is capped at 30 fps; direct camera interaction stays responsive.
      if(animating&&!dirty&&now-lastDraw<1000/30){frame=requestAnimationFrame(render);return;}
      dirty=false;controls.update();circuit?.animate(lastDraw?Math.min((now-lastDraw)/1000,.1):0);renderer.render(scene,camera);lastDraw=now;
      if(circuit?.needsAnimation()&&!frame)frame=requestAnimationFrame(render);
    }
    function requestRender(){dirty=true;if(alive&&contextAvailable&&!document.hidden&&!frame)frame=requestAnimationFrame(render);}
    controls.addEventListener('change', requestRender);
    function stopInertia() {
      // OrbitControls retains pending rotation when setting the camera directly.
      // A non-damped update consumes it using its public API, before applying a view.
      const damping = controls.enableDamping;
      controls.enableDamping = false;
      controls.update();
      controls.enableDamping = damping;
    }
    function reset() {
      defaultView=true;stopInertia();
      // Portrait framing adapts to a narrow canvas as well as the laptop layout.
      const distance = lessonMode ? Math.min(300,Math.max(135,85/(2*Math.tan(33*Math.PI/360)*camera.aspect))) : (camera.aspect < 0.85 ? 125 : 105);
      camera.position.set(lessonMode ? 48 : 25, -36, distance); camera.up.set(0, 1, 0); controls.target.set(lessonMode ? 22 : 0, 0, 0); controls.update(); requestRender();
    }
    const select = (id: string) => {
      selectedPinId=id;
      for (const [pid, mesh] of pinMeshes) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.color.set(pid === id ? selectedAccent : 0xcaa851);mat.emissive.copy(pid===id?new THREE.Color(selectedAccent).multiplyScalar(.35):new THREE.Color(0));
      }
      const pin = pinById.get(id);
      if (pin) { highlight.position.set(pin.x, pin.y, 3.5); glow.position.set(pin.x, pin.y, 3.4); }
      requestRender();
    };
    const resize = () => {
      const width = container.clientWidth, height = container.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false);if(defaultView)reset(); requestRender();
    };
    const observer = new ResizeObserver(resize); observer.observe(container); resize(); reset(); select(initialSelected.current);
    api.current = { select, reset,
      setAccent(value){selectedAccent=value;highlightMat.color.set(value);glowMat.color.set(value);this.setEffects();select(selectedPinId);},
      setEffects(){const options=appearanceRef.current;controls.enableDamping=!options.reducedMotion;this.circuit?.configure({...options,enabled:options.flow,playing:currentLesson.current?.playing??true});requestRender();},
      zoom(direction) {
      defaultView=false;stopInertia();
      const offset = camera.position.clone().sub(controls.target);
      const distance = THREE.MathUtils.clamp(offset.length() * (direction === 1 ? 0.85 : 1 / 0.85), controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(offset.setLength(distance));
      controls.update(); requestRender();
    }, simplify(value) { details.visible = !value; renderer.setPixelRatio(value ? 1 : Math.min(window.devicePixelRatio, 1.75)); resize(); } };
    api.current.simplify(currentSimple.current);
    if (lessonMode) {
      const circuit = createCircuitScene(); scene.add(circuit.group); hitboxes.push(...circuit.hitboxes); api.current.circuit = circuit;api.current.setEffects();
      const value = currentLesson.current!; circuit.update(value.wires, value.lit, value.pending); requestRender();
    }
    const raycaster = new THREE.Raycaster();
    const activePointers = new Set<number>();
    let down: { x: number; y: number; id: number; moved: boolean; multi: boolean } | null = null;
    const pointerDown = (e: PointerEvent) => {
      activePointers.add(e.pointerId);
      if (activePointers.size > 1) { if (down) down.multi = true; return; }
      if (e.button !== 0 || e.shiftKey || e.ctrlKey || e.metaKey) { down = null; return; }
      if (e.button === 0) down = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, multi: false };
    };
    const pointerMove = (e: PointerEvent) => {
      if (down && (e.shiftKey || e.ctrlKey || e.metaKey || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6)) down.moved = true;
    };
    const pointerUp = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);
      if (!down || e.pointerId !== down.id) return;
      const start = down; down = null;
      if (e.shiftKey || e.ctrlKey || e.metaKey || start.multi || start.moved || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), camera);
      const hit = raycaster.intersectObjects(hitboxes)[0];
      if (hit) selectCallback.current(hit.object.userData.pinId as string);
    };
    const cancel = (e: PointerEvent) => { activePointers.delete(e.pointerId); down = null; };
    const contextLost = (e: Event) => { e.preventDefault(); contextAvailable = false; cancelAnimationFrame(frame); frame = 0; setStatus('error'); };
    const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else requestRender();};document.addEventListener('visibilitychange',visibility);
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', cancel);
    canvas.addEventListener('webglcontextlost', contextLost);
    setStatus('ready');
    return () => {
      alive = false; cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility); observer.disconnect(); controls.dispose(); api.current?.circuit?.dispose(); api.current = null;
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', cancel); canvas.removeEventListener('webglcontextlost', contextLost);
      scene.traverse(obj => { if (obj instanceof THREE.Mesh) obj.geometry.dispose(); });
      materials.forEach(mat => mat.dispose()); textures.forEach(texture => texture.dispose()); environment?.dispose();renderer.dispose(); if (contextAvailable) renderer.forceContextLoss(); canvas.remove();
    };
  }, [sceneVersion, lessonMode]);
  useEffect(() => { initialSelected.current = selectedId; api.current?.select(selectedId); }, [selectedId]);
  useEffect(() => { api.current?.reset(); }, [resetKey]);
  useEffect(() => { currentSimple.current = simple;appearanceRef.current.simple=simple; api.current?.simplify(simple);api.current?.setEffects(); }, [simple]);
  useEffect(() => { if (zoomCommand) api.current?.zoom(zoomCommand.direction); }, [zoomCommand]);
  useEffect(() => { currentLesson.current = lesson; if (lesson) { api.current?.circuit?.update(lesson.wires, lesson.lit, lesson.pending);api.current?.setEffects(); api.current?.select(selectedId); } }, [lesson, selectedId]);
  useEffect(()=>{appearanceRef.current={accent,flow,reducedMotion,simple};api.current?.setAccent(accent);},[accent,flow,reducedMotion,simple]);
  return <><div className="scene-host" ref={host} data-scene-status={status} />{status !== 'ready' && <div className="scene-message" role="status">{status === 'loading' ? '正在準備 3D 開發板…' : <><strong>目前無法顯示 3D 模型</strong><span>請確認瀏覽器支援 WebGL 並啟用硬體加速。你仍可使用下方清單探索全部接腳。</span><button onClick={() => setSceneVersion(version => version + 1)}>重試 3D 模型</button></>}</div>}</>;
}
