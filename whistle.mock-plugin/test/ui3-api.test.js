const fs=require('fs-extra'),os=require('os'),path=require('path');
const storage=require('../lib/storage');
describe('UI 3.0 API data consistency',()=>{
 let dir,stats,interfaces;
 const call=(controller,req)=>{let body,status=200;const res={status:n=>{status=n;return res;},json:value=>{body=value;return res;}};controller.call({dataDir:dir},req,res);return {body,status};};
 beforeEach(()=>{dir=fs.mkdtempSync(path.join(os.tmpdir(),'ui3-api-'));jest.resetModules();jest.doMock('../lib/storage',()=>({...storage,DATA_DIR:dir}));stats=require('../app/cgi-bin/stats');interfaces=require('../app/cgi-bin/interfaces');fs.writeJsonSync(path.join(dir,'features.json'),{features:[{id:'f',name:'Module',active:true}]});fs.writeJsonSync(path.join(dir,'interfaces.json'),{interfaces:[]});});
 afterEach(()=>{fs.removeSync(dir);jest.dontMock('../lib/storage');});
 test('date and URL filters apply consistently to summary, top and timeline',()=>{fs.writeJsonSync(path.join(dir,'logs.json'),{logs:[{id:'1',timestamp:'2026-10-06T12:00:00',url:'/orders',eventType:'mock_hit',interfaceId:'i',featureId:'f'},{id:'2',timestamp:'2026-10-07T12:00:00',url:'/users',eventType:'mock_hit',interfaceId:'other',featureId:'f'}]});const query={startDate:'2026-10-06',endDate:'2026-10-07',url:'orders'};const overview=call(stats,{query:{...query,type:'overview'}}).body.data;const top=call(stats,{query:{...query,type:'top'}}).body.data;const timeline=call(stats,{query:{...query,type:'timeline'}}).body.data;expect(overview.totalHits).toBe(1);expect(top.topInterfaces).toEqual([{id:'i',name:'i',featureId:'f',count:1}]);expect(Object.values(timeline.timeline).reduce((a,b)=>a+b,0)).toBe(1);});
 test('invalid date ranges are rejected',()=>{fs.writeJsonSync(path.join(dir,'logs.json'),{logs:[]});expect(call(stats,{query:{startDate:'2026-02-30',endDate:'2026-10-08'}}).status).toBe(400);expect(call(stats,{query:{startDate:'2026-10-08',endDate:'2026-10-01'}}).status).toBe(400);});
 test('new interface persists response headers and references',()=>{const created=call(interfaces,{method:'POST',body:{name:'Headers',featureId:'f',urlPattern:'/headers',headers:{'X-Test':'yes'},responses:[{id:'r',name:'R',content:'{}'}],activeResponseId:'r',httpMethod:'GET'},query:{}});expect(created.body.code).toBe(0);expect(created.body.data.headers).toEqual({'X-Test':'yes'});const saved=fs.readJsonSync(path.join(dir,'interfaces.json')).interfaces[0];expect(saved.activeResponseId).toBe('r');expect(saved.headers).toEqual({'X-Test':'yes'});});
 test('interface lookup for captured hits returns only the interface and module names', () => {
   fs.writeJsonSync(path.join(dir, 'interfaces.json'), {
     interfaces: [{ id: 'i', featureId: 'f', name: '订单详情', responses: [{ content: '{}' }] }]
   });
   expect(call(interfaces, { method: 'GET', query: { id: 'i' } }).body.data)
     .toEqual({ interfaceName: '订单详情', featureName: 'Module' });
   expect(call(interfaces, { method: 'GET', query: { id: 'deleted' } }).status).toBe(404);
 });
});
