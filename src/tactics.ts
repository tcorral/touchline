import {Command,Formation,RandomSource,Situation,Tactic,clamp,distance} from './engine.js';

export const BUILTIN_TACTICS=['tactics/demo01.json','tactics/demo02.json','tactics/pepe.json','tactics/juan.json','tactics/ana.json'];

/** A tactic file is JSON: name, colors [shirt, shorts, number], 11 formation rows [x, y, strength], and steps. */
export type TacticStep =
  | {op:'formation'|'chase'|'keeper'|'defend'}
  | {op:'shoot';player:number|'all';deviation:number}
  | {op:'pass';from:number;to:number}
  | {op:'pass-or-shoot';whenXBelow:number;deviation:number}
  | {op:'kick-space-or-shoot';samples:number;whenXAbove:number;deviation:number};

export interface TacticDefinition {
  name:string;
  colors:[string,string,string];
  formation:Formation;
  steps:TacticStep[];
}

export function loadTactic(value:unknown):Tactic {
  return compileTactic(parseTacticDefinition(value));
}

export function compileTactic(definition:TacticDefinition):Tactic {
  const formation=definition.formation.map(row=>[...row] as [number,number,number]);
  const steps=definition.steps.map(step=>({...step}));
  return {
    name:definition.name,
    colors:[...definition.colors],
    formation,
    commands(situation,random){
      const commands:Command[]=[];
      for(const step of steps)applyStep(step,formation,situation,random,commands);
      return commands;
    }
  };
}

function applyStep(step:TacticStep,formation:Formation,s:Situation,random:RandomSource,commands:Command[]){
  switch(step.op){
    case 'formation':
      formation.forEach(([x,y],player)=>commands.push({kind:'move',player,x,y}));
      return;
    case 'chase':
      commands.push({kind:'move',player:s.closestBall(),...s.ball});
      return;
    case 'keeper':
      commands.push({kind:'move',player:0,x:formation[0][0],y:clamp(Math.trunc(s.ball.y/2),-20,20)});
      return;
    case 'defend':
      if(!s.closer()||s.ball.x<0)for(let i=1;i<4;i++){
        const mark=s.opponents[s.nearest(s.opponents,{x:formation[i][0],y:formation[i][1]})[0]];
        commands.push({kind:'move',player:i,x:mark.x+10,y:mark.y});
      }
      return;
    case 'shoot':
      if(step.player==='all'){for(let i=0;i<11;i++)commands.push({kind:'shoot',player:i,deviation:step.deviation});}
      else commands.push({kind:'shoot',player:step.player,deviation:step.deviation});
      return;
    case 'pass':
      commands.push({kind:'pass',player:step.from,to:step.to});
      return;
    case 'pass-or-shoot':
      for(let i=0;i<11;i++)commands.push(s.own[i].x<step.whenXBelow?{kind:'pass',player:i,to:s.nextPlayer(i)}:{kind:'shoot',player:i,deviation:step.deviation});
      return;
    case 'kick-space-or-shoot':{
      let best=9999999,x=0,y=0;
      for(let i=0;i<step.samples;i++){
        const xx=Math.trunc(random()*340)-170,yy=Math.trunc(random()*240)-120;
        let score=yy*5-xx*100;
        for(const player of s.own)if(Math.trunc(distance({x:xx,y:yy},player))<70)score-=1000;
        for(const player of s.opponents)if(Math.trunc(distance({x:xx,y:yy},player))<70)score+=1000;
        if(best>score){best=score;x=xx;y=yy;}
      }
      for(let i=0;i<11;i++)commands.push(s.own[i].x>step.whenXAbove?{kind:'shoot',player:i,deviation:step.deviation}:{kind:'kick',player:i,x,y});
    }
  }
}

export function parseTacticDefinition(value:unknown):TacticDefinition {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('A tactic file must be a JSON object.');
  const raw=value as Record<string,unknown>;
  if(typeof raw.name!=='string'||!raw.name.trim())throw new Error('The tactic needs a name.');
  if(!Array.isArray(raw.colors)||raw.colors.length!==3||raw.colors.some(color=>typeof color!=='string'||!color.trim())){
    throw new Error('Colors must be three strings: shirt, shorts, and number.');
  }
  if(!Array.isArray(raw.formation)||raw.formation.length!==11)throw new Error('The formation must list 11 players.');
  const formation:Formation=raw.formation.map((row,index)=>{
    if(!Array.isArray(row)||row.length!==3||row.some(n=>typeof n!=='number'||!Number.isFinite(n))){
      throw new Error(`Player ${index+1} must be [x, y, strength].`);
    }
    return [row[0],row[1],row[2]];
  });
  if(!Array.isArray(raw.steps)||raw.steps.length===0)throw new Error('The tactic needs at least one step.');
  return {
    name:raw.name.trim(),
    colors:[raw.colors[0] as string,raw.colors[1] as string,raw.colors[2] as string],
    formation,
    steps:raw.steps.map((step,index)=>parseStep(step,index))
  };
}

function parseStep(value:unknown,index:number):TacticStep {
  if(!value||typeof value!=='object'||Array.isArray(value)||typeof (value as {op?:unknown}).op!=='string'){
    throw new Error(`Step ${index+1} needs an op.`);
  }
  const step=value as Record<string,unknown>;
  const label=`Step ${index+1}`;
  switch(step.op){
    case 'formation':
    case 'chase':
    case 'keeper':
    case 'defend':
      return {op:step.op};
    case 'shoot':
      return {op:'shoot',player:step.player==='all'?'all':playerIndex(step.player,`${label} player`),deviation:finiteNumber(step.deviation,`${label} deviation`)};
    case 'pass':
      return {op:'pass',from:playerIndex(step.from,`${label} passer`),to:playerIndex(step.to,`${label} receiver`)};
    case 'pass-or-shoot':
      return {op:'pass-or-shoot',whenXBelow:finiteNumber(step.whenXBelow,`${label} line`),deviation:finiteNumber(step.deviation,`${label} deviation`)};
    case 'kick-space-or-shoot':
      return {op:'kick-space-or-shoot',samples:sampleCount(step.samples),whenXAbove:finiteNumber(step.whenXAbove,`${label} line`),deviation:finiteNumber(step.deviation,`${label} deviation`)};
    default:
      throw new Error(`Unknown tactic step "${step.op}".`);
  }
}

function playerIndex(value:unknown,label:string):number {
  if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>10)throw new Error(`${label} must be a player index from 0 to 10.`);
  return value;
}

function finiteNumber(value:unknown,label:string):number {
  if(typeof value!=='number'||!Number.isFinite(value))throw new Error(`${label} must be a number.`);
  return value;
}

function sampleCount(value:unknown):number {
  if(typeof value!=='number'||!Number.isInteger(value)||value<1||value>500)throw new Error('Space search samples must be a whole number from 1 to 500.');
  return value;
}
