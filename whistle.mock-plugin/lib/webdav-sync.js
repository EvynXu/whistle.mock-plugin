const crypto = require('crypto');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const zlib = require('zlib');

const WEBDAV_FILE_NAME = 'whistle-mock-plugin-manifest.json';
const LEGACY_COMPRESSED_WEBDAV_FILE_NAME = 'whistle-mock-plugin-sync.json.gz';
const LEGACY_WEBDAV_FILE_NAME = 'whistle-mock-plugin-sync.json';
const MODULE_FILE_PREFIX = 'whistle-mock-module-';
const DEFAULT_WEBDAV_ENDPOINT = 'https://webdav.example.com/webdav/whistle-mock-plugin-sync/';
const CONFIG_FILE_NAME = 'webdav-config.json';
const STATE_FILE_NAME = 'webdav-sync-state.json';
const SYNC_VERSION = 1;
const REQUEST_TIMEOUT = 30000;
const WRITE_REQUEST_TIMEOUT = 10 * 60 * 1000;
const MOVE_REQUEST_TIMEOUT = 60000;
const MAX_TRANSFER_SIZE = 150 * 1024 * 1024;
const MAX_UNCOMPRESSED_MODULE_SIZE = 256 * 1024 * 1024;
const MODULE_FILE_PATTERN = /^whistle-mock-module-[a-f0-9]{16}-[a-f0-9]{24}\.json\.gz$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

const createError = (message, statusCode = 500, conflict) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (conflict) error.conflict = conflict;
  return error;
};

const normalizeWebDavEndpoint = (value) => {
  const input = typeof value == 'string' ? value.trim() : '';
  if (!input) throw createError('WebDAV 目录地址不能为空', 400);

  let url;
  try {
    url = new URL(input);
  } catch (error) {
    throw createError('WebDAV 目录地址格式不正确', 400);
  }

  if (url.protocol != 'http:' && url.protocol != 'https:') {
    throw createError('WebDAV 目录地址只支持 HTTP 或 HTTPS', 400);
  }
  if (url.username || url.password) {
    throw createError('WebDAV 目录地址中不要包含账号或密码', 400);
  }

  url.search = '';
  url.hash = '';
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
  return url.toString();
};

const getWebDavFileUrl = (endpoint) => {
  return new URL(WEBDAV_FILE_NAME, normalizeWebDavEndpoint(endpoint)).toString();
};

const getLegacyWebDavFileUrl = (endpoint) => {
  return new URL(LEGACY_WEBDAV_FILE_NAME, normalizeWebDavEndpoint(endpoint)).toString();
};

const getModuleFileUrl = (endpoint, fileName) => {
  if (!MODULE_FILE_PATTERN.test(fileName || '')) {
    throw createError('WebDAV 模块文件名无效', 422);
  }
  return new URL(fileName, normalizeWebDavEndpoint(endpoint)).toString();
};

const getTempFileUrl = (endpoint, fileName) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return new URL(`.${fileName}.${suffix}.tmp`, normalizeWebDavEndpoint(endpoint)).toString();
};

const hashBuffer = (value) => {
  return crypto.createHash('sha256').update(value).digest('hex');
};

const createModuleContent = (feature, interfaces) => ({ feature, interfaces });

const getModuleContentHash = (feature, interfaces) => {
  return hashBuffer(Buffer.from(JSON.stringify(createModuleContent(feature, interfaces))));
};

const createModuleFileName = (featureId, compressedSha256) => {
  const idHash = hashBuffer(Buffer.from(featureId)).slice(0, 16);
  return `${MODULE_FILE_PREFIX}${idHash}-${compressedSha256.slice(0, 24)}.json.gz`;
};

const getResponseHeader = (headers, name) => {
  if (!headers) return null;
  if (typeof headers.get == 'function') return headers.get(name) || null;
  return headers[name.toLowerCase()] || headers[name] || null;
};

const responseError = (action, response) => {
  const status = response && response.status;
  if (status == 401) return createError(`${action}失败：用户名或密码错误`, 401);
  if (status == 403) return createError(`${action}失败：当前用户没有目录读写权限`, 403);
  if (status == 404) return createError(`${action}失败：WebDAV 目录不存在`, 404);
  if (status == 409) return createError(`${action}失败：请先在 WebDAV 中创建专用同步目录`, 409);
  if (status == 412) return createError('远端模块清单已被其他设备更新，请刷新后重试', 412);
  if (status == 405) return createError(`${action}失败：服务器不支持所需的 WebDAV 方法，请检查地址和服务能力`, 405);
  if (status == 423) return createError(`${action}失败：WebDAV 资源已被锁定`, 423);
  if (status == 507) return createError(`${action}失败：WebDAV 存储空间不足`, 507);

  let detail = '';
  const data = response && response.data;
  if (Buffer.isBuffer(data)) detail = data.toString('utf8');
  else if (typeof data == 'string') detail = data;
  else if (data && typeof data == 'object') detail = data.message || data.error || data.detail || '';
  detail = String(detail || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
  return createError(`${action}失败 (${status || '未知状态'})${detail ? `：${detail}` : ''}`, status || 502);
};

const networkError = (action, error) => {
  const code = error && (error.code || (error.cause && error.cause.code));
  const messages = {
    ENOTFOUND: '域名解析失败，请检查 WebDAV 地址',
    EAI_AGAIN: '域名解析超时，请稍后重试',
    ECONNREFUSED: '连接被拒绝，请检查服务地址和端口',
    ECONNRESET: '连接被远端重置',
    ETIMEDOUT: '连接超时，请检查网络或防火墙',
    ECONNABORTED: '请求超时，请检查网络或 WebDAV 服务',
    DEPTH_ZERO_SELF_SIGNED_CERT: '服务器使用了不受信任的自签名证书',
    SELF_SIGNED_CERT_IN_CHAIN: '服务器证书链包含不受信任的自签名证书',
    UNABLE_TO_VERIFY_LEAF_SIGNATURE: '无法验证服务器 TLS 证书',
    ERR_TLS_CERT_ALTNAME_INVALID: '服务器证书与 WebDAV 域名不匹配',
    EPROTO: 'TLS 连接失败，请检查 HTTPS 配置',
  };
  const detail = messages[code]
    || (error && error.message)
    || (error && error.cause && error.cause.message)
    || '未知网络错误';
  return createError(`${action}失败${code ? ` [${code}]` : ''}：${detail}`, 502);
};

const validateFeature = (feature, messagePrefix = '同步数据') => {
  if (!feature || typeof feature != 'object' || typeof feature.id != 'string' || !feature.id
    || typeof feature.name != 'string' || !feature.name) {
    throw createError(`${messagePrefix}包含无效的功能模块`, 422);
  }
  return feature;
};

const validateModuleData = (value, expectedFeatureId) => {
  if (!value || typeof value != 'object' || value.version != SYNC_VERSION || !Number.isFinite(value.updatedAt)) {
    throw createError('WebDAV 模块文件版本或更新时间无效', 422);
  }
  const feature = validateFeature(value.feature, 'WebDAV 模块文件');
  if (expectedFeatureId && feature.id != expectedFeatureId) {
    throw createError(`WebDAV 模块文件与清单中的模块 ID 不一致：${expectedFeatureId}`, 422);
  }
  if (!Array.isArray(value.interfaces)) {
    throw createError(`模块“${feature.name}”缺少接口数据`, 422);
  }

  const interfaceIds = new Set();
  value.interfaces.forEach((interfaceItem) => {
    if (!interfaceItem || typeof interfaceItem != 'object' || typeof interfaceItem.id != 'string' || !interfaceItem.id) {
      throw createError(`模块“${feature.name}”包含无效的接口配置`, 422);
    }
    if (interfaceIds.has(interfaceItem.id)) {
      throw createError(`模块“${feature.name}”包含重复的接口 ID：${interfaceItem.id}`, 422);
    }
    if (interfaceItem.featureId != feature.id) {
      throw createError(`接口 ${interfaceItem.id} 未关联模块“${feature.name}”`, 422);
    }
    interfaceIds.add(interfaceItem.id);
  });

  return {
    version: SYNC_VERSION,
    updatedAt: value.updatedAt,
    feature,
    interfaces: value.interfaces,
  };
};

const validateSyncData = (value) => {
  if (!value || typeof value != 'object') {
    throw createError('同步数据格式不正确', 422);
  }
  if (value.version != SYNC_VERSION || !Number.isFinite(value.updatedAt)) {
    throw createError('同步数据版本或更新时间无效', 422);
  }
  if (!Array.isArray(value.features) || !Array.isArray(value.interfaces)) {
    throw createError('同步数据缺少功能模块或接口数据', 422);
  }

  const featureIds = new Set();
  value.features.forEach((feature) => {
    validateFeature(feature);
    if (featureIds.has(feature.id)) {
      throw createError(`同步数据包含重复的功能模块 ID：${feature.id}`, 422);
    }
    featureIds.add(feature.id);
  });

  const interfaceIds = new Set();
  value.interfaces.forEach((interfaceItem) => {
    if (!interfaceItem || typeof interfaceItem != 'object' || typeof interfaceItem.id != 'string' || !interfaceItem.id) {
      throw createError('同步数据包含无效的接口配置', 422);
    }
    if (interfaceIds.has(interfaceItem.id)) {
      throw createError(`同步数据包含重复的接口 ID：${interfaceItem.id}`, 422);
    }
    if (typeof interfaceItem.featureId != 'string' || !featureIds.has(interfaceItem.featureId)) {
      throw createError(`接口 ${interfaceItem.id} 未关联有效的功能模块`, 422);
    }
    interfaceIds.add(interfaceItem.id);
  });

  return {
    version: SYNC_VERSION,
    updatedAt: value.updatedAt,
    features: value.features,
    interfaces: value.interfaces,
  };
};

const validateManifest = (value) => {
  if (!value || typeof value != 'object' || value.version != SYNC_VERSION || !Number.isFinite(value.updatedAt)) {
    throw createError('WebDAV 模块清单版本或更新时间无效', 422);
  }
  if (!Array.isArray(value.modules)) {
    throw createError('WebDAV 模块清单缺少模块列表', 422);
  }

  const moduleIds = new Set();
  const fileNames = new Set();
  const modules = value.modules.map((moduleItem) => {
    if (!moduleItem || typeof moduleItem != 'object' || typeof moduleItem.id != 'string' || !moduleItem.id
      || typeof moduleItem.name != 'string' || !moduleItem.name) {
      throw createError('WebDAV 模块清单包含无效的模块', 422);
    }
    if (moduleIds.has(moduleItem.id)) {
      throw createError(`WebDAV 模块清单包含重复的模块 ID：${moduleItem.id}`, 422);
    }
    if (!MODULE_FILE_PATTERN.test(moduleItem.fileName || '') || fileNames.has(moduleItem.fileName)) {
      throw createError(`模块“${moduleItem.name}”的压缩文件名无效`, 422);
    }
    if (!Number.isFinite(moduleItem.updatedAt) || !Number.isInteger(moduleItem.interfaceCount) || moduleItem.interfaceCount < 0
      || !SHA256_PATTERN.test(moduleItem.sha256 || '') || !SHA256_PATTERN.test(moduleItem.contentSha256 || '')) {
      throw createError(`模块“${moduleItem.name}”的清单信息无效`, 422);
    }
    moduleIds.add(moduleItem.id);
    fileNames.add(moduleItem.fileName);
    return {
      id: moduleItem.id,
      name: moduleItem.name,
      fileName: moduleItem.fileName,
      updatedAt: moduleItem.updatedAt,
      interfaceCount: moduleItem.interfaceCount,
      sha256: moduleItem.sha256,
      contentSha256: moduleItem.contentSha256,
    };
  });

  return { version: SYNC_VERSION, updatedAt: value.updatedAt, modules };
};

const createWebDavSync = (dataDir, httpClient = axios) => {
  const configFile = path.join(dataDir, CONFIG_FILE_NAME);
  const stateFile = path.join(dataDir, STATE_FILE_NAME);
  const featuresFile = path.join(dataDir, 'features.json');
  const interfacesFile = path.join(dataDir, 'interfaces.json');

  const readConfig = () => {
    try {
      if (!fs.existsSync(configFile)) return null;
      const saved = fs.readJsonSync(configFile);
      if (!saved || !saved.endpoint || !saved.username || !saved.password) return null;
      return {
        endpoint: normalizeWebDavEndpoint(saved.endpoint),
        username: String(saved.username).trim(),
        password: String(saved.password),
      };
    } catch (error) {
      return null;
    }
  };

  const requireConfig = () => {
    const config = readConfig();
    if (!config) throw createError('尚未配置 WebDAV 连接', 400);
    return config;
  };

  const saveConfig = (config) => {
    fs.ensureDirSync(dataDir);
    fs.writeJsonSync(configFile, config, { spaces: 2, mode: 0o600 });
    try {
      fs.chmodSync(configFile, 0o600);
    } catch (error) {
      // 部分文件系统不支持 chmod，不影响本地配置保存。
    }
  };

  const readSyncState = (config) => {
    try {
      if (!fs.existsSync(stateFile)) return {};
      const saved = fs.readJsonSync(stateFile);
      if (!saved || saved.endpoint != config.endpoint || !saved.modules || typeof saved.modules != 'object') return {};
      return Object.keys(saved.modules).reduce((result, featureId) => {
        const contentSha256 = saved.modules[featureId];
        if (typeof featureId == 'string' && featureId && SHA256_PATTERN.test(contentSha256 || '')) {
          result[featureId] = contentSha256;
        }
        return result;
      }, {});
    } catch (error) {
      return {};
    }
  };

  const saveSyncState = (config, moduleEntries) => {
    try {
      const modules = readSyncState(config);
      moduleEntries.forEach((moduleItem) => {
        modules[moduleItem.id] = moduleItem.contentSha256;
      });
      fs.ensureDirSync(dataDir);
      fs.writeJsonSync(stateFile, { endpoint: config.endpoint, modules }, { spaces: 2, mode: 0o600 });
      try {
        fs.chmodSync(stateFile, 0o600);
      } catch (error) {
        // 同步基线不含凭据，chmod 失败不影响同步结果。
      }
    } catch (error) {
      console.warn('[webdav] 保存模块同步基线失败:', error.message);
    }
  };

  const getLocalUpdatedAt = () => {
    return Math.max(
      fs.existsSync(featuresFile) ? fs.statSync(featuresFile).mtimeMs : 0,
      fs.existsSync(interfacesFile) ? fs.statSync(interfacesFile).mtimeMs : 0
    );
  };

  const readLocalData = () => {
    const featuresData = fs.existsSync(featuresFile) ? fs.readJsonSync(featuresFile) : { features: [] };
    const interfacesData = fs.existsSync(interfacesFile) ? fs.readJsonSync(interfacesFile) : { interfaces: [] };
    return validateSyncData({
      version: SYNC_VERSION,
      updatedAt: getLocalUpdatedAt() || Date.now(),
      features: Array.isArray(featuresData.features) ? featuresData.features : [],
      interfaces: Array.isArray(interfacesData.interfaces) ? interfacesData.interfaces : [],
    });
  };

  const getLocalModules = (localData = readLocalData()) => {
    return localData.features.map((feature) => {
      const interfaces = localData.interfaces.filter(interfaceItem => interfaceItem.featureId == feature.id);
      const timestamps = [feature.updatedAt, feature.createdAt]
        .concat(interfaces.map(interfaceItem => interfaceItem.updatedAt))
        .map(value => Date.parse(value))
        .filter(Number.isFinite);
      return {
        id: feature.id,
        name: feature.name,
        interfaceCount: interfaces.length,
        updatedAt: Math.max(localData.updatedAt, ...timestamps),
        contentSha256: getModuleContentHash(feature, interfaces),
        feature,
        interfaces,
      };
    });
  };

  const request = async (action, config, requestConfig) => {
    try {
      return await httpClient({
        timeout: REQUEST_TIMEOUT,
        maxContentLength: MAX_TRANSFER_SIZE,
        maxBodyLength: MAX_TRANSFER_SIZE,
        validateStatus: () => true,
        auth: {
          username: config.username,
          password: config.password,
        },
        ...requestConfig,
      });
    } catch (error) {
      throw networkError(action, error);
    }
  };

  const testConnection = async (candidate) => {
    const config = {
      endpoint: normalizeWebDavEndpoint(candidate.endpoint),
      username: typeof candidate.username == 'string' ? candidate.username.trim() : '',
      password: typeof candidate.password == 'string' ? candidate.password : '',
    };
    if (!config.username) throw createError('WebDAV 用户名不能为空', 400);
    if (!config.password) throw createError('WebDAV 密码不能为空', 400);

    const response = await request('测试 WebDAV 连接', config, {
      method: 'PROPFIND',
      url: config.endpoint,
      headers: { Depth: '0' },
    });
    if ((response.status >= 200 && response.status < 300) || response.status == 207) return config;
    throw responseError('测试 WebDAV 连接', response);
  };

  const readRemoteManifest = async (config, options = {}) => {
    const response = await request('读取 WebDAV 模块清单', config, {
      method: 'GET',
      url: getWebDavFileUrl(config.endpoint),
      headers: { 'Cache-Control': 'no-cache' },
      responseType: 'arraybuffer',
    });
    if (response.status == 404) return null;
    if (response.status < 200 || response.status >= 300) throw responseError('读取 WebDAV 模块清单', response);

    const remoteMeta = {
      etag: getResponseHeader(response.headers, 'etag'),
      lastModified: getResponseHeader(response.headers, 'last-modified'),
    };
    try {
      let data = response.data;
      if (Buffer.isBuffer(data)) data = data.toString('utf8');
      else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) data = Buffer.from(data).toString('utf8');
      if (typeof data == 'string') data = JSON.parse(data);
      return { data: validateManifest(data), invalid: false, ...remoteMeta };
    } catch (error) {
      if (options.allowInvalid) return { data: null, invalid: true, ...remoteMeta };
      if (error && error.statusCode) throw error;
      throw createError('WebDAV 模块清单不是有效的 JSON', 422);
    }
  };

  const readRemoteModule = async (config, moduleItem) => {
    const response = await request(`读取模块“${moduleItem.name}”`, config, {
      method: 'GET',
      url: getModuleFileUrl(config.endpoint, moduleItem.fileName),
      headers: { 'Cache-Control': 'no-cache' },
      responseType: 'arraybuffer',
    });
    if (response.status == 404) throw createError(`远端模块“${moduleItem.name}”的压缩文件不存在`, 404);
    if (response.status < 200 || response.status >= 300) throw responseError(`读取模块“${moduleItem.name}”`, response);

    let compressed = Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data || '');
    if (compressed.length > MAX_TRANSFER_SIZE) throw createError(`模块“${moduleItem.name}”的压缩文件过大`, 413);
    if (compressed.length < 2 || compressed[0] != 0x1f || compressed[1] != 0x8b) {
      throw createError(`模块“${moduleItem.name}”不是有效的 gzip 文件`, 422);
    }
    if (hashBuffer(compressed) != moduleItem.sha256) {
      throw createError(`模块“${moduleItem.name}”的压缩文件不完整或已被修改`, 422);
    }

    let uncompressed;
    try {
      uncompressed = zlib.gunzipSync(compressed, { maxOutputLength: MAX_UNCOMPRESSED_MODULE_SIZE });
    } catch (error) {
      throw createError(`模块“${moduleItem.name}”的压缩文件已损坏或不完整`, 422);
    }
    if (uncompressed.length > MAX_UNCOMPRESSED_MODULE_SIZE) {
      throw createError(`模块“${moduleItem.name}”解压后数据过大`, 413);
    }

    let parsed;
    try {
      parsed = JSON.parse(uncompressed.toString('utf8'));
    } catch (error) {
      throw createError(`模块“${moduleItem.name}”解压后不是有效的 JSON`, 422);
    }
    const data = validateModuleData(parsed, moduleItem.id);
    if (data.feature.name != moduleItem.name || data.interfaces.length != moduleItem.interfaceCount
      || getModuleContentHash(data.feature, data.interfaces) != moduleItem.contentSha256) {
      throw createError(`模块“${moduleItem.name}”与远端清单不一致`, 422);
    }
    return data;
  };

  const cleanupFile = async (config, fileUrl) => {
    try {
      const response = await request('清理 WebDAV 文件', config, {
        method: 'DELETE',
        url: fileUrl,
        timeout: MOVE_REQUEST_TIMEOUT,
      });
      if ((response.status < 200 || response.status >= 300) && response.status != 404) {
        console.warn('[webdav] 清理文件失败:', response.status);
      }
    } catch (error) {
      console.warn('[webdav] 清理文件失败:', error.message);
    }
  };

  const uploadModule = async (config, moduleName, fileName, compressed) => {
    const tempUrl = getTempFileUrl(config.endpoint, fileName);
    const finalUrl = getModuleFileUrl(config.endpoint, fileName);
    let moved = false;
    try {
      const putResponse = await request(`上传模块“${moduleName}”`, config, {
        method: 'PUT',
        url: tempUrl,
        headers: {
          'Content-Type': 'application/gzip',
          'If-None-Match': '*',
        },
        timeout: WRITE_REQUEST_TIMEOUT,
        data: compressed,
      });
      if (putResponse.status < 200 || putResponse.status >= 300) {
        throw responseError(`上传模块“${moduleName}”`, putResponse);
      }

      const moveResponse = await request(`发布模块“${moduleName}”`, config, {
        method: 'MOVE',
        url: tempUrl,
        headers: { Destination: finalUrl, Overwrite: 'T' },
        timeout: MOVE_REQUEST_TIMEOUT,
      });
      if (moveResponse.status < 200 || moveResponse.status >= 300) {
        throw responseError(`发布模块“${moduleName}”`, moveResponse);
      }
      moved = true;
    } finally {
      if (!moved) await cleanupFile(config, tempUrl);
    }
  };

  const writeManifest = async (config, manifest, remote, options = {}) => {
    const headers = { 'Content-Type': 'application/json; charset=utf-8' };
    if (remote && remote.etag) headers['If-Match'] = remote.etag;
    else if (remote && remote.lastModified) headers['If-Unmodified-Since'] = remote.lastModified;
    else if (!remote) headers['If-None-Match'] = '*';
    else if (!options.force) {
      throw createError('WebDAV 服务未返回 ETag 或 Last-Modified，无法安全更新已有模块清单；确认后可强制覆盖', 409, 'REMOTE_UNVERIFIABLE');
    }

    const response = await request('写入 WebDAV 模块清单', config, {
      method: 'PUT',
      url: getWebDavFileUrl(config.endpoint),
      headers,
      timeout: MOVE_REQUEST_TIMEOUT,
      data: Buffer.from(JSON.stringify(manifest)),
    });
    if (response.status < 200 || response.status >= 300) {
      throw responseError('写入 WebDAV 模块清单', response);
    }
  };

  const selectModules = (modules, featureIds, action) => {
    if (featureIds == null) {
      if (!modules.length) throw createError(`暂无可${action}的功能模块`, 400);
      return modules;
    }
    if (!Array.isArray(featureIds) || !featureIds.length) {
      throw createError(`请至少选择一个要${action}的功能模块`, 400);
    }
    const selectedIds = new Set();
    featureIds.forEach((featureId) => {
      if (typeof featureId != 'string' || !featureId || selectedIds.has(featureId)) {
        throw createError(`${action}的功能模块 ID 无效或重复`, 400);
      }
      selectedIds.add(featureId);
    });
    const selected = modules.filter(moduleItem => selectedIds.has(moduleItem.id));
    if (selected.length != selectedIds.size) {
      const knownIds = new Set(modules.map(moduleItem => moduleItem.id));
      const missingId = featureIds.find(featureId => !knownIds.has(featureId));
      throw createError(`找不到要${action}的功能模块：${missingId}`, 400);
    }
    return selected;
  };

  const writeLocalData = (nextData) => {
    const data = validateSyncData(nextData);
    fs.ensureDirSync(dataDir);

    const suffix = `${process.pid}-${Date.now()}`;
    const featuresTempFile = path.join(dataDir, `.features-${suffix}.tmp`);
    const interfacesTempFile = path.join(dataDir, `.interfaces-${suffix}.tmp`);
    const oldFeatures = fs.existsSync(featuresFile) ? fs.readFileSync(featuresFile) : null;
    const oldInterfaces = fs.existsSync(interfacesFile) ? fs.readFileSync(interfacesFile) : null;

    try {
      fs.writeJsonSync(featuresTempFile, { features: data.features }, { spaces: 2 });
      fs.writeJsonSync(interfacesTempFile, { interfaces: data.interfaces }, { spaces: 2 });
      fs.moveSync(featuresTempFile, featuresFile, { overwrite: true });
      fs.moveSync(interfacesTempFile, interfacesFile, { overwrite: true });
    } catch (error) {
      if (oldFeatures) fs.writeFileSync(featuresFile, oldFeatures);
      else fs.removeSync(featuresFile);
      if (oldInterfaces) fs.writeFileSync(interfacesFile, oldInterfaces);
      else fs.removeSync(interfacesFile);
      throw createError(`覆盖本地配置失败：${error.message}`, 500);
    } finally {
      fs.removeSync(featuresTempFile);
      fs.removeSync(interfacesTempFile);
    }
  };

  const formatModuleStatus = moduleItem => ({
    id: moduleItem.id,
    name: moduleItem.name,
    interfaceCount: moduleItem.interfaceCount,
    updatedAt: moduleItem.updatedAt,
  });

  const formatStatus = (remote) => {
    const config = readConfig();
    const localModules = getLocalModules().map(formatModuleStatus);
    return {
      configured: !!config,
      endpoint: config ? config.endpoint : DEFAULT_WEBDAV_ENDPOINT,
      username: config ? config.username : '',
      remoteFileName: WEBDAV_FILE_NAME,
      remoteFileExists: remote === undefined ? null : !!remote,
      remoteFileInvalid: !!(remote && remote.invalid),
      remoteUpdatedAt: remote && remote.data ? remote.data.updatedAt : null,
      localUpdatedAt: getLocalUpdatedAt() || null,
      localModules,
      remoteModules: remote && remote.data ? remote.data.modules.map(formatModuleStatus) : [],
    };
  };

  return {
    getStatus: () => formatStatus(),
    test: async (input) => {
      await testConnection(input);
      return formatStatus();
    },
    connect: async (input) => {
      const config = await testConnection(input);
      saveConfig(config);
      return formatStatus();
    },
    refresh: async () => {
      const config = requireConfig();
      return formatStatus(await readRemoteManifest(config, { allowInvalid: true }));
    },
    push: async (options = {}) => {
      const force = options == true || options.force == true;
      const featureIds = options == true || options == false ? null : options.featureIds;
      const config = requireConfig();
      const localModules = getLocalModules();
      const selectedModules = selectModules(localModules, featureIds, '推送');
      const remote = await readRemoteManifest(config, { allowInvalid: true });

      if (!force && remote && remote.invalid) {
        throw createError('远端模块清单已损坏，继续推送会用已选择的本地模块创建新清单', 409, 'REMOTE_INVALID');
      }
      const remoteModules = remote && remote.data ? remote.data.modules : [];
      const remoteById = new Map(remoteModules.map(moduleItem => [moduleItem.id, moduleItem]));
      const syncState = readSyncState(config);
      const conflicting = selectedModules.find((localModule) => {
        const remoteModule = remoteById.get(localModule.id);
        if (!remoteModule || remoteModule.contentSha256 == localModule.contentSha256) return false;
        const syncedHash = syncState[localModule.id];
        return !syncedHash || remoteModule.contentSha256 != syncedHash;
      });
      if (!force && conflicting) {
        throw createError(`远端模块“${conflicting.name}”与本地内容不同，继续推送会覆盖远端数据`, 409, 'REMOTE_NEWER');
      }

      const changedModules = selectedModules.filter((localModule) => {
        const existing = remoteById.get(localModule.id);
        return !existing || existing.contentSha256 != localModule.contentSha256;
      });
      if (!changedModules.length && remote && remote.data) {
        saveSyncState(config, selectedModules);
        return formatStatus(remote);
      }
      if (!force && remote && !remote.etag && !remote.lastModified) {
        throw createError('WebDAV 服务未返回 ETag 或 Last-Modified，无法安全更新已有模块清单；确认后可强制覆盖', 409, 'REMOTE_UNVERIFIABLE');
      }

      const pushedAt = Date.now();
      const nextById = new Map(remoteModules.map(moduleItem => [moduleItem.id, moduleItem]));
      for (const localModule of changedModules) {
        const modulePayload = {
          version: SYNC_VERSION,
          updatedAt: pushedAt,
          ...createModuleContent(localModule.feature, localModule.interfaces),
        };
        const rawPayload = Buffer.from(JSON.stringify(modulePayload));
        if (rawPayload.length > MAX_UNCOMPRESSED_MODULE_SIZE) {
          throw createError(`模块“${localModule.name}”的数据超过单模块同步限制`, 413);
        }
        const compressed = zlib.gzipSync(rawPayload, {
          level: zlib.constants.Z_BEST_SPEED,
        });
        if (compressed.length > MAX_TRANSFER_SIZE) {
          throw createError(`模块“${localModule.name}”压缩后仍超过上传限制`, 413);
        }
        const sha256 = hashBuffer(compressed);
        const entry = {
          id: localModule.id,
          name: localModule.name,
          fileName: createModuleFileName(localModule.id, sha256),
          updatedAt: pushedAt,
          interfaceCount: localModule.interfaceCount,
          sha256,
          contentSha256: localModule.contentSha256,
        };
        await uploadModule(config, localModule.name, entry.fileName, compressed);
        nextById.set(localModule.id, entry);
      }

      const nextModules = remoteModules
        .map(moduleItem => nextById.get(moduleItem.id))
        .concat(selectedModules
          .filter(moduleItem => !remoteById.has(moduleItem.id))
          .map(moduleItem => nextById.get(moduleItem.id)));
      const nextManifest = validateManifest({ version: SYNC_VERSION, updatedAt: pushedAt, modules: nextModules });
      await writeManifest(config, nextManifest, remote, { force });
      saveSyncState(config, selectedModules.map(moduleItem => nextById.get(moduleItem.id)));
      return formatStatus({ data: nextManifest, invalid: false });
    },
    pull: async (options = {}) => {
      const force = options == true || options.force == true;
      const featureIds = options == true || options == false ? null : options.featureIds;
      const config = requireConfig();
      const remote = await readRemoteManifest(config);
      if (!remote || !remote.data.modules.length) {
        throw createError('WebDAV 中暂无模块，请先推送本地模块', 404);
      }

      const selectedRemoteModules = selectModules(remote.data.modules, featureIds, '拉取');
      const localData = readLocalData();
      const localModules = getLocalModules(localData);
      const localById = new Map(localModules.map(moduleItem => [moduleItem.id, moduleItem]));
      const syncState = readSyncState(config);
      const conflicting = selectedRemoteModules.find((remoteModule) => {
        const localModule = localById.get(remoteModule.id);
        if (!localModule || localModule.contentSha256 == remoteModule.contentSha256) return false;
        const syncedHash = syncState[remoteModule.id];
        return !syncedHash || localModule.contentSha256 != syncedHash;
      });
      if (!force && conflicting) {
        throw createError(`本地模块“${conflicting.name}”与远端内容不同，继续拉取会覆盖本地数据`, 409, 'LOCAL_NEWER');
      }

      const downloadedModules = [];
      for (const moduleItem of selectedRemoteModules) {
        downloadedModules.push(await readRemoteModule(config, moduleItem));
      }

      const downloadedById = new Map(downloadedModules.map(moduleData => [moduleData.feature.id, moduleData]));
      const selectedIds = new Set(selectedRemoteModules.map(moduleItem => moduleItem.id));
      const latestLocalData = readLocalData();
      const latestLocalModules = getLocalModules(latestLocalData);
      const latestLocalById = new Map(latestLocalModules.map(moduleItem => [moduleItem.id, moduleItem]));
      const changedDuringPull = selectedRemoteModules.find((remoteModule) => {
        const before = localById.get(remoteModule.id);
        const latest = latestLocalById.get(remoteModule.id);
        return (before && !latest) || (!before && latest)
          || (before && latest && before.contentSha256 != latest.contentSha256);
      });
      if (changedDuringPull) {
        throw createError(`拉取期间本地模块“${changedDuringPull.name}”发生变化，请重新确认后再拉取`, 409, 'LOCAL_CHANGED');
      }

      const nextFeatures = latestLocalData.features.map((feature) => {
        const downloaded = downloadedById.get(feature.id);
        return downloaded ? downloaded.feature : feature;
      });
      downloadedModules.forEach((moduleData) => {
        if (!latestLocalById.has(moduleData.feature.id)) nextFeatures.push(moduleData.feature);
      });
      const nextInterfaces = latestLocalData.interfaces
        .filter(interfaceItem => !selectedIds.has(interfaceItem.featureId))
        .concat(downloadedModules.flatMap(moduleData => moduleData.interfaces));
      const nextData = validateSyncData({
        version: SYNC_VERSION,
        updatedAt: Date.now(),
        features: nextFeatures,
        interfaces: nextInterfaces,
      });
      writeLocalData(nextData);
      saveSyncState(config, selectedRemoteModules);
      return formatStatus(remote);
    },
    disconnect: () => {
      fs.removeSync(configFile);
      return formatStatus();
    },
  };
};

module.exports = {
  WEBDAV_FILE_NAME,
  LEGACY_COMPRESSED_WEBDAV_FILE_NAME,
  LEGACY_WEBDAV_FILE_NAME,
  DEFAULT_WEBDAV_ENDPOINT,
  normalizeWebDavEndpoint,
  getWebDavFileUrl,
  getLegacyWebDavFileUrl,
  getModuleFileUrl,
  createModuleFileName,
  validateManifest,
  validateModuleData,
  validateSyncData,
  createWebDavSync,
};
