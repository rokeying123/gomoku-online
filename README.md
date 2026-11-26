# 棋局 · 微信 H5 在线五子棋

简约竞技风的移动端优先五子棋网站。玩家通过微信内置浏览器打开 HTTPS 网址即可使用，不需要安装 App。

## 功能

- 微信 H5 / 手机浏览器适配，竖屏布局
- 创建私人房间，生成 5 位房间号
- 分享带房间号的邀请链接，好友打开后自动填入房间号
- Socket.IO 实时同步落子
- 服务端校验回合、坐标、空位和胜负
- 15×15 棋盘，黑棋先手，五子连珠判胜
- 平局判断、双方同意后再来一局、房间内聊天
- `/health` 健康检查接口

## 本地开发

需要 Node.js 18 或更高版本。

```bash
npm install
npm start
```

访问 `http://localhost:3000`。本地可用两个浏览器窗口测试；微信内访问需要部署到公网 HTTPS 域名。

## 国内云服务器部署（推荐：Ubuntu 22.04/24.04）

> 需要你自己准备云服务器、域名和备案。中国大陆服务器对外提供网站服务，通常需要先完成 ICP 备案；域名还需要配置 HTTPS 证书。不同云厂商的备案要求和流程以其官方说明为准。

1. 准备一台 Ubuntu 云服务器，开放 TCP 80、443 端口；Node 服务建议仅监听本机 `3000` 端口。
2. 将项目上传服务器，安装 Node.js 18+。
3. 在项目目录执行：

   ```bash
   npm install --omit=dev
   npm start
   ```

4. 配置 Nginx 反向代理到 `http://127.0.0.1:3000`，并启用 WebSocket Upgrade：

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_read_timeout 86400;
       }
   }
   ```

5. 为域名配置有效 HTTPS 证书，并把 Nginx 的 443 配置好。微信内打开建议使用 HTTPS。
6. 使用 PM2 或 systemd 保持 Node 服务常驻。部署后访问 `https://your-domain.com/health`，看到 `{"ok":true,...}` 即表示服务正常。
7. 把 `https://your-domain.com` 发到微信聊天中测试。创建房间后复制邀请信息，好友点开链接即可加入。

## 微信访问注意事项

- 使用已备案且解析到大陆服务器的域名，并完成 HTTPS 配置。
- 如果要在微信内长期稳定传播，需按微信公众平台/开放平台及域名业务类型要求完成相关域名业务配置；具体规则以微信平台当期要求为准。
- 服务器必须支持 Node.js 长连接和 WebSocket，不能只部署为纯静态网页。

## 当前版本边界

- 当前无需注册，昵称仅在本局使用。
- 房间和棋局状态保存在服务端内存中；服务器重启后房间会清空。
- 目前没有账号体系、持久化战绩、排行榜和观战功能。
- 适合小规模体验和验证玩法；正式公开运营前建议增加 Redis/数据库、限流、断线重连和日志监控。

## 免费部署到 Render（通过 GitHub）

1. 在 GitHub 创建一个仓库，例如 `gomoku-online`。
2. 在仓库页面选择 **Add file → Upload files**，上传本项目内的文件和 `public` 文件夹（不要把 ZIP 文件本身当作网站代码上传）。
3. 打开 Render，使用 GitHub 登录并授权访问该仓库。
4. 在 Render 选择 **New → Blueprint**，选择仓库。Render 会读取根目录的 `render.yaml`。
5. 确认创建 `gomoku-online` Web Service，等待部署完成。
6. 打开 Render 分配的 `https://……onrender.com` 地址，在两台设备上分别创建/加入房间测试。

免费实例可能在一段时间无请求后休眠，首次访问会有冷启动延迟；免费实例不适合承诺全天候在线。Render 的免费服务地区和中国大陆微信访问表现需要实际测试。

### 手机上传提示

GitHub 手机网页也可以上传文件，但文件夹上传体验因浏览器而异。若手机端无法一次上传整个 `public` 文件夹，建议使用电脑，或在 GitHub 仓库中逐个上传 `public/index.html`、`public/app.js`、`public/style.css`，并保持目录结构不变。
