import{FaceLandmarker,FilesetResolver}from'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';

const FRAME='https://paymegpt.com/objects/generated-images/83/1778616234545-136b0c600d7098de.png';
const vid=document.getElementById('vid');
const cvs=document.getElementById('cvs');
const ctx=cvs.getContext('2d');
const st=document.getElementById('status');
const startBtn=document.getElementById('startBtn');
const stopBtn=document.getElementById('stopBtn');

// Preload frame — draw to offscreen canvas to strip white background
const rawImg=new Image();
rawImg.crossOrigin='anonymous';
rawImg.src=FRAME;

let cleanFrame=null;

rawImg.onload=()=>{
  // Create offscreen canvas and remove near-white pixels
  const oc=document.createElement('canvas');
  oc.width=rawImg.naturalWidth;
  oc.height=rawImg.naturalHeight;
  const oc2=oc.getContext('2d');
  oc2.drawImage(rawImg,0,0);
  const id=oc2.getImageData(0,0,oc.width,oc.height);
  const d=id.data;
  for(let i=0;i<d.length;i+=4){
    const r=d[i],g=d[i+1],b=d[i+2];
    // If pixel is near-white (all channels >230), make transparent
    if(r>230&&g>230&&b>230) d[i+3]=0;
  }
  oc2.putImageData(id,0,0);
  cleanFrame=oc;
};

let lm=null,go=false,stream=null;

async function loadModel(){
  st.textContent='Loading model…';
  startBtn.disabled=true;
  try{
    const fs=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
    lm=await FaceLandmarker.createFromOptions(fs,{
      baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',delegate:'GPU'},
      runningMode:'VIDEO',numFaces:1
    });
    st.textContent='Model ready — starting camera…';
    await startCam();
  }catch(e){
    st.textContent='Error: '+e.message;
    startBtn.disabled=false;
  }
}

async function startCam(){
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:480},height:{ideal:360}}});
    vid.srcObject=stream;
    vid.onloadedmetadata=()=>{
      cvs.width=vid.videoWidth;
      cvs.height=vid.videoHeight;
      st.textContent='✓ Live — frames tracking your face';
      stopBtn.style.display='block';
      startBtn.style.display='none';
      go=true;
      requestAnimationFrame(loop);
    };
  }catch(e){
    st.textContent='Camera error: '+e.message+' — close other apps and retry';
    startBtn.disabled=false;
  }
}

function stopCam(){
  go=false;
  if(stream) stream.getTracks().forEach(t=>t.stop());
  stream=null;
  vid.srcObject=null;
  ctx.clearRect(0,0,cvs.width,cvs.height);
  st.textContent='Camera stopped';
  stopBtn.style.display='none';
  startBtn.style.display='block';
  startBtn.disabled=false;
}

function loop(){
  if(!go)return;
  if(vid.readyState>=2&&lm&&cleanFrame){
    const r=lm.detectForVideo(vid,performance.now());
    ctx.clearRect(0,0,cvs.width,cvs.height);
    if(r.faceLandmarks&&r.faceLandmarks.length>0){
      const pts=r.faceLandmarks[0];
      const W=cvs.width,H=cvs.height;
      const lEye=pts[33],rEye=pts[263];
      const lx=lEye.x*W,ly=lEye.y*H;
      const rx=rEye.x*W,ry=rEye.y*H;
      const eyeW=Math.abs(rx-lx);
      const fw=eyeW*0.85;
      const fh=fw*(cleanFrame.height/cleanFrame.width);
      const cx=(lx+rx)/2;
      const cy=(ly+ry)/2;
      const angle=Math.atan2(ry-ly,rx-lx);
      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(angle);
      ctx.drawImage(cleanFrame,-fw/2,-fh*0.45,fw,fh);
      ctx.restore();
    }
  }
  requestAnimationFrame(loop);
}

// Explicit start button — user controls camera
startBtn.addEventListener('click',loadModel);
stopBtn.addEventListener('click',stopCam);

// Release camera on page unload
window.addEventListener('beforeunload',stopCam);
window.addEventListener('pagehide',stopCam);