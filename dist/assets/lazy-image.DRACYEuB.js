import {offlineH as h} from './index-Cl7-v4me.js';
const LazyImage={name:'LazyImage',props:{src:String,mode:String},render(){const fit=this.mode==='aspectFit'?'contain':this.mode==='aspectFill'?'cover':'fill';return h('div',{class:'van-image'},this.src?[h('img',{class:'van-image__img',src:this.src,loading:'lazy',decoding:'async',alt:'',style:{objectFit:fit}})]:null)}};
export {LazyImage as _};
