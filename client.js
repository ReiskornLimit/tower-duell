import * as rules from './logic.js';
let peer=null,link=null,isHost=false,gameState=null,settleUntil=0,session=0,localMode=false,localSeat='host',connectTimer=null;

let relaySource=null,relayTimer=null,relayReady=false,relayActive=false,relayGuest=null,moveLog=[],round=0;
let relayToken=crypto.randomUUID();
async function relayPost(m){const data=JSON.stringify({...m,sender:relayToken});if(data.length>3900)throw Error('Die Runde ist zu lang für die Ersatzverbindung.');const r=await fetch('https://ntfy.sh/towerduell-v5-'+room,{method:'POST',headers:{'Content-Type':'text/plain'},body:data});if(!r.ok)throw Error(r.status===429?'Tageslimit der Ersatzverbindung erreicht. Bitte später erneut versuchen.':'Ersatzverbindung nicht erreichbar.');}
function startRelay(ticket){if(ticket!==session||link?.open||localMode)return;
 relaySource=new EventSource('https://ntfy.sh/towerduell-v5-'+room+'/sse');
 relaySource.onopen=()=>{if(ticket!==session)return;if(!isHost)relayPost({kind:'join'}).catch(relayError);};
 relaySource.onmessage=e=>{if(ticket!==session||link?.open)return;let m;try{m=JSON.parse(JSON.parse(e.data).message);}catch{return;}if(m.sender===relayToken)return;
 if(isHost){
  if(m.kind==='join'&&(!relayGuest||relayGuest===m.sender)){relayGuest=m.sender;relayReady=true;relayActive=true;online=true;if(!gameState){gameState=rules.setup(['host','guest']);moveLog=[];}$('#connection').textContent='● Ihr seid verbunden · Ersatzverbindung';broadcast();}
  else if(m.kind==='intent'&&relayReady&&m.sender===relayGuest)applyIntent(m.intent,'guest');
 }else if(m.kind==='sync'&&m.recipient===relayToken&&Array.isArray(m.moves)&&m.moves.length<=150&&Number.isInteger(m.round)){
  if(m.round<round)return;
  let s=rules.setup(['host','guest']);try{for(const x of m.moves){if(!Number.isFinite(x)||Math.abs(x)>220)throw Error('x');s=rules.applyAction(s,s.turn,{type:'drop',x,angle:0,move:s.move});}}catch{return;}
  if(gameState&&m.round===round&&s.move<gameState.move)return;
  round=m.round;gameState=s;relayActive=true;relayReady=true;online=true;sending=false;$('#connection').textContent='● Ihr seid verbunden · Ersatzverbindung';receive(stateFor('guest'));
 }};
 relaySource.onerror=()=>{if(ticket!==session||link?.open)return;$('#connection').textContent=relayReady?'Verbindung unterbrochen – wird erneut aufgebaut …':'Online-Verbindung wird aufgebaut …';};
}
function relayError(e){sending=false;toast(e.message||'Verbindungsfehler. Bitte erneut beitreten.');updateUI();}

const validRoom=c=>/^[A-Z0-9_-]{3,32}$/.test(c);
function roomURL(){const u=new URL(location.href);u.search='';u.searchParams.set('room',room);return u.href;}
function disconnect(){session++;clearTimeout(relayTimer);if(relaySource)relaySource.close();relaySource=null;relayReady=false;relayActive=false;relayGuest=null;moveLog=[];round=0;clearTimeout(connectTimer);if(link){link.close();link=null;}if(peer){peer.destroy();peer=null;}online=false;gameState=null;settleUntil=0;}
function stateFor(who){return {type:'state',status:gameState?(rules.isGameOver(gameState).over?'over':'playing'):'waiting',seats:gameState?['host','guest']:['host'],you:who,connected:localMode||relayReady?2:link?.open?2:1,view:gameState?rules.viewFor(gameState,who):null,result:gameState?rules.isGameOver(gameState):null,meta:rules.meta};}
function broadcast(){receive(stateFor(localMode?localSeat:'host'));if(relayReady&&isHost)relayPost({kind:'sync',moves:moveLog,round,recipient:relayGuest}).catch(relayError);if(link?.open)link.send({type:'snapshot',packet:stateFor('guest')});}
function applyIntent(m,who){
 if(!gameState)return false;
 if(!localMode&&!relayReady&&(!link?.open)){toast('Warte, bis dein Freund verbunden ist.');return false;}
 if(m.type==='reset'){if(!rules.isGameOver(gameState).over){toast('Die Runde läuft noch.');return false;}gameState=rules.setup(['host','guest']);moveLog=[];round++;localSeat='host';animMove=-1;settleUntil=0;broadcast();return true;}
 if(m.type!=='action')return false;
 if(performance.now()<settleUntil){toast('Der Turm setzt sich noch.');return false;}
 const verdict=rules.validateAction(gameState,who,m.action);if(!verdict.ok){if(who==='host'||localMode)toast(verdict.error);else if(link?.open)link.send({type:'error',error:verdict.error});return false;}
 gameState=rules.applyAction(gameState,who,m.action);moveLog.push(m.action.x);settleUntil=performance.now()+3050;
 if(localMode)localSeat=gameState.turn;broadcast();return true;
}
function start(code,host=false){
 code=String(code||'').trim().toUpperCase();if(!validRoom(code)){toast('Raumcode: 3–32 Buchstaben oder Ziffern.');return;}
 disconnect();localMode=false;room=code;isHost=host;const tokenKey='td:relay:'+room+':'+host;relayToken=sessionStorage.getItem(tokenKey)||crypto.randomUUID();sessionStorage.setItem(tokenKey,relayToken);packet=null;animMove=-1;animating=false;sending=false;$('#roomInput').value=room;
 history.replaceState(null,'',roomURL());sessionStorage.setItem('td:hostRoom',host?room:'');
 $('#connection').textContent=host?'Raum wird erstellt …':'Verbinde mit deinem Freund …';setStatus('Verbindung wird hergestellt …');$('#drop').disabled=true;
 if(typeof Peer!=='function'){toast('Verbindung konnte nicht geladen werden. Bitte Seite neu laden.');return;}
 const ticket=session;relayTimer=setTimeout(()=>startRelay(ticket),9000);
 peer=host?new Peer('towerduell-v3-'+room,{debug:0}):new Peer('towerduell-guest-'+crypto.randomUUID(),{debug:0});
 peer.on('open',()=>{if(ticket!==session)return;
  if(host){online=true;$('#connection').textContent='● Raum '+room+' bereit – Freund einladen';receive(stateFor('host'));}
  else {$('#connection').textContent='Raum gefunden – direkte Verbindung wird aufgebaut …';link=peer.connect('towerduell-v3-'+room,{reliable:true,serialization:'json'});attach(link,ticket);}});
 peer.on('connection',c=>{if(ticket!==session)return;if(!isHost||link?.open){c.on('open',()=>{c.send({type:'error',error:'Dieser Raum ist bereits voll.'});setTimeout(()=>c.close(),200);});return;}link=c;attach(c,ticket);});
 peer.on('error',e=>{if(ticket!==session||relayReady)return;online=false;$('#drop').disabled=true;sending=false;
  const msg=e.type==='peer-unavailable'?'Raum nicht erreichbar. Dein Freund muss zuerst „Neuer Raum“ öffnen.':e.type==='unavailable-id'?'Dieser Raumcode ist belegt. Erstelle einen neuen Raum.':'Verbindung fehlgeschlagen. Versuche es erneut oder teste ohne VPN.';
  $('#connection').textContent=msg;setStatus(msg);toast(msg);});
 peer.on('disconnected',()=>{if(ticket===session&&!peer.destroyed)peer.reconnect();});
 connectTimer=setTimeout(()=>{if(ticket===session&&!link?.open&&!relayReady&&!isHost){$('#connection').textContent='Ersatzverbindung wird aufgebaut …';setStatus('Die Online-Verbindung braucht einen Moment …');}},18000);
}
function attach(c,ticket){
 c.on('open',()=>{if(ticket!==session||relayActive){c.close();return;}clearTimeout(connectTimer);clearTimeout(relayTimer);if(relaySource)relaySource.close();online=true;$('#connection').textContent='● Ihr seid verbunden · Raum '+room;
  if(isHost){if(!gameState)gameState=rules.setup(['host','guest']);broadcast();}
 });
 c.on('data',m=>{if(ticket!==session||!m||typeof m!=='object')return;
  if(isHost){if(m.type==='action'||m.type==='reset')applyIntent(m,'guest');}
  else if(m.type==='snapshot'&&m.packet?.meta?.game==='Tower Duell'){sending=false;receive(m.packet);}
  else if(m.type==='error'){sending=false;toast(String(m.error).slice(0,150));updateUI();}
 });
 c.on('close',()=>{if(ticket!==session||relayReady)return;online=false;sending=false;$('#drop').disabled=true;$('#connection').textContent='Dein Freund ist nicht mehr verbunden.';setStatus(isHost?'Dein Freund kann mit demselben Link wieder beitreten.':'Verbindung getrennt. Bitte erneut beitreten.');});
 c.on('error',()=>{if(ticket===session){sending=false;toast('Verbindungsfehler. Bitte erneut beitreten.');}});
}
function send(m){if(relayActive&&!isHost){relayPost({kind:'intent',intent:m}).catch(relayError);return true;}if(localMode||isHost)return applyIntent(m,localMode?localSeat:'host');if(link?.open){link.send(m);return true;}toast('Noch keine Verbindung zum Spielraum.');return false;}
function startLocal(){disconnect();localMode=true;room='';online=true;packet=null;animMove=-1;animating=false;sending=false;localSeat='host';gameState=rules.setup(['host','guest']);history.replaceState(null,'',location.pathname);$('#connection').textContent='● Zu zweit an diesem Gerät – nach jedem Zug abwechseln';broadcast();}

const $=s=>document.querySelector(s),canvas=$('#canvas'),ctx=canvas.getContext('2d'),slider=$('#position');
let room='',socket=null,retry=0,packet=null,animStart=0,animMove=-1,animating=false,online=false,sending=false,local=false,localState=null,localLogic=null,sound=false,audio=null;

let aim=0,angle=0,lastTime=0;
const colors=['#f58b70','#65cdbd'];
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('visible');setTimeout(()=>$('#toast').classList.remove('visible'),3000);}
function setStatus(t){$('#status').textContent=t;}
function setAim(v){aim=Math.round(Math.max(-220,Math.min(220,v)));slider.value=aim;$('#positionLabel').textContent=aim+' cm';}
function receive(m){const previous=packet;packet=m;if(m.view&&m.view.move>0&&m.view.move!==animMove){animMove=m.view.move;if(previous?.view&&previous.view.move===m.view.move-1){animStart=performance.now();animating=true;tone(300,.07);}else{animating=false;}}
 $('#name0').textContent='Koralle'+(m.seats[0]===m.you?' · Du':'');$('#name1').textContent='Türkis'+(m.seats[1]===m.you?' · Du':'');
 $('#height').textContent=m.view?.move||0;updateUI();}
function updateUI(){const m=packet,v=m?.view,playing=m?.status==='playing',can=playing&&v?.yourTurn&&!animating&&online&&!sending;
 $('#drop').disabled=!can;$('#p0').classList.toggle('active',playing&&v?.turn===m.seats[0]);$('#p1').classList.toggle('active',playing&&v?.turn===m.seats[1]);
 const waiting=!m||m.status==='waiting',over=m?.status==='over'&&!animating;
 $('#overlay').hidden=!(waiting||over);$('#rematch').hidden=!over||!m?.seats.includes(m.you);
 if(waiting){$('#overlayTitle').textContent=room?'Dein Platz steht.':'Bereit für ein Duell?';$('#overlayText').textContent=room?'Schick deinem Freund den Einladungslink. Das Spiel startet, sobald ihr zu zweit seid.':'Erstelle einen Raum und lade deinen Freund ein.';}
 if(over){$('#overlayTitle').textContent=m.result?.winner===m.you?'Du gewinnst!':'Der Turm ist gefallen.';$('#overlayText').textContent=m.result?.winner===m.you?'Dein Freund hat den Turm umgeworfen. Revanche?':m.result?.loser===m.you?'Du hast ihn umgeworfen. Beim nächsten Mal hält er!':'Runde beendet. Zeit für ein neues Duell.';}
 if(animating)setStatus('Der Turm setzt sich …');else if(over)setStatus(m.result?.winner===m.you?'Sieg! Bereit für die Revanche?':'Runde vorbei. Neue Chance?');else if(playing)setStatus(v.player<0?'Du schaust zu. Erstelle einen neuen Raum zum Mitspielen.':v.yourTurn?'Du bist dran. Platziere deinen Block.':'Dein Freund ist am Zug.');else if(room)setStatus('Warte auf deinen Freund …');
 const w=v?.wind||0;$('#wind').textContent=Math.abs(w)<.1?'Windstill':(Math.abs(w)*.45).toFixed(1)+' km/h';$('#windArrow').textContent=w<0?'←':'→';
 const risk=v?.risk||0;$('#riskFill').style.width=(100-risk)+'%';$('#riskFill').style.background=risk>75?'#e87961':'#419e8b';$('#riskText').textContent=risk>75?'Wackelige Sache':risk>40?'Vorsicht am Rand':'Alles im Lot';
}
function drop(){if($('#drop').disabled)return;if(!isHost&&!localMode)sending=true;if(send({type:'action',action:{type:'drop',x:aim,angle:0,move:packet.view.move}})){$('#drop').disabled=true;}else{sending=false;updateUI();}}
function tone(hz,duration){if(!sound)return;audio??=new AudioContext();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.setValueAtTime(hz,audio.currentTime);g.gain.setValueAtTime(.07,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.start();o.stop(audio.currentTime+duration);}
$('#sound').onclick=()=>{sound=!sound;$('#sound').textContent=sound?'♫ an':'♫ aus';tone(500,.1);};
$('#create').onclick=$('#newRoom').onclick=()=>{const bytes=crypto.getRandomValues(new Uint8Array(8));start(Array.from(bytes,b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join(''),true);};
$('#join').onclick=()=>start($('#roomInput').value.trim());$('#roomInput').onkeydown=e=>{if(e.code==='Enter')$('#join').click();};
$('#invite').onclick=async()=>{if(!room){toast('Erstelle zuerst einen Online-Raum.');return;}try{await navigator.clipboard.writeText(roomURL());toast('Link kopiert – schick ihn deinem Freund!');}catch{if(navigator.share)navigator.share({title:'Tower Duell',url:location.href}).catch(()=>{});else prompt('Einladungslink:',location.href);}};
$('#rematch').onclick=()=>{animMove=-1;animating=false;send({type:'reset'});};
$('#local').onclick=startLocal;
$('#drop').onclick=drop;slider.oninput=()=>setAim(Number(slider.value));$('#left').onclick=()=>setAim(aim-5);$('#right').onclick=()=>setAim(aim+5);
window.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'&&e.target.type!=='range')return;if(['ArrowLeft','ArrowRight','Space'].includes(e.code)){e.preventDefault();if(e.code==='Space')drop();else setAim(aim+(e.code==='ArrowLeft'?-5:5));}});
let drag=false,scale=1,width=0,height=0;
canvas.onpointerdown=e=>{if(packet?.view?.yourTurn&&!animating){drag=true;canvas.setPointerCapture(e.pointerId);setAim((e.clientX-canvas.getBoundingClientRect().left-width/2)/scale);}};
canvas.onpointermove=e=>{if(drag)setAim((e.clientX-canvas.getBoundingClientRect().left-width/2)/scale);};canvas.onpointerup=canvas.onpointercancel=()=>{drag=false;};
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);width=r.width;height=r.height;canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);}
new ResizeObserver(resize).observe(canvas);
function roundRect(x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();}
function drawBlock(b,x,y,a,alpha=1){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.globalAlpha=alpha;roundRect(-b.w/2+3,-b.h/2+4,b.w,b.h,4,'#23374720');roundRect(-b.w/2,-b.h/2,b.w,b.h,4,colors[b.owner]||'#687c84');roundRect(-b.w/2+4,-b.h/2+3,b.w-8,3,2,'#ffffff50');ctx.fillStyle='#17304330';ctx.fillRect(-b.w/2+7,b.h/2-5,b.w-14,2);ctx.restore();}
function frame(t){const v=packet?.view,blocks=v?.blocks||[];ctx.clearRect(0,0,width,height);
 const total=blocks.length*26+145;scale=Math.min(width/590,(height-70)/Math.max(310,total));const ground=height-38;
 ctx.fillStyle='#e4e6df';for(let i=0;i<7;i++){const x=(i*193+t*.004*(v?.wind||2))%(width+150)-75;ctx.beginPath();ctx.ellipse(x,80+(i%3)*65,45+(i%2)*20,10,0,0,Math.PI*2);ctx.fill();}
 ctx.strokeStyle='#1727380b';ctx.lineWidth=1;for(let y=ground;y>60;y-=26*scale){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
 ctx.save();ctx.translate(width/2,ground);ctx.scale(scale,scale);
 roundRect(-150,8,300,32,5,'#233b4220');roundRect(-125,0,250,27,5,'#667c80');roundRect(-125,0,250,5,3,'#8fa0a0');
 let positions=null;if(animating&&v?.frames?.length){const progress=(t-animStart)/3000;if(progress>=1){animating=false;updateUI();tone(packet.status==='over'?130:550,.12);}else positions=v.frames[Math.min(v.frames.length-1,Math.floor(progress*(v.frames.length-1)))];}
 if(packet?.status==='over'&&!animating)positions=v?.frames?.at(-1);
 for(let i=0;i<blocks.length;i++){const b=blocks[i],p=positions?.[i];drawBlock(b,p?p[0]:b.x,p?p[1]:b.y,p?p[2]:b.a);}
 if(packet?.status==='playing'&&!animating){const top=-blocks.length*26-105,b={w:v.nextWidth,h:26,owner:v.players.indexOf(v.turn)};
 ctx.setLineDash([4,7]);ctx.strokeStyle=colors[b.owner]+'70';ctx.beginPath();ctx.moveTo(aim,top+15);ctx.lineTo(aim,-blocks.length*26);ctx.stroke();ctx.setLineDash([]);drawBlock(b,aim,top+Math.sin(t*.002)*3,0,v.yourTurn?.9:.35);}
 ctx.restore();lastTime=t;requestAnimationFrame(frame);}
requestAnimationFrame(frame);
const initial=new URLSearchParams(location.search).get('room');if(initial)start(initial,sessionStorage.getItem('td:hostRoom')===initial.toUpperCase());
