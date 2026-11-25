// Standalone wrapper. Module navigation and language controls live in offline.js.
import {offlineH as h} from './index-Cl7-v4me.js';
const DatabaseLayout={name:'DatabaseLayout',props:{menu:{type:Array,default:()=>[]},defaultActiveKey:{type:String,default:''},defaultActiveTypeKey:{type:String,default:''},fallbackUrl:{type:String,default:''},hideTopAllOption:Boolean,autoSelectFirstChild:Boolean,versionOptions:{type:Array,default:()=>[]},versionLocked:Boolean},emits:['change'],render(){const active=this.menu.find(item=>item.key===this.defaultActiveKey);return h('section',{class:'offline-database-page'},[h('header',{class:'page-hero'},[h('h1',{class:'offline-page-title'},active?.title||'数据库')]),this.$slots.default?.()])}};
export {DatabaseLayout as _};
