import {Game,Match,Tactic} from './engine.js';
import {GameAudio} from './audio.js';
import {BUILTIN_TACTICS,loadTactic} from './tactics.js';
const audio=new GameAudio();
const audioButton=document.querySelector<HTMLButtonElement>('#audio-toggle')!;
document.querySelector<HTMLButtonElement>('#create-tactic')!.addEventListener('click',()=>{window.location.href='tactics.html';});
const gameControl=document.querySelector<HTMLButtonElement>('#game-control')!;
async function enableAudio(){try{await audio.enable();audioButton.textContent='🔊 Sound on';if(game&&!paused&&!game.finished)audio.startMusic();}catch(error){console.error(error);audioButton.textContent='Tap to enable sound';}}
audioButton.addEventListener('click',()=>{if(audio.enabled){audio.disable();audioButton.textContent='🔇 Enable sound';}else void enableAudio();});
void enableAudio();
let audioGestureHandled=false;
function unlockAudio(event:Event){
 if(audioGestureHandled||audioButton.contains(event.target as Node))return;
 audioGestureHandled=true;
 window.removeEventListener('pointerdown',unlockAudio);
 window.removeEventListener('keydown',unlockAudio);
 void enableAudio();
}
window.addEventListener('pointerdown',unlockAudio);
window.addEventListener('keydown',unlockAudio);
const canvas=document.querySelector('canvas')!,ctx=canvas.getContext('2d')!;
const image=new Image();image.src='assets/Campo.png';
const playerBase=new Image();playerBase.src='assets/players-base.png';
const shirtMask=new Image();shirtMask.src='assets/players-shirt-mask.png';
const shortsMask=new Image();shortsMask.src='assets/players-shorts-mask.png';
let playerSheets:HTMLCanvasElement[]=[];
let game:Game|null=null,paused=false,waitUntil=0,lastTick=0,goalAnimationUntil=0,goalAnimationStarted=0,kickoffWhistled=false,fulltimeWhistled=false;
const homeName=document.querySelector<HTMLElement>('#home-name')!,awayName=document.querySelector<HTMLElement>('#away-name')!;
const homeScore=document.querySelector<HTMLElement>('#home-score')!,awayScore=document.querySelector<HTMLElement>('#away-score')!,timer=document.querySelector<HTMLElement>('#match-timer')!;
const winnerBanner=document.querySelector<HTMLElement>('#winner-banner')!,winnerName=document.querySelector<HTMLElement>('#winner-name')!,winnerLabel=document.querySelector<HTMLElement>('.winner-label')!,winnerTrophy=document.querySelector<HTMLElement>('.winner-trophy')!;
function updateMatchDisplay(){
 if(!game)return;
 homeScore.textContent=String(game.match.score[0]);awayScore.textContent=String(game.match.score[1]);timer.textContent=game.clock;
 if(game.finished&&winnerBanner.hidden){const winner=game.match.winner();winnerLabel.textContent=winner===null?'MATCH DRAW':'MATCH WINNER';winnerName.textContent=winner===null?'No winner':game.match.tactics[winner].name;winnerTrophy.textContent=winner===null?'':'🏆';winnerBanner.hidden=false;}
 if(game.finished)gameControl.textContent='Start';
}
// Simulation coordinates span x=-160..160 and y=-120..120.
// Map those limits to the actual pitch lines in the 600x400 background.
const FIELD_X_SCALE=1.5, FIELD_Y_SCALE=4/3;
const toCanvas=(x:number,y:number)=>({x:300+x*FIELD_X_SCALE,y:200+y*FIELD_Y_SCALE});
const fromCanvas=(x:number,y:number)=>({x:(x-300)/FIELD_X_SCALE,y:(y-200)/FIELD_Y_SCALE});
const selectA=document.querySelector<HTMLSelectElement>('#a')!,selectB=document.querySelector<HTMLSelectElement>('#b')!;
const tacticMessage=document.querySelector<HTMLElement>('#tactic-message')!;
const tacticFile=document.querySelector<HTMLInputElement>('#tactic-file')!;
const library: {id:string;tactic:Tactic}[]=[];
function showTacticMessage(text:string,error=false){tacticMessage.hidden=false;tacticMessage.textContent=text;tacticMessage.classList.toggle('error',error);}
function clearTacticMessage(){tacticMessage.hidden=true;tacticMessage.textContent='';tacticMessage.classList.remove('error');}
function rememberTactic(id:string,tactic:Tactic){
 library.push({id,tactic});
 for(const select of [selectA,selectB]){const option=document.createElement('option');option.value=id;option.textContent=tactic.name;select.append(option);}
}
function selectedTactic(select:HTMLSelectElement):Tactic{
 const found=library.find(item=>item.id===select.value);
 if(!found)throw new Error('Choose a tactic.');
 return found.tactic;
}
function tintedLayer(mask:HTMLImageElement,color:string):HTMLCanvasElement {
 const layer=document.createElement('canvas');layer.width=mask.naturalWidth;layer.height=mask.naturalHeight;
 const c=layer.getContext('2d')!;c.fillStyle=color;c.fillRect(0,0,layer.width,layer.height);
 c.globalCompositeOperation='destination-in';c.drawImage(mask,0,0);return layer;
}
function rebuildPlayerSheets(){
 if(!game||!playerBase.complete||!playerBase.naturalWidth||!shirtMask.complete||!shortsMask.complete)return;
 const tactics=game.match.tactics;
 playerSheets=tactics.map(t=>{
  const sheet=document.createElement('canvas');sheet.width=playerBase.naturalWidth;sheet.height=playerBase.naturalHeight;
  const c=sheet.getContext('2d')!;c.drawImage(playerBase,0,0);
  c.globalCompositeOperation='multiply';c.drawImage(tintedLayer(shirtMask,t.colors[0]),0,0);c.drawImage(tintedLayer(shortsMask,t.colors[1]),0,0);
  c.globalCompositeOperation='source-over';return sheet;
 });
}
[playerBase,shirtMask,shortsMask].forEach(img=>img.addEventListener('load',()=>{if(game)rebuildPlayerSheets();}));
function reset(){if(!library.length)return;clearTacticMessage();audio.stopMusic();winnerBanner.hidden=true;winnerName.textContent='';goalAnimationUntil=0;goalAnimationStarted=0;kickoffWhistled=false;fulltimeWhistled=false;game=new Game(new Match([selectedTactic(selectA),selectedTactic(selectB)]));rebuildPlayerSheets();homeName.textContent=game.match.tactics[0].name;awayName.textContent=game.match.tactics[1].name;updateMatchDisplay();paused=false;gameControl.textContent='Pause';waitUntil=performance.now()+6000;lastTick=waitUntil;if(audio.enabled)audio.startMusic();}
gameControl.addEventListener('click',()=>{
 if(game&&!game.finished){
  paused=!paused;
  if(paused)audio.stopMusic();else{lastTick=performance.now();audio.startMusic();}
  gameControl.textContent=paused?'Resume':'Pause';
  return;
 }
 reset();
});
document.querySelector('#load-tactic')!.addEventListener('click',()=>tacticFile.click());
tacticFile.addEventListener('change',async()=>{
 const file=tacticFile.files?.[0];
 tacticFile.value='';
 if(!file)return;
 try{
  const tactic=loadTactic(JSON.parse(await file.text()));
  const id=`device:${file.name}:${library.length}`;
  rememberTactic(id,tactic);
  selectA.value=id;
    showTacticMessage(`Loaded ${tactic.name} as the home team. It will be used the next time Start is pressed.`);
 }catch(error){
  console.error(error);
  showTacticMessage(error instanceof SyntaxError?'That file is not valid JSON.':error instanceof Error?error.message:'Could not load that tactic.',true);
 }
});
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();const q=fromCanvas((e.clientX-r.left)*600/r.width,(e.clientY-r.top)*400/r.height);document.querySelector('#coordinates')!.textContent=`${Math.trunc(q.x)}, ${Math.trunc(q.y)}`;});
function drawGoalCelebration(now:number){
 const elapsed=now-goalAnimationStarted;if(elapsed<0||elapsed>=1500)return;
 const progress=elapsed/1500;const fade=progress<0.72?1:(1-progress)/0.28;const ease=1-Math.pow(1-Math.min(1,progress*5),3);const scale=0.72+0.28*ease+Math.sin(progress*Math.PI*8)*0.025*(1-progress);
 ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,fade));ctx.translate(300,200);ctx.scale(scale,scale);
 // Bright radial burst behind the headline.
 ctx.fillStyle='rgba(255,224,76,0.22)';ctx.beginPath();ctx.arc(0,0,112,0,Math.PI*2);ctx.fill();
 for(let i=0;i<18;i++){const a=i*Math.PI/9;const r1=68,r2=i%2===0?126:108;ctx.beginPath();ctx.moveTo(Math.cos(a)*r1,Math.sin(a)*r1);ctx.lineTo(Math.cos(a+0.045)*r2,Math.sin(a+0.045)*r2);ctx.lineTo(Math.cos(a-0.045)*r2,Math.sin(a-0.045)*r2);ctx.closePath();ctx.fillStyle=i%2===0?'rgba(255,232,105,0.88)':'rgba(255,255,255,0.78)';ctx.fill();}
 ctx.font='900 italic 48px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=10;ctx.strokeStyle='#10251a';ctx.strokeText('GOAL!',0,0);ctx.lineWidth=4;ctx.strokeStyle='#ffffff';ctx.strokeText('GOAL!',0,0);ctx.fillStyle='#fff';ctx.fillText('GOAL!',0,0);
 ctx.restore();
}
function drawBall(x:number,y:number){
 const radius=3;
 ctx.save();ctx.translate(x,y);
 ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.clip();
 ctx.beginPath();for(let point=0;point<5;point++){const angle=-Math.PI/2+point*Math.PI*2/5;const px=Math.cos(angle)*0.95,py=Math.sin(angle)*0.95;if(point===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.fillStyle='#111';ctx.fill();
 for(let panel=0;panel<5;panel++){const angle=-Math.PI/2+panel*Math.PI*2/5;ctx.beginPath();ctx.moveTo(Math.cos(angle)*1.15,Math.sin(angle)*1.15);ctx.quadraticCurveTo(Math.cos(angle+0.23)*2.35,Math.sin(angle+0.23)*2.35,Math.cos(angle+0.63)*2.75,Math.sin(angle+0.63)*2.75);ctx.strokeStyle='#111';ctx.lineWidth=0.48;ctx.stroke();}
 ctx.beginPath();ctx.arc(0,0,radius-0.2,0,Math.PI*2);ctx.strokeStyle='#111';ctx.lineWidth=0.55;ctx.stroke();
 ctx.restore();
}
function drawWelcome(now:number){
 ctx.fillStyle='#196c36';ctx.fillRect(0,0,canvas.width,canvas.height);if(image.complete&&image.naturalWidth)ctx.drawImage(image,0,0,canvas.width,canvas.height);
 ctx.fillStyle='rgba(8,22,13,.38)';ctx.fillRect(0,0,canvas.width,canvas.height);
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const cycle=reducedMotion?1600:now%6200,exitStart=3600,exitProgress=reducedMotion?0:Math.max(0,Math.min(1,(cycle-exitStart)/760));
 const exitEase=exitProgress*exitProgress*exitProgress,offset=-exitEase*(canvas.width+260),alpha=1-exitProgress;
 const easeOutBack=(value:number)=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(value-1,3)+c1*Math.pow(value-1,2);};
 const words=[
  {text:'WELCOME',start:120,duration:520,y:151,font:'900 25px system-ui',color:'#f4f4e8',size:25},
  {text:'TO THE',start:455,duration:540,y:193,font:'800 27px system-ui',color:'#ffdf77',size:27},
  {text:'PITCH',start:830,duration:650,y:239,font:'900 italic 60px system-ui',color:'#fff',size:60}
 ];
 ctx.save();ctx.globalAlpha=alpha;
 if(!reducedMotion&&cycle>=120&&cycle<exitStart){
  const exitFade=Math.max(0,Math.min(1,(cycle-(exitStart-180))/180));ctx.globalAlpha=alpha*(1-exitFade*.55);
  for(let streak=0;streak<8;streak++){const y=130+streak*19;ctx.beginPath();ctx.moveTo(370+streak%3*22+offset,y);ctx.lineTo(520+streak%3*22+offset,y);ctx.strokeStyle=streak%2===0?'rgba(255,223,119,.72)':'rgba(255,255,255,.35)';ctx.lineWidth=streak%2===0?3:1.5;ctx.stroke();}
 }
 if(!reducedMotion&&exitProgress>0){ctx.save();ctx.globalAlpha=alpha*.72;for(let streak=0;streak<10;streak++){const y=126+streak*17;ctx.beginPath();ctx.moveTo(370+streak%3*20+offset,y);ctx.lineTo(545+streak%3*20+offset,y);ctx.strokeStyle=streak%2===0?'rgba(255,223,119,.82)':'rgba(255,255,255,.42)';ctx.lineWidth=streak%2===0?3:1.5;ctx.stroke();}ctx.restore();}
 words.forEach((word,index)=>{
  const local=reducedMotion?1:Math.max(0,Math.min(1,(cycle-word.start)/word.duration));if(local===0&&cycle<word.start)return;
  const eased=reducedMotion?1:easeOutBack(local),startX=canvas.width+260,targetX=canvas.width/2;
  const x=startX+(targetX-startX)*eased+offset,y=word.y+offset*0.018;
  const impact=!reducedMotion&&index===2?Math.exp(-Math.pow((cycle-(word.start+word.duration*.78))/145,2)):0;
  const scale=reducedMotion?1:(index===2?.82+.18*eased+impact*.34+.035*Math.sin(cycle/28)*impact:.92+.08*eased);
  if(!reducedMotion&&local<1){ctx.save();ctx.globalAlpha*=Math.max(0,1-local)*.65;ctx.font=word.font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=word.color;ctx.fillText(word.text,x+36, y);ctx.restore();}
  if(impact>.015){
   ctx.save();ctx.translate(x,y);ctx.globalAlpha*=impact;
   ctx.beginPath();ctx.arc(0,0,24+(1-impact)*104,0,Math.PI*2);ctx.strokeStyle='rgba(255,231,111,.92)';ctx.lineWidth=5*(1-impact)+1;ctx.stroke();
   ctx.fillStyle=`rgba(255,224,76,${impact*.2})`;ctx.beginPath();ctx.arc(0,0,62,0,Math.PI*2);ctx.fill();
   for(let ray=0;ray<26;ray++){const angle=ray*Math.PI/13,inner=54,outer=108+impact*48;ctx.beginPath();ctx.moveTo(Math.cos(angle)*inner,Math.sin(angle)*inner);ctx.lineTo(Math.cos(angle)*outer,Math.sin(angle)*outer);ctx.strokeStyle=ray%2===0?'rgba(255,232,105,.96)':'rgba(255,255,255,.88)';ctx.lineWidth=ray%2===0?4:2;ctx.stroke();}
   ctx.restore();
  }
  ctx.save();ctx.translate(x,y);ctx.rotate(!reducedMotion?(1-local)*-.08:0);ctx.scale(scale,scale);ctx.font=word.font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=word.size>40?11:7;ctx.strokeStyle='#10251a';ctx.strokeText(word.text,0,0);ctx.lineWidth=word.size>40?4:2.5;ctx.strokeStyle='#fff';ctx.strokeText(word.text,0,0);ctx.fillStyle=word.color;ctx.shadowColor=index===2?'rgba(255,205,60,.65)':'transparent';ctx.shadowBlur=impact*22;ctx.fillText(word.text,0,0);ctx.restore();
 });
 if(cycle>=120&&cycle<exitStart){
  const ruleProgress=reducedMotion?1:Math.max(0,Math.min(1,(cycle-950)/500));ctx.globalAlpha=alpha*ruleProgress;ctx.fillStyle='#ffdf77';ctx.fillRect(canvas.width/2-112+offset,278,224*ruleProgress,3);
  ctx.fillStyle='rgba(255,255,255,.72)';ctx.font='700 9px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('VIRTUAL FOOTBALL TOURNAMENT',canvas.width/2+offset,299);
 }
 ctx.restore();
}
function draw(){if(!game)return;const current=game;ctx.fillStyle='#196c36';ctx.fillRect(0,0,600,400);if(image.complete&&image.naturalWidth)ctx.drawImage(image,0,0,canvas.width,canvas.height);
 current.match.teams.forEach((players,t)=>players.forEach(p=>{
  const screen=toCanvas(p.x,p.y),x=Math.trunc(screen.x),y=Math.trunc(screen.y),colors=current.match.tactics[t].colors;
  const dx=p.targetX-p.x,dy=p.targetY-p.y;
  const moving=Math.abs(dx)+Math.abs(dy)>1;
  const direction=moving?(Math.round((Math.atan2(dy,dx)+Math.PI*2)%(Math.PI*2)/(Math.PI/4))+2)%8:4;
  const pose=moving?Math.floor(current.ticks/4)%5:0;
  if(playerSheets[t])ctx.drawImage(playerSheets[t],direction*64,pose*64,64,64,x-14,y-14,28,28);
  else {ctx.fillStyle=colors[0];ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle=colors[2];ctx.font='bold 8px Arial';ctx.textAlign='center';ctx.fillText(String(p.number),x,y+12);
 }));
 const b=current.match.ball,ballScreen=toCanvas(b.x,b.y);drawBall(Math.trunc(ballScreen.x),Math.trunc(ballScreen.y));if(goalAnimationUntil>performance.now())drawGoalCelebration(performance.now());
 document.querySelector('#status')!.textContent=current.finished?'Match finished':paused?'Paused':performance.now()<waitUntil?'Kickoff in a moment…':'Match in progress';
}
function frame(now:number){const current=game;if(!current){drawWelcome(now);requestAnimationFrame(frame);return;}if(!paused&&now>=waitUntil){if(!kickoffWhistled){kickoffWhistled=true;audio.effect('whistle_start');}const speed=Number(document.querySelector<HTMLSelectElement>('#speed')!.value);let count=0;while(now-lastTick>=100/speed&&count++<100){const previousScore=current.match.score[0]+current.match.score[1],previousKicks=current.match.ball.kicks;current.tick();if(current.match.ball.kicks>previousKicks)audio.effect('kick');const currentScore=current.match.score[0]+current.match.score[1];if(currentScore>previousScore){audio.effect('goal');if(speed===1||speed===5){goalAnimationStarted=now;goalAnimationUntil=now+1500;}}if(current.finished&&!fulltimeWhistled){fulltimeWhistled=true;audio.stopMusic();audio.effect('whistle_end');}lastTick+=100/speed;}}updateMatchDisplay();draw();requestAnimationFrame(frame);}
async function loadBuiltInTactics(){
 const loaded:{id:string;tactic:Tactic}[]=[];
 for(const url of BUILTIN_TACTICS){
  const response=await fetch(url);
  if(!response.ok)throw new Error(`Missing ${url}`);
  loaded.push({id:url,tactic:loadTactic(await response.json())});
 }
 for(const item of loaded)rememberTactic(item.id,item.tactic);
 try{
  const saved=JSON.parse(localStorage.getItem('football-custom-tactics')??'[]') as {id:string;definition:unknown}[];
  for(const item of saved)if(typeof item.id==='string')rememberTactic(`saved:${item.id}`,loadTactic(item.definition));
 }catch(error){console.warn('Could not load saved tactics.',error);}
 selectB.value=BUILTIN_TACTICS[1];
}
loadBuiltInTactics().then(()=>{document.querySelector<HTMLElement>('#status')!.textContent='Ready to start';requestAnimationFrame(frame);}).catch(error=>{console.error(error);showTacticMessage('Could not load the built-in tactics.',true);});
