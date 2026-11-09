import React from 'react';
import { Button, Input, Select } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
export default function Matchers({
  value = [],
  onChange,
  responses
}) {
  const update = (index, key, val) => onChange(value.map((m, i) => i === index ? {
    ...m,
    [key]: val
  } : m));
  return <div className="mm-matchers">
    {value.map((m, i) => <div className="mm-matcher" key={i}>
      <Input aria-label={`条件 ${i + 1} 参数路径`} placeholder="参数路径，如 data.user.id" value={m.paramPath} onChange={e => update(i, 'paramPath', e.target.value)} />
      <Select aria-label={`条件 ${i + 1} 匹配方式`} value={m.matchType || 'exact'} onChange={v => update(i, 'matchType', v)} options={[{
        value: 'exact',
        label: '等于'
      }, {
        value: 'contains',
        label: '包含'
      }, {
        value: 'regex',
        label: '正则'
      }]} />
      <Input aria-label={`条件 ${i + 1} 期望值`} placeholder="期望值" value={m.paramValue} onChange={e => update(i, 'paramValue', e.target.value)} />
      {responses && <Select aria-label={`条件 ${i + 1} 目标响应`} allowClear placeholder="目标响应（可选）" value={m.targetResponseId || undefined} onChange={v => update(i, 'targetResponseId', v)} options={responses.map(r => ({
        value: r.id,
        label: r.name
      }))} />}
      <Button type="text" danger aria-label={`删除条件 ${i + 1}`} icon={<DeleteOutlined />} onClick={() => onChange(value.filter((_, n) => n !== i))} />
    </div>)}
    <Button type="dashed" icon={<PlusOutlined />} onClick={() => onChange([...value, {
      paramPath: '',
      paramValue: '',
      matchType: 'exact'
    }])}>添加条件</Button>
  </div>;
}
