const { normalizeServerAddress }=require('../ui/src/utils/server-address');
test('shows server NIC IPs, removes duplicates and loopback, preserves bound host priority',()=>{
 const result=normalizeServerAddress({ec:0,server:{port:8899,bip:'10.1.2.3',ipv4:['127.0.0.1','0.0.0.0','192.168.1.2','10.1.2.3','192.168.1.2','999.1.2.3'],ipv6:['::1','::','2001:db8::1']}});
 expect(result).toEqual({addresses:['10.1.2.3','192.168.1.2','2001:db8::1'],port:8899});
});
test('supports IPv6/object addresses and a custom Whistle port',()=>{
 expect(normalizeServerAddress({ec:0,server:{port:'9786',ipv4:[{address:'192.168.0.2'}],ipv6:[{address:'fd00::1'}]}})).toEqual({addresses:['192.168.0.2','fd00::1'],port:9786});
});
test('does not invent a LAN address or port when unavailable; refuses invalid API payload',()=>{
 expect(normalizeServerAddress({ec:0,server:{ipv4:[],port:99999}})).toEqual({addresses:[],port:null});
 expect(normalizeServerAddress({ec:0,server:{ipv4:['192.168.0.2']}}).port).toBeNull();
 expect(()=>normalizeServerAddress('<html/>')).toThrow();expect(()=>normalizeServerAddress({ec:401})).toThrow();
});
