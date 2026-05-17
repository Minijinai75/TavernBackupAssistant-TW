# 酒館備份助手 繁體中文版 (Tavern Backup Assistant TW)

**作者：** Minijinai75（基於 [SenriYuki 原版](https://github.com/SenriYuki/TavernBackupAssistant)）  
**版本：** 2.2-TW

專為 SillyTavern 設計的一鍵備份與還原工具，繁體中文介面。

> **🛑 重要安裝警告**
>
> **這是一個【後端插件】。**
> **嚴禁**直接在酒館網頁介面使用「擴充」→「從 URL 安裝」功能，**這會導致插件無法運作！**
> 因為本插件需要系統級權限（讀寫硬碟、解壓檔案），您**必須**使用下方的命令列方式進行安裝。

---

## ✨ 功能特色

* **一鍵全備份**：核心資料（角色/對話）、插件、主題美化、設定、金鑰。
* **一鍵還原**：拖曳 ZIP 包即可還原，自動清理暫存檔案。
* **安全防呆**：即時進度條 + 還原前二次確認。
* **繁體中文介面**：所有按鈕、提示、警告皆為繁體中文。

---

## ⚠️ 安全說明與前置要求

為了讓插件能夠正常讀寫備份檔案，你**必須**修改 `config.yaml` 設定檔。

> **🔴 風險告知：**
> 1. **啟用伺服器插件 (enableServerPlugins)**：允許插件管理你裝置上的檔案。請只安裝值得信任的作者開發的插件。
> 2. **關閉 CSRF 保護 (disableCsrfProtection)**：為了確保備份檔案能順利上傳。請勿在無密碼的情況下將酒館暴露到公網。

---

## 🚀 Zeabur 雲端部署安裝教學

如果你的 SillyTavern 是部署在 Zeabur 上（Docker + Persistent Volume），請依以下步驟操作：

### 步驟 1：開啟 Zeabur Terminal

1. 登入 [Zeabur Dashboard](https://dash.zeabur.com/)
2. 點擊你的 SillyTavern 服務
3. 點擊「Terminal」分頁，進入容器命令列

### 步驟 2：修改權限設定

在 Terminal 中執行以下指令：

```bash
sed -i 's/enableServerPlugins:.*/enableServerPlugins: true/' config.yaml
sed -i 's/disableCsrfProtection:.*/disableCsrfProtection: true/' config.yaml
echo "✅ 設定已修改完成！"
```

### 步驟 3：安裝插件

繼續在 Terminal 中執行：

```bash
cd plugins
git clone https://github.com/Minijinai75/TavernBackupAssistant-TW.git
cd TavernBackupAssistant-TW
npm install
echo "✅ 插件安裝完成！"
```

### 步驟 4：重啟服務

在 Zeabur Dashboard 中點擊「Restart」重啟你的 SillyTavern 服務。

### 步驟 5：開始使用

重啟後，在酒館的「擴充功能」選單中會出現「酒館備份助手」按鈕。

---

## 💻 電腦端安裝教學（本機部署）

### 修改設定

1. 找到 SillyTavern 資料夾中的 `config.yaml`
2. 用記事本開啟，修改以下兩行：

```yaml
enableServerPlugins: true      # 允許插件寫入檔案
disableCsrfProtection: true    # 防止上傳報錯
```

3. 儲存後重啟酒館

### 安裝插件

在酒館目錄下開啟終端機：

```bash
cd plugins
git clone https://github.com/Minijinai75/TavernBackupAssistant-TW.git
cd TavernBackupAssistant-TW
npm install
```

重啟 SillyTavern 即可使用。

---

## ❓ 常見問題

### Q: 安裝了但看不到插件？
A: 你重啟酒館了嗎？你在 `config.yaml` 裡開啟 `enableServerPlugins: true` 了嗎？

### Q: 上傳失敗 / 網路錯誤？
A: 你大概率忘記將 `disableCsrfProtection` 設為 `true` 了。

### Q: Zeabur 重新部署後插件會消失嗎？
A: 如果 `plugins/` 目錄在 Persistent Volume 的掛載路徑內，就不會消失。如果不在，每次重新部署後需要重新安裝。建議將 plugin 安裝指令加入 Dockerfile 的 entrypoint 中。

---

## 📜 致謝

* 原版作者：[SenriYuki](https://github.com/SenriYuki/TavernBackupAssistant)
* 繁體中文版：[Minijinai75](https://github.com/Minijinai75)
