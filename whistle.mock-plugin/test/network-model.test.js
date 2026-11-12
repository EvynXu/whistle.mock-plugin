const { TextDecoder, TextEncoder } = require('util');
global.TextDecoder = TextDecoder; global.TextEncoder = TextEncoder;
const { summarize, mergeRows, decodeBody, sessionDetail, mockHitDetails } = require('../ui/src/utils/network/model');
const part = text => ({ base64: Buffer.from(text).toString('base64'), size: Buffer.byteLength(text), headers: { 'Content-Type': 'application/json; charset=utf-8' } });
test('list summaries omit bodies/credentials and partial updates preserve URL and method', () => {
  const original = summarize({ id:'r',url:'https://example.test/api',startTime:1,req:{method:'POST',headers:{Authorization:'secret'},body:'private'},res:{statusCode:200,base64:'secret',headers:{'content-type':'application/json'}} });
  expect(original).not.toHaveProperty('req'); expect(JSON.stringify(original)).not.toContain('secret');
  const rows=mergeRows([original],[summarize({id:'r',endTime:3,res:{statusCode:201,size:12}})]);
  expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({url:'https://example.test/api',method:'POST',status:201,endTime:3});
});
test('merging deduplicates IDs and bounds metadata memory to most recent 500 rows', () => {
  const rows=Array.from({length:600},(_,i)=>({id:String(i),startTime:i}));
  const merged=mergeRows(rows,[{id:'599',status:200}]);
  expect(merged).toHaveLength(500); expect(merged[0]).toMatchObject({id:'599',status:200}); expect(merged[499].id).toBe('100');
});
test('marks a captured Mock hit from its response headers, including on a pending row update', () => {
  const pending = summarize({ id: 'r', startTime: 1 });
  const hit = summarize({ id: 'r', res: { statusCode: 200, headers: {
    'X-Whistle-Mock': 'true',
    'X-Whistle-Mock-Rule': '订单详情'
  } } });
  expect(mergeRows([pending], [hit])[0]).toMatchObject({ startTime: 1, mockHit: true });

  const unnamedHit = summarize({ id: 'u', res: { statusCode: 200, headers: { 'x-whistle-mock': 'true' } } });
  expect(unnamedHit.mockHit).toBe(true);

  const passthrough = summarize({ id: 'p', rules: { rule: { matcher: 'whistle.mock-plugins://' } },
    res: { statusCode: 200, headers: { 'x-whistle-mock-rule': '订单详情' } } });
  expect(passthrough).not.toHaveProperty('mockHit');
});
test('reads captured Mock names and keeps the interface ID for older captures', () => {
  const headers = { 'X-Whistle-Mock': 'true', 'X-Whistle-Mock-Interface': 'i' };
  expect(mockHitDetails(headers)).toEqual({ interfaceId: 'i', interfaceName: '', featureName: '' });
  expect(mockHitDetails({
    ...headers,
    'X-Whistle-Mock-Rule': "UTF-8''" + encodeURIComponent('订单详情'),
    'X-Whistle-Mock-Feature': 'Orders'
  })).toEqual({ interfaceId: 'i', interfaceName: '订单详情', featureName: 'Orders' });
  expect(mockHitDetails({ 'X-Whistle-Mock-Interface': 'i' })).toBeNull();
});
test('decodes UTF-8, GBK, Buffer JSON, and already-decoded text without mangling', () => {
  expect(decodeBody(part('{"姓名":"测试"}')).text).toBe('{"姓名":"测试"}');
  expect(decodeBody({base64:'1tDOxA==',size:4,headers:{'content-type':'text/plain; charset=gbk'}}).text).toBe('中文');
  expect(decodeBody({body:{type:'Buffer',data:[97,98,99]},size:3}).text).toBe('abc');
  expect(decodeBody({body:'中文',headers:{'content-type':'text/plain; charset=gbk'}}).text).toBe('中文');
});
test('refuses binary, unavailable, truncated, undecodable and oversized bodies', () => {
  expect(decodeBody({body:'binary',headers:{'content-type':'image/png'}}).available).toBe(false);
  expect(decodeBody({body:'',size:100}).available).toBe(false);
  expect(decodeBody({body:'abc',size:100}).available).toBe(false);
  expect(decodeBody({base64:'/w==',size:1}).available).toBe(false);
  expect(decodeBody({base64:'a'.repeat(7*1024*1024)}).available).toBe(false);
  expect(decodeBody({body:'abc',size:3,hasGzipError:true}).available).toBe(false);
});
test('compressed size is compared with decoded size, while HEAD/204 empty responses are valid', () => {
  expect(decodeBody({...part('abc'),size:25,unzipSize:3,headers:{'content-encoding':'gzip'}}).available).toBe(true);
  expect(decodeBody({body:'',size:123,statusCode:200},'HEAD').available).toBe(true);
  expect(decodeBody({body:'',size:0,statusCode:204}).available).toBe(true);
});
test('only completed HTTP text responses can become Mock; do not replay pending or websocket traffic', () => {
  const session={id:'r',url:'https://example.test/api',req:{method:'GET'},res:{...part('{}'),statusCode:200},endTime:3};
  expect(sessionDetail(session).canSave).toBe(true);
  expect(sessionDetail({...session,endTime:undefined}).canSave).toBe(false);
  expect(sessionDetail({...session,endTime:undefined,res:{headers:{}}}).reason).toContain('尚未结束');
  expect(sessionDetail({...session,resError:true}).canSave).toBe(false);
  expect(sessionDetail({...session,url:'wss://example.test/socket'}).canSave).toBe(false);
});

test('CONNECT tunnel metadata cannot be imported as a decrypted HTTP mock', () => {
  const detail=sessionDetail({id:'tunnel',url:'https://example.test',req:{method:'CONNECT'},res:{statusCode:200,headers:{},size:0},endTime:3});
  expect(detail.canSave).toBe(false);
});
