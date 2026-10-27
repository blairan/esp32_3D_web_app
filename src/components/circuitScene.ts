import * as THREE from 'three';
import { pinById } from '../board';
import { wireColor } from '../circuit';
import type { CircuitWire } from '../circuit';

export const partPositions: Record<string, [number, number, number]> = {
  'resistor:a': [29, -9, 2], 'resistor:b': [44, -9, 2],
  'led:a': [34, 10, 2], 'led:k': [44, 10, 2],
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
  const red = new THREE.MeshStandardMaterial({color:0xa32727,roughness:.24,metalness:.05,emissive:0x000000});
  const green = new THREE.MeshStandardMaterial({color:0x079a76,metalness:.2,roughness:.45});
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
    const context=canvas.getContext('2d')!;context.fillStyle='#43576b';context.textAlign='center';context.textBaseline='middle';context.font='600 80px Arial, sans-serif';context.fillText(content,256,64);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;textures.push(map);
    const material=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false});materials.push(material);
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);mesh.position.set(x,y,1);group.add(mesh);
  }
  // Unpolarized axial 220-ohm resistor: red / red / brown / gold.
  cylinder(1.5,8,36.5,-9,2,beige,true);
  tube([new THREE.Vector3(29,-9,2),new THREE.Vector3(44,-9,2)],gray);
  [0xaf3436,0xaf3436,0x785030,0xbb9a43].forEach((color,i)=>{
    const material=new THREE.MeshStandardMaterial({color,roughness:.5});materials.push(material);
    cylinder(1.53,.65,33.6+i*1.85,-9,2,material,true);
  });
  text('220 Ω',36.5,-4.5,12,2.8);text('A',29,-12,4);text('B',44,-12,4);
  // One red LED, with explicit A/K labels; glow reflects validated graph state only.
  const dome=new THREE.Mesh(new THREE.SphereGeometry(2.7,28,20,0,Math.PI*2,0,Math.PI/2),red);
  dome.rotation.x=Math.PI/2;dome.position.set(39,18,3);group.add(dome);
  cylinder(2.7,2.4,39,18,2.2,red);cylinder(3.1,.55,39,18,.9,red);
  tube([new THREE.Vector3(37.4,17,.5),new THREE.Vector3(34,14,.5),new THREE.Vector3(34,10,2)],gray);
  tube([new THREE.Vector3(40.5,17,.5),new THREE.Vector3(44,14,.5),new THREE.Vector3(44,10,2)],gray);
  text('LED',39,24,10,2.6);text('A+',34,6.8,5);text('K−',44,6.8,5);
  const haloMaterial=new THREE.MeshBasicMaterial({color:0xff4433,transparent:true,opacity:.14,depthWrite:false});materials.push(haloMaterial);
  const halo=new THREE.Mesh(new THREE.CircleGeometry(5.5,36),haloMaterial);halo.position.set(39,18,0);group.add(halo);halo.visible=false;
  for(const [id,pos] of Object.entries(partPositions)) {
    const terminal=new THREE.Mesh(new THREE.SphereGeometry(.8,16,10),green);terminal.position.set(...pos);group.add(terminal);
    const target=new THREE.Mesh(new THREE.SphereGeometry(2.2,12,8),pick);target.position.set(...pos);target.userData.pinId=id;group.add(target);hitboxes.push(target);
  }
  const pendingMaterial=new THREE.MeshBasicMaterial({color:0xe2a22e,transparent:true,opacity:.9,depthTest:false});materials.push(pendingMaterial);
  const pendingRing=new THREE.Mesh(new THREE.TorusGeometry(1.7,.24,8,28),pendingMaterial);pendingRing.renderOrder=6;pendingRing.visible=false;group.add(pendingRing);
  let wireMeshes:THREE.Mesh[]=[];
  function clearWires() { for(const mesh of wireMeshes){group.remove(mesh);mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}wireMeshes=[]; }
  let previousWires:CircuitWire[]|null=null;
  return {
    group,hitboxes,
    update(wires:CircuitWire[],lit:boolean,pending:string|null) {
      if(wires!==previousWires) {
        clearWires();previousWires=wires;
        wires.forEach((wire,i)=>{
          const from=terminalPosition(wire.from),to=terminalPosition(wire.to);if(!from||!to)return;
          const height=6+(i%3)*1.2;
          const mid1=from.clone().lerp(to,.3);mid1.z=height;
          const mid2=from.clone().lerp(to,.7);mid2.z=height;
          const material=new THREE.MeshStandardMaterial({color:wireColor(wire),roughness:.4});
          wireMeshes.push(tube([from,mid1,mid2,to],material,.26));
        });
      }
      red.color.set(lit?0xff4f3b:0x9f2d2b);red.emissive.set(lit?0xe52e14:0x000000);red.emissiveIntensity=lit?1.6:0;halo.visible=lit;
      const pos=pending?terminalPosition(pending):null;pendingRing.visible=Boolean(pos);if(pos)pendingRing.position.copy(pos).add(new THREE.Vector3(0,0,1.5));
    },
    dispose() {
      clearWires();group.removeFromParent();group.traverse(object=>{if(object instanceof THREE.Mesh)object.geometry.dispose();});
      materials.forEach(material=>material.dispose());textures.forEach(texture=>texture.dispose());
    },
  };
}
