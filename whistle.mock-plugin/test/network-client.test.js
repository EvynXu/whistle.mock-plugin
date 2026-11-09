jest.mock('axios',()=>({get:jest.fn(),isCancel:jest.fn(()=>false)}));
const axios=require('axios');
const {fetchNetwork,fetchSession}=require('../ui/src/utils/network/client');
beforeEach(()=>jest.clearAllMocks());
test('reads Whistle reserved API, carries incremental cursor/pending IDs, strips response bodies',async()=>{
 axios.get.mockResolvedValue({data:{ec:0,data:{data:{r:{id:'r',url:'https://example.test',res:{body:'private'}}},lastId:'r',endId:'r',hasNew:true}}});
 const result=await fetchNetwork('previous',['pending']);
 expect(axios.get).toHaveBeenCalledWith('/whistle/cgi-bin/get-data',expect.objectContaining({params:expect.objectContaining({startTime:'previous',ids:'pending',status:'--',count:50})}));
 expect(result.rows).toEqual([{id:'r',url:'https://example.test'}]);expect(result.cursor).toBe('r');expect(result.hasNew).toBe(true);
});
test('refuses plugin HTML fallback and reports authenticated Whistle errors',async()=>{
 axios.get.mockResolvedValueOnce({data:'<!doctype html>'});await expect(fetchNetwork(null,[])).rejects.toThrow('未连接');
 axios.get.mockRejectedValueOnce({response:{status:401}});await expect(fetchNetwork(null,[])).rejects.toThrow('需要登录');
});
test('loads an existing session without sending a target request, and reports eviction',async()=>{
 axios.get.mockResolvedValueOnce({data:{r:{id:'r',url:'https://example.test'}}});expect((await fetchSession('r')).id).toBe('r');
 expect(axios.get).toHaveBeenCalledWith('/whistle/cgi-bin/get-session',expect.objectContaining({params:{reqList:'["r"]',resList:'["r"]'}}));
 axios.get.mockResolvedValueOnce({data:{r:0}});await expect(fetchSession('r')).rejects.toThrow('缓存中移除');
});
