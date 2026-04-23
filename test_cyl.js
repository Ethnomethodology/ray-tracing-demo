const BABYLON = require('babylonjs');
const engine = new BABYLON.NullEngine();
const scene = new BABYLON.Scene(engine);
const mesh = BABYLON.MeshBuilder.CreateCylinder("c", { diameterTop: 0.02, diameterBottom: 0.15, height: 3.5 }, scene);
const pos = mesh.geometry.getVerticesData(BABYLON.VertexBuffer.PositionKind);
console.log("Min Y:", Math.min(...pos.filter((_,i)=>i%3===1)));
console.log("Max Y:", Math.max(...pos.filter((_,i)=>i%3===1)));
console.log("Vertices at Max Y:", pos.filter((_,i)=>i%3===1 && pos[i]===1.75).length);
let maxXatMaxY = 0;
for(let i=0; i<pos.length; i+=3) {
  if (pos[i+1] === 1.75) maxXatMaxY = Math.max(maxXatMaxY, pos[i]);
}
console.log("Max X at Max Y:", maxXatMaxY);
let maxXatMinY = 0;
for(let i=0; i<pos.length; i+=3) {
  if (pos[i+1] === -1.75) maxXatMinY = Math.max(maxXatMinY, pos[i]);
}
console.log("Max X at Min Y:", maxXatMinY);
