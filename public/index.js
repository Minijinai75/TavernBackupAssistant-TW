(function () {
    const MODAL_ID = 'backup-assistant-ui';
    const PLUGIN_BASE_URL = '/api/plugins/tavern-backup-assistant';
    let pollInterval = null;

    async function startPolling() {
        const bar = document.getElementById('ba-progress-bar');
        const txt = document.getElementById('ba-status-text');
        const warn = document.getElementById('ba-warning-blink');
        const btn = document.getElementById('btn-start-backup');

        if(pollInterval) clearInterval(pollInterval);

        pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`${PLUGIN_BASE_URL}/status`);
                const data = await res.json();

                if (bar && txt) {
                    bar.style.width = data.progress + '%';
                    txt.innerText = `${data.progress}% - ${data.message}`;

                    if (data.status === 'working') {
                        if(warn) warn.style.display = 'block';
                    }
                    if (data.status === 'done') {
                        clearInterval(pollInterval);
                        bar.style.backgroundColor = '#4caf50';
                        if(warn) warn.style.display = 'none';

                        if (data.resultFile) {
                            txt.innerText = '✅ 打包完成！瀏覽器正在下載...';
                            window.location.href = `${PLUGIN_BASE_URL}/download/${data.resultFile}`;
                        } else {
                            txt.innerText = '✅ 還原完成！請重新整理頁面。';
                        }
                        if(btn) btn.disabled = false;
                    }
                    else if (data.status === 'error') {
                        clearInterval(pollInterval);
                        bar.style.backgroundColor = '#f44336';
                        if(warn) warn.style.display = 'none';
                        alert('❌ 錯誤 (Error): ' + data.message);
                        if(btn) btn.disabled = false;
                    }
                }
            } catch(e) {}
        }, 800);
    }

    window.backupAssistant = {
        show() {
            const html = `
            <div id="${MODAL_ID}" class="ba-mask">
                <div class="ba-win">
                    <div class="ba-head">
                        <h3><i class="fa-solid fa-box-archive"></i> 酒館備份助手 <small>v2.2-TW</small></h3>
                        <div class="ba-close" onclick="document.getElementById('${MODAL_ID}').remove()">×</div>
                    </div>

                    <div class="ba-tabs">
                        <div class="ba-tab active" onclick="window.backupAssistant.switchTab(this, 'tab-backup')">📤 備份 (Backup)</div>
                        <div class="ba-tab" onclick="window.backupAssistant.switchTab(this, 'tab-restore')">📥 還原 (Restore)</div>
                    </div>

                    <div id="tab-backup" class="ba-content">
                        <div class="ba-desc">請選擇要打包的內容：</div>
                        <div class="ba-list">
                            <label class="ba-item">
                                <input type="checkbox" id="chk-data" checked>
                                <div class="ba-item-text">
                                    <div class="ba-title"><i class="fa-solid fa-database"></i> 核心資料 (Data)</div>
                                    <div class="ba-subtitle">包含：角色、聊天紀錄、群組、世界書、使用者頭像</div>
                                </div>
                            </label>
                            <label class="ba-item">
                                <input type="checkbox" id="chk-ext" checked>
                                <div class="ba-item-text">
                                    <div class="ba-title"><i class="fa-solid fa-puzzle-piece"></i> 插件 (Extensions)</div>
                                    <div class="ba-subtitle">包含：已安裝的功能性插件 (System & User)</div>
                                </div>
                            </label>
                            <label class="ba-item">
                                <input type="checkbox" id="chk-themes" checked>
                                <div class="ba-item-text">
                                    <div class="ba-title"><i class="fa-solid fa-palette"></i> 主題美化 (Themes)</div>
                                    <div class="ba-subtitle">包含：介面主題、背景圖、動態立繪 (Movables)</div>
                                </div>
                            </label>
                            <label class="ba-item">
                                <input type="checkbox" id="chk-conf" checked>
                                <div class="ba-item-text">
                                    <div class="ba-title"><i class="fa-solid fa-gears"></i> 設定 (Config)</div>
                                    <div class="ba-subtitle">config.yaml 設定檔</div>
                                </div>
                            </label>
                            <label class="ba-item">
                                <input type="checkbox" id="chk-sec">
                                <div class="ba-item-text">
                                    <div class="ba-title"><i class="fa-solid fa-key"></i> 金鑰 (Secrets)</div>
                                    <div class="ba-subtitle">API Key 等敏感資訊（慎選）</div>
                                </div>
                            </label>
                        </div>
                        <div class="ba-actions">
                            <button id="btn-start-backup" class="ba-btn primary" onclick="window.backupAssistant.doBackup()">
                                <i class="fa-solid fa-download"></i> 開始打包並下載
                            </button>
                        </div>
                    </div>

                    <div id="tab-restore" class="ba-content" style="display:none;">
                        <div class="ba-warning-box">
                            <div style="font-weight:bold; margin-bottom:5px; display:flex; align-items:center; gap:8px;">
                                <i class="fa-solid fa-triangle-exclamation"></i> 警告 (Warning)
                            </div>
                            <div style="font-size:0.9em; opacity:0.8;">
                                還原操作將 <b>直接覆蓋</b> 現有的同名檔案。<br>
                                如果目前酒館內有重要資料，請先進行備份。
                            </div>
                        </div>

                        <div class="ba-upload-area" onclick="document.getElementById('restore-file').click()">
                            <i class="fa-solid fa-file-zipper" style="font-size: 2em; margin-bottom: 10px; opacity: 0.5;"></i>
                            <div id="ba-upload-text">點擊選擇或拖曳 ZIP 檔案到此處</div>
                            <input type="file" id="restore-file" accept=".zip"
                                   onchange="window.backupAssistant.updateFileName(this)"
                                   onclick="event.stopPropagation()">
                        </div>

                        <div class="ba-actions">
                            <button id="btn-start-restore" class="ba-btn danger" onclick="window.backupAssistant.preRestore()">
                                <i class="fa-solid fa-upload"></i> 上傳並還原
                            </button>
                        </div>
                    </div>

                    <div class="ba-progress-area">
                        <div class="ba-status-text" id="ba-status-text">準備就緒 (Ready)</div>
                        <div class="ba-progress-bg">
                            <div class="ba-progress-bar" id="ba-progress-bar" style="width: 0%"></div>
                        </div>
                        <div id="ba-warning-blink" style="display:none; text-align:center; color:#ff6b6b; font-weight:bold; margin-top:8px; animation: ba-blink 1.5s infinite;">
                            ⚡ 正在處理，請勿關閉或重新整理此視窗 ⚡
                        </div>
                    </div>
                    <div class="ba-foot">Plugin by SenriYuki · TW by Minijinai75</div>
                </div>
            </div>
            <style>@keyframes ba-blink { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }</style>`;

            const exist = document.getElementById(MODAL_ID);
            if(exist) exist.remove();
            $('body').append(html);
        },

        updateFileName(input) {
            const txt = document.getElementById('ba-upload-text');
            if (input.files && input.files[0]) {
                txt.innerHTML = `<span style="color:#6fa8dc; font-weight:bold;">${input.files[0].name}</span>`;
                txt.style.opacity = '1';
            } else {
                txt.innerText = '點擊選擇或拖曳 ZIP 檔案到此處';
            }
        },

        switchTab(el, targetId) {
            document.querySelectorAll('.ba-tab').forEach(t => t.classList.remove('active'));
            el.classList.add('active');
            document.querySelectorAll('.ba-content').forEach(c => c.style.display = 'none');
            document.getElementById(targetId).style.display = 'block';
        },

        async doBackup() {
            const opts = {
                data: document.getElementById('chk-data').checked,
                extensions: document.getElementById('chk-ext').checked,
                themes: document.getElementById('chk-themes').checked,
                config: document.getElementById('chk-conf').checked,
                secrets: document.getElementById('chk-sec').checked
            };

            const btn = document.getElementById('btn-start-backup');
            btn.disabled = true;
            const bar = document.getElementById('ba-progress-bar');
            if(bar) bar.style.backgroundColor = '#6fa8dc';

            try {
                startPolling();
                const res = await fetch(`${PLUGIN_BASE_URL}/backup`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(opts)
                });
                const data = await res.json();
                if (!data.success) {
                    alert('啟動失敗 (Start Failed): ' + data.error);
                    btn.disabled = false;
                }
            } catch(e) { btn.disabled = false; }
        },

        preRestore() {
            const fileInput = document.getElementById('restore-file');
            if (!fileInput.files || fileInput.files.length === 0) return alert('請先選擇一個 ZIP 檔案！');

            if (confirm('⚠️ 嚴重警告 ⚠️\n\n即將開始還原資料，這將【覆蓋】現有檔案。\n\nData restore will OVERWRITE existing files.\n\n確定要繼續嗎？')) {
                if(confirm('再次確認 (Confirm Again)：\n\n建議先備份目前資料！\n真的要覆蓋嗎？')) this.doRestore(fileInput.files[0]);
            }
        },

        async doRestore(file) {
            const btn = document.getElementById('btn-start-restore');
            btn.disabled = true;
            startPolling();
            try {
                await fetch(`${PLUGIN_BASE_URL}/restore`, { method: 'POST', body: file });
            } catch(e) { alert('上傳錯誤 (Upload Error)'); }
            btn.disabled = false;
        }
    };

    const checkBtn = setInterval(() => {
        const bar = document.getElementById('extensionsMenu');
        if(bar && !document.getElementById('ba-open-btn')) {
            const btn = document.createElement('div');
            btn.id = 'ba-open-btn';
            btn.className = 'list-group-item flex-container flex-gap-10 interactable';
            btn.innerHTML = '<div class="fa-solid fa-box-archive"></div><div>酒館備份助手</div>';
            btn.onclick = () => window.backupAssistant.show();
            bar.appendChild(btn);
            clearInterval(checkBtn);
        }
    }, 2000);
})();
