const path = require('path');
const fs = require('fs');
const os = require('os');

let archiver, AdmZip, fsExtra;
try {
    archiver = require('archiver');
    AdmZip = require('adm-zip');
    fsExtra = require('fs-extra');
} catch (e) {
    console.error('[備份助手] ❌ 缺少依賴！請在插件目錄下執行 "npm install"');
}

const PLUGIN_ID = 'tavern-backup-assistant';
const PLUGIN_DIR = __dirname;
const EXTENSION_DIR = path.join(process.cwd(), 'public', 'scripts', 'extensions', 'third-party', 'TavernBackupAssistant');
const BACKUP_TEMP_DIR = path.join(os.tmpdir(), 'st_backup_temp');

let currentTask = { status: 'idle', progress: 0, message: '', resultFile: null };

function getDirectorySize(dirPath, excludeDirs) {
    let size = 0;
    if (!fs.existsSync(dirPath)) return 0;
    try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            if (excludeDirs && excludeDirs.includes(file)) continue;
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) size += getDirectorySize(filePath);
            else size += stats.size;
        }
    } catch (e) {}
    return size;
}

function cleanTempFolder() {
    try {
        if (fs.existsSync(BACKUP_TEMP_DIR)) {
            fsExtra.emptyDirSync(BACKUP_TEMP_DIR);
        } else {
            fs.mkdirSync(BACKUP_TEMP_DIR, { recursive: true });
        }
    } catch (e) {
        console.error('[備份助手] 清理暫存資料夾失敗:', e);
    }
}

function installFrontend() {
    try {
        if (!fs.existsSync(EXTENSION_DIR)) fs.mkdirSync(EXTENSION_DIR, { recursive: true });
        ['index.js', 'style.css', 'manifest.json'].forEach(file => {
            const src = path.join(PLUGIN_DIR, 'public', file);
            const dest = path.join(EXTENSION_DIR, file);
            if (fs.existsSync(src)) fs.copyFileSync(src, dest);
        });
        console.log('[備份助手] UI 擴充檔案已安裝/更新。');
    } catch (err) {
        console.error('[備份助手] UI 安裝錯誤:', err);
    }
}

function updateStatus(progress, message, status = 'working') {
    currentTask.progress = Math.min(100, Math.max(0, Math.round(progress)));
    currentTask.message = message;
    currentTask.status = status;
}

// 需要排除的目錄（避免備份插件自身及快取）
const DATA_EXCLUDE_DIRS = ['TavernBackupAssistant-TW'];

function init(app, config) {
    installFrontend();
    if (!fs.existsSync(BACKUP_TEMP_DIR)) fs.mkdirSync(BACKUP_TEMP_DIR, { recursive: true });

    app.get('/status', (req, res) => res.json(currentTask));

    app.post('/backup', async (req, res) => {
        if (currentTask.status === 'working') return res.status(409).json({ error: '任務進行中' });
        if (!archiver) return res.status(500).json({ error: '缺少依賴' });

        cleanTempFolder();

        const { data, extensions, themes, config: incConfig, secrets } = req.body;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `ST_Backup_${timestamp}.zip`;
        const filePath = path.join(BACKUP_TEMP_DIR, fileName);

        currentTask.resultFile = null;
        updateStatus(0, '正在掃描檔案...', 'working');

        const output = fs.createWriteStream(filePath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        const rootDir = process.cwd();

        const P = {
            data: path.join(rootDir, 'data'),
            extGlobal: path.join(rootDir, 'public', 'scripts', 'extensions'),
            extUser: path.join(rootDir, 'data', 'default-user', 'extensions'),
            themeGlobal: path.join(rootDir, 'public', 'themes'),
            themeUser: path.join(rootDir, 'data', 'default-user', 'themes'),
            movables: path.join(rootDir, 'public', 'Movables')
        };

        let totalBytes = 0;
        if (data) totalBytes += getDirectorySize(P.data, DATA_EXCLUDE_DIRS);
        if (extensions) {
            totalBytes += getDirectorySize(P.extGlobal);
            if (!data) totalBytes += getDirectorySize(P.extUser);
        }
        if (themes) {
            totalBytes += getDirectorySize(P.themeGlobal);
            if (!data) totalBytes += getDirectorySize(P.themeUser);
        }
        if (incConfig) totalBytes += 10000;

        archive.pipe(output);

        archive.on('progress', (progress) => {
            const percent = totalBytes > 0 ? (progress.fs.processedBytes / totalBytes) * 100 : 50;
            updateStatus(percent, `正在打包：${Math.round(progress.fs.processedBytes / 1024 / 1024)}MB`);
        });

        output.on('close', () => {
            currentTask.resultFile = fileName;
            updateStatus(100, '完成！', 'done');
        });

        archive.on('error', (err) => {
            updateStatus(0, '錯誤：' + err.message, 'error');
        });

        // 備份 data 時排除插件自身目錄，避免打包暫存檔案
        if (data) {
            const dataEntries = fs.readdirSync(P.data);
            dataEntries.forEach(entry => {
                if (DATA_EXCLUDE_DIRS.includes(entry)) return;
                const fullPath = path.join(P.data, entry);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    archive.directory(fullPath, 'data/' + entry);
                } else {
                    archive.file(fullPath, { name: 'data/' + entry });
                }
            });
        }
        if (extensions) {
            archive.directory(P.extGlobal, 'public/scripts/extensions');
            if (!data && fs.existsSync(P.extUser)) archive.directory(P.extUser, 'data/default-user/extensions');
        }
        if (themes) {
            archive.directory(P.themeGlobal, 'public/themes');
            if (!data && fs.existsSync(P.themeUser)) archive.directory(P.themeUser, 'data/default-user/themes');
            if (fs.existsSync(P.movables)) archive.directory(P.movables, 'public/Movables');
        }
        if (incConfig && fs.existsSync(path.join(rootDir, 'config.yaml'))) {
            archive.file(path.join(rootDir, 'config.yaml'), { name: 'config.yaml' });
        }
        if (secrets && fs.existsSync(path.join(rootDir, 'secrets.json'))) {
            archive.file(path.join(rootDir, 'secrets.json'), { name: 'secrets.json' });
        }

        archive.append(JSON.stringify({ createdBy: 'TavernBackupAssistant-TW', version: '2.2-tw' }), { name: 'backup_info.json' });
        archive.finalize();

        res.json({ success: true, message: '備份已開始' });
    });

    app.get('/download/:filename', (req, res) => {
        const file = path.join(BACKUP_TEMP_DIR, req.params.filename);
        if (fs.existsSync(file)) {
            res.download(file, (err) => {
                if (!err) {
                    try {
                        fs.unlinkSync(file);
                        console.log(`[備份助手] 暫存檔案已清理: ${req.params.filename}`);
                    } catch (e) {}
                }
            });
        } else {
            res.status(404).send('找不到檔案');
        }
    });

    app.post('/restore', (req, res) => {
        if (!AdmZip) return res.status(500).json({ error: '缺少依賴' });

        cleanTempFolder();
        updateStatus(0, '正在接收檔案...', 'working');
        const fileName = 'restore_upload.zip';
        const filePath = path.join(BACKUP_TEMP_DIR, fileName);
        const writeStream = fs.createWriteStream(filePath);

        req.pipe(writeStream);

        writeStream.on('finish', async () => {
            try {
                updateStatus(20, '校驗檔案中...', 'working');
                const zip = new AdmZip(filePath);
                const rootDir = process.cwd();

                updateStatus(30, '正在解壓覆蓋...', 'working');
                zip.extractAllTo(rootDir, true);

                try { fs.unlinkSync(filePath); } catch(e) {}

                updateStatus(100, '還原成功！請重新整理頁面。', 'done');
                res.json({ success: true });
            } catch (err) {
                updateStatus(0, '失敗：' + err.message, 'error');
                res.json({ success: false, error: err.message });
            }
        });

        writeStream.on('error', () => res.json({ success: false }));
    });
}

module.exports = { init, info: { id: PLUGIN_ID, name: '酒館備份助手', description: '一鍵備份與還原工具（繁體中文版）' } };
