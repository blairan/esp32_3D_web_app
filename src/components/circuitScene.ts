import * as THREE from 'three';
import { pinById } from '../board';
import { wireColor, currentPath } from '../circuit';
import type { CircuitWire } from '../circuit';

export const partPositions: Record<string, [number, number, number]> = {
  'resistor:a': [24.5, 8, 2], 'resistor:b': [39.5, 8, 2],
  'led:a': [49, -1, 2], 'led:k': [59, -1, 2],
};
export function terminalPosition(id: string): THREE.Vector3 | null {
  const pin = pinById.get(id);
  if (pin) return new THREE.Vector3(pin.x, pin.y, 3.3);
  const pos = partPositions[id];
  return pos ? new THREE.Vector3(...pos) : null;
}
export function createCircuitScene() {
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
    const context=canvas.getContext('2d')!;context.fillStyle='rgba(255,255,255,.92)';context.roundRect(16,8,480,112,24);context.fill();context.fillStyle='#43576b';context.textAlign='center';context.textBaseline='middle';context.font='600 80px Arial, sans-serif';context.fillText(content,256,64);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;textures.push(map);
    const material=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false});materials.push(material);
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);mesh.position.set(x,y,1);group.add(mesh);
  }
  // Unpolarized axial 220-ohm resistor: red / red / brown / gold.
  const resistorBody=new THREE.Mesh(new THREE.CapsuleGeometry(1.5,5,6,20),beige);resistorBody.rotation.z=Math.PI/2;resistorBody.position.set(32,8,2);group.add(resistorBody);
  tube([new THREE.Vector3(24.5,8,2),new THREE.Vector3(39.5,8,2)],gray);
  [0xaf3436,0xaf3436,0x785030,0xbb9a43].forEach((color,i)=>{
    const material=new THREE.MeshStandardMaterial({color,roughness:.5});materials.push(material);
    cylinder(1.53,.65,29.1+i*1.85,8,2,material,true);
  });
  text('220 Ω',32,12.5,12,2.8);text('A',24.5,5,4);text('B',39.5,5,4);
  // One red LED, with explicit A/K labels; glow reflects validated graph state only.
  const dome=new THREE.Mesh(new THREE.SphereGeometry(2.7,28,20,0,Math.PI*2,0,Math.PI/2),red);
  dome.rotation.x=Math.PI/2;dome.position.set(54,7,3);group.add(dome);
  cylinder(2.7,2.4,54,7,2.2,red);cylinder(3.1,.55,54,7,.9,red);
  tube([new THREE.Vector3(52.4,6,.5),new THREE.Vector3(49,3,.5),new THREE.Vector3(49,-1,2)],gray);
  tube([new THREE.Vector3(55.5,6,.5),new THREE.Vector3(59,3,.5),new THREE.Vector3(59,-1,2)],gray);
  text('LED',54,13,10,2.6);text('A+',49,-4.2,5);text('K−',59,-4.2,5);
  const haloMaterial=new THREE.MeshBasicMaterial({color:0xff4433,transparent:true,opacity:.14,depthWrite:false});materials.push(haloMaterial);
  const halo=new THREE.Mesh(new THREE.CircleGeometry(5.5,36),haloMaterial);halo.position.set(54,7,0);group.add(halo);halo.visible=false;
  for(const [id,pos] of Object.entries(partPositions)) {
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
  let flowItems:FlowItem[]=[],phase=0,lit=false,enabled=true,playing=true,reducedMotion=false,simple=false;
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
      item.group.visible=enabled&&lit&&item.active;
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
    needsAnimation(){return enabled&&lit&&playing&&!reducedMotion&&!simple&&flowItems.some(item=>item.active);},
    animate(delta:number){if(this.needsAnimation()){phase=(phase+delta*.45)%1;positionFlow();}},
    update(wires:CircuitWire[],nextLit:boolean,pending:string|null){
      if(wires!==previousWires){
        clearWires();previousWires=wires;
        wires.forEach((wire,index)=>{
          const from=terminalPosition(wire.from),to=terminalPosition(wire.to);if(!from||!to)return;
          const height=6+(index%3)*1.2,mid1=from.clone().lerp(to,.3),mid2=from.clone().lerp(to,.7);mid1.z=height;mid2.z=height;
          if([wire.from,wire.to].some(id=>pinById.get(id)?.role==='ground')){const floor=Math.min(from.y,to.y,-13)-5;mid1.set(from.x,floor,height);mid2.set(to.x,floor,height);}
          const curve=new THREE.CatmullRomCurve3([from,mid1,mid2,to]);
          const material=new THREE.MeshStandardMaterial({color:wireColor(wire),roughness:.32});
          const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,32,.3,8,false),material);group.add(mesh);wireMeshes.push(mesh);addFlow('wire:'+wire.id,curve,wire.from);
        });
        addFlow('resistor:resistor',new THREE.CatmullRomCurve3([new THREE.Vector3(24.5,8,2),new THREE.Vector3(32,8,4),new THREE.Vector3(39.5,8,2)]),'resistor:a');
        addFlow('led:led',new THREE.CatmullRomCurve3([new THREE.Vector3(49,-1,2),new THREE.Vector3(52.4,5,2),new THREE.Vector3(54,7,5),new THREE.Vector3(55.5,5,2),new THREE.Vector3(59,-1,2)]),'led:a');
      }
      lit=nextLit;const path=new Map(currentPath(wires,lit?'HIGH':'LOW').map(segment=>[segment.kind+':'+segment.id,segment]));
      for(const item of flowItems){const segment=path.get(item.key);item.active=Boolean(segment);item.forward=segment?.from===item.from;}
      red.color.set(lit?0xe83942:0xb81d32);red.emissive.set(lit?0xdc101c:0x000000);red.emissiveIntensity=lit ? .8 : 0;halo.visible=lit;positionFlow();
      const position=pending?terminalPosition(pending):null;pendingRing.visible=Boolean(position);if(position)pendingRing.position.copy(position).add(new THREE.Vector3(0,0,1.5));
    },
    dispose(){
      clearWires();group.removeFromParent();const geometries=new Set<THREE.BufferGeometry>();group.traverse(object=>{if(object instanceof THREE.Mesh)geometries.add(object.geometry);});
      geometries.forEach(geometry=>geometry.dispose());arrowGeometry.dispose();materials.forEach(material=>material.dispose());textures.forEach(texture=>texture.dispose());
    },
  };
}
