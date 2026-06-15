// Generates the lead-triage flow as a clean, properly-spaced SVG.
// Every box is sized for its text; arrows are computed from box edges.
// Writes images/flow.svg AND splices the inline <svg> into viralapplaunch.html.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const VB_W = 1360, VB_H = 1372;

// ---- palette ----
const C = {
  cream:'#FBF9F4', ink:'#111110', muted:'#6E6E68', faint:'#9B9890',
  blue:'#2456C9', blueSub:'#DCE6FB', grey:'#C9C6BF', teal:'#16A697', tealSub:'#5AA59D',
  arrow:'#B7B4AD', frameBlue:'#2456C9', frameTeal:'#16A697', frameFill:'#EAF0FB', label:'#8A877F',
};

const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// ---- node registry ----
const N = {};
function rect(id, o){ N[id] = {id, shape:'rect', ...o, cy:o.y + o.h/2}; return N[id]; }
function dia(id, o){ N[id] = {id, shape:'dia', ...o}; return N[id]; }

// anchors
const aBottom = n => n.shape==='dia' ? [n.cx, n.cy+n.hh] : [n.cx, n.y+n.h];
const aTop    = n => n.shape==='dia' ? [n.cx, n.cy-n.hh] : [n.cx, n.y];
const aLeft   = n => n.shape==='dia' ? [n.cx-n.hw, n.cy] : [n.cx-n.w/2, n.cy];
const aRight  = n => n.shape==='dia' ? [n.cx+n.hw, n.cy] : [n.cx+n.w/2, n.cy];

// styling by layer
function style(layer, dashed){
  if(layer==='engineSolid') return {fill:C.blue, stroke:C.blue, title:'#FFFFFF', sub:C.blueSub, dash:''};
  if(layer==='engine')      return {fill:'#FFFFFF', stroke:C.blue, title:C.ink, sub:C.muted, dash:''};
  if(layer==='marketing')   return {fill:'#FFFFFF', stroke:C.teal, title:C.teal, sub:C.tealSub, dash:''};
  if(layer==='nurture')     return {fill:'#FFFFFF', stroke:C.grey, title:C.muted, sub:C.faint, dash:'stroke-dasharray="5 4"'};
  return {fill:'#FFFFFF', stroke:C.grey, title:C.ink, sub:C.muted, dash:''};
}

// ---- LAYOUT ----
// top engine column centered at X0
const X0 = 645;
// inputs
rect('paidads',  {cx:520, y:44,  w:150, h:46, layer:'ladder',      title:'Paid ads',       sub:['Meta · YouTube'], stage:1});
rect('organic',  {cx:770, y:44,  w:192, h:46, layer:'ladder',      title:'Organic social', sub:['IG · FB · TikTok · LinkedIn'], stage:1});
rect('typeform', {cx:520, y:122, w:188, h:46, layer:'ladder',      title:'Typeform',        sub:['budget + qualifying questions'], stage:1});
rect('manychat', {cx:770, y:122, w:206, h:46, layer:'marketing',   title:'ManyChat',        sub:['qualifying conversation we design'], stage:1});
// trigger
rect('trigger',  {cx:X0,  y:200, w:330, h:60, layer:'engineSolid', title:'Trigger we build', sub:['fires on Typeform submit / ManyChat complete','runs the full engine automatically'], stage:2});
// engine stack
rect('enrich',   {cx:X0,  y:294, w:244, h:46, layer:'ladder',      title:'Enrich + research', sub:['Perplexity · Apify (or equivalents)'], stage:3});
rect('profile',  {cx:X0,  y:354, w:262, h:46, layer:'ladder',      title:'Unified profile',   sub:['stage · revenue · funding · app maturity'], stage:3});
rect('claim',    {cx:X0,  y:414, w:244, h:46, layer:'ladder',      title:'Claim check',       sub:['flags over or under-stated budget'], stage:3});
rect('aidec',    {cx:X0,  y:474, w:262, h:48, layer:'engineSolid', title:'AI decision',       sub:['best-fit LANE + OFFER + MESSAGE'], stage:3});
// human review
rect('human',    {cx:X0,  y:560, w:306, h:60, layer:'engine',      title:'Human review + self-learning', sub:['first 30 days: did they buy what we predicted?','retrain scoring · refine offer-fit · dial in bands'], stage:3});
// ghl + route
rect('ghl',      {cx:X0,  y:642, w:262, h:48, layer:'ladder',      title:'GoHighLevel, source of truth', sub:['tags score · lane · offer · status'], stage:4});
dia ('route',    {cx:X0,  cy:744, hw:84, hh:38, layer:'engineSolid', title:'Route by score', stage:4});
// nurture
rect('nurture',  {cx:1210, y:876, w:198, h:50, layer:'nurture',    title:'Flag in GHL: long-term nurture', sub:['not ready now · re-score later'], stage:4, titleSize:11});

// LANE 0
rect('email',    {cx:250, y:876,  w:192, h:46, layer:'marketing', title:'Email',           sub:['funnels them into the course'], lane:'0', stage:5});
rect('blueprint',{cx:250, y:946,  w:182, h:46, layer:'ladder',    title:'Blueprint course',sub:['$997 (front-end)'], lane:'0', stage:5});
dia ('afford',   {cx:250, cy:1042, hw:90, hh:48, layer:'ladder',  lines:['Affordability /','budget signal','(A-B tested)'], lane:'0', stage:5});
rect('morebudget',{cx:150, y:1126, w:196, h:50, layer:'ladder',   title:'More budget · Cap raising', boldTitle:false, sub:['upsell · one-off / payment plan'], lane:'0', stage:5});
rect('cantafford',{cx:360, y:1126, w:154, h:50, layer:'ladder',   title:"Can't afford · ASO", boldTitle:false, sub:['downsell'], lane:'0', stage:5});
rect('cart',     {cx:360, y:1210, w:134, h:38, layer:'ladder',    title:'Cart checkout', boldTitle:false, lane:'0', stage:5});
rect('founders', {cx:360, y:1282, w:182, h:50, layer:'ladder',    title:'Join Founders Club', sub:['heavily recommended'], lane:'0', stage:5});

// LANE 1
dia ('budget',   {cx:690, cy:902, hw:60, hh:38, layer:'ladder',   title:'Budget?', lane:'1', stage:5});
rect('bpbase',   {cx:585, y:960,  w:198, h:50, layer:'ladder',    title:'< 2k/mo · BP Base', boldTitle:false, sub:['web funnel: coaching + course'], lane:'1', stage:5});
rect('gt2k',     {cx:815, y:960,  w:208, h:50, layer:'ladder',    title:'> 2k/mo', boldTitle:false, sub:['book call / sales team · BP Pro'], lane:'1', stage:5});
dia ('abtest',   {cx:585, cy:1070, hw:52, hh:42, layer:'ladder',  title:'A / B test', lane:'1', stage:5});
rect('oncall',   {cx:815, y:1046, w:212, h:50, layer:'ladder',    title:'On-call upsells', boldTitle:false, sub:['cap-raise · ad content · UX audit'], lane:'1', stage:5});
rect('dedicated',{cx:585, y:1156, w:202, h:50, layer:'ladder',    title:'Dedicated coach / BP Plus', boldTitle:false, sub:['media buying + creative → FC'], lane:'1', stage:5});
rect('bppro',    {cx:815, y:1156, w:156, h:46, layer:'ladder',    title:'BP Pro', boldTitle:false, sub:['upsell on call'], lane:'1', stage:5});

// LANE 2
rect('bookcall', {cx:1015, y:876, w:192, h:46, layer:'ladder',    title:'Book call with Dan', sub:['SDR double-qualify'], lane:'2', stage:5});
rect('closing',  {cx:1015, y:956, w:166, h:46, layer:'ladder',    title:'Closing call', boldTitle:false, sub:['sell DFY services'], lane:'2', stage:5});

// MARKETING STRIP
rect('speed',    {cx:640, y:1282, w:362, h:50, layer:'marketing', title:'Speed-to-lead + dialer', sub:['cart abandons · no-shows from any booking · re-engage'], lane:'all', stage:5});

// ---- renderers ----
function nodeSVG(n){
  const s = style(n.layer, n.dashed);
  const cls = `node lyr-${n.layer==='marketing'?'marketing':(n.layer.startsWith('engine')?'engine':'ladder')}`;
  let shape;
  if(n.shape==='dia'){
    const pts = `${n.cx},${n.cy-n.hh} ${n.cx+n.hw},${n.cy} ${n.cx},${n.cy+n.hh} ${n.cx-n.hw},${n.cy}`;
    shape = `<polygon points="${pts}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="1.4" ${s.dash}/>`;
  } else {
    shape = `<rect x="${n.cx-n.w/2}" y="${n.y}" width="${n.w}" height="${n.h}" rx="11" fill="${s.fill}" stroke="${s.stroke}" stroke-width="1.4" ${s.dash} filter="url(#soft)"/>`;
  }
  // text lines
  const cy = n.shape==='dia' ? n.cy : n.y + n.h/2;
  let lines;
  if(n.lines){ // diamond multiline, all same weight
    lines = n.lines.map(t => ({t, size:11.5, w:'400', fill:s.title}));
  } else {
    const tSize = n.titleSize || 12.5;
    lines = [{t:n.title, size:tSize, w:(n.boldTitle===false?'400':'700'), fill:s.title}];
    (n.sub||[]).forEach(t => lines.push({t, size:10.5, w:'400', fill:s.sub}));
  }
  const lh = 14.6;
  const startY = cy - (lines.length-1)*lh/2 + 3.6;
  const texts = lines.map((ln,i)=>`<text x="${n.cx}" y="${(startY+i*lh).toFixed(1)}" text-anchor="middle" font-size="${ln.size}" font-weight="${ln.w}" fill="${ln.fill}">${esc(ln.t)}</text>`).join('');
  return `<g class="${cls}">${shape}${texts}</g>`;
}

function edge(d, {dashed=false}={}){
  return `<path class="lnk" d="${d}" fill="none" stroke="${C.arrow}" stroke-width="1.3" ${dashed?'stroke-dasharray="5 4"':''} marker-end="url(#arr)"/>`;
}
function label(x, y, t, w){
  const bw = w || (t.length*5.2+10);
  return `<g class="lnk-label"><rect x="${(x-bw/2).toFixed(1)}" y="${y-9.5}" width="${bw.toFixed(1)}" height="13" fill="${C.cream}"/><text x="${x}" y="${y}" text-anchor="middle" font-size="9.5" fill="${C.label}" font-style="italic">${esc(t)}</text></g>`;
}
// elbow: vertical from a, to b, bend at midY
function elbowV(a, b, midY){
  return `M${a[0]},${a[1]} L${a[0]},${midY} L${b[0]},${midY} L${b[0]},${b[1]}`;
}
function straight(a,b){ return `M${a[0]},${a[1]} L${b[0]},${b[1]}`; }

// ---- edges ----
const neutralEdges = [];
const lane0 = [], lane1 = [], lane2 = [], laneAll = [];

// inputs -> capture
neutralEdges.push(edge(straight(aBottom(N.paidads), aTop(N.typeform))));
neutralEdges.push(edge(straight(aBottom(N.organic), aTop(N.manychat))));
// capture -> trigger (converge)
neutralEdges.push(edge(`M${aBottom(N.typeform)[0]},${aBottom(N.typeform)[1]} L520,184 L605,184 L605,200`));
neutralEdges.push(edge(`M${aBottom(N.manychat)[0]},${aBottom(N.manychat)[1]} L770,184 L685,184 L685,200`));
// engine chain
neutralEdges.push(edge(straight(aBottom(N.trigger), aTop(N.enrich))));
neutralEdges.push(edge(straight(aBottom(N.enrich), aTop(N.profile))));
neutralEdges.push(edge(straight(aBottom(N.profile), aTop(N.claim))));
neutralEdges.push(edge(straight(aBottom(N.claim), aTop(N.aidec))));
neutralEdges.push(edge(straight(aBottom(N.aidec), aTop(N.human))));
neutralEdges.push(label(706, 540, 'trains it', 56));
neutralEdges.push(edge(straight(aBottom(N.human), aTop(N.ghl))));
neutralEdges.push(edge(straight(aBottom(N.ghl), aTop(N.route))));

// route fan-out (each into its lane group)
const rB = aBottom(N.route); // [645,782]
const busY = 822;
lane0.push(edge(`M${rB[0]},${rB[1]} L${rB[0]},${busY} L${aTop(N.email)[0]},${busY} L${aTop(N.email)[0]},${aTop(N.email)[1]}`));
lane1.push(edge(`M${rB[0]},${rB[1]} L${rB[0]},${busY} L${aTop(N.budget)[0]},${busY} L${aTop(N.budget)[0]},${aTop(N.budget)[1]}`));
lane2.push(edge(`M${rB[0]},${rB[1]} L${rB[0]},${busY} L${aTop(N.bookcall)[0]},${busY} L${aTop(N.bookcall)[0]},${aTop(N.bookcall)[1]}`));
// nurture (not ready)
const rR = aRight(N.route);
laneAll.push(edge(`M${rR[0]},${rR[1]} L1210,${rR[1]} L1210,${aTop(N.nurture)[1]}`, {dashed:true}));
laneAll.push(label(1000, rR[1]-0.5, 'not ready', 58));

// lane 0 internals
lane0.push(edge(straight(aBottom(N.email), aTop(N.blueprint))));
lane0.push(edge(straight(aBottom(N.blueprint), aTop(N.afford))));
const afB = aBottom(N.afford);
lane0.push(edge(`M${afB[0]},${afB[1]} L${afB[0]},1108 L${N.morebudget.cx},1108 L${N.morebudget.cx},${aTop(N.morebudget)[1]}`));
lane0.push(label(196, 1102, 'more budget', 64));
lane0.push(edge(`M${afB[0]},${afB[1]} L${afB[0]},1108 L${N.cantafford.cx},1108 L${N.cantafford.cx},${aTop(N.cantafford)[1]}`));
lane0.push(label(318, 1102, "can't afford", 62));
lane0.push(edge(straight(aBottom(N.cantafford), aTop(N.cart))));
lane0.push(edge(straight(aBottom(N.cart), aTop(N.founders))));

// lane 1 internals
const buB = aBottom(N.budget);
lane1.push(edge(`M${buB[0]},${buB[1]} L${buB[0]},950 L${N.bpbase.cx},950 L${N.bpbase.cx},${aTop(N.bpbase)[1]}`));
lane1.push(label(642, 944, '<2k', 26));
lane1.push(edge(`M${buB[0]},${buB[1]} L${buB[0]},950 L${N.gt2k.cx},950 L${N.gt2k.cx},${aTop(N.gt2k)[1]}`));
lane1.push(label(754, 944, '>2k', 26));
lane1.push(edge(straight(aBottom(N.bpbase), aTop(N.abtest))));
lane1.push(edge(straight(aBottom(N.gt2k), aTop(N.oncall))));
lane1.push(edge(straight(aBottom(N.abtest), aTop(N.dedicated))));
lane1.push(edge(straight(aBottom(N.oncall), aTop(N.bppro))));

// lane 2 internals
lane2.push(edge(straight(aBottom(N.bookcall), aTop(N.closing))));

// marketing recovery (dashed) cart -> speed
const caR = aRight(N.cart);
laneAll.push(edge(`M${caR[0]},${caR[1]} L450,${caR[1]} L450,${N.speed.cy} L${aLeft(N.speed)[0]},${N.speed.cy}`, {dashed:true}));

// ---- frames ----
function frame(x,y,w,h,stroke,fill='none',dash='5 4'){ return `<rect class="frame" x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="1.3" stroke-dasharray="${dash}"/>`; }
function flbl(x,y,t,opts={}){ const {anchor='middle',size=10,weight='400',fill=C.muted}=opts; return `<text class="frame-lbl" x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(t)}</text>`; }

const frames = [
  frame(500, 270, 290, 264, C.frameBlue, C.frameFill),      // triage engine
  frame(40, 808, 1295, 548, C.frameTeal),                    // value ladder + marketing
  frame(44, 846, 422, 502, C.grey),                          // score 0 zone
  frame(474, 846, 470, 374, C.grey),                         // score 1 zone
  frame(908, 846, 216, 172, C.grey),                         // score 2 zone
].join('');
const frameLabels = [
  flbl(512, 286, 'TRIAGE ENGINE', {anchor:'start', size:11, weight:'700', fill:C.frameBlue}),
  flbl(800, 286, 'the brain we add on top of your ladder', {anchor:'start', size:11, fill:C.muted}),
  flbl(687, 824, 'YOUR EXISTING VALUE LADDER  +  the MARKETING LAYER we wrap around every lane', {size:10.5, weight:'700', fill:C.frameTeal}),
  flbl(687, 838, 'message-match copy · speed-to-lead + multi-touch follow-up · abandon & no-show recovery · A/B + CRO', {size:10, fill:C.muted}),
  flbl(56, 868, 'SCORE 0 · DIY · under ~$1k/mo · self-serve funnel', {anchor:'start', size:10, weight:'600', fill:C.muted}),
  flbl(486, 868, 'SCORE 1 · DWY · ~$1-5k/mo · budget-routed', {anchor:'start', size:10, weight:'600', fill:C.muted}),
  flbl(918, 868, 'SCORE 2 · DFY · ~$5k/mo+ · high-touch close', {anchor:'start', size:9.5, weight:'600', fill:C.muted}),
].join('');

// ---- assemble ----
const neutralNodes = ['paidads','organic','typeform','manychat','trigger','enrich','profile','claim','aidec','human','ghl','route','nurture'].map(id=>nodeSVG(N[id])).join('');
const lane0Nodes = ['email','blueprint','afford','morebudget','cantafford','cart','founders'].map(id=>nodeSVG(N[id])).join('');
const lane1Nodes = ['budget','bpbase','gt2k','abtest','oncall','dedicated','bppro'].map(id=>nodeSVG(N[id])).join('');
const lane2Nodes = ['bookcall','closing'].map(id=>nodeSVG(N[id])).join('');
const laneAllNodes = ['speed'].map(id=>nodeSVG(N[id])).join('');

const defs = `<defs>
<marker id="arr" markerWidth="7" markerHeight="7" refX="5.4" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${C.arrow}"/></marker>
<filter id="soft" x="-12%" y="-30%" width="124%" height="160%"><feDropShadow dx="0" dy="1.4" stdDeviation="2.2" flood-color="#10204a" flood-opacity="0.10"/></filter>
</defs>`;

const inner = `
<rect x="0" y="0" width="${VB_W}" height="${VB_H}" fill="${C.cream}"/>
${defs}
<g class="flow-frames">${frames}${frameLabels}</g>
${neutralEdges.join('')}
${neutralNodes}
<g class="lane" data-lane="0">${lane0.join('')}${lane0Nodes}</g>
<g class="lane" data-lane="1">${lane1.join('')}${lane1Nodes}</g>
<g class="lane" data-lane="2">${lane2.join('')}${lane2Nodes}</g>
<g class="lane" data-lane="all">${laneAll.join('')}${laneAllNodes}</g>
`;

const openTag = `<svg class="flow-svg" id="flowSvg" viewBox="0 0 ${VB_W} ${VB_H}" font-family="'DM Sans','Segoe UI',sans-serif" role="img" aria-label="Lead triage flow: paid and organic leads are captured, enriched, scored by an AI engine, then routed by score into your existing value ladder, wrapped in a marketing layer.">`;
const fullSvg = `${openTag}${inner}</svg>`;

// write standalone
const standalone = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}" font-family="'DM Sans','Segoe UI',sans-serif">${inner}</svg>\n`;
fs.writeFileSync(path.join(__dirname,'images','flow.svg'), standalone);

// splice into HTML
const htmlPath = path.join(__dirname,'viralapplaunch.html');
let html = fs.readFileSync(htmlPath,'utf8');
const re = /<svg class="flow-svg"[\s\S]*?<\/svg>/;
if(!re.test(html)){ console.error('flow-svg block not found'); process.exit(1); }
html = html.replace(re, fullSvg);
fs.writeFileSync(htmlPath, html);
console.log('flow.svg + inline diagram updated. viewBox', VB_W, VB_H, '| nodes', Object.keys(N).length);
