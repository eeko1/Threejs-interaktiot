import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { VRButton } from "three/addons/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/addons/webxr/XRControllerModelFactory.js";

let camera, scene, renderer, controls;
let controller1, controller2;
let controllerGrip1, controllerGrip2;
let raycaster;
const intersected = [];
const tempMatrix = new THREE.Matrix4();
let group = new THREE.Group();
group.name = "Interaction-Group";

function init() {
  scene = new THREE.Scene();
  scene.add(group);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(5, 5, 5);

  // Fog Configuration
  const fogColor = 0xd0dee7; // Light blue fog color
  const near = 0.5; // Start fog close to the camera
  const far = 15; // End fog further away for a gradient effect
  scene.fog = new THREE.Fog(fogColor, near, far);
  scene.background = new THREE.Color(fogColor); // Match background to fog color

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
  scene.add(ambientLight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.update();

  window.addEventListener("resize", resize, false);

  loadModels();
  initVR();
}

function initVR() {
  renderer.xr.enabled = true;
  document.body.appendChild(VRButton.createButton(renderer));

  controller1 = renderer.xr.getController(0);
  controller1.addEventListener("selectstart", onSelectStart);
  controller1.addEventListener("selectend", onSelectEnd);
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener("selectstart", onSelectStart);
  controller2.addEventListener("selectend", onSelectEnd);
  scene.add(controller2);

  const controllerModelFactory = new XRControllerModelFactory();

  controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(
    controllerModelFactory.createControllerModel(controllerGrip1)
  );
  scene.add(controllerGrip1);

  controllerGrip2 = renderer.xr.getControllerGrip(1);
  const loader = new GLTFLoader().setPath("");

  loader.load("pyssy/scene.gltf", async function (gltf) {
    const model = gltf.scene;
    await renderer.compileAsync(model, camera, scene);
    model.scale.set(0.0003, 0.0003, 0.0003);
    model.rotation.y = THREE.MathUtils.degToRad(180);
    model.rotation.x = THREE.MathUtils.degToRad(-36.5);
    controllerGrip2.add(model);
  });

  scene.add(controllerGrip2);

  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);

  const line = new THREE.Line(geometry);
  line.name = "line";
  line.scale.z = 5;

  controller1.add(line.clone());
  controller2.add(line.clone());

  raycaster = new THREE.Raycaster();
}

function onSelectStart(event) {
  const controller = event.target;
  const intersections = getIntersections(controller);

  if (intersections.length > 0) {
    const intersection = intersections[0];
    const object = intersection.object;
    controller.attach(object);
    controller.userData.selected = object;
  }

  controller.userData.targetRayMode = event.data.targetRayMode;
}

function onSelectEnd(event) {
  const controller = event.target;

  if (controller.userData.selected !== undefined) {
    const object = controller.userData.selected;
    group.attach(object);
    controller.userData.selected = undefined;
  }
}

function getIntersections(controller) {
  controller.updateMatrixWorld();
  raycaster.setFromXRController(controller);
  return raycaster.intersectObjects(group.children, true);
}

function intersectObjects(controller) {
  if (controller.userData.targetRayMode === "screen") return;
  if (controller.userData.selected !== undefined) return;

  const line = controller.getObjectByName("line");
  const intersections = getIntersections(controller);

  if (intersections.length > 0) {
    const intersection = intersections[0];
    const object = intersection.object;
    object.traverse(function (node) {
      if (node.material) {
        node.material.transparent = true;
        node.material.opacity = 0.5;
      }
    });
    intersected.push(object);
    line.scale.z = intersection.distance;
  } else {
    line.scale.z = 5;
  }
}

function cleanIntersected() {
  while (intersected.length) {
    const object = intersected.pop();
    object.traverse(function (node) {
      if (node.material) {
        node.material.transparent = false;
        node.material.opacity = 1;
      }
    });
  }
}

init();

function loadModels() {
  new RGBELoader()
    .setPath("hdri/")
    .load("zwartkops_start_morning_4k.hdr", function (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;

      scene.background = texture;
      scene.environment = texture;

      const loader = new GLTFLoader().setPath("");

      loader.load("shoe/shoe.gltf", async function (gltf) {
        const model = gltf.scene;
        await renderer.compileAsync(model, camera, scene);
        group.add(model);
        model.position.set(15, 0.3, 20);
      });

      loader.load("koiraglb/koira.glb", async function (gltf) {
        const model = gltf.scene;
        await renderer.compileAsync(model, camera, scene);
        group.add(model);
        model.position.set(4, 2, 20);
      });

      loader.load("polyworld/threejsmaailma.glb", async function (gltf) {
        const model = gltf.scene;
        await renderer.compileAsync(model, camera, scene);
        scene.add(model);
        model.position.set(0, 0, 0);
      });

      loader.load("barrel/barrel.gltf", async function (gltf) {
        const model = gltf.scene;
        await renderer.compileAsync(model, camera, scene);
        group.add(model);
        model.position.set(4, 0.75, -20);
      });

      loader.load("nissan/scene.gltf", async function (gltf) {
        const model = gltf.scene;
        await renderer.compileAsync(model, camera, scene);
        group.add(model);
        model.position.set(10, 0, -20);
      });

      loader.load("torus/torus.gltf", async function (gltf) {
        const model = gltf.scene;
        await renderer.compileAsync(model, camera, scene);
        group.add(model);
        model.position.set(0, 0.7, 0);
      });
    });
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

renderer.setAnimationLoop(function () {
  cleanIntersected();
  intersectObjects(controller1);
  intersectObjects(controller2);
  controls.update();
  renderer.render(scene, camera);
});
