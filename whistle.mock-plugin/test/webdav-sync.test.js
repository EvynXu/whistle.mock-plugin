const os = require('os');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const fs = require('fs-extra');
const {
  WEBDAV_FILE_NAME,
  createWebDavSync,
  createModuleFileName,
  getModuleFileUrl,
  getWebDavFileUrl,
  normalizeWebDavEndpoint,
  validateManifest,
  validateModuleData,
  validateSyncData,
} = require('../lib/webdav-sync');
const settingsController = require('../app/cgi-bin/settings');

const createDataDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'whistle-mock-webdav-'));
const jsonBuffer = value => Buffer.from(typeof value == 'string' ? value : JSON.stringify(value));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

const createModule = (id, name, interfaceId = `${id}-interface`) => ({
  feature: { id, name, active: true },
  interfaces: [{ id: interfaceId, featureId: id, name: `${name}接口`, urlPattern: `/api/${id}` }],
});

const writeLocalData = (dataDir, modules, updatedAt = Date.now()) => {
  const featuresFile = path.join(dataDir, 'features.json');
  const interfacesFile = path.join(dataDir, 'interfaces.json');
  fs.writeJsonSync(featuresFile, { features: modules.map(moduleItem => moduleItem.feature) });
  fs.writeJsonSync(interfacesFile, { interfaces: modules.flatMap(moduleItem => moduleItem.interfaces) });
  const time = new Date(updatedAt);
  fs.utimesSync(featuresFile, time, time);
  fs.utimesSync(interfacesFile, time, time);
  return { featuresFile, interfacesFile };
};

const writeConfig = (dataDir) => {
  fs.writeJsonSync(path.join(dataDir, 'webdav-config.json'), {
    endpoint: 'https://webdav.example.com/webdav/whistle-mock-plugin-sync/',
    username: 'tester',
    password: 'secret-password',
  });
};

const createRemoteModule = (moduleItem, updatedAt = 2000) => {
  const payload = {
    version: 1,
    updatedAt,
    feature: moduleItem.feature,
    interfaces: moduleItem.interfaces,
  };
  const compressed = zlib.gzipSync(jsonBuffer(payload), { level: zlib.constants.Z_BEST_SPEED });
  const contentSha256 = sha256(jsonBuffer({ feature: moduleItem.feature, interfaces: moduleItem.interfaces }));
  const compressedSha256 = sha256(compressed);
  return {
    compressed,
    entry: {
      id: moduleItem.feature.id,
      name: moduleItem.feature.name,
      fileName: createModuleFileName(moduleItem.feature.id, compressedSha256),
      updatedAt,
      interfaceCount: moduleItem.interfaces.length,
      sha256: compressedSha256,
      contentSha256,
    },
  };
};

const createManifest = (remoteModules, updatedAt = 2000) => ({
  version: 1,
  updatedAt,
  modules: remoteModules.map(moduleItem => moduleItem.entry),
});

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

describe('WebDAV 模块同步', () => {
  const dataDirs = [];

  afterEach(() => {
    dataDirs.splice(0).forEach(dataDir => fs.removeSync(dataDir));
  });

  test('规范化目录并生成安全的清单和模块地址', () => {
    expect(normalizeWebDavEndpoint('https://webdav.example.com/webdav/demo?x=1#hash'))
      .toBe('https://webdav.example.com/webdav/demo/');
    expect(getWebDavFileUrl('https://webdav.example.com/webdav/demo'))
      .toBe(`https://webdav.example.com/webdav/demo/${WEBDAV_FILE_NAME}`);
    const fileName = createModuleFileName('../中文/feature', 'a'.repeat(64));
    expect(fileName).toMatch(/^whistle-mock-module-[a-f0-9]{16}-[a-f0-9]{24}\.json\.gz$/);
    expect(getModuleFileUrl('https://webdav.example.com/webdav/demo', fileName))
      .toBe(`https://webdav.example.com/webdav/demo/${fileName}`);
    expect(() => normalizeWebDavEndpoint('ftp://webdav.example.com/demo')).toThrow('只支持 HTTP 或 HTTPS');
    expect(() => getModuleFileUrl('https://webdav.example.com/demo', '../secret.gz')).toThrow('文件名无效');
  });

  test('拒绝异常的清单、模块和跨模块接口引用', () => {
    expect(() => validateManifest({ version: 1, updatedAt: 1, modules: [{ id: 'x' }] }))
      .toThrow('无效的模块');
    expect(() => validateModuleData({
      version: 1,
      updatedAt: 1,
      feature: { id: 'feature-1', name: '功能' },
      interfaces: [{ id: 'interface-1', featureId: 'feature-2' }],
    })).toThrow('未关联模块');
    expect(() => validateSyncData({
      version: 1,
      updatedAt: 1,
      features: [createModule('feature-1', '功能').feature],
      interfaces: [{ id: 'interface-1', featureId: 'missing' }],
    })).toThrow('未关联有效的功能模块');
  });

  test('使用 PROPFIND 测试连接，状态展示模块名且不返回密码', async () => {
    const dataDir = createDataDir();
    dataDirs.push(dataDir);
    writeLocalData(dataDir, [createModule('feature-1', '用户中心')]);
    let request;
    const service = createWebDavSync(dataDir, async (config) => {
      request = config;
      return { status: 207, data: '', headers: {} };
    });

    await service.connect({
      endpoint: 'https://webdav.example.com/webdav/demo',
      username: 'tester',
      password: 'secret-password',
    });

    expect(request.method).toBe('PROPFIND');
    expect(request.headers.Depth).toBe('0');
    expect(service.getStatus()).toEqual(expect.objectContaining({
      configured: true,
      username: 'tester',
      localModules: [expect.objectContaining({ id: 'feature-1', name: '用户中心', interfaceCount: 1 })],
    }));
    expect(service.getStatus()).not.toHaveProperty('password');
  });

  test('鉴权和网络失败返回明确错误', async () => {
    const dataDir = createDataDir();
    dataDirs.push(dataDir);
    const authService = createWebDavSync(dataDir, async () => ({ status: 401, data: '', headers: {} }));
    await expect(authService.test({ endpoint: 'https://webdav.example.com/demo/', username: 'x', password: 'x' }))
      .rejects.toThrow('用户名或密码错误');

    const networkService = createWebDavSync(dataDir, async () => {
      const error = new Error('getaddrinfo ENOTFOUND');
      error.code = 'ENOTFOUND';
      throw error;
    });
    await expect(networkService.test({ endpoint: 'https://webdav.invalid/demo/', username: 'x', password: 'x' }))
      .rejects.toThrow('域名解析失败');
  });

  test('只推送勾选模块，每个模块独立 gzip，最后条件写入清单', async () => {
    const dataDir = createDataDir();
    dataDirs.push(dataDir);
    const userModule = createModule('feature-user', '用户中心');
    const orderModule = createModule('feature-order', '订单中心');
    writeLocalData(dataDir, [userModule, orderModule], 3000);
    writeConfig(dataDir);
    const requests = [];
    const service = createWebDavSync(dataDir, async (config) => {
      requests.push(config);
      if (config.method == 'GET') return { status: 404, data: '', headers: {} };
      return { status: config.method == 'PUT' ? 201 : 204, data: '', headers: {} };
    });

    const status = await service.push({ featureIds: ['feature-user'] });
    const gzipPut = requests.find(request => request.method == 'PUT' && request.headers['Content-Type'] == 'application/gzip');
    const manifestPut = requests.find(request => request.method == 'PUT' && request.url.endsWith(WEBDAV_FILE_NAME));
    const payload = JSON.parse(zlib.gunzipSync(gzipPut.data).toString('utf8'));
    const manifest = JSON.parse(manifestPut.data.toString('utf8'));

    expect(payload.feature.name).toBe('用户中心');
    expect(payload.interfaces).toHaveLength(1);
    expect(payload.interfaces[0].featureId).toBe('feature-user');
    expect(manifest.modules).toHaveLength(1);
    expect(manifest.modules[0].name).toBe('用户中心');
    expect(manifestPut.headers['If-None-Match']).toBe('*');
    expect(requests.findIndex(request => request == manifestPut)).toBeGreaterThan(requests.findIndex(request => request == gzipPut));
    expect(status.remoteModules.map(moduleItem => moduleItem.name)).toEqual(['用户中心']);
    expect(gzipPut.data.toString('utf8')).not.toContain('secret-password');
  });

  test('未传模块 ID 时默认全选，并为每个模块生成一个 gzip', async () => {
    const dataDir = createDataDir();
    dataDirs.push(dataDir);
    writeLocalData(dataDir, [createModule('feature-user', '用户中心'), createModule('feature-order', '订单中心')]);
    writeConfig(dataDir);
    const requests = [];
    const service = createWebDavSync(dataDir, async (config) => {
      requests.push(config);
      if (config.method == 'GET') return { status: 404, data: '', headers: {} };
      return { status: config.method == 'PUT' ? 201 : 204, data: '', headers: {} };
    });

    await service.push();
    const gzipPuts = requests.filter(request => request.method == 'PUT' && request.headers['Content-Type'] == 'application/gzip');
    const payloadNames = gzipPuts.map(request => JSON.parse(zlib.gunzipSync(request.data).toString('utf8')).feature.name);
    expect(gzipPuts).toHaveLength(2);
    expect(payloadNames).toEqual(['用户中心', '订单中心']);
  });

  test('局部推送保留未选远端模块并使用 ETag 更新清单', async () => {
    const dataDir = createDataDir();
    dataDirs.push(dataDir);
    const userModule = createModule('feature-user', '用户中心');
    const newOrderModule = createModule('feature-order', '新订单中心');
    const oldOrderModule = createModule('feature-order', '旧订单中心');
    const remoteUser = createRemoteModule(userModule, 1000);
    const remoteOrder = createRemoteModule(oldOrderModule, 1000);
    const manifest = createManifest([remoteUser, remoteOrder], 1000);
    writeLocalData(dataDir, [userModule, newOrderModule], 3000);
    writeConfig(dataDir);
    const requests = [];
    const service = createWebDavSync(dataDir, async (config) => {
      requests.push(config);
      if (config.method == 'GET') return { status: 200, data: jsonBuffer(manifest), headers: { etag: '"v1"' } };
      return { status: 204, data: '', headers: {} };
    });

    await service.push({ featureIds: ['feature-order'], force: true });
    const manifestPut = requests.find(request => request.method == 'PUT' && request.url.endsWith(WEBDAV_FILE_NAME));
    const nextManifest = JSON.parse(manifestPut.data.toString('utf8'));
    expect(nextManifest.modules.map(moduleItem => moduleItem.name)).toEqual(['用户中心', '新订单中心']);
    expect(nextManifest.modules[0].fileName).toBe(remoteUser.entry.fileName);
    expect(manifestPut.headers['If-Match']).toBe('"v1"');
  });

  test('已有清单没有并发校验头时要求确认后才能覆盖', async () => {
    const dataDir = createDataDir();
    dataDirs.push(dataDir);
    const localModule = createModule('feature-local', '本地模块');
    const remoteModule = createRemoteModule(createModule('feature-remote', '远端模块'), 1000);
    writeLocalData(dataDir, [localModule], 3000);
    writeConfig(dataDir);
    const manifest = createManifest([remoteModule], 1000);
    const service = createWebDavSync(dataDir, async (config) => {
      if (config.method == 'GET') return { status: 200, data: jsonBuffer(manifest), headers: {} };
      return { status: 204, data: '', headers: {} };
    });

    await expect(service.push({ featureIds: ['feature-local'] })).rejects.toMatchObject({
      statusCode: 409,
      conflict: 'REMOTE_UNVERIFIABLE',
    });
  });

  test('模块哈希基线避免其他模块修改掩盖远端冲突', async () => {
    const dataDir = createDataDir();
    dataDirs.push(dataDir);
    const localUser = createModule('feature-user', '本地用户中心');
    const localOrder = createModule('feature-order', '本地订单中心');
    const localOrderHash = createRemoteModule(localOrder, 1000).entry.contentSha256;
    const remoteOrder = createRemoteModule(createModule('feature-order', '远端订单中心'), 1000);
    writeLocalData(dataDir, [localUser, localOrder], 5000);
    writeConfig(dataDir);
    fs.writeJsonSync(path.join(dataDir, 'webdav-sync-state.json'), {
      endpoint: 'https://webdav.example.com/webdav/whistle-mock-plugin-sync/',
      modules: { 'feature-order': localOrderHash },
    });
    const manifest = createManifest([remoteOrder], 1000);
    const requests = [];
    const service = createWebDavSync(dataDir, async (config) => {
      requests.push(config);
      return { status: 200, data: jsonBuffer(manifest), headers: { etag: '"v2"' } };
    });

    await expect(service.push({ featureIds: ['feature-order'] })).rejects.toMatchObject({
      statusCode: 409,
      conflict: 'REMOTE_NEWER',
    });
    expect(requests.some(request => request.method == 'PUT')).toBe(false);
  });

  test('任一模块上传失败时不发布新清单', async () => {
    const dataDir = createDataDir();
    dataDirs.push(dataDir);
    writeLocalData(dataDir, [createModule('feature-1', '模块一')]);
    writeConfig(dataDir);
    const requests = [];
    const service = createWebDavSync(dataDir, async (config) => {
      requests.push(config);
      if (config.method == 'GET') return { status: 404, data: '', headers: {} };
      if (config.method == 'PUT') {
        const error = new Error('timeout');
        error.code = 'ECONNABORTED';
        throw error;
      }
      return { status: 204, data: '', headers: {} };
    });

    await expect(service.push()).rejects.toThrow('请求超时');
    expect(requests.some(request => request.method == 'MOVE')).toBe(false);
    expect(requests.some(request => request.method == 'DELETE')).toBe(true);
    expect(requests.some(request => request.method == 'PUT' && request.url.endsWith(WEBDAV_FILE_NAME))).toBe(false);
  });

  test('只拉取勾选模块，替换同 ID 模块并保留未选本地模块', async () => {
    const dataDir = createDataDir();
    dataDirs.push(dataDir);
    const localUser = createModule('feature-user', '本地用户中心');
    const localOrder = createModule('feature-order', '本地订单中心');
    const remoteUserModule = createModule('feature-user', '远端用户中心', 'remote-user-interface');
    const remoteOrderModule = createModule('feature-order', '远端订单中心', 'remote-order-interface');
    const remoteUser = createRemoteModule(remoteUserModule, 4000);
    const remoteOrder = createRemoteModule(remoteOrderModule, 4000);
    const manifest = createManifest([remoteUser, remoteOrder], 4000);
    const files = writeLocalData(dataDir, [localUser, localOrder], 1000);
    writeConfig(dataDir);
    const requests = [];
    const service = createWebDavSync(dataDir, async (config) => {
      requests.push(config);
      if (config.url.endsWith(WEBDAV_FILE_NAME)) {
        return { status: 200, data: jsonBuffer(manifest), headers: { etag: '"v1"' } };
      }
      if (config.url.endsWith(remoteUser.entry.fileName)) {
        return { status: 200, data: remoteUser.compressed, headers: {} };
      }
      return { status: 404, data: '', headers: {} };
    });

    await service.pull({ featureIds: ['feature-user'], force: true });
    const features = fs.readJsonSync(files.featuresFile).features;
    const interfaces = fs.readJsonSync(files.interfacesFile).interfaces;
    expect(features.map(feature => feature.name)).toEqual(['远端用户中心', '本地订单中心']);
    expect(interfaces.map(interfaceItem => interfaceItem.id)).toEqual(['feature-order-interface', 'remote-user-interface']);
    expect(requests.some(request => request.url.endsWith(remoteOrder.entry.fileName))).toBe(false);
  });

  test('分片损坏时不修改任何本地文件', async () => {
    const dataDir = createDataDir();
    dataDirs.push(dataDir);
    const localModule = createModule('feature-user', '本地用户中心');
    const remoteModule = createRemoteModule(createModule('feature-user', '远端用户中心'), 4000);
    const manifest = createManifest([remoteModule], 4000);
    const files = writeLocalData(dataDir, [localModule], 1000);
    writeConfig(dataDir);
    const beforeFeatures = fs.readFileSync(files.featuresFile, 'utf8');
    const beforeInterfaces = fs.readFileSync(files.interfacesFile, 'utf8');
    const service = createWebDavSync(dataDir, async (config) => {
      if (config.url.endsWith(WEBDAV_FILE_NAME)) return { status: 200, data: jsonBuffer(manifest), headers: {} };
      return { status: 200, data: Buffer.from('not-gzip'), headers: {} };
    });

    await expect(service.pull({ force: true })).rejects.toThrow('不是有效的 gzip');
    expect(fs.readFileSync(files.featuresFile, 'utf8')).toBe(beforeFeatures);
    expect(fs.readFileSync(files.interfacesFile, 'utf8')).toBe(beforeInterfaces);
  });

  test('下载期间保留未选模块修改，并拒绝覆盖发生变化的已选模块', async () => {
    const dataDir = createDataDir();
    dataDirs.push(dataDir);
    const localUser = createModule('feature-user', '本地用户中心');
    const localOrder = createModule('feature-order', '本地订单中心');
    const remoteUser = createRemoteModule(createModule('feature-user', '远端用户中心'), 4000);
    const manifest = createManifest([remoteUser], 4000);
    const files = writeLocalData(dataDir, [localUser, localOrder], 1000);
    writeConfig(dataDir);
    let modifySelected = false;
    const createService = () => createWebDavSync(dataDir, async (config) => {
      if (config.url.endsWith(WEBDAV_FILE_NAME)) return { status: 200, data: jsonBuffer(manifest), headers: {} };
      const currentFeatures = fs.readJsonSync(files.featuresFile).features;
      currentFeatures.find(feature => feature.id == (modifySelected ? 'feature-user' : 'feature-order')).description = '下载期间修改';
      fs.writeJsonSync(files.featuresFile, { features: currentFeatures });
      return { status: 200, data: remoteUser.compressed, headers: {} };
    });

    await createService().pull({ featureIds: ['feature-user'], force: true });
    expect(fs.readJsonSync(files.featuresFile).features.find(feature => feature.id == 'feature-order').description)
      .toBe('下载期间修改');

    writeLocalData(dataDir, [localUser, localOrder], 1000);
    modifySelected = true;
    const beforeInterfaces = fs.readFileSync(files.interfacesFile, 'utf8');
    await expect(createService().pull({ featureIds: ['feature-user'], force: true })).rejects.toMatchObject({
      statusCode: 409,
      conflict: 'LOCAL_CHANGED',
    });
    expect(fs.readJsonSync(files.featuresFile).features.find(feature => feature.id == 'feature-user').description)
      .toBe('下载期间修改');
    expect(fs.readFileSync(files.interfacesFile, 'utf8')).toBe(beforeInterfaces);
  });

  test('空选择和未知模块被拒绝', async () => {
    const dataDir = createDataDir();
    dataDirs.push(dataDir);
    writeLocalData(dataDir, [createModule('feature-1', '功能')]);
    writeConfig(dataDir);
    const service = createWebDavSync(dataDir, async () => ({ status: 404, data: '', headers: {} }));
    await expect(service.push({ featureIds: [] })).rejects.toThrow('至少选择一个');
    await expect(service.push({ featureIds: ['missing'] })).rejects.toThrow('找不到要推送');
  });

  test('设置默认关闭，关闭功能保留凭据；断开只删除本地凭据', () => {
    const dataDir = createDataDir();
    dataDirs.push(dataDir);
    writeConfig(dataDir);
    const getResponse = createResponse();
    settingsController.call({ dataDir }, { method: 'GET' }, getResponse);
    expect(getResponse.body.webDavSyncEnabled).toBe(false);

    const putResponse = createResponse();
    settingsController.call({ dataDir }, { method: 'PUT', body: { webDavSyncEnabled: false } }, putResponse);
    expect(fs.existsSync(path.join(dataDir, 'webdav-config.json'))).toBe(true);

    const httpClient = jest.fn();
    const status = createWebDavSync(dataDir, httpClient).disconnect();
    expect(status.configured).toBe(false);
    expect(fs.existsSync(path.join(dataDir, 'webdav-config.json'))).toBe(false);
    expect(httpClient).not.toHaveBeenCalled();
  });
});
