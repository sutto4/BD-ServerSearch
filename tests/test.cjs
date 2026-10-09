const assert = require('node:assert/strict');
const Plugin = require('../ServerSearch.plugin.js');
const guilds = {a:{id:'a',name:'Café Gaming'},b:{id:'b',name:'Art Club'},c:{id:'c',name:'Gaming Friends'},d:null};
const ids = (query, favorites = new Set(), only = false) => Plugin.filter(guilds,query,favorites,only).map(g=>g.id);
assert.deepEqual(ids('CAFE'), ['a']);
assert.deepEqual(ids('gaming cafe'), ['a']);
assert.deepEqual(ids('   '), ['b','a','c']);
assert.deepEqual(ids('gaming',new Set(['c']),true), ['c']);
assert.deepEqual(ids('<script>'), []);
assert.deepEqual(ids('',new Set(['missing']),true), []);
const listeners = new Map(), subscriptions = new Set(), styles = new Set(), timers = new Set();
global.document = {querySelector:()=>null,addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:(key,fn)=>{if(listeners.get(key)===fn)listeners.delete(key);}};
global.setInterval = fn => {timers.add(fn);return fn;};
global.clearInterval = fn => timers.delete(fn);
let available = true, errors = 0;
global.BdApi = {
 Webpack:{getStore:()=>available?{getGuilds:()=>guilds,addChangeListener:fn=>subscriptions.add(fn),removeChangeListener:fn=>subscriptions.delete(fn)}:null,getByKeys:()=>undefined},
 Data:{load:()=>['a',null,42]},
 DOM:{addStyle:id=>styles.add(id),removeStyle:id=>styles.delete(id)},
 UI:{showToast:()=>errors++}
};
const plugin = new Plugin();
plugin.start();
assert.deepEqual([...plugin.favorites],['a']);
assert.equal(listeners.size,2);assert.equal(subscriptions.size,1);assert.equal(timers.size,1);
plugin.start();
assert.equal(listeners.size,2);assert.equal(subscriptions.size,1);assert.equal(timers.size,1);
plugin.stop();plugin.stop();
assert.equal(listeners.size+subscriptions.size+timers.size+styles.size,0);
available = false;plugin.start();
assert.equal(errors,1);assert.equal(listeners.size+subscriptions.size+timers.size+styles.size,0);
console.log('Passed: six filtering cases, saved-data validation, restart/stop cleanup, missing-store handling.');


(async () => {
    const p = new Plugin();
    let called, closed = 0, failures = 0;
    p.active = true; p.close = () => closed++;
    BdApi.UI.showToast = () => failures++;
    BdApi.Webpack.getByKeys = key => key === 'transitionToGuild' ? {transitionToGuild:id=>called=id} : undefined;
    await p.openServer('123'); assert.equal(called,'123'); assert.equal(closed,1);
    p.navigation = null;
    BdApi.Webpack.getByKeys = key => key === 'transitionTo' ? {transitionTo:path=>called=path} : undefined;
    await p.openServer('456'); assert.equal(called,'/channels/456'); assert.equal(closed,2);
    p.navigation = null; BdApi.Webpack.getByKeys = () => undefined;
    BdApi.Webpack.getByStrings = () => path => called=path;
    await p.openServer('789'); assert.equal(called,'/channels/789'); assert.equal(closed,3);
    p.navigation = null; BdApi.Webpack.getByStrings = () => undefined;
    const log = console.error; console.error = () => {};
    try {
        await p.openServer('1'); assert.equal(failures,1); assert.equal(closed,3);
        p.navigation = () => Promise.reject(new Error('route failed'));
        await p.openServer('2'); assert.equal(failures,2); assert.equal(closed,3);
    } finally { console.error=log; }
    p.element = (tag,cls,text) => ({tag,text,style:{},children:[],setAttribute(){},append(child){this.children.push(child);},remove(){this.removed=true;}});
    const blank = p.avatar({id:'123',name:'Example',icon:null});
    assert.equal(blank.text,'EX'); assert.equal(blank.children.length,0);
    const avatar = p.avatar({id:'123',name:'Example',icon:'abc'});
    const img = avatar.children[0];
    assert.equal(img.src,'https://cdn.discordapp.com/icons/123/abc.png?size=64');
    assert.equal(img.loading,'lazy'); img.onload(); assert.equal(img.style.opacity,'1');
    img.onerror(); assert.equal(img.removed,true); assert.equal(avatar.text,'EX');
    console.log('Passed: navigation paths/failures and icon loading/fallback.');
})().catch(error => {console.error(error);process.exitCode=1;});
