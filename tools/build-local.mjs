import {cp,readFile,readdir,writeFile,access} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const dist=new URL('dist/',root);
const manifest=JSON.parse(await readFile(new URL('manifest.json',dist),'utf8'));
const mainPath=new URL('dist'+manifest.main,root);
const mainName=manifest.main.split('/').at(-1);
const source=await readFile(mainPath,'utf8');
const boundary=source.indexOf('\nfunction offlineNavigate(');
if(boundary<0)throw new Error('数据库引擎适配入口已变化，请检查当前数据包。');
const adapter=await readFile(new URL('tools/offline-engine.mjs',root),'utf8');
const layouts=['content-layout.js','database-layout.js'];
await cp(new URL('web/',root),dist,{
 recursive:true,
 filter:path=>![...layouts,'.DS_Store'].includes(String(path).split('/').at(-1))
});
await writeFile(mainPath,source.slice(0,boundary)+'\n'+adapter);

// Local layout wrappers are kept outside the public repository; refresh them when present.
// Also replace Vant's throttled JS lazy-image component with native lazy/async <img> so icons render immediately.
const nativeLazyImage=`import {offlineH as h} from './${mainName}';\nconst LazyImage={name:'LazyImage',props:{src:String,mode:String},render(){const fit=this.mode==='aspectFit'?'contain':this.mode==='aspectFill'?'cover':'fill';return h('div',{class:'van-image'},this.src?[h('img',{class:'van-image__img',src:this.src,loading:'lazy',decoding:'async',alt:'',style:{objectFit:fit}})]:null)}};\nexport {LazyImage as _};\n`;
const exists=url=>access(url).then(()=>true,()=>false);
for(const file of await readdir(new URL('assets/',dist))){
 if(/^lazy-image\.[^.]+\.js$/.test(file)){await writeFile(new URL('assets/'+file,dist),nativeLazyImage);continue;}
 const match=file.match(/^(content|database)-layout\.[^.]+\.js$/);if(!match)continue;
 const template=new URL(`web/${match[1]}-layout.js`,root);if(!await exists(template))continue;
 const target=new URL('assets/'+file,dist),current=await readFile(target,'utf8');
 const scope=current.match(/data-v-[0-9a-f]{8}/)?.[0];
 let next=(await readFile(template,'utf8')).replace('__MAIN__','./'+mainName);
 if(next.includes('__SCOPE__')){if(!scope)throw new Error('找不到内容布局样式作用域：'+file);next=next.replace('__SCOPE__',scope);}
 await writeFile(target,next);
}

// Embed the manifest so the shell can start downloading without an extra request.
const shellPath=new URL('index.html',dist),shell=await readFile(shellPath,'utf8');
if(!shell.includes('<!--site-manifest-->'))throw new Error('index.html 缺少 <!--site-manifest--> 占位符');
await writeFile(shellPath,shell.replace('<!--site-manifest-->',()=>'<script type="application/json" id="site-manifest">'+JSON.stringify(manifest).replaceAll('<','\\u003c')+'</script>'));
console.log('已生成站点页面和百科资源。');
