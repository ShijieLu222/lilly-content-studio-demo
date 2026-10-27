#!/bin/zsh
cd "$(dirname "$0")" || exit 1
if ! command -v npm >/dev/null 2>&1; then
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    . "$HOME/.nvm/nvm.sh"
  fi
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "请先安装 Node.js 20.19+，然后重新打开此启动文件。"
  read -r "?按回车退出"
  exit 1
fi
if [ ! -d node_modules ]; then
  npm install || exit 1
fi
echo "礼来创意工作台：http://127.0.0.1:5173/"
echo "请保持此终端打开；按 Ctrl+C 停止服务。"
npm run dev
