# 文件助手

一个本地 Windows 桌面文件助手，用来把常用文件按“项目/场景”整理起来，支持搜索、标签、备注、打开文件和打开所在文件夹。

## 运行

```powershell
npm install
npm run dev
```

如果 npm 需要走本机代理：

```powershell
npm install --proxy http://127.0.0.1:7897 --https-proxy http://127.0.0.1:7897
npm run dev
```

检查构建：

```powershell
npm run typecheck
npm run build
```

## 边界

- 软件只管理文件入口，不移动、不修改、不删除真实文件。
- “移除入口”只会从软件列表删除记录。
- 数据保存在 Electron `userData` 目录下的本地 JSON 文件中。
- v1 不做全盘扫描、云同步和账号系统。
