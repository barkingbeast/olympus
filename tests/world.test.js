import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sanctuaryProgress} from '../dist/game.js';
import {weeklyRecap,recapSvg} from '../dist/recap.js';
import {godTapArt} from '../dist/art.js';
const today='2026-10-21';
const win=(item,user_id='a',day=today,kind='game')=>({user_id,day,kind,item,payload:{economy:2}});
test('sanctuary unlocks from own completed rewarded games, never pending runs or an ally',()=>{
 const state={me:'a',today,activities:[win('fleece','b'),win('lantern','a',today,'game_run'),win('fleece','a','2026-10-22')]};
 assert.deepEqual(sanctuaryProgress(state),{sheep:0,lantern:false});
 state.activities.push(win('fleece'),win('lantern'));assert.deepEqual(sanctuaryProgress(state),{sheep:3,lantern:true});
 state.activities.push(win('fleece','a','2026-10-20'));assert.equal(sanctuaryProgress(state).sheep,5);
});
test('weekly card shows this weeks shared progress and contains no private fields',()=>{
 const state={me:'a',today,profiles:[{id:'a',name:'PRIVATE NAME'},{id:'b'}],activities:[{user_id:'a',day:today,kind:'checkin',payload:{status:'success'}},{user_id:'b',day:today,kind:'checkin',payload:{status:'success'}},{user_id:'a',day:'2026-10-18',kind:'checkin',payload:{status:'success'}}],notes:[{body:'PRIVATE NOTE'}],duo:{invite:'PRIVATE INVITE'}};
 const recap=weeklyRecap(state,true);assert.equal(recap.week,'2026-10-19');assert.equal(recap.checkins,2);assert.equal(recap.combos,1);assert.equal(recap.damage,200);assert.equal(recap.defeated,false);assert.equal(recap.streak,1);
 const svg=recapSvg(recap);assert.match(svg,/DEMO · SAMPLE PROGRESS/);assert.doesNotMatch(svg,/PRIVATE|masturbation|invite/);assert.match(svg,/OUR WEEK SO FAR/);
 assert.match(recapSvg({...recap,defeated:true,boss:'<script>&'}),/THE WEEKLY VICTORY/);assert.doesNotMatch(recapSvg({...recap,boss:'<script>&'}),/<script>/);
});
test('each god has a distinct signature effect',()=>{
 assert.match(godTapArt('zeus'),/zeus-bolts/);assert.match(godTapArt('poseidon'),/ocean-swell/);assert.match(godTapArt('hades'),/underworld-portal/);
});
