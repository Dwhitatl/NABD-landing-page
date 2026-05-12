var frameImg = new Image();
frameImg.crossOrigin = 'anonymous';
frameImg.src = 'https://paymegpt.com/objects/generated-images/83/1778619918079-ee3e17e7d5ac76de.png';

var curColor = 'black';
var colorFilters = {
  black:    'brightness(0) saturate(100%)',
  tortoise: 'sepia(1) saturate(2) hue-rotate(340deg) brightness(0.6)',
  gold:     'sepia(1) saturate(3) hue-rotate(10deg) brightness(1.1)',
  silver:   'grayscale(1) brightness(1.3)',
  rosegold: 'sepia(0.5) saturate(2) hue-rotate(320deg) brightness(1.1)'
};

var go = false;
var lm = null;

function selectFrame(el) {
  document.querySelectorAll('.frame-btn').forEach(function(b){ b.classList.remove('active'); });
  el.classList.add('active');
  frameImg = new Image();
  frameImg.crossOrigin = 'anonymous';
  frameImg.src = el.dataset.url;
}

function selectSwatch(el) {
  document.querySelectorAll('.swatch').forEach(function(s){ s.classList.remove('active'); });
  el.classList.add('active');
  curColor = el.dataset.color;
  document.getElementById('swatchLabel').textContent = el.dataset.label;
}

function setStatus(msg) {
  document.getElementById('statusBar').textContent = msg;
}

async function startCamera() {
  document.getElementById('startScreen').style.display = 'none';
  setStatus('Starting camera…');

  var vid = document.getElementById('vid');
  var cvs = document.getElementById('overlay');
  var ctx = cvs.getContext('2d');

  // Size canvas to match video container
  var wrap = document.getElementById('cameraWrap');
  cvs.width  = wrap.offsetWidth  || 360;
  cvs.height = wrap.offsetHeight || 480;

  // Init MediaPipe FaceMesh
  var faceMesh = new FaceMesh({locateFile: function(f){
    return 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/' + f;
  }});

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  faceMesh.onResults(function(results) {
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0 && frameImg.complete) {
      var pts = results.multiFaceLandmarks[0];
      var W = cvs.width, H = cvs.height;

      // Key landmarks
      var lEye = pts[33],  rEye = pts[263];
      var lTemple = pts[234], rTemple = pts[454];

      var lx = lEye.x * W,  ly = lEye.y * H;
      var rx = rEye.x * W,  ry = rEye.y * H;
      var ltx = lTemple.x * W, rtx = rTemple.x * W;

      // Frame sizing — temple to temple
      var fw = Math.abs(rtx - ltx) * 1.12;
      var fh = fw * (frameImg.naturalHeight / frameImg.naturalWidth);

      // Center on eye midpoint
      var cx = (lx + rx) / 2;
      var cy = (ly + ry) / 2;

      // Rotation angle
      var angle = Math.atan2(ry - ly, rx - lx);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      // Apply color filter via CSS on offscreen canvas
      if (curColor !== 'black') {
        ctx.filter = colorFilters[curColor];
      }

      ctx.drawImage(frameImg, -fw/2, -fh * 0.45, fw, fh);
      ctx.restore();

      setStatus('Face detected ✓ · ' + (document.querySelector('.frame-btn.active .f-label') || {textContent:''}).textContent);
    } else {
      setStatus('Looking for face…');
    }
  });

  // Start camera
  var camera = new Camera(vid, {
    onFrame: async function() {
      await faceMesh.send({image: vid});
    },
    width: 480,
    height: 640
  });

  camera.start().then(function() {
    setStatus('Camera active · Select a frame →');
  }).catch(function(e) {
    setStatus('Camera error: ' + e.message);
    document.getElementById('startScreen').style.display = 'flex';
  });
}