import WebcamManager from './Webcam.js';
import DetectionManager from './DetectionManager.js';
import Marker from './Marker.js';
import MarkerPair from './MarkerPair.js';
import CreateHTML from './HTMLOverlay.js';

const defaultConfig = {
  camera_params: {
    camID: undefined,
    videoSize: 1,
    torch: false,
    rearCamera: false,
  },
  detection_params: {
    minMarkerDistance: 10,
    minMarkerPerimeter: 0.02,
    maxMarkerPerimeter: 0.8,
    sizeAfterPerspectiveRemoval: 49,
  },
  feed_params: {
    contrast: 0,
    brightness: 0,
    grayscale: 0,
    flip: false,
  },
  // TODO: These are not implemented atm, should default to hidden or no?
  overlay_params: {
    present: true, // if false, will set the overlay to not have any visible elements, but it will still exist in the html for detection
    hide: true, // sets the overlay to hide on the left of the screen with a button on top
  },
}

const MARKER_COUNT = 100;
const MARKERS = [];

// pass this to html function
let config = {};

let webcamMan, detectionMan;
// This has side effects to the MARKERS array so users can access it
// which markers changed, overlay canvas, overlay ctx
let overlayCanvas, overlayCtx;
const updateMarkers = (markerChange) => {
  const [markers, dt, w, h] = markerChange;
  if (overlayCanvas.width !== w) {
    overlayCanvas.width = w;
    overlayCanvas.height = h;
  }
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  markers.forEach(detectedMarker => {
    const m = MARKERS.find((x) => x.id === detectedMarker.id);

    if (m === undefined) return;
    m.update(detectedMarker);

    const center = m.center;
    const corners = m.corners;
    const angle = m.rotation;
  
    overlayCtx.strokeStyle = "#FF00AA";
    overlayCtx.beginPath();
  
    corners.forEach((c, i) => {
      overlayCtx.moveTo(c.x, c.y);
      let c2 = corners[(i + 1) % corners.length];
      overlayCtx.lineTo(c2.x, c2.y);
    });
  
    overlayCtx.stroke();
    overlayCtx.closePath();
  
    // draw first corner
    overlayCtx.strokeStyle = "blue";
    overlayCtx.strokeRect(corners[0].x - 2, corners[0].y - 2, 4, 4);
  
    overlayCtx.strokeStyle = "#FF00AA";
    overlayCtx.strokeRect(center.x - 1, center.y - 1, 2, 2);
  
    // !!!
    // It's the center
    overlayCtx.font = "12px monospace";
    overlayCtx.textAlign = "center";
    overlayCtx.fillStyle = "#FF55AA";
    overlayCtx.fillText(`ID=${m.id}`, center.x, center.y - 7);
    overlayCtx.fillText(angle.toFixed(2), center.x, center.y + 15);
  });

  MARKERS.forEach(m => m.updatePresence(dt));
};

const init = (domRoot, userConfig, markerList) => {
  if (markerList) {
    if (markerList.length <= 0) console.warn('BEHOLDER WARNING: your provided list of markers is empty, no markers will be tracked');

    markerList.forEach(id => MARKERS.push(new Marker(id)));
  } else {
    for (let i = 0; i < MARKER_COUNT; i++) {
      MARKERS.push(new Marker(i));
    }
  }

  const root = document.querySelector(domRoot);

  // If it's undefined just intialize with an empty config
  config = defaultConfig;
  // Merge default and user config
  if (userConfig) {
    if (userConfig.camera_params) config.camera_params = { ...config.camera_params, ...userConfig.camera_params };
    if (userConfig.detection_params) config.detection_params = { ...config.detection_params, ...userConfig.detection_params };
    if (userConfig.feed_params) config.feed_params = { ...config.feed_params, ...userConfig.feed_params };
    if (userConfig.overlay_params) config.overlay_params = { ...config.overlay_params, ...userConfig.overlay_params };
  }

  root.innerHTML = CreateHTML(config, '');
  root.querySelector('#beholder-video').setAttribute("playsinline", "playsinline");
  

  // Set up all of the dom events
  root.querySelector('#toggle-screen').addEventListener('click', () => root.querySelector('#detection-panel').classList.toggle('hidden'));

  // camera stream change events
  root.querySelector('#camera_param_id').addEventListener('change', (e) => {
    config.camera_params.camID = e.target.value;

    // re-attach camera stream
    webcamMan.startCameraFeed(config.camera_params);
  });

  root.querySelector('#camera_param_videoSize').addEventListener('change', (e) => {
    config.camera_params.videoSize = e.target.value;

    // re-attach camera stream
    webcamMan.startCameraFeed(config.camera_params);
  });

  root.querySelector('#detection_params-minMarkerDistance')
    .addEventListener('change', (e) => config.detection_params.minMarkerDistance = e.target.value);
  root.querySelector('#detection_params-minMarkerPerimeter')
    .addEventListener('change', (e) => config.detection_params.minMarkerPerimeter = e.target.value);
  root.querySelector('#detection_params-maxMarkerPerimeter')
    .addEventListener('change', (e) => config.detection_params.maxMarkerPerimeter = e.target.value);
  root.querySelector('#detection_params-sizeAfterPerspectiveRemoval')
    .addEventListener('change', (e) => config.detection_params.sizeAfterPerspectiveRemoval = e.target.value);
  
  root.querySelector('#detection_params-contrast')
    .addEventListener('change', (e) => config.feed_params.contrast = e.target.value);
  root.querySelector('#detection_params-brightness')
    .addEventListener('change', (e) => config.feed_params.brightness = e.target.value);
  root.querySelector('#detection_params-grayscale')
    .addEventListener('change', (e) => config.feed_params.grayscale = e.target.value);
  root.querySelector('#detection_params-flip')
    .addEventListener('change', (e) => config.feed_params.flip = e.target.checked);
  
  root.querySelector('#detection_params-torch')
    .addEventListener('change', (e) => {
      config.camera_params.torch = e.target.checked;

      webcamMan.startCameraFeed(config.camera_params);
    });

  // set up service managers
  webcamMan = new WebcamManager(root.querySelector('#beholder-video'));
  detectionMan = new DetectionManager(root.querySelector('#detection-canvas'), root.querySelector('#beholder-video'));
  overlayCanvas = root.querySelector('#detection-canvas-overlay');
  overlayCtx = overlayCanvas.getContext('2d');

  webcamMan.startCameraFeed(config.camera_params);
  return;
}

let prevTime = Date.now();
export const update = () => {
  const currentTime = Date.now();
  const dt = currentTime - prevTime;
  prevTime = currentTime;

  // check to see that we do indeed have video?

  // run detection
  const detectedMarkers = detectionMan.detect(dt, config.feed_params, config.detection_params)
  // update and draw markers
  updateMarkers(detectedMarkers);
};

const hide = () => {
  document.querySelector('#detection-panel').classList.add('hidden');
};
const show = () => {
  document.querySelector('#detection-panel').classList.remove('hidden');
};

export const getAllMarkers = () => {
  return MARKERS;
}

export const getMarker = (id) => {
  // Maybe have this error if you are looking for an untracked marker
  return MARKERS.find((x) => x.id === id);
}

export const getMarkerPair = (idA, idB) => {
  // throw error here
  return new MarkerPair(MARKERS[idA], MARKERS[idB]);
}

export default {
  init,
  update,
  getMarker,
  getMarkerPair,
  getAllMarkers,
  hide,
  show,
  getVideo: () => (webcamMan.video),
}
