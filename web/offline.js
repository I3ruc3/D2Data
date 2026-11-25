import {loadDatabaseData} from '/data-loader.mjs';
const $=id=>document.getElementById(id);
const inline=$('site-manifest');
const manifest=inline?JSON.parse(inline.textContent):await fetch('/manifest.json',{cache:'no-cache'}).then(r=>r.json());
const params=new URLSearchParams(location.search);
const path=location.pathname.replace(/\/+$/,'')||'/';
const key=path.split('/').filter(Boolean).at(-1);
const section=path==='/d4/boss-timer'?'boss':path==='/wiki'?'wiki':'database';
const page=Object.hasOwn(manifest.pages,key)?key:'runeword';
const lang=params.get('lang')||'zhCN';
document.body.dataset.section=section;
if(section==='database')document.body.dataset.page=page;

// Start every database download before any other work: engine, page chunks and data in parallel.
const preloaded=new Set();
function modulePreload(href){
 if(!href||preloaded.has(href))return;preloaded.add(href);
 const link=document.createElement('link');link.rel='modulepreload';link.href=href;document.head.append(link);
}
function preloadPage(id){modulePreload(manifest.pages[id]);for(const dep of manifest.preload?.[id]||[])modulePreload(dep);}
let resources;
if(section==='database'){
 modulePreload(manifest.main);preloadPage(page);
 const styles=Promise.all(manifest.css.map(href=>new Promise((resolve,reject)=>{
  const link=document.createElement('link');link.rel='stylesheet';link.href=href;
  link.onload=resolve;link.onerror=()=>reject(new Error('样式文件加载失败：'+href));
  document.head.insertBefore(link,document.querySelector('link[href="/offline.css"]'));
 })));
 resources=Promise.all([styles,import(manifest.main),import('/tooltips.js'),loadDatabaseData(manifest,lang)]);
 resources.catch(()=>{});
}

// Keep sticky database toolbars directly below the site header.
const header=$('offline-toolbar');
const syncHeaderHeight=()=>document.documentElement.style.setProperty('--shell-h',header.offsetHeight+'px');
new ResizeObserver(syncHeaderHeight).observe(header);syncHeaderHeight();

const nav=$('offline-nav');
function addTab(title,href,active,extra=''){
 const link=document.createElement('a');link.href=href;link.textContent=title;link.className=extra;
 if(active){link.classList.add('active');link.setAttribute('aria-current','page')}
 nav.append(link);return link;
}
const suffix=lang==='zhCN'?'':'?lang='+lang;
for(const [id,title] of Object.entries(manifest.modules)){
 const link=addTab(title,'/d2r/data/'+id+suffix,section==='database'&&id===page);
 // Hovering a tab warms up that module's code so switching is instant.
 link.addEventListener('pointerenter',()=>{if(section==='database')preloadPage(id)},{once:true});
}
const divider=document.createElement('span');divider.className='nav-divider';divider.setAttribute('aria-hidden','true');nav.append(divider);
addTab('D4 Boss计时','/d4/boss-timer',section==='boss');
addTab('百科','/wiki',section==='wiki');
function revealActive(){const active=nav.querySelector('.active');if(active&&nav.scrollWidth>nav.clientWidth)nav.scrollTo({left:active.offsetLeft-nav.clientWidth/2+active.offsetWidth/2})}
revealActive();

if(section==='database'){
 $('offline-language').value=lang;
 $('data-version').textContent='v'+manifest.version;
 $('data-version').title=`数据 ${manifest.version} · 同步于 ${new Date(manifest.syncedAt).toLocaleDateString('zh-CN')}`;
 $('offline-language').onchange=e=>{const query=new URLSearchParams(location.search);query.set('lang',e.target.value);location.search=query.toString()};
 function detail(label,value){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;typeof value==='string'?dd.textContent=value:dd.append(value);$('data-details').append(dt,dd)}
 detail('数据版本',manifest.version);detail('同步时间',new Date(manifest.syncedAt).toLocaleString('zh-CN'));detail('本地图片',`${manifest.images} 张`);
 if(manifest.missingImages)detail('原站缺失图片',`${manifest.missingImages} 张`);
 const source=document.createElement('a');source.href=manifest.source;source.textContent='暗黑核 D2Core';source.target='_blank';source.rel='noreferrer';detail('数据来源',source);
 $('info-button').onclick=()=>$('data-dialog').showModal();
 $('close-dialog').onclick=()=>$('data-dialog').close();
 $('data-dialog').onclick=e=>{if(e.target===$('data-dialog'))$('data-dialog').close()};
}else{
 $('data-version').remove();$('offline-language').remove();$('info-button').remove();$('data-dialog').remove();
}

function showError(error){
 const box=document.createElement('div');box.className='page-error';
 const title=document.createElement('strong');title.textContent='页面加载失败';
 const message=document.createElement('p');message.textContent=error.message;
 const retry=document.createElement('button');retry.type='button';retry.textContent='重新加载';retry.onclick=()=>location.reload();
 box.append(title,message,retry);$('app').replaceChildren(box);console.error(error.stack||String(error));
}

try{
 if(section==='boss'){
  document.title='D4 Boss计时';
  const [html,schedule,{initBossTimer}]=await Promise.all([
   fetch('/boss.html').then(r=>{if(!r.ok)throw new Error('计时页面缺失');return r.text()}),
   fetch('/data/boss-schedule.json',{cache:'no-cache'}).then(r=>r.json()),
   import('/boss-timer.mjs')
  ]);
  for(const cfg of [schedule.world,schedule.normal])if(!Number.isFinite(cfg.intervalSeconds)||cfg.intervalSeconds<=0||!Number.isFinite(Date.parse(cfg.baseTime)))throw new Error('Boss 周期配置无效');
  $('app').innerHTML=html;initBossTimer(schedule);
 }else if(section==='wiki'){
  document.title='百科';document.body.classList.add('encyclopedia-page');
  const frame=document.createElement('iframe');frame.className='encyclopedia-frame';frame.title='百科';frame.src='/encyclopedia/diablo/index.htm';$('app').replaceChildren(frame);
 }else{
  let tooltipsInstalled=false;
  function databasePage(url){
   if(url.origin!==location.origin||(url.searchParams.get('lang')||'zhCN')!==lang)return null;
   const route=url.pathname.replace(/\/+$/,'')||'/';
   if(route==='/'||route==='/index.html')return 'runeword';
   const match=route.match(/^\/d2r\/data\/([^/]+)$/);
   return match&&Object.hasOwn(manifest.pages,match[1])?match[1]:null;
  }
  async function renderDatabase(){
   const url=new URL(location.href),nextPage=databasePage(url);
   if(!nextPage){location.reload();return;}
   preloadPage(nextPage);
   const [[,engine,tooltips,data],component]=await Promise.all([resources,import(manifest.pages[nextPage])]);
   if(location.href!==url.href)return;
   document.body.dataset.page=nextPage;
   engine.mountOffline(component.default,data);
   if(!tooltipsInstalled){tooltips.installTooltips(engine);tooltipsInstalled=true;}
   document.title=manifest.modules[nextPage]+' · D2数据库';
   for(const link of nav.querySelectorAll('a')){
    const active=new URL(link.href).pathname==='/d2r/data/'+nextPage;
    link.classList.toggle('active',active);
    if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
   }
   revealActive();
  }
  async function navigate(href){
   const url=new URL(href,location.href);
   if(!databasePage(url)){location.assign(url.href);return;}
   if(url.href===location.href)return;
   history.pushState(null,'',url.pathname+url.search+url.hash);
   try{await renderDatabase();if(location.href===url.href)window.scrollTo(0,0);}catch(error){showError(error);}
  }
  await renderDatabase();
  window.__D2_NAVIGATE__=navigate;
  document.addEventListener('click',event=>{
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const link=event.target.closest('a[href]');
   if(!link||link.hasAttribute('download')||link.target&&link.target!=='_self'||!databasePage(new URL(link.href)))return;
   event.preventDefault();navigate(link.href);
  });
  window.addEventListener('popstate',()=>{renderDatabase().catch(showError);});
 }
}catch(error){showError(error)}
