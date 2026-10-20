// Small SVG games. Rewards are claimed through the authenticated game API.
export const gameList=[
 {id:'boulder',name:'Boulder Roll',icon:'◉',desc:'Hold to push. Let go when the mountain glows.',color:'#e7bd77'},
 {id:'lantern',name:'Hades’ Lantern',icon:'✦',desc:'Remember the light. Retrace its hidden path.',color:'#c7a0e7'},
 {id:'fleece',name:'Golden Fleece',icon:'☁',desc:'Draw a loop around the flock. Leave the fox outside.',color:'#b9d4a0'}
];
export function insidePolygon(point,polygon){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
 const a=polygon[i],b=polygon[j];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
}return inside}
export function simpleLoop(points){
 if(points.length<4||Math.hypot(points[0].x-points.at(-1).x,points[0].y-points.at(-1).y)>45)return false;
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 for(let i=0;i<points.length-1;i++)for(let j=i+2;j<points.length-1;j++){
  if(i===0&&j===points.length-2)continue;
  const a=points[i],b=points[i+1],c=points[j],d=points[j+1];
  const overlap=Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x))<=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x))&&Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y))<=Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y));
  if(overlap&&cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0)return false;
 }return true;
}
export const lanternPaths=[ [12,8,9,5,6,2], [15,11,10,6,5,1], [12,13,9,10,6,7] ];
let current;
export function stopMiniGame(){if(current){current.abort();current=null}}
const motion=()=>!document.body.classList.contains('reduced')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
const stars=()=>Array.from({length:16},(_,i)=>`<circle class="game-star" cx="${(i*67+17)%360}" cy="${(i*39+15)%210}" r="${i%3?1:2}" style="--delay:${i%5*.4}s"/>`).join('');
const mountain=`<path d="M0 240 85 100 145 182 226 62 360 231V340H0z" fill="#39463a"/><path d="m226 62-33 68 34-15 25 14z" fill="#95a091" opacity=".25"/><path d="M0 285 114 210 196 260 290 175 360 249V360H0z" fill="#26382f"/>`;
export function gameCover(id){
 const g=gameList.find(x=>x.id===id);return `<svg class="game-cover" viewBox="0 0 360 130" aria-hidden="true"><path d="M0 120 95 45 155 91 245 18 360 110v30H0z" fill="${g.color}" opacity=".09"/><circle class="cover-orb" cx="284" cy="36" r="22" fill="${g.color}" opacity=".1"/>${id==='boulder'?'<path d="m90 122 180-80" stroke="#ab9267" stroke-width="3"/><circle class="cover-stone" cx="175" cy="66" r="27" fill="#727960" stroke="#e7bd77"/><path d="m165 47 10 12-9 16 19 5" stroke="#e7bd77" fill="none"/>':id==='lantern'?'<path d="M146 100h65l-7-47h-51z" fill="#382a48" stroke="#c7a0e7"/><path d="M162 51V39a17 17 0 0 1 34 0v12" fill="none" stroke="#c7a0e7"/><circle class="lantern-glow" cx="179" cy="77" r="30" fill="#c7a0e7" opacity=".16"/><path d="m179 57-8 22 9 11 8-12z" fill="#e1baff"/>':`<g class="cover-flock">${[130,185,231].map((x,i)=>sheep(x,73+i%2*13,i)).join('')}</g>`}</svg>`;
}
function sheep(x,y,i){return `<g class="sheep" data-sheep="${i}" transform="translate(${x} ${y})"><path d="m-12 10-1 8m17-8 1 8" stroke="#c0ad78" stroke-width="3"/><ellipse rx="20" ry="14" fill="#e8d99e"/><circle cx="-10" cy="-5" r="9" fill="#f4e9be"/><circle cx="2" cy="-8" r="10" fill="#f4e9be"/><ellipse cx="19" cy="1" rx="9" ry="10" fill="#867a5b"/><path d="m20-7 6-4" stroke="#867a5b" stroke-width="4"/><circle cx="22" cy="-1" r="1.5" fill="#17291f"/></g>`}
export function openMiniGame({id,showModal,onStart,onClaim,rewarded=false,capped=false}){
 stopMiniGame();const game=gameList.find(g=>g.id===id);if(!game)return;
 showModal(`<div class="eyebrow">THE OLYMPUS ARCADE</div><h2>${game.name}</h2><p>${game.desc}</p><div class="mini-game" style="--game-color:${game.color}"><div class="game-intro">${gameCover(id)}<span class="game-round-tag">A LITTLE ADVENTURE · 20–45 SECONDS</span><button class="btn primary full" data-game-start>Play ${game.name} →</button><p class="tiny">${rewarded?'Already rewarded today. Play for fun.':capped?'Today’s reward cap is reached. Play for fun.':'+5 XP · +2 coins on completion. Two rewarded games daily.'}</p></div></div><p class="game-help tiny">No streaks to maintain here. Your daily check-in is the main quest.</p>`);
 const dialog=document.querySelector('#modal'),root=dialog.querySelector('.mini-game'),controller=new AbortController();current=controller;const signal=controller.signal;
 const listen=(el,event,fn)=>el.addEventListener(event,fn,{signal});
 let raf=0,elapsed=0,finished=false,session=null,last=0;
 signal.addEventListener('abort',()=>cancelAnimationFrame(raf),{once:true});
 listen(dialog,'close',()=>controller.abort());
 const status=t=>{const el=root.querySelector('.game-status');if(el)el.textContent=t};
 function scene(body,controls=''){root.innerHTML=`<div class="game-hud"><span data-game-stage>GET READY</span><span data-game-clock>0s</span></div>${body}<p class="game-status" role="status"></p>${controls}`}
 function loop(tick){const frame=time=>{if(signal.aborted||finished)return;const dt=last?Math.min((time-last)/1000,.05):0;last=time;if(!document.hidden){elapsed+=dt;tick(dt,elapsed);const clock=root.querySelector('[data-game-clock]');if(clock)clock.textContent=Math.floor(elapsed)+'s'}raf=requestAnimationFrame(frame)};raf=requestAnimationFrame(frame)}
 function finish(){
  if(finished||signal.aborted)return;finished=true;cancelAnimationFrame(raf);root.classList.add('game-won');
  root.insertAdjacentHTML('beforeend',`<div class="game-result"><div class="win-laurel">✧</div><div class="eyebrow">A LITTLE VICTORY</div><h3>${id==='boulder'?'Summit reached.':id==='lantern'?'You found your way.':'The flock is safe.'}</h3><p>${rewarded||capped?'Beautifully done. This round was just for fun.':'Your adventure is complete. Claim your reward.'}</p>${!rewarded&&!capped?'<button class="btn primary full" data-game-claim>Claim +5 XP · +2 coins</button>':''}<button class="btn subtle full" data-game-again>Play again →</button><p class="tiny game-claim-status" role="status"></p></div>`);
  const claim=root.querySelector('[data-game-claim]');if(claim)listen(claim,'click',async()=>{claim.disabled=true;claim.textContent='Saving your reward…';try{const reward=await onClaim(id,session);if(signal.aborted)return;rewarded=true;claim.textContent=reward.awarded?'✓ +5 XP · +2 coins saved':'✓ Reward already claimed or daily cap reached';root.querySelector('.game-claim-status').textContent='Your progress is saved.'}catch(e){if(signal.aborted)return;claim.disabled=false;claim.textContent='Retry saving reward';root.querySelector('.game-claim-status').textContent=e.message}});
  listen(root.querySelector('[data-game-again]'),'click',()=>openMiniGame({id,showModal,onStart,onClaim,rewarded,capped}));
 }
 listen(root.querySelector('[data-game-start]'),'click',async e=>{
  const b=e.currentTarget;b.disabled=true;b.textContent='Opening the realm…';
  try{if(!rewarded&&!capped)session=await onStart(id);if(signal.aborted)return;
   if(id==='boulder')boulder();else if(id==='lantern')lantern();else fleece();
  }catch(error){if(!signal.aborted){b.disabled=false;b.textContent='Try again';root.querySelector('.tiny').textContent=error.message}}
 });
 function boulder(){
  scene(`<svg class="game-scene" viewBox="0 0 360 340" aria-label="Boulder on a mountain slope"><g fill="#dfc78d">${stars()}</g>${mountain}<path d="M25 303 325 108" stroke="#877d56" stroke-width="10" stroke-linecap="round"/><path d="M25 300 325 105" stroke="#bdad7c" stroke-width="2"/><path d="M318 106V64m0 0 22 11-22 9" stroke="#e7bd77" fill="#e7bd7733"/><g class="rolling-stone"><circle r="27" fill="#68745c" stroke="#c3ba8c" stroke-width="2"/><path class="stone-crack" d="m-12-20 13 14-8 12 13 5-1 12m-4-29 15-8" fill="none" stroke="#cbb778" stroke-width="2"/></g><g class="boulder-dust" fill="#e7bd77"><circle r="3"/><circle cx="-10" cy="9" r="2"/><circle cx="-18" cy="3" r="2"/></g></svg><div class="bar game-progress"><span style="width:0%"></span></div>`,`<button class="btn primary full push-button" data-push>Hold to push ↑</button>`);
  const stone=root.querySelector('.rolling-stone'),dust=root.querySelector('.boulder-dust'),button=root.querySelector('[data-push]');let progress=0,holding=false;
  const hold=e=>{e.preventDefault();holding=true;if(e.pointerId!==undefined)button.setPointerCapture(e.pointerId)};const release=()=>holding=false;
  listen(button,'pointerdown',hold);for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(button,event,release);
  listen(button,'keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();holding=true}});listen(button,'keyup',release);listen(window,'blur',release);listen(document,'visibilitychange',release);
  loop((dt,t)=>{const danger=t%4.8>3.1;progress=Math.max(0,Math.min(100,progress+(holding?(danger?-14:7.8):0)*dt));
   const x=42+progress*2.7,y=262-progress*1.75;stone.setAttribute('transform',`translate(${x} ${y}) rotate(${progress*9})`);dust.setAttribute('transform',`translate(${x-25} ${y+20})`);dust.style.opacity=holding&&!danger&&motion()?'.6':'0';
   root.classList.toggle('mountain-danger',danger);button.textContent=danger?'Release · the mountain is cracking!':'Hold to push ↑';button.classList.toggle('danger',danger);
   root.querySelector('.game-progress span').style.width=progress+'%';root.querySelector('[data-game-stage]').textContent=Math.floor(progress)+'% TO THE SUMMIT';status(danger?'Let go. Wait for the golden light to return.':'Steady hands. Hold the button to climb.');if(progress>=100&&t>=10)finish();
  });
 }
 function lantern(){
  scene(`<svg class="lantern-sky" viewBox="0 0 360 90" aria-hidden="true"><g fill="#c7a0e7">${stars()}</g><circle class="lantern-glow" cx="180" cy="45" r="34" fill="#c7a0e7" opacity=".12"/><path d="m179 18-10 29 12 16 10-17z" fill="#dfb9ff"/><path d="M0 85q90-30 180-6t180-4" stroke="#c7a0e7" opacity=".15"/></svg><div class="lantern-grid">${Array.from({length:16},(_,i)=>`<button class="lantern-tile" data-tile="${i}" aria-label="Stone ${i+1}"><span>✦</span><small></small></button>`).join('')}</div>`,`<button class="btn subtle full" data-show-path>Show the path again</button>`);
  let round=0,reveal=0,step=0,showing=true,pause=0,waiting=false;const tiles=[...root.querySelectorAll('[data-tile]')];
  const show=()=>{showing=true;reveal=0;step=0;pause=0;waiting=false;tiles.forEach(el=>{el.classList.remove('lit','chosen');el.querySelector('small').textContent=''});status('Watch the lantern cross the stones.')};show();
  listen(root.querySelector('[data-show-path]'),'click',()=>{if(!waiting)show()});
  for(const tile of tiles)listen(tile,'click',()=>{
   if(showing||waiting||finished)return;const path=lanternPaths[round];if(Number(tile.dataset.tile)!==path[step]){status('The mist shifted. Watch once more.');show();return}
   tile.classList.add('chosen');tile.querySelector('small').textContent=String(step+1);step++;
   if(step===path.length){waiting=true;pause=0;status(round===2?'The way is clear. Your lantern shines.':'A path remembered. One step deeper…')}
  });
  loop((dt,t)=>{root.querySelector('[data-game-stage]').textContent=`PATH ${round+1} / 3`;
   if(waiting){pause+=dt;if(pause>1){if(round===2){if(t>=10)finish()}else{round++;show()}}return}
   if(showing){reveal+=dt;tiles.forEach(el=>el.classList.remove('lit'));const i=Math.floor(reveal/.65);if(i<6){tiles[lanternPaths[round][i]].classList.add('lit');tiles[lanternPaths[round][i]].querySelector('small').textContent=String(i+1)}else{showing=false;tiles.forEach(el=>el.querySelector('small').textContent='');status('Your turn. Tap the six stones in order.')}}
  });
 }
 function fleece(){
  scene(`<svg class="game-scene fleece-field" viewBox="0 0 360 340" aria-label="Draw a fence around five sheep, keeping the fox outside"><g fill="#b9d4a0">${stars()}</g><path d="M0 75q120-35 230 6t130-3v262H0z" fill="#284b38"/><path d="M0 255q160-50 360-20v105H0z" fill="#33523a"/>${Array.from({length:12},(_,i)=>`<path d="m${(i*59+18)%350} ${110+i%4*56} 3-7 3 7" stroke="#96af722b"/>`).join('')}<g class="flock">${Array.from({length:5},(_,i)=>sheep(115+i%3*61,145+Math.floor(i/3)*68,i)).join('')}</g><g class="fleece-fox" transform="translate(310 270)"><path d="m-17 8-17-15 5 22 25 3 16-15-5-18-7 12-13-7z" fill="#c98a58"/><path d="m-9 8 10 7 8-11" fill="#ead5ab"/><circle cx="5" cy="-1" r="2" fill="#28372a"/></g><path class="fence-line" fill="none" stroke="#edce7e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle class="fence-start" r="10" fill="none" stroke="#edce7e" stroke-dasharray="3 3" opacity="0"/></svg>`,`<button class="btn subtle full" data-clear-fence>Clear fence</button>`);
  const field=root.querySelector('.fleece-field'),line=root.querySelector('.fence-line'),start=root.querySelector('.fence-start'),sheepEls=[...root.querySelectorAll('[data-sheep]')];let points=[],posts=[],drawing=false,round=0,settling=0,success=false;
  let flock=[];const reset=()=>{flock=Array.from({length:5},(_,i)=>({x:112+i%3*62,y:137+Math.floor(i/3)*72,phase:i*1.6+round}));points=[];posts=[];drawing=false;success=false;settling=0;line.setAttribute('d','');start.setAttribute('opacity','0');status('Draw a loop, or tap fence posts and return to the first. Keep the fox out.');};reset();
  function point(e){const r=field.getBoundingClientRect();return{x:(e.clientX-r.left)*360/r.width,y:(e.clientY-r.top)*340/r.height}}
  const clear=()=>{posts=[];points=[];line.setAttribute('d','');start.setAttribute('opacity','0')};listen(root.querySelector('[data-clear-fence]'),'click',clear);
  listen(field,'pointerdown',e=>{if(success)return;e.preventDefault();drawing=true;points=[point(e)];field.setPointerCapture(e.pointerId);start.setAttribute('cx',points[0].x);start.setAttribute('cy',points[0].y);start.setAttribute('opacity','1');line.classList.remove('fence-failed')});
  listen(field,'pointermove',e=>{if(!drawing||success)return;const p=point(e);if(Math.hypot(p.x-points.at(-1).x,p.y-points.at(-1).y)<5||points.length>=300)return;posts=[];points.push(p);line.setAttribute('d',points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '))});
  listen(field,'pointerup',()=>{if(!drawing)return;drawing=false;if(points.length===1){const p=points[0];if(posts.length>=3&&Math.hypot(p.x-posts[0].x,p.y-posts[0].y)<35){points=[...posts,posts[0]]}else{posts.push(p);start.setAttribute('cx',posts[0].x);start.setAttribute('cy',posts[0].y);line.setAttribute('d',posts.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' '));status('Add fence posts. Tap the first post to close your loop.');return}}posts=[];const valid=simpleLoop(points)&&flock.every(p=>insidePolygon(p,points))&&!insidePolygon({x:310,y:270},points);if(valid){success=true;line.setAttribute('d',line.getAttribute('d')+' Z');start.setAttribute('opacity','0');status('A golden fence. A happy flock.');field.classList.add('flock-safe')}else{line.classList.add('fence-failed');status('Try a closed loop around every sheep, with the fox outside.')}});
  listen(field,'pointercancel',()=>{drawing=false;clear()});
  loop((dt,t)=>{root.querySelector('[data-game-stage]').textContent=`FLOCK ${round+1} / 3`;if(success){settling+=dt;if(settling>1.2){if(round===2){if(t>=10)finish()}else{round++;field.classList.remove('flock-safe');reset()}}return}
   if(!drawing)for(let i=0;i<flock.length;i++){flock[i].x=112+i%3*62+Math.sin(t*.6+flock[i].phase)*(motion()?9:0);flock[i].y=137+Math.floor(i/3)*72+Math.cos(t*.7+flock[i].phase)*(motion()?7:0)}
   flock.forEach((p,i)=>sheepEls[i].setAttribute('transform',`translate(${p.x} ${p.y})`));
  });
 }
}
