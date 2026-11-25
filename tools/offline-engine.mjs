function offlineNavigate({url}){
 const next=new URL(url,location.origin),lang=new URLSearchParams(location.search).get('lang');
 if(lang&&!next.searchParams.has('lang'))next.searchParams.set('lang',lang);
 if(window.__D2_NAVIGATE__)return window.__D2_NAVIGATE__(next.href);
 location.assign(next.pathname+next.search);return Promise.resolve();
}
function offlineBack(){history.length>1?history.back():location.assign('/d2r/data/runeword');return Promise.resolve();}

// Appended to the existing engine to reuse its store and database parser.
let offlineApp,offlineScroll;
export function mountOffline(component,database){
 if(offlineApp){window.removeEventListener('scroll',offlineScroll);offlineApp.unmount();}
 window.__offlineComponent=component;
 const {app,i18n}=createApp();
 appVm={$i18n:i18n,$store:store,$route:{query:Object.fromEntries(new URLSearchParams(location.search))},globalData:{}};
 if(!Data.loaded)loadData(...database);
 const vm=app.mount('#app');offlineApp=app;
 // One layout read per frame at most, instead of one per scroll event.
 let queued=false;
 offlineScroll=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;const table=vm.$refs.table;if(table&&window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-600)table.loadMore()})};
 window.addEventListener('scroll',offlineScroll,{passive:true});
 window.__D2_OFFLINE__={vm,Data,getDBItems,getDBSkills,getCubeRecipes};
 return vm;
}

// Stable names for the local layout wrappers; minified export aliases change between releases.
export {getItemInfo as offlineItemInfo,createVNode as offlineH,isMobile as offlineIsMobile};
