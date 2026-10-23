# Justfile for BETAFPV Matrix 1S 5IN1 II 3D Interactive Explorer

# Set shell to bash
set shell := ["bash", "-uc"]

# 預設動作：列出所有可用指令
default:
    @just --list

# 安裝專案相依套件
install:
    npm install

# 啟動本機 Vite 開發伺服器 (http://localhost:8080)
dev:
    npm run dev

# 執行 TypeScript 靜態型別檢查
typecheck:
    npm run typecheck

# 建置生產環境最佳化打包成品 (dist/)
build:
    npm run build

# 預覽生產環境打包成品
preview: build
    npm run preview

# 驗證 IC 封裝幾何與相片貼圖載入及釋放
check-hardware:
    npm run check:hardware

# 執行 Playwright 無頭自動化測試並截圖存至 tools/screenshots/
screenshots: build
    node tools/screenshots.mjs

# 產生 3D 模型與 BETAFPV 官方照片之側邊對照圖
compare:
    python3 tools/generate_comparison.py

# 重新由原廠照片萃取透視校正貼圖 (Homography Rectification) 與多邊形輪廓
extract-assets:
    python3 tools/extract_assets.py

# 執行完整驗證流程 (型別檢查 + 生產建置 + 硬體模型檢查 + 截圖測試 + 對照圖合成)
verify: typecheck build check-hardware screenshots compare
    @echo "✅ 全流程驗證與展示截圖合成完成！"

# 清理建置產物
clean:
    rm -rf dist
    @echo "🧹 已清除 dist/ 建置產物。"
