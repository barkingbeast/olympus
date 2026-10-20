import {godArt,bossArt,bossPhase,realmArt,realmName} from './art.js';

// Visual effects only: game rewards and health are always supplied by saved state.
const colors={zeus:'#e9c777',poseidon:'#8acdc4',hades:'#c394da'};
const labels={idle:'At ease',attack:'Divine strike',hit:'Impact',death:'Fallen',revive:'Rise again',victory:'Victory',evolve:'Ascension',transform:'Awakened'};
const durations={idle:0,attack:850,hit:650,death:1200,revive:1100,victory:1300,evolve:1500};
let sequence=0;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const limited=()=>document.body.classList.contains('reduced')||matchMedia('(prefers-reduced-motion: reduce)').matches;
function particles(){return `<div class="battle-sparks" aria-hidden="true">${Array.from({length:16},(_,i)=>`<i style="--sx:${Math.cos(i*Math.PI/8)*100}px;--sy:${Math.sin(i*Math.PI/8)*85}px;--sd:${i%4*35}ms"></i>`).join('')}</div>`}
function animate(actor,kind){if(!actor)return;for(const x of Object.keys(labels))actor.classList.remove('anim-'+x);void actor.offsetWidth;actor.classList.add('anim-'+kind);}
function artStage(god,stage,index,awakened=false){return `<div class="battle-stage realm-${stage}" style="--battle-color:${colors[god]||colors.zeus}">${realmArt(stage)}<div class="battle-floor"></div><div class="motion-actor battle-god">${godArt(god,stage)}</div><div class="battle-beam" aria-hidden="true"></div><div class="motion-actor battle-enemy">${bossArt(index,awakened)}</div><div class="battle-impact" aria-hidden="true">${particles()}</div></div>`}
export function awakenGod(actor){
 if(!actor)return;
 actor.classList.remove('tap-awake');void actor.offsetWidth;actor.classList.add('tap-awake');
 if(limited()){setTimeout(()=>actor.classList.remove('tap-awake'),400);return}
 actor.onanimationend=e=>{if(e.animationName==='god-greeting'){actor.classList.remove('tap-awake');actor.onanimationend=null}};
}
export async function playBattle({god,stage,before,after,damage,combo,defeated,name,showModal,closeModal}){
 if(limited())return;
 const token=++sequence;
 const transforming=bossPhase(before)==='dormant'&&bossPhase(after)==='awakened';
 showModal(`<div class="eyebrow">${combo?'TWO GODS. ONE STRIKE.':'YOUR DAILY STRIKE'}</div><h2>${combo?'Divine combo':'A step. A strike.'}</h2><p class="battle-caption" role="status">${combo?'Your ally’s strength joins yours.':'Your progress has power.'}</p>${artStage(god,stage,after.index,bossPhase(before)==='awakened')}<div class="barlabel"><span>${name}</span><span class="battle-hp">${before.max-before.damage} / ${after.max} HP</span></div><div class="bar battle-health"><span style="width:${100-before.damage/before.max*100}%"></span></div><div class="battle-damage" aria-hidden="true">−${damage}${combo?' · COMBO':''}</div><button class="btn subtle full" data-motion="skip">Skip animation →</button>`);
 const dialog=document.querySelector('#modal'),scene=dialog.querySelector('.battle-stage');
 const active=()=>sequence===token&&dialog.open&&scene.isConnected;
 const skip=()=>{sequence++;if(dialog.open&&scene.isConnected)closeModal()};
 dialog.querySelector('[data-motion="skip"]').onclick=skip;
 animate(scene.querySelector('.battle-god'),'attack');scene.classList.add('striking');
 await wait(300);if(!active())return;
 animate(scene.querySelector('.battle-enemy'),'hit');scene.classList.add('impact');
 dialog.querySelector('.battle-health span').style.width=(100-after.damage/after.max*100)+'%';
 dialog.querySelector('.battle-hp').textContent=`${after.max-after.damage} / ${after.max} HP`;
 dialog.querySelector('.battle-damage').classList.add('visible');
 await wait(570);if(!active())return;
 if(transforming){
  const enemy=scene.querySelector('.battle-enemy');enemy.innerHTML=bossArt(after.index,true);animate(enemy,'transform');
  dialog.querySelector('h2').textContent='The boss awakens.';dialog.querySelector('.battle-caption').textContent='Half its health is gone. A new form rises—keep going together.';
  await wait(1500);if(!active())return;
 }
 if(defeated){
  dialog.querySelector('h2').textContent='A legend falls.';dialog.querySelector('.battle-caption').textContent='The weekly boss is defeated. You did this together.';
  animate(scene.querySelector('.battle-enemy'),'death');scene.classList.add('defeating');
  await wait(1000);if(!active())return;
  animate(scene.querySelector('.battle-god'),'victory');dialog.querySelector('h2').textContent='Olympus remembers.';
  await wait(1050);
 }else{animate(scene.querySelector('.battle-god'),'victory');await wait(600)}
 if(active())closeModal();
}
export function openAnimationStudio({god='zeus',stage=2,index=0,showModal}){
 ++sequence;
 showModal(`<div class="eyebrow">THE HALL OF MOTION</div><h2>Bring your legend to life.</h2><p>Preview every animation. This never changes your progress.</p>${artStage(god,stage,index)}<div class="motion-controls"><span class="tiny">YOUR GOD</span><div class="motion-buttons">${['attack','hit','death','revive','victory','evolve'].map(x=>`<button class="btn" data-motion="god" data-kind="${x}">${x==='death'?'Fall & rise':labels[x]}</button>`).join('')}</div><span class="tiny">WEEKLY BOSS</span><div class="motion-buttons"><button class="btn" data-motion="boss" data-kind="hit">Take a hit</button><button class="btn" data-motion="boss" data-kind="death">Defeat</button><button class="btn" data-motion="boss" data-kind="revive">Return</button><button class="btn" data-motion="boss" data-kind="transform">Transform</button></div><button class="linkbtn" data-motion="realm">Preview next landscape →</button></div><p class="tiny center motion-status" role="status">${limited()?'Reduced motion is on; previews keep movement minimal.':'Tap a move to preview it.'}</p>`);
 const dialog=document.querySelector('#modal'),scene=dialog.querySelector('.battle-stage');
 let previewStage=stage;
 dialog.querySelectorAll('[data-motion]').forEach(button=>button.addEventListener('click',async()=>{
  if(button.dataset.motion==='realm'){previewStage=(previewStage+1)%7;const landscape=scene.querySelector('.realm-art');landscape.outerHTML=realmArt(previewStage);scene.className='battle-stage realm-'+previewStage;dialog.querySelector('.motion-status').textContent=realmName(previewStage)+' · scenery preview only';return}
  const isGod=button.dataset.motion==='god',kind=button.dataset.kind;
  const actor=scene.querySelector(isGod?'.battle-god':'.battle-enemy');
  const current=++sequence;
  scene.classList.remove('striking','impact','defeating');dialog.querySelector('.motion-status').textContent=(isGod?'Your god: ':'Boss: ')+labels[kind];
  if(kind==='transform'){actor.innerHTML=bossArt(index,true);dialog.querySelector('.motion-status').textContent='Boss: Awakened at half health';}
  if(kind==='revive'&&!isGod)actor.innerHTML=bossArt(index);
  animate(actor,kind);
  if(kind==='attack'){scene.classList.add('striking');await wait(300);if(current!==sequence||!scene.isConnected)return;animate(scene.querySelector('.battle-enemy'),'hit');scene.classList.add('impact')}
  if(kind==='death'&&isGod){await wait(durations.death);if(current===sequence&&scene.isConnected){animate(actor,'revive');dialog.querySelector('.motion-status').textContent='Rise again. Your story continues.'}}
 }));
}
