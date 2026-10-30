export const meta={game:"Tower Duell",minPlayers:2,maxPlayers:2};
function wind(n){return Math.sin(n*2.17+.8)*Math.min(65,Math.max(0,n-3)*1.8);}
function size(n){return [96,88,104,78,92,84][n%6];}
export function setup(players){return {players:[...players],turn:players[0],blocks:[],move:0,wind:0,nextWidth:96,loser:null,frames:[],risk:0};}
export function validateAction(s,p,a){
 if(s.loser)return {ok:false,error:"Die Runde ist vorbei."};
 if(s.turn!==p)return {ok:false,error:"Dein Freund ist am Zug."};
 if(!a||a.type!=="drop"||!Number.isFinite(a.x)||Math.abs(a.x)>220||!Number.isFinite(a.angle)||Math.abs(a.angle)>.22||a.move!==s.move)return {ok:false,error:"Ungültiger oder veralteter Zug."};
 return {ok:true};
}
export function applyAction(s,p,a){
 const blocks=s.blocks.map(b=>({...b})),n=blocks.length;
 const b={x:a.x+Math.sin(a.angle)*10,y:-13-n*26,w:s.nextWidth,h:26,a:0,owner:s.players.indexOf(p)};
 blocks.push(b);
 let failed=-1,risk=0,dir=1;
 // Quasi-static rigid body model: gravity, finite contact patches and wind
 // moments. Every interface must support the combined mass above it.
 for(let i=0;i<blocks.length;i++){
 const below=i?blocks[i-1]:{x:0,w:250,y:13};
 const left=Math.max(below.x-below.w/2,blocks[i].x-blocks[i].w/2);
 const right=Math.min(below.x+below.w/2,blocks[i].x+blocks[i].w/2);
 let mass=0,moment=0,windMoment=0;
 for(let j=i;j<blocks.length;j++){const m=blocks[j].w*26;mass+=m;moment+=m*blocks[j].x;windMoment+=m*s.wind*(below.y-13-blocks[j].y)/500;}
 const resultant=(moment+windMoment)/mass,half=(right-left)/2;
 const use=half>0?Math.abs(resultant-(left+right)/2)/half:10;
 risk=Math.max(risk,use);if((right<=left||resultant<left||resultant>right)&&failed<0){failed=i;dir=resultant<(left+right)/2?-1:1;}
 }
 const frames=[];
 for(let f=0;f<=60;f++){const t=f/20,drop=Math.min(105,250*t*t);
 frames.push(blocks.map((q,i)=>{
 let x=q.x,y=q.y,angle=q.a;if(i===n){y=q.y-105+drop;angle=a.angle*Math.max(0,1-t/.65);}
 if(failed>=0&&i>=failed&&t>.66){const dt=t-.66,pivot=blocks[failed],theta=dir*Math.min(2.5,dt*dt*1.5),dy=q.y-pivot.y;
 x=pivot.x-dy*Math.sin(theta)+dir*dt*dt*18;y=pivot.y+dy*Math.cos(theta)+dt*dt*90;angle=theta;
 const floor=-Math.abs(Math.sin(angle))*q.w/2-Math.abs(Math.cos(angle))*q.h/2;
 if(y>floor){y=floor;angle=dir*Math.PI/2;}}
 return [Math.round(x*100)/100,Math.round(y*100)/100,Math.round(angle*10000)/10000];
 }));}
 return {...s,blocks,frames,move:s.move+1,turn:s.players.find(v=>v!==p),loser:failed>=0?p:null,wind:wind(s.move+1),nextWidth:size(s.move+1),risk:Math.min(100,Math.round(risk*100)),lastWind:s.wind};
}
export function isGameOver(s){return s.loser?{over:true,winner:s.players.find(p=>p!==s.loser),loser:s.loser}:{over:false};}
export function viewFor(s,p){return {...s,yourTurn:s.turn===p,player:s.players.indexOf(p)};}
