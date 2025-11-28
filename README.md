# ⚪⚫ Gemini Gomoku Online (五子棋大戰)

<div align="center">
  <img src="assets/homepage.png" alt="Game Homepage" width="800" />
  <br />
  <br />
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
  [![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite)](https://vitejs.dev/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)
  [![Gemini AI](https://img.shields.io/badge/AI-Gemini-8E75B2?logo=google)](https://deepmind.google/technologies/gemini/)
</div>

這是一個現代化的五子棋網頁遊戲，結合了 **Google Gemini AI** 進行智慧對戰，並支援 **PeerJS** 實現無伺服器的即時線上對戰。

## ✨ 特色功能 (Features)

### 1. 🤖 挑戰 AI (vs Gemini)
- 整合 **Google Gemini 2.5 Flash** 模型。
- AI 會分析盤面並提供策略推理 (Reasoning)。
- 體驗與大型語言模型對弈的樂趣。

### 2. 🌍 線上對戰 (Online PvP)
- 使用 **WebRTC (PeerJS)** 技術，無需後端伺服器即可連線。
- **建立房間**：生成專屬代碼分享給朋友。
- **即時聊天**：內建文字聊天室功能。
- **狀態同步**：即時同步下棋動作與遊戲狀態。

### 3. 👥 本地雙人 (Local PvP)
- 支援單機雙人輪流對戰，適合面對面遊玩。

### 4. 🎨 精美介面
- 使用 Tailwind CSS 打造的現代化 UI。
- 擬真木紋棋盤與流暢的動畫效果。

<div align="center">
  <img src="assets/gameplay.png" alt="Gameplay Screenshot" width="800" />
</div>

## 🛠️ 技術棧 (Tech Stack)

- **Frontend Framework**: React 19
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **AI Integration**: Google GenAI SDK (`@google/genai`)
- **P2P Networking**: PeerJS

## 🚀 快速開始 (Getting Started)

### 先決條件 (Prerequisites)
- [Node.js](https://nodejs.org/) (建議 v18 以上)
- Google Gemini API Key (若要使用 AI 功能)

### 安裝與執行 (Installation)

1. **複製專案**
   ```bash
   git clone <repository-url>
   cd gemini-gomoku-online
   ```

2. **安裝依賴**
   ```bash
   npm install
   ```

3. **設定環境變數**
   在專案根目錄建立 `.env.local` 檔案，並填入您的 API Key：
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. **啟動遊戲**
   我們提供了方便的批次檔腳本：
   - **啟動伺服器**：雙擊 `start.bat`
   - **檢查狀態**：雙擊 `check_server.bat`
   - **停止伺服器**：雙擊 `stop.bat`

   或者使用指令：
   ```bash
   npm run dev
   ```

5. **開啟瀏覽器**
   前往 `http://localhost:3000` 開始遊玩！

## 📂 專案結構 (Project Structure)

```
.
├── src/
│   ├── components/    # React 組件 (Board, etc.)
│   ├── services/      # 邏輯服務 (Game Logic, Gemini AI)
│   ├── types.ts       # TypeScript 型別定義
│   ├── constants.ts   # 常數設定
│   ├── App.tsx        # 主程式入口
│   └── index.tsx      # 渲染入口
├── assets/            # 靜態資源 (Screenshots)
├── *.bat              # 管理腳本
└── README.md          # 說明文件
```

## 🤝 貢獻 (Contributing)

歡迎提交 Pull Request 或 Issue 來改進這個專案！

## 📄 授權 (License)

此專案採用 MIT 授權。
