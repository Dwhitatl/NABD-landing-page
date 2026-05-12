var model=null,userImage=null,scaledMesh=null;
var curFrameUrl=null,curFrameLabel='',curFrameTier='';
var curColor='black',curColorLabel='Black';
var colorTints={black:{r:0,g:0,b:0,a:0},tortoise:{r:120,g:55,b:5,a:0.62},gold:{r:200,g:150,b:0,a:0.52},silver:{r:180,g:180,b:180,a:0.48},rosegold:{r:200,g:100,b:110,a:0.50}};

function setStatus(id,color,text){var d=document.getElementById('dot'+id),l=document.getElementById('status'+id);if(d)d.className='dot '+color;if(l)l.textContent=text;}

async function initModel(){
  var prog=document.getElementById('loadProgress');
  try{
    prog.textContent='Setting up WebGL…';
    await tf.setBackend('webgl');
    await tf.ready();
    prog.textContent='Downloading face model…';
    model=await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,{maxFaces:1});
    setStatus('Model','green','Face model ready ✓');
    var ls=document.getElementById('loadingScreen');
    ls.classList.add('fade');
    setTimeout(function(){ls.style.display='none';},600);
  }catch(e){
    console.error('Model error:',e);
    prog.textContent='Model error — '+e.message;
    setStatus('Model','orange','Model error');
    setTimeout(function(){var ls=document.getElementById('loadingScreen');ls.classList.add('fade');setTimeout(function(){ls.style.display='none';},600);},2000);
  }
}

document.getElementById('fileInput').addEventListener('change',function(e){
  var file=e.target.files[0];if(!file)return;
  var reader=new FileReader();
  reader.onload=function(ev){
    var img=new Image();
    img.onload=function(){userImage=img;document.getElementById('uploadZone').style.display='none';document.getElementById('canvasArea').classList.add('visible');detectAndDraw();};
    img.src=ev.target.result;
  };
  reader.readAsDataURL(file);
});

async function detectAndDraw(){
  if(!userImage)return;
  var overlay=document.getElementById('processingOverlay');
  overlay.classList.add('show');
  var canvas=document.getElementById('outputCanvas');
  var ctx=canvas.getContext('2d');
  var maxW=480;
  var scale=Math.min(maxW/userImage.naturalWidth,maxW/userImage.naturalHeight,1);
  canvas.width=Math.round(userImage.naturalWidth*scale);
  canvas.height=Math.round(userImage.naturalHeight*scale);
  ctx.drawImage(userImage,0,0,canvas.width,canvas.height);
  scaledMesh=null;
  if(model){
    try{
      var preds=await model.estimateFaces({input:canvas});
      if(preds&&preds.length>0){scaledMesh=preds[0].scaledMesh;setStatus('Face','green','Face detected ✓');}
      else{setStatus('Face','orange','No face found — using estimate');}
    }catch(e){setStatus('Face','orange','Detection error — using estimate');}
  }else{setStatus('Face','orange','Model not loaded — using estimate');}
  overlay.classList.remove('show');
  if(curFrameUrl)drawFrame(ctx,canvas.width,canvas.height);
}

function drawFrame(ctx,W,H){
  if(!curFrameUrl||!userImage)return;
  var img=new Image();
  img.crossOrigin='anonymous';
  img.onload=function(){
    var fx,fy,fw,fh,angle=0;
    if(scaledMesh&&scaledMesh.length>400){
      var lE=scaledMesh[33],rE=scaledMesh[263];
      var eyeSpan=Math.abs(rE[0]-lE[0]);
      fw=eyeSpan*1.5;
      fh=fw*(img.naturalHeight/img.naturalWidth);
      var eyeCX=(lE[0]+rE[0])/2;
      var eyeCY=(lE[1]+rE[1])/2;
      fx=eyeCX-(fw/2);
      fy=eyeCY-(fh*0.50);
      angle=Math.atan2(rE[1]-lE[1],rE[0]-lE[0])*0.5;
    }else{
      fw=W*0.65;fh=fw*(img.naturalHeight/img.naturalWidth);fx=(W-fw)/2;fy=H*0.30;
    }
    ctx.drawImage(userImage,0,0,W,H);
    ctx.save();
    var cx=fx+fw/2,cy=fy+fh/2;
    ctx.translate(cx,cy);ctx.rotate(angle);ctx.translate(-cx,-cy);
    ctx.drawImage(img,fx,fy,fw,fh);
    var t=colorTints[curColor];
    if(t&&t.a>0){ctx.globalCompositeOperation='multiply';ctx.globalAlpha=t.a;ctx.fillStyle='rgb('+t.r+','+t.g+','+t.b+')';ctx.fillRect(fx,fy,fw,fh);}
    ctx.restore();
    document.getElementById('resultTitle').textContent=curFrameLabel+' · '+curColorLabel;
    document.getElementById('resultSub').textContent=curFrameTier+' frame';
    document.getElementById('resultBanner').classList.add('show');
  };
  img.onerror=function(){setStatus('Frame','orange','Frame failed to load');};
  img.src=curFrameUrl;
}

function selectFrame(el){
  document.querySelectorAll('.frame-btn').forEach(function(b){b.classList.remove('active');});
  el.classList.add('active');
  curFrameUrl=el.dataset.url;curFrameLabel=el.dataset.label;curFrameTier=el.dataset.tier;
  setStatus('Frame','green',curFrameLabel+' ✓');
  if(userImage){var c=document.getElementById('outputCanvas');drawFrame(c.getContext('2d'),c.width,c.height);}
}

function selectSwatch(el){
  document.querySelectorAll('.swatch').forEach(function(s){s.classList.remove('active');});
  el.classList.add('active');
  curColor=el.dataset.color;curColorLabel=el.dataset.label;
  document.getElementById('swatchLabel').textContent=curColorLabel;
  if(userImage&&curFrameUrl){var c=document.getElementById('outputCanvas');drawFrame(c.getContext('2d'),c.width,c.height);}
}

function resetAll(){
  userImage=null;scaledMesh=null;curFrameUrl=null;
  document.querySelectorAll('.frame-btn').forEach(function(b){b.classList.remove('active');});
  document.getElementById('uploadZone').style.display='';
  document.getElementById('canvasArea').classList.remove('visible');
  document.getElementById('resultBanner').classList.remove('show');
  document.getElementById('fileInput').value='';
  setStatus('Face','grey','No photo yet');
  setStatus('Frame','grey','No frame selected');
}

window.addEventListener('load',initModel);