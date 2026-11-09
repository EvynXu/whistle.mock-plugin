const { formatJSONForDisplay } = require('../ui/src/utils/network/format');
test('pretty prints JSON objects and arrays, retaining empty values and string whitespace', () => {
  const source=' { "a" : [{"b":1},{}],"empty":[],"s":"  a b  "} ';
  const result=formatJSONForDisplay(source);
  expect(result.available).toBe(true);
  expect(result.text).toBe('{\n  "a": [\n    {\n      "b": 1\n    },\n    {}\n  ],\n  "empty": [],\n  "s": "  a b  "\n}');
  expect(source).toContain(' { "a"');
});
test('does not round large IDs, reorder numeric keys, merge duplicate keys or rewrite escapes', () => {
  const source='{"10":900719925474099312345,"2":1e400,"id":1,"id":2,"s":"\\u4e2d\\n\\\""}';
  const result=formatJSONForDisplay(source);
  expect(result.available).toBe(true);
  expect(result.text).toContain('900719925474099312345'); expect(result.text).toContain('1e400');
  expect(result.text.indexOf('"10"')).toBeLessThan(result.text.indexOf('"2"'));
  expect(result.text.match(/"id"/g)).toHaveLength(2); expect(result.text).toContain('"\\u4e2d\\n\\\""');
});
test('non-JSON and invalid JSON remain raw', () => {
  for(const text of ['plain text','<xml/>','{"broken":}', '']) {
    const result=formatJSONForDisplay(text); expect(result.available).toBe(false); expect(result.text).toBe(text);
  }
});
test('bounds expanded formatting size and depth without truncating the source', () => {
  const text='['.repeat(101)+'0'+']'.repeat(101);
  const result=formatJSONForDisplay(text); expect(result.available).toBe(false); expect(result.text).toBe(text);
  const large='"'+'a'.repeat(2*1024*1024)+'"';
  expect(formatJSONForDisplay(large)).toMatchObject({available:false,text:large});
});
