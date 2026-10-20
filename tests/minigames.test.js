import {test} from 'node:test';
import assert from 'node:assert/strict';
import {insidePolygon,simpleLoop,lanternPaths} from '../dist/minigames.js';
test('fleece fence distinguishes inside sheep, outside fox, open loops and crossings',()=>{
 const loop=[{x:40,y:40},{x:160,y:40},{x:280,y:40},{x:280,y:240},{x:160,y:240},{x:40,y:240},{x:40,y:40}];
 assert.equal(simpleLoop(loop),true);assert.equal(insidePolygon({x:160,y:140},loop),true);assert.equal(insidePolygon({x:310,y:270},loop),false);
 assert.equal(simpleLoop(loop.slice(0,-1)),false);
 assert.equal(simpleLoop([{x:0,y:0},{x:50,y:50},{x:100,y:100},{x:100,y:0},{x:50,y:50},{x:0,y:100},{x:0,y:0}]),false);
});
test('lantern has three distinct six-stone paths, each using adjacent tiles',()=>{
 assert.equal(new Set(lanternPaths.map(x=>x.join(','))).size,3);
 for(const path of lanternPaths){assert.equal(path.length,6);assert.equal(new Set(path).size,6);for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];assert.equal(Math.abs(a%4-b%4)+Math.abs(Math.floor(a/4)-Math.floor(b/4)),1)}}
});
