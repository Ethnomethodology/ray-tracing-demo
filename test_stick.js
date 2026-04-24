const BABYLON = require('babylonjs');
const engine = new BABYLON.NullEngine();
const scene = new BABYLON.Scene(engine);

const stickMesh = BABYLON.MeshBuilder.CreateCylinder("stickMesh", { diameterTop: 0.02, diameterBottom: 0.15, height: 3.5 }, scene);
stickMesh.bakeTransformIntoVertices(BABYLON.Matrix.Translation(0, -1.75, 0));
stickMesh.position = new BABYLON.Vector3(0, 0, 0); // At surface

// Suppose surface normal is +Z (0, 0, 1), so surface points towards +Z.
const _surfaceNormal = new BABYLON.Vector3(0, 0, 1);

const _fromVec = new BABYLON.Vector3(0, 1, 0);
const _toVec = _surfaceNormal.clone().negate(); // (0, 0, -1), points INWARD.

stickMesh.rotationQuaternion = BABYLON.Quaternion.FromUnitVectorsToRef(
    _fromVec,
    _toVec,
    new BABYLON.Quaternion()
);

stickMesh.computeWorldMatrix(true);

const narrowTipWorld = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(0, 0, 0), stickMesh.getWorldMatrix());
const thickHandleWorld = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(0, -3.5, 0), stickMesh.getWorldMatrix());

console.log("Narrow Tip World (should be at origin):", narrowTipWorld);
console.log("Thick Handle World (should be pointing outward, +Z is outward so handle should have +Z):", thickHandleWorld);
