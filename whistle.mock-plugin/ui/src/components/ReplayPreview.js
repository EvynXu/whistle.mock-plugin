import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Empty, Space, Spin, Typography } from 'antd';
import axios from 'axios';
import { PREVIEW_KEYS } from '../../../lib/replay-preview';

function position(image, event) {
  const rect = image.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
  };
}

export default function ReplayPreview({ run, onAction }) {
  const image = useRef(null);
  const [frame, setFrame] = useState('');
  const [frameError, setFrameError] = useState(false);
  const hasFrame = !!frame && run.running;
  const { id, running } = run;

  useEffect(() => {
    setFrame('');
    setFrameError(false);
    if (!running) return;
    const controller = new AbortController();
    let after = 0;
    let frameUrl;
    let retry;

    async function loadFrames() {
      try {
        while (!controller.signal.aborted) {
          const response = await axios.post('/cgi-bin/replay-session/frame', null, {
            params: { id, after }, responseType: 'blob', timeout: 6500, signal: controller.signal
          });
          if (controller.signal.aborted) return;
          if (response.status === 204) continue;
          const sequence = Number(response.headers['x-replay-frame']);
          if (response.data.type !== 'image/jpeg' || !Number.isSafeInteger(sequence) || sequence <= after) {
            setFrameError(true);
            return;
          }
          after = sequence;
          if (frameUrl) URL.revokeObjectURL(frameUrl);
          frameUrl = URL.createObjectURL(response.data);
          setFrame(frameUrl);
        }
      } catch (error) {
        if (controller.signal.aborted || error.response?.status === 410) return;
        if (error.response?.status >= 400 && error.response.status < 500) setFrameError(true);
        else retry = setTimeout(loadFrames, 500);
      }
    }

    loadFrames();
    return () => {
      controller.abort();
      clearTimeout(retry);
      if (frameUrl) URL.revokeObjectURL(frameUrl);
    };
  }, [id, running]);

  useEffect(() => {
    const target = image.current;
    if (!target) return;
    let timer;
    let pending;
    const limit = value => Math.max(-2000, Math.min(2000, value));
    const flush = () => {
      timer = undefined;
      const { dx, dy } = pending;
      onAction({ ...pending, dx: limit(dx), dy: limit(dy) });
      pending = undefined;
    };
    const wheel = event => {
      event.preventDefault();
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? target.clientHeight : 1;
      pending = {
        type: 'wheel', ...position(target, event),
        dx: (pending?.dx || 0) + event.deltaX * scale,
        dy: (pending?.dy || 0) + event.deltaY * scale
      };
      if (timer === undefined) timer = setTimeout(flush, 32);
    };
    target.addEventListener('wheel', wheel, { passive: false });
    return () => {
      clearTimeout(timer);
      target.removeEventListener('wheel', wheel);
    };
  }, [hasFrame, onAction]);

  return <section className="mm-replay-preview" aria-label="浮层复现">
    <div className="mm-replay-preview-toolbar">
      <Typography.Text strong>页面复现</Typography.Text>
      {run.running && <Space wrap>
        <Button size="small" onClick={() => onAction({ type: 'restart' })}>重新加载入口</Button>
        <Button size="small" onClick={() => onAction({ type: 'stop' })}>结束复现</Button>
      </Space>}
    </div>
    <div className="mm-replay-preview-stage">
      {!run.running ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="复现已结束" /> : frameError ?
        <Alert type="error" showIcon message="无法连接复现画面，请结束后重试。" /> : hasFrame ?
        <img ref={image} className="mm-replay-preview-image" src={frame}
          tabIndex={0} draggable={false} alt="隔离浏览器中的复现页面"
          onClick={event => {
            event.currentTarget.focus();
            onAction({ type: 'click', ...position(event.currentTarget, event) });
          }}
          onPaste={event => {
            event.preventDefault();
            const text = event.clipboardData.getData('text/plain').slice(0, 4096);
            if (text) onAction({ type: 'text', text });
          }}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return;
            const key = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a'
              ? 'ControlOrMeta+A' : event.shiftKey && event.key === 'Tab' ? 'Shift+Tab' : event.key;
            const action = PREVIEW_KEYS.has(key) ? { type: 'key', key } :
              !event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1 ? { type: 'text', text: event.key } : null;
            if (action) {
              event.preventDefault();
              onAction(action);
            }
          }} />
        : <Spin tip="正在加载复现页面"><div className="mm-replay-preview-placeholder" /></Spin>}
    </div>
  </section>;
}
