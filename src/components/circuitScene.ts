import {lessons,hasButton,type LessonId} from '../lessons';
import * as THREE from 'three';
import { pinById } from '../board';
import { wireColor, currentPath } from '../circuit';
import type { CircuitWire } from '../circuit';

export const partPositions: Record<string, [number, number, number]> = {
  'resistor:a': [24.5, 8, 2], 'resistor:b': [39.5, 8, 2],
  'led:a': [49, -1, 2], 'led:k': [59, -1, 2],
  'resistor2:a':[24.5,-16,2],'resistor2:b':[39.5,-16,2],'led2:a':[49,-25,2],'led2:k':[59,-25,2],
  'resistor3:a':[24.5,-40,2],'resistor3:b':[39.5,-40,2],'led3:a':[49,-49,2],'led3:k':[59,-49,2],
  'ldr:a':[26,-14,2],'ldr:b':[44,-14,2],'divider:a':[26,-32,2],'divider:b':[44,-32,2],
  'servo:s':[30,-17,2],'servo:vcc':[39,-17,2],'servo:gnd':[48,-17,2],'supply:plus':[30,18,2],'supply:minus':[46,18,2],
  'rgb:r':[49,-1,2],'rgb:g':[49,-25,2],'rgb:b':[49,-49,2],'rgb:k':[65,-25,2],
  'pot:vcc':[27,-10,2],'pot:w':[35.5,-10,2],'pot:gnd':[44,-10,2],
  'buzzer:s':[27,4,2],'buzzer:vcc':[35.5,4,2],'buzzer:gnd':[44,4,2],
  'button:a1':[27,-7,2],'button:a2':[27,-16,2],'button:b1':[44,-7,2],'button:b2':[44,-16,2],
};
export function terminalPosition(id: string): THREE.Vector3 | null {
  const pin = pinById.get(id);
  if (pin) return new THREE.Vector3(pin.x, pin.y, 3.3);
  const pos = partPositions[id];
  return pos ? new THREE.Vector3(...pos) : null;
}
export function createCircuitScene(lessonId:LessonId='blink') {
  const group = new THREE.Group();
  const hitboxes: THREE.Mesh[] = [];
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];
  const gray = new THREE.MeshStandardMaterial({color:0x9aa8ad,metalness:.65,roughness:.35});
  const beige = new THREE.MeshStandardMaterial({color:0xdfc596,roughness:.65});
  const red = new THREE.MeshPhysicalMaterial({color:0xb81d32,roughness:.2,metalness:0,clearcoat:1,clearcoatRoughness:.12,transparent:true,opacity:.94,emissive:0x000000});
  const green = new THREE.MeshStandardMaterial({color:0x3563e9,metalness:.2,roughness:.45});
  const pick = new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
  materials.push(gray,beige,red,green,pick);
  function cylinder(radius: number, length: number, x:number,y:number,z:number, material:THREE.Material, horizontal=false) {
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,20),material);
    mesh.rotation[horizontal?'z':'x']=Math.PI/2;mesh.position.set(x,y,z);group.add(mesh);return mesh;
  }
  function tube(points:THREE.Vector3[],material:THREE.Material,radius=.17) {
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,radius,7,false),material);group.add(mesh);return mesh;
  }
  function text(content:string,x:number,y:number,width:number,height=2) {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
    const context=canvas.getContext('2d')!;context.fillStyle='rgba(255,255,255,.92)';context.roundRect(16,8,480,112,24);context.fill();context.fillStyle='#43576b';context.textAlign='center';context.textBaseline='middle';context.font='600 80px Arial, sans-serif';let fontSize=80;while(context.measureText(content).width>440&&fontSize>24){fontSize-=2;context.font=`600 ${fontSize}px Arial, sans-serif`;}context.fillText(content,256,64);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;textures.push(map);
    const material=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false});materials.push(material);
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);mesh.position.set(x,y,1);group.add(mesh);
  }
  const ledVisuals:{material:THREE.MeshPhysicalMaterial;halo:THREE.Mesh;baseColor:number}[]=[];
  for(let index=0;index<((lessonId==='buzzer-doorbell'||lessonId==='servo-angle')?0:(lessonId==='traffic-light'||lessonId==='rgb-mixing')?3:lessonId==='dual-led'?2:1);index++){
    const offset=-24*index,baseColor=lessonId==='traffic-light'?[0xb81d32,0xe6ad15,0x249a51][index]:index?0x2864d5:0xb81d32;
    const ledMaterial=index?red.clone():red;if(index){ledMaterial.color.set(baseColor);materials.push(ledMaterial);}
    const resistorBody=new THREE.Mesh(new THREE.CapsuleGeometry(1.5,5,6,20),beige);resistorBody.rotation.z=Math.PI/2;resistorBody.position.set(32,8+offset,2);group.add(resistorBody);
  tube([new THREE.Vector3(24.5,8+offset,2),new THREE.Vector3(39.5,8+offset,2)],gray);
  [0xaf3436,0xaf3436,0x785030,0xbb9a43].forEach((color,i)=>{
    const material=new THREE.MeshStandardMaterial({color,roughness:.5});materials.push(material);
    cylinder(1.53,.65,29.1+i*1.85,8+offset,2,material,true);
  });
  text((lessonId==='dual-led'||lessonId==='traffic-light'||lessonId==='rgb-mixing')?`R${index+1} 220 Ω`:'220 Ω',32,12.5+offset,15,2.8);text('A',24.5,5+offset,4);text('B',39.5,5+offset,4);
  if(lessonId==='rgb-mixing')continue;
  // One red LED, with explicit A/K labels; glow reflects validated graph state only.
  const dome=new THREE.Mesh(new THREE.SphereGeometry(2.7,28,20,0,Math.PI*2,0,Math.PI/2),ledMaterial);
  dome.rotation.x=Math.PI/2;dome.position.set(54,7+offset,3);group.add(dome);
  cylinder(2.7,2.4,54,7+offset,2.2,ledMaterial);cylinder(3.1,.55,54,7+offset,.9,ledMaterial);
  tube([new THREE.Vector3(52.4,6+offset,.5),new THREE.Vector3(49,3+offset,.5),new THREE.Vector3(49,-1+offset,2)],gray);
  tube([new THREE.Vector3(55.5,6+offset,.5),new THREE.Vector3(59,3+offset,.5),new THREE.Vector3(59,-1+offset,2)],gray);
  text(lessonId==='traffic-light'?['RED','YELLOW','GREEN'][index]:(lessonId==='dual-led'?`LED ${index+1}`:'LED'),54,13+offset,10,2.6);text('A+',49,-4.2+offset,5);text('K−',59,-4.2+offset,5);
  const haloMaterial=new THREE.MeshBasicMaterial({color:baseColor,transparent:true,opacity:.14,depthWrite:false});materials.push(haloMaterial);
  const halo=new THREE.Mesh(new THREE.CircleGeometry(5.5,36),haloMaterial);halo.position.set(54,7+offset,0);group.add(halo);halo.visible=false;
    ledVisuals.push({material:ledMaterial,halo,baseColor});
  }
  let sensorMaterial:THREE.MeshStandardMaterial|null=null,servoHorn:THREE.Group|null=null;
  if(lessonId==='ldr-nightlight'){
   sensorMaterial=new THREE.MeshStandardMaterial({color:0xb6a387,roughness:.8});materials.push(sensorMaterial);const sensor=new THREE.Mesh(new THREE.CylinderGeometry(5.5,5.5,1.6,24),sensorMaterial);sensor.rotation.x=Math.PI/2;sensor.position.set(35,-6,2);group.add(sensor);
   const traceMaterial=new THREE.MeshStandardMaterial({color:0x704323});materials.push(traceMaterial);tube([new THREE.Vector3(32,-8,3),new THREE.Vector3(32,-4,3),new THREE.Vector3(34,-4,3),new THREE.Vector3(34,-8,3),new THREE.Vector3(36,-8,3),new THREE.Vector3(36,-4,3),new THREE.Vector3(38,-4,3),new THREE.Vector3(38,-8,3)],traceMaterial,.25);
   tube([terminalPosition('ldr:a')!,new THREE.Vector3(32,-9,1)],gray);tube([terminalPosition('ldr:b')!,new THREE.Vector3(38,-9,1)],gray);text('LDR',35,2,12,2.5);
   const resistor=new THREE.Mesh(new THREE.CapsuleGeometry(1.5,5,6,20),beige);resistor.rotation.z=Math.PI/2;resistor.position.set(35,-26,2);group.add(resistor);tube([terminalPosition('divider:a')!,new THREE.Vector3(30,-26,2),new THREE.Vector3(40,-26,2),terminalPosition('divider:b')!],gray);text('10 kΩ',35,-21,14,2.5);for(const [i,color] of [0x785030,0x222222,0xe48622,0xbb9a43].entries()){const band=new THREE.MeshStandardMaterial({color});materials.push(band);cylinder(1.53,.6,32.4+i*1.8,-26,2,band,true);}
  }
  if(lessonId==='servo-angle'){
   const bodyMaterial=new THREE.MeshStandardMaterial({color:0x275498,roughness:.4});materials.push(bodyMaterial);const housing=new THREE.Mesh(new THREE.BoxGeometry(22,16,8),bodyMaterial);housing.position.set(40,-2,3);group.add(housing);
   const white=new THREE.MeshStandardMaterial({color:0xe5e9ee,roughness:.5});materials.push(white);servoHorn=new THREE.Group();servoHorn.position.set(40,-2,8);const hub=new THREE.Mesh(new THREE.CylinderGeometry(2,2,1,24),white);hub.rotation.x=Math.PI/2;servoHorn.add(hub);const arm=new THREE.Mesh(new THREE.BoxGeometry(12,2,1),white);arm.position.x=5;servoHorn.add(arm);group.add(servoHorn);text('SERVO',40,12,18,3);
   const sourceMaterial=new THREE.MeshStandardMaterial({color:0x596578,roughness:.6});materials.push(sourceMaterial);const source=new THREE.Mesh(new THREE.BoxGeometry(22,9,3),sourceMaterial);source.position.set(38,26,2);group.add(source);text('EXTERNAL 5V',38,33,24,2.5);for(const id of ['servo:s','servo:vcc','servo:gnd','supply:plus','supply:minus']){const pos=terminalPosition(id)!;tube([pos,new THREE.Vector3(pos.x,id.startsWith('servo:')?-10:22,2)],gray);}for(const [id,label] of [['servo:s','SIG'],['servo:vcc','VCC'],['servo:gnd','GND'],['supply:plus','+5V'],['supply:minus','GND']]){const pos=terminalPosition(id)!;text(label,pos.x,pos.y-3,6);}
  }
  let rgbMaterial:THREE.MeshPhysicalMaterial|null=null,rgbHalo:THREE.Mesh|null=null,potKnob:THREE.Mesh|null=null;
  if(lessonId==='rgb-mixing'){
   rgbMaterial=red.clone();materials.push(rgbMaterial);const dome=new THREE.Mesh(new THREE.SphereGeometry(4.4,28,20),rgbMaterial);dome.position.set(57,-15,4);group.add(dome);
   const haloMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.2});materials.push(haloMaterial);rgbHalo=new THREE.Mesh(new THREE.CircleGeometry(8,32),haloMaterial);rgbHalo.position.set(57,-15,0);group.add(rgbHalo);
   for(const id of ['rgb:r','rgb:g','rgb:b','rgb:k']){const pos=terminalPosition(id)!;tube([pos,new THREE.Vector3(pos.x,-15,1),new THREE.Vector3(57,-15,2)],gray);text(id==='rgb:k'?'K-':id.slice(-1).toUpperCase(),pos.x,pos.y-3,4);}
   text('RGB / K-',53,2,17,2.8);
  }
  if(lessonId==='pot-dimming'){
   const body=new THREE.Mesh(new THREE.BoxGeometry(17,15,3),beige);body.position.set(35.5,-1,1);group.add(body);potKnob=new THREE.Mesh(new THREE.CylinderGeometry(5,5,3,24),green);potKnob.geometry.rotateX(Math.PI/2);potKnob.position.set(35.5,-1,4);group.add(potKnob);
   const mark=new THREE.Mesh(new THREE.BoxGeometry(.7,3,.4),gray);mark.position.set(0,1.8,1.8);potKnob.add(mark);text('POT / ADC',35.5,-21,18,2.5);for(const [id,label] of [['pot:vcc','VCC'],['pot:w','W'],['pot:gnd','GND']]){const pos=terminalPosition(id)!;tube([pos,new THREE.Vector3(pos.x,-5,1)],gray);text(label,pos.x,pos.y-3,6);}
  }
  let buzzerRing:THREE.Mesh|null=null;
  if(lessonId==='buzzer-doorbell'){
   const bodyMaterial=new THREE.MeshStandardMaterial({color:0x26303e,roughness:.5});materials.push(bodyMaterial);
   cylinder(6.5,5,35.5,15,3.5,bodyMaterial);
   const opening=new THREE.Mesh(new THREE.CircleGeometry(2,24),bodyMaterial);opening.position.set(35.5,15,6.2);group.add(opening);
   const ringMaterial=new THREE.MeshBasicMaterial({color:0x4388ff,transparent:true,opacity:.7});materials.push(ringMaterial);buzzerRing=new THREE.Mesh(new THREE.TorusGeometry(8,.5,8,40),ringMaterial);buzzerRing.position.set(35.5,15,4);buzzerRing.visible=false;group.add(buzzerRing);
   text('ACTIVE BUZZER',35.5,26,24,3);text('S',27,1,4);text('VCC',35.5,1,7);text('GND',44,1,7);
  }
  let buttonCap:THREE.Mesh|null=null;
  if(hasButton(lessonId)){
    const housing=new THREE.Mesh(new THREE.BoxGeometry(12,12,2.5),new THREE.MeshStandardMaterial({color:0x26303e,roughness:.55}));materials.push(housing.material);housing.position.set(35.5,-11.5,1);group.add(housing);
    buttonCap=new THREE.Mesh(new THREE.CylinderGeometry(3.1,3.1,2,24),green);buttonCap.rotation.x=Math.PI/2;buttonCap.position.set(35.5,-11.5,3.3);group.add(buttonCap);
    const target=new THREE.Mesh(new THREE.SphereGeometry(3.4,16,12),pick);target.position.set(35.5,-11.5,4);target.userData.pinId='button:press';hitboxes.push(target);group.add(target);
    for(const [id,pos] of Object.entries(partPositions).filter(([id])=>id.startsWith('button:'))){const right=id.includes(':b');tube([new THREE.Vector3(...pos),new THREE.Vector3(right?40.5:30.5,pos[1],1)],gray);text(id.split(':')[1].toUpperCase(),pos[0],pos[1]-2.6,4,1.6);}
    text('BUTTON',35.5,-2.5,13,2.3);
  }
  for(const [id,pos] of Object.entries(partPositions).filter(([id])=>Object.hasOwn(lessons[lessonId].parts,id))) {
    const terminal=new THREE.Mesh(new THREE.SphereGeometry(.8,16,10),green);terminal.position.set(...pos);group.add(terminal);
    const target=new THREE.Mesh(new THREE.SphereGeometry(2.2,12,8),pick);target.position.set(...pos);target.userData.pinId=id;group.add(target);hitboxes.push(target);
  }
  const pendingMaterial=new THREE.MeshBasicMaterial({color:0xe2a22e,transparent:true,opacity:.9,depthTest:false});materials.push(pendingMaterial);
  const pendingRing=new THREE.Mesh(new THREE.TorusGeometry(1.7,.24,8,28),pendingMaterial);pendingRing.renderOrder=6;pendingRing.visible=false;group.add(pendingRing);
  const particleCanvas=document.createElement('canvas');particleCanvas.width=64;particleCanvas.height=64;const particleContext=particleCanvas.getContext('2d')!;const glowGradient=particleContext.createRadialGradient(32,32,0,32,32,32);glowGradient.addColorStop(0,'rgba(255,255,255,1)');glowGradient.addColorStop(.18,'rgba(255,250,220,1)');glowGradient.addColorStop(.35,'rgba(255,218,106,.9)');glowGradient.addColorStop(.7,'rgba(255,176,60,.22)');glowGradient.addColorStop(1,'rgba(255,176,60,0)');particleContext.fillStyle=glowGradient;particleContext.fillRect(0,0,64,64);const particleTexture=new THREE.CanvasTexture(particleCanvas);textures.push(particleTexture);
  const arrowGeometry=new THREE.ConeGeometry(.5,1.5,8);
  const particleMaterial=new THREE.SpriteMaterial({map:particleTexture,color:0xffffff,transparent:true,depthWrite:false,toneMapped:false});
  const arrowMaterial=new THREE.MeshBasicMaterial({color:0xffca65,toneMapped:false});materials.push(particleMaterial,arrowMaterial);
  interface FlowItem {key:string;curve:THREE.CatmullRomCurve3;from:string;group:THREE.Group;dots:THREE.Sprite[];arrow:THREE.Mesh;active:boolean;forward:boolean}
  let flowItems:FlowItem[]=[],phase=0,lit=false,lit2=false,lit3=false,enabled=true,playing=true,reducedMotion=false,simple=false;
  let wireMeshes:THREE.Mesh[]=[],previousWires:CircuitWire[]|null=null;
  function addFlow(key:string,curve:THREE.CatmullRomCurve3,from:string){
    const root=new THREE.Group(),dots=Array.from({length:3},()=>{const dot=new THREE.Sprite(particleMaterial);dot.scale.set(2.2,2.2,1);return dot;});
    const arrow=new THREE.Mesh(arrowGeometry,arrowMaterial);root.add(...dots,arrow);group.add(root);
    flowItems.push({key,curve,from,group:root,dots,arrow,active:false,forward:true});
  }
  function positionFlow(){
    for(const item of flowItems){
      item.dots.forEach((dot,index)=>{const position=(phase+index/3)%1;dot.position.copy(item.curve.getPointAt(item.forward?position:1-position));dot.visible=!reducedMotion&&!simple;});
      const t=item.forward ? .56 : .44,tangent=item.curve.getTangentAt(t).multiplyScalar(item.forward?1:-1).normalize();
      item.arrow.position.copy(item.curve.getPointAt(t));item.arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),tangent);
      item.group.visible=enabled&&(lit||lit2||lit3)&&item.active;
    }
  }
  function clearWires(){
    for(const mesh of wireMeshes){group.remove(mesh);mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}wireMeshes=[];
    flowItems.forEach(item=>group.remove(item.group));flowItems=[];
  }
  return {
    group,hitboxes,
    configure(options:{accent:string;enabled:boolean;playing:boolean;reducedMotion:boolean;simple:boolean}){
      green.color.set(options.accent);enabled=options.enabled;playing=options.playing;reducedMotion=options.reducedMotion;simple=options.simple;positionFlow();
    },
    needsAnimation(){return enabled&&(lit||lit2||lit3)&&playing&&!reducedMotion&&!simple&&flowItems.some(item=>item.active);},
    animate(delta:number){if(this.needsAnimation()){phase=(phase+delta*.45)%1;positionFlow();}},
    update(wires:CircuitWire[],nextLit:boolean,pending:string|null,pressed=false,nextLit2=false,nextLit3=false,brightness=1,rgb:number[]=[0,0,0],potPosition=2048,lightPosition=3072,servoAngle=90){
      if(wires!==previousWires){
        clearWires();previousWires=wires;
        wires.forEach((wire,index)=>{
          const from=terminalPosition(wire.from),to=terminalPosition(wire.to);if(!from||!to)return;
          const height=6+(index%3)*1.2,mid1=from.clone().lerp(to,.3),mid2=from.clone().lerp(to,.7);mid1.z=height;mid2.z=height;
          if([wire.from,wire.to].some(id=>pinById.get(id)?.role==='ground')){const floor=(lessonId==='traffic-light'||lessonId==='rgb-mixing')?Math.min(from.y,to.y,-56)-5-(index%2)*3:lessonId==='dual-led'?Math.min(from.y,to.y,-32)-5-(index%2)*3:Math.min(from.y,to.y,-13)-5;mid1.set(from.x,floor,height);mid2.set(to.x,floor,height);}
          const curve=new THREE.CatmullRomCurve3([from,mid1,mid2,to]);
          const material=new THREE.MeshStandardMaterial({color:wireColor(wire),roughness:.32});
          const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,32,.3,8,false),material);group.add(mesh);wireMeshes.push(mesh);addFlow('wire:'+wire.id,curve,wire.from);
        });
        for(let index=0;index<((lessonId==='buzzer-doorbell'||lessonId==='servo-angle')?0:(lessonId==='traffic-light'||lessonId==='rgb-mixing')?3:lessonId==='dual-led'?2:1);index++){
          const offset=-24*index,r=index?'resistor'+(index+1):'resistor',l=index?'led'+(index+1):'led';
          addFlow('resistor:'+r,new THREE.CatmullRomCurve3([new THREE.Vector3(24.5,8+offset,2),new THREE.Vector3(32,8+offset,4),new THREE.Vector3(39.5,8+offset,2)]),r+':a');
          if(lessonId==='rgb-mixing'){const anode=['rgb:r','rgb:g','rgb:b'][index];addFlow('led:rgb-'+index,new THREE.CatmullRomCurve3([terminalPosition(anode)!,new THREE.Vector3(57,-15,6),terminalPosition('rgb:k')!]),anode);continue;}
          addFlow('led:'+l,new THREE.CatmullRomCurve3([new THREE.Vector3(49,-1+offset,2),new THREE.Vector3(52.4,5+offset,2),new THREE.Vector3(54,7+offset,5),new THREE.Vector3(55.5,5+offset,2),new THREE.Vector3(59,-1+offset,2)]),l+':a');
        }
      }
      if(sensorMaterial)sensorMaterial.color.setRGB(.3+.5*lightPosition/4095,.24+.45*lightPosition/4095,.16+.4*lightPosition/4095);
      if(servoHorn)servoHorn.rotation.z=((nextLit?servoAngle:90)-90)*Math.PI/180;
      if(rgbMaterial&&rgbHalo){const on=rgb.some(v=>v>0);const color=new THREE.Color(`rgb(${rgb.join(',')})`);rgbMaterial.color.copy(on?color:new THREE.Color(0x80909e));rgbMaterial.emissive.copy(color);rgbMaterial.emissiveIntensity=on?.8:0;(rgbHalo.material as THREE.MeshBasicMaterial).color.copy(color);rgbHalo.visible=on;}
      if(potKnob)potKnob.rotation.z=(potPosition/4095-.5)*Math.PI*1.5;
      if(buzzerRing)buzzerRing.visible=nextLit;
      if((lessonId==='pwm-breathing'||lessonId==='pot-dimming')){particleMaterial.opacity=brightness;arrowMaterial.transparent=true;arrowMaterial.opacity=brightness;}
      if(buttonCap)buttonCap.position.z=pressed?2:3.3;
      lit=nextLit;lit2=nextLit2;lit3=nextLit3;const path=new Map(currentPath(wires,lit?'HIGH':'LOW',lessonId,lit2?'HIGH':'LOW',lit3?'HIGH':'LOW').map(segment=>[segment.kind+':'+segment.id,segment]));
      for(const item of flowItems){const segment=path.get(item.key);item.active=Boolean(segment);item.forward=segment?.from===item.from;}
      ledVisuals.forEach((visual,index)=>{const on=[lit,lit2,lit3][index];visual.material.color.set(on?(lessonId==='traffic-light'?visual.baseColor:index?0x4388ff:0xe83942):visual.baseColor);visual.material.emissive.set(on?(lessonId==='traffic-light'?visual.baseColor:index?0x164edd:0xdc101c):0x000000);if((lessonId==='pwm-breathing'||lessonId==='pot-dimming'))visual.material.color.multiplyScalar(.35+.65*brightness);visual.material.emissiveIntensity=on ? .8*(index===0?brightness:1) : 0;(visual.halo.material as THREE.MeshBasicMaterial).opacity=.14*(index===0?brightness:1);visual.halo.visible=on;});positionFlow();
      const position=pending?terminalPosition(pending):null;pendingRing.visible=Boolean(position);if(position)pendingRing.position.copy(position).add(new THREE.Vector3(0,0,1.5));
    },
    dispose(){
      clearWires();group.removeFromParent();const geometries=new Set<THREE.BufferGeometry>();group.traverse(object=>{if(object instanceof THREE.Mesh)geometries.add(object.geometry);});
      geometries.forEach(geometry=>geometry.dispose());arrowGeometry.dispose();materials.forEach(material=>material.dispose());textures.forEach(texture=>texture.dispose());
    },
  };
}
