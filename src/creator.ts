import {Formation} from './engine.js';
import {BUILTIN_TACTICS,parseTacticDefinition,TacticDefinition,TacticStep} from './tactics.js';

const formation:Formation=[[-145,0,7],[-105,-70,6],[-115,-25,7],[-115,25,7],[-105,70,6],[-45,-55,5],[-35,0,6],[-45,55,5],[65,-50,5],[80,0,6],[65,50,5]];
let colors:[string,string,string]=['#e8d84a','#237d58','#ffffff'];
let steps:TacticStep[]=[{op:'formation'},{op:'chase'},{op:'keeper'}];
let selectedPlayer=0;
const nameInput=document.querySelector<HTMLInputElement>('#tactic-name')!;
const tacticPresetSelect=document.querySelector<HTMLSelectElement>('#tactic-template')!;
const loadTemplateButton=document.querySelector<HTMLButtonElement>('#load-template')!;
const colorInputs=[document.querySelector<HTMLInputElement>('#shirt-color')!,document.querySelector<HTMLInputElement>('#shorts-color')!,document.querySelector<HTMLInputElement>('#number-color')!];
const presetSelect=document.querySelector<HTMLSelectElement>('#formation-preset')!;
const canvas=document.querySelector<HTMLCanvasElement>('#formation-pitch')!;
const context=canvas.getContext('2d')!;
const playerList=document.querySelector<HTMLElement>('#player-list')!;
const xInput=document.querySelector<HTMLInputElement>('#player-x')!,yInput=document.querySelector<HTMLInputElement>('#player-y')!,strengthInput=document.querySelector<HTMLInputElement>('#player-strength')!;
const stepList=document.querySelector<HTMLElement>('#step-list')!;
const preview=document.querySelector<HTMLTextAreaElement>('#json-preview')!;
const status=document.querySelector<HTMLElement>('#save-status')!;
const pitch={left:27,top:22,width:666,height:406};
const presets:Record<string,[number,number,number]>={'4-3-3':[4,3,3],'4-4-2':[4,4,2],'3-5-2':[3,5,2],'5-3-2':[5,3,2]};
const stepLabels:Record<TacticStep['op'],string>={formation:'Return to formation',chase:'Chase the ball',keeper:'Goalkeeper position',defend:'Mark opponents',shoot:'Shoot',pass:'Pass','pass-or-shoot':'Pass or shoot','kick-space-or-shoot':'Kick into space or shoot'};

function pitchPoint(x:number,y:number){return {x:pitch.left+(x+160)/320*pitch.width,y:pitch.top+(y+120)/240*pitch.height};}
function drawPitch(){
 context.clearRect(0,0,canvas.width,canvas.height);context.fillStyle='#287444';context.fillRect(0,0,canvas.width,canvas.height);
 context.strokeStyle='#b8d69b';context.lineWidth=2;context.strokeRect(pitch.left,pitch.top,pitch.width,pitch.height);
 context.beginPath();context.moveTo(pitch.left+pitch.width/2,pitch.top);context.lineTo(pitch.left+pitch.width/2,pitch.top+pitch.height);context.stroke();
 context.beginPath();context.ellipse(pitch.left+pitch.width/2,pitch.top+pitch.height/2,57,57,0,0,Math.PI*2);context.stroke();
 context.strokeRect(pitch.left,pitch.top+pitch.height*.28,67,pitch.height*.44);context.strokeRect(pitch.left+pitch.width-67,pitch.top+pitch.height*.28,67,pitch.height*.44);
 formation.forEach(([x,y],index)=>{const p=pitchPoint(x,y);context.beginPath();context.arc(p.x,p.y,index===selectedPlayer?17:14,0,Math.PI*2);context.fillStyle=index===selectedPlayer?'#f1b84a':colors[0];context.fill();context.lineWidth=2;context.strokeStyle='#102017';context.stroke();context.fillStyle=colors[2];context.font='700 12px DM Sans, sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillText(String(index+1),p.x,p.y);});
}
function renderPlayers(){
 playerList.replaceChildren();
 formation.forEach((_,index)=>{const button=document.createElement('button');button.type='button';button.className='player-chip';button.textContent=index===0?'GK':'P'+(index+1);button.setAttribute('aria-label',index===0?'Select goalkeeper':`Select player ${index+1}`);button.setAttribute('aria-pressed',String(index===selectedPlayer));button.addEventListener('click',()=>selectPlayer(index));playerList.append(button);});
 xInput.value=String(formation[selectedPlayer][0]);yInput.value=String(formation[selectedPlayer][1]);strengthInput.value=String(formation[selectedPlayer][2]);drawPitch();
}
function selectPlayer(index:number){selectedPlayer=index;renderPlayers();}
function updatePlayer(){formation[selectedPlayer]=[Math.max(-160,Math.min(160,Number(xInput.value)||0)),Math.max(-120,Math.min(120,Number(yInput.value)||0)),Math.max(1,Math.min(10,Number(strengthInput.value)||1))];xInput.value=String(formation[selectedPlayer][0]);yInput.value=String(formation[selectedPlayer][1]);strengthInput.value=String(formation[selectedPlayer][2]);drawPitch();updatePreview();}
function arrangeFormation(value:string){
 const counts=presets[value];if(!counts)return;
 formation[0]=[-145,0,7];let player=1;
 counts.forEach((count,line)=>{const x=[-105,-35,65][line];for(let row=0;row<count;row++){const y=(row-(count-1)/2)*Math.min(42,150/count);formation[player++]=[x,y,6];}});
 presetSelect.value=value;renderPlayers();updatePreview();
}
function definition():TacticDefinition{return {name:nameInput.value.trim(),colors:[colors[0],colors[1],colors[2]],formation:formation.map(row=>[...row] as [number,number,number]),steps:steps.map(step=>({...step}))};}
function updatePreview(){
 const value=definition();preview.value=JSON.stringify(value,null,2);
 try{parseTacticDefinition(value);status.textContent='Ready to save or download.';status.classList.remove('error');}
 catch(error){status.textContent=error instanceof Error?error.message:'Check the tactic details.';status.classList.add('error');}
}
function makeStep(op:TacticStep['op']):TacticStep{
 switch(op){case'formation':case'chase':case'keeper':case'defend':return {op};case'shoot':return {op,player:'all',deviation:0};case'pass':return {op,from:1,to:2};case'pass-or-shoot':return {op,whenXBelow:80,deviation:0};case'kick-space-or-shoot':return {op,samples:50,whenXAbove:50,deviation:15};}
}
function numberField(label:string,key:string,value:number,min=-999,max=999){
 const wrapper=document.createElement('label');wrapper.textContent=label;const input=document.createElement('input');input.type='number';input.step='1';input.min=String(min);input.max=String(max);input.value=String(value);input.dataset.key=key;wrapper.append(input);return wrapper;
}
function playerField(label:string,key:string,value:number|'all'){
 const wrapper=document.createElement('label');wrapper.textContent=label;const select=document.createElement('select');select.dataset.key=key;
 if(key==='player'){const all=document.createElement('option');all.value='all';all.textContent='All players';select.append(all);}
 for(let index=0;index<11;index++){const option=document.createElement('option');option.value=String(index);option.textContent=`${index+1}${index===0?' (GK)':''}`;select.append(option);}
 select.value=String(value);wrapper.append(select);return wrapper;
}
function renderSteps(){
 stepList.replaceChildren();
 steps.forEach((step,index)=>{
  const row=document.createElement('article');row.className='step-row';row.dataset.index=String(index);
  const top=document.createElement('div');top.className='step-top';const number=document.createElement('span');number.className='step-number';number.textContent=String(index+1).padStart(2,'0');
  const op=document.createElement('select');op.className='step-op';op.setAttribute('aria-label',`Step ${index+1} action`);
  (Object.keys(stepLabels) as TacticStep['op'][]).forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=stepLabels[value];op.append(option);});op.value=step.op;op.addEventListener('change',()=>{steps[index]=makeStep(op.value as TacticStep['op']);renderSteps();updatePreview();});
  const actions=document.createElement('div');actions.className='step-actions';
  for(const [label,offset,symbol] of [['Move step up',-1,'↑'],['Move step down',1,'↓'],['Remove step',0,'×']] as const){const button=document.createElement('button');button.type='button';button.textContent=symbol;button.setAttribute('aria-label',label);button.disabled=label==='Move step up'?index===0:label==='Move step down'?index===steps.length-1:false;button.addEventListener('click',()=>{if(label==='Remove step'){steps.splice(index,1);}else{const target=index+offset;[steps[index],steps[target]]=[steps[target],steps[index]];}renderSteps();updatePreview();});actions.append(button);}
  top.append(number,op,actions);row.append(top);
  const fields=document.createElement('div');fields.className='step-fields';
  switch(step.op){case'shoot':fields.append(playerField('Shooter','player',step.player),numberField('Deviation','deviation',step.deviation,-120,120));break;
   case'pass':fields.append(playerField('From','from',step.from),playerField('To','to',step.to));break;
   case'pass-or-shoot':fields.append(numberField('Pass below X','whenXBelow',step.whenXBelow,-160,160),numberField('Shot deviation','deviation',step.deviation,-120,120));break;
   case'kick-space-or-shoot':fields.append(numberField('Search samples','samples',step.samples,1,500),numberField('Shoot above X','whenXAbove',step.whenXAbove,-160,160),numberField('Deviation','deviation',step.deviation,-120,120));break;}
  if(fields.childElementCount)row.append(fields);stepList.append(row);
 });
}
function updateStepField(event:Event){
 const target=event.target;if(!(target instanceof HTMLInputElement||target instanceof HTMLSelectElement)||!target.dataset.key)return;
 const index=Number(target.closest<HTMLElement>('.step-row')?.dataset.index);if(!Number.isInteger(index)||!steps[index])return;
 const key=target.dataset.key;const value=target instanceof HTMLSelectElement&&target.value==='all'?'all':Number(target.value);
 steps[index]={...steps[index],[key]:value} as TacticStep;updatePreview();
}
function saveTactic(){
 try{
  const tactic=parseTacticDefinition(definition());const saved=JSON.parse(localStorage.getItem('football-custom-tactics')??'[]') as {id:string;definition:TacticDefinition}[];
  const id=globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  saved.push({id,definition:tactic});localStorage.setItem('football-custom-tactics',JSON.stringify(saved));status.textContent=`${tactic.name} saved. It is ready in the match selectors.`;status.classList.remove('error');
 }catch(error){status.textContent=error instanceof Error?error.message:'Could not save this tactic.';status.classList.add('error');}
}
function applyTemplate(template:TacticDefinition){
 nameInput.value=`${template.name} copy`;
 colors=[...template.colors];
 colorInputs.forEach((input,index)=>input.value=colors[index]);
 formation.splice(0,formation.length,...template.formation.map(row=>[...row] as [number,number,number]));
 steps=template.steps.map(step=>({...step}));
 selectedPlayer=0;presetSelect.value='custom';renderPlayers();renderSteps();updatePreview();
 status.textContent=`Loaded ${template.name} as a copy. Edit the name, then save it as a custom tactic.`;
}
async function loadBuiltinTemplates(){
 try{
    const templates=await Promise.all(BUILTIN_TACTICS.map(async url=>{
     const response=await fetch(url);if(!response.ok)throw new Error(`Could not load ${url}.`);
     return {url,definition:parseTacticDefinition(await response.json())};
    }));
    templates.forEach(({url,definition})=>{const option=document.createElement('option');option.value=url;option.textContent=definition.name;tacticPresetSelect.append(option);});
    loadTemplateButton.disabled=false;
 }catch(error){
    status.textContent=error instanceof Error?error.message:'Could not load the built-in tactics.';status.classList.add('error');
 }
}
loadTemplateButton.addEventListener('click',()=>{
 const url=tacticPresetSelect.value;
 if(!url)return;
 fetch(url).then(response=>{if(!response.ok)throw new Error(`Could not load ${url}.`);return response.json();})
    .then(value=>applyTemplate(parseTacticDefinition(value)))
    .catch(error=>{status.textContent=error instanceof Error?error.message:'Could not load that tactic.';status.classList.add('error');});
});
function downloadTactic(){
 try{const tactic=parseTacticDefinition(definition());const blob=new Blob([JSON.stringify(tactic,null,2)+'\n'],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`${tactic.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'tactic'}.json`;link.click();URL.revokeObjectURL(url);status.textContent='Tactic JSON downloaded.';status.classList.remove('error');}
 catch(error){status.textContent=error instanceof Error?error.message:'Could not download this tactic.';status.classList.add('error');}
}

canvas.addEventListener('pointerdown',event=>{const rect=canvas.getBoundingClientRect();const px=(event.clientX-rect.left)*canvas.width/rect.width,py=(event.clientY-rect.top)*canvas.height/rect.height;let closest=-1,best=24;
 formation.forEach(([x,y],index)=>{const p=pitchPoint(x,y),distance=Math.hypot(p.x-px,p.y-py);if(distance<best){closest=index;best=distance;}});
 if(closest>=0){selectPlayer(closest);canvas.setPointerCapture(event.pointerId);canvas.dataset.dragging='true';}});
canvas.addEventListener('pointermove',event=>{if(canvas.dataset.dragging!=='true')return;const rect=canvas.getBoundingClientRect(),px=(event.clientX-rect.left)*canvas.width/rect.width,py=(event.clientY-rect.top)*canvas.height/rect.height;formation[selectedPlayer]=[Math.round(Math.max(-160,Math.min(160,(px-pitch.left)/pitch.width*320-160))),Math.round(Math.max(-120,Math.min(120,(py-pitch.top)/pitch.height*240-120))),formation[selectedPlayer][2]];xInput.value=String(formation[selectedPlayer][0]);yInput.value=String(formation[selectedPlayer][1]);drawPitch();updatePreview();});
canvas.addEventListener('pointerup',()=>{canvas.dataset.dragging='false';});canvas.addEventListener('pointercancel',()=>{canvas.dataset.dragging='false';});
[xInput,yInput,strengthInput].forEach(input=>input.addEventListener('input',updatePlayer));
colorInputs.forEach((input,index)=>input.addEventListener('input',()=>{colors[index]=input.value;drawPitch();updatePreview();}));
nameInput.addEventListener('input',updatePreview);presetSelect.addEventListener('change',()=>arrangeFormation(presetSelect.value));
stepList.addEventListener('input',updateStepField);stepList.addEventListener('change',updateStepField);
document.querySelector('#add-step')!.addEventListener('click',()=>{steps.push(makeStep('formation'));renderSteps();updatePreview();});
document.querySelector('#save-tactic')!.addEventListener('click',saveTactic);document.querySelector('#download-tactic')!.addEventListener('click',downloadTactic);
renderPlayers();renderSteps();updatePreview();void loadBuiltinTemplates();