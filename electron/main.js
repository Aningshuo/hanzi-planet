const { app, BrowserWindow, ipcMain, dialog, shell, Menu, session } = require('electron');
const path = require('path');
const fs = require('fs');

const isMac = process.platform === 'darwin';
let mainWindow = null;

function dataFile() {
  return path.join(app.getPath('userData'), 'hanzi-planet-data.json');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1040,
    minHeight: 680,
    center: true,
    show: false,
    backgroundColor: '#fdf6ec',
    title: '汉字星球 · 识字工作台',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 18, y: 22 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      backgroundThrottling: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about', label: '关于汉字星球' },
            { type: 'separator' },
            { role: 'hide', label: '隐藏' },
            { role: 'hideOthers', label: '隐藏其他' },
            { role: 'unhide', label: '显示全部' },
            { type: 'separator' },
            { role: 'quit', label: '退出' }
          ]
        }]
      : []),
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '使用说明',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '使用说明',
              message: '汉字星球 · 识字工作台',
              detail:
                '每天陪孩子学 2-3 个字，跟着「玩 → 认 → 练 → 写 → 说」五步走。\n' +
                '学习地图按单元解锁，每学完 8 个字可做一次单元小测。\n' +
                '复习中心会按记忆曲线提醒复习，绘本馆用已学汉字生成分级读物。\n' +
                '家长中心可查看学习报告、设置时长与环节开关。'
            });
          }
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  // 允许“说”环节使用麦克风录音（仅本地播放，不上传）
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'audioCapture') return callback(true);
    callback(false);
  });
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

// ---------- 数据持久化 ----------
ipcMain.handle('data:load', async () => {
  try {
    const raw = fs.readFileSync(dataFile(), 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
});

ipcMain.handle('data:save', async (_e, data) => {
  try {
    const tmp = dataFile() + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data), 'utf8');
    fs.renameSync(tmp, dataFile());
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.handle('data:export', async (_e, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: '导出学习档案',
    defaultPath: `汉字星球-学习档案-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  return true;
});

ipcMain.handle('data:import', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: '导入学习档案',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePaths || !filePaths[0]) return null;
  try {
    return JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
  } catch (e) {
    return null;
  }
});

ipcMain.handle('data:reset', async () => {
  try {
    if (fs.existsSync(dataFile())) fs.unlinkSync(dataFile());
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.handle('app:info', async () => ({
  version: app.getVersion(),
  platform: process.platform,
  electron: process.versions.electron,
  userData: app.getPath('userData')
}));
