const fs = require('fs-extra');
const path = require('path');
const storage = require('../../lib/storage');

const DATA_DIR = storage.DATA_DIR;
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

/**
 * 统计接口
 * GET /cgi-bin/stats?type=overview|hits|misses|top
 */
module.exports = (req, res) => {
  try {
    const type = req.query.type || 'overview';

    if (!fs.existsSync(LOGS_FILE)) {
      return res.json({ code: 0, data: { logs: [], timeline: {}, topInterfaces: [], topFeatures: [] } });
    }

    const logsData = fs.readJsonSync(LOGS_FILE);
    const logs = logsData.logs || [];

    const now = new Date();
    const dayKey = value => {
      const date = new Date(value);
      return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    };
    const parseDay = value => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
      const date = new Date(`${value}T00:00:00`);
      return Number.isFinite(date.getTime()) && dayKey(date) === value ? date : null;
    };
    const start = req.query.startDate ? parseDay(req.query.startDate) : new Date(now.getFullYear(),now.getMonth(),now.getDate()-6);
    const end = req.query.endDate ? parseDay(req.query.endDate) : new Date(now.getFullYear(),now.getMonth(),now.getDate());
    if (!start || !end || start > end || end-start > 366*86400000) return res.status(400).json({code:400,message:'请选择有效的日期范围（最多 366 天）'});
    const endExclusive = new Date(end); endExclusive.setDate(endExclusive.getDate()+1);
    const filterUrl = String(req.query.url || '').toLowerCase();
    const recentLogs = logs.filter(log => {
      const t = new Date(log.timestamp);
      return t >= start && t < endExclusive && (!filterUrl || String(log.url || '').toLowerCase().includes(filterUrl));
    });

    // 分离命中和未命中
    const hitLogs = recentLogs.filter(log => log.eventType === 'mock_hit');
    const missLogs = recentLogs.filter(log => log.eventType === 'mock_miss' || log.eventType === 'proxy_pass');

    let data = {};

    switch (type) {
      case 'overview': {
        // 接口总数
        const interfacesFile = path.join(DATA_DIR, 'interfaces.json');
        let totalInterfaces = 0;
        let activeInterfaces = 0;
        if (fs.existsSync(interfacesFile)) {
          const intfData = fs.readJsonSync(interfacesFile);
          const list = intfData.data || intfData.interfaces || intfData || [];
          totalInterfaces = Array.isArray(list) ? list.length : 0;
          activeInterfaces = Array.isArray(list) ? list.filter(i => i.active).length : 0;
        }

        data = {
          totalRequests: recentLogs.length,
          totalHits: hitLogs.length,
          totalMisses: missLogs.length,
          totalInterfaces,
          activeInterfaces,
          hitRate: recentLogs.length > 0 ? ((hitLogs.length / recentLogs.length) * 100).toFixed(1) : 0,
          todayHits: hitLogs.filter(log => {
            const t = new Date(log.timestamp);
            return t.toDateString() === now.toDateString();
          }).length,
        };
        break;
      }

      case 'top': {
        // Top 10 命中接口
        const interfaceHitMap = {};
        hitLogs.forEach(log => {
          const id = log.interfaceId || log.interfaceName || 'unknown';
          const name = log.interfaceName || id;
          if (!interfaceHitMap[id]) {
            interfaceHitMap[id] = { id, name, featureId: log.featureId, count: 0 };
          }
          interfaceHitMap[id].count++;
        });
        const topInterfaces = Object.values(interfaceHitMap)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        // Top 10 命中功能模块
        const featureHitMap = {};
        hitLogs.forEach(log => {
          const id = log.featureId || log.featureName || 'unknown';
          const name = log.featureName || '未分类';
          if (!featureHitMap[id]) {
            featureHitMap[id] = { id, name, count: 0 };
          }
          featureHitMap[id].count++;
        });
        const topFeatures = Object.values(featureHitMap)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        data = { topInterfaces, topFeatures };
        break;
      }

      case 'timeline': {
        // 最近 7 天每天的命中数
        const timeline = {};
        for (let date = new Date(start); date <= end; date.setDate(date.getDate()+1)) {
          timeline[dayKey(date)] = 0;
        }
        hitLogs.forEach(log => {
          const key = dayKey(log.timestamp);
          if (timeline[key] !== undefined) {
            timeline[key]++;
          }
        });
        data = { timeline };
        break;
      }

      case 'recent': {
        let filteredLogs = hitLogs;
        const filterDate = req.query.date;
        const filterUrl = req.query.url;
        
        if (filterDate) {
          filteredLogs = filteredLogs.filter(log => {
            const logDate = dayKey(log.timestamp);
            return logDate === filterDate;
          });
        }
        
        if (filterUrl) {
          const lowerUrl = filterUrl.toLowerCase();
          filteredLogs = filteredLogs.filter(log => {
            const logUrl = (log.url || '').toLowerCase();
            return logUrl.includes(lowerUrl);
          });
        }
        
        data = { logs: filteredLogs.slice(0, 20) };
        break;
      }

      default:
        data = {};
    }

    res.json({ code: 0, data });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ code: 500, message: err.message });
  }
};
