const pc=document.getElementById('pts');
for(let i=0;i<22;i++){const p=document.createElement('div');p.className='pt';const s=Math.random()*3+1.5;p.style.cssText=`width:${s}px;height:${s}px;left:${Math.random()*100}%;bottom:-8px;animation-duration:${Math.random()*14+9}s;animation-delay:${Math.random()*14}s;`;pc.appendChild(p);}
const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('on');obs.unobserve(e.target);}},{threshold:0.08}));
document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));