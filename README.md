# 如初的网盘 - 项目文档

## 项目概述

如初的网盘是一个传奇补丁资源站，提供市面上99%的传奇补丁资源，包括装备射线补丁、BOSS射线、地砖、计时器、技能补丁等。

## 技术栈

- **前端**: HTML5 + JavaScript + Bootstrap 5
- **后端**: Cloudflare Workers + D1 数据库
- **域名**: https://mir.de5.net
- **数据库名称**: 176170_xyz
- **数据库ID**: a5ca1d3c-******-******-9a81-b77ee9b39fad

## 部署信息

### Cloudflare Workers

Worker 已部署到 Cloudflare，并通过自定义域名 `mir.de5.net` 访问。

**部署命令**:
```bash
npx wrangler deploy worker.js
npx wrangler pages deploy .
```

### Cloudflare D1 数据库

数据库表结构：

```sql
CREATE TABLE admin_tokens (
  token TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  ip TEXT,
  location TEXT,
  date TEXT NOT NULL,
  approved INTEGER DEFAULT 0,
  reply TEXT,
  reply_date TEXT
);
```

### Wrangler 配置

**wrangler.toml**:
```toml
name = "176170-xyz-comments"
main = "worker.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "176170_xyz"
database_id = "a5ca1d3c-844a-4bac-9a81-b77ee9b39fad"
```

## API 接口

### 留言管理

#### 获取留言列表
```
GET https://mir.de5.net/api/comments?page=1&limit=10
```

#### 提交留言
```
POST https://mir.de5.net/api/comments
Content-Type: application/json

{
  "name": "QQ:123456",
  "content": "留言内容",
  "ip": "1.2.3.4",
  "location": "广东省广州市"
}
```

#### 审核留言
```
POST https://mir.de5.net/api/comments/{id}/approve
Authorization: Bearer {token}
```

#### 编辑留言
```
PUT https://mir.de5.net/api/comments/{id}/edit
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "新内容",
  "approved": true
}
```

#### 回复留言
```
POST https://mir.de5.net/api/comments/{id}/reply
Authorization: Bearer {token}
Content-Type: application/json

{
  "reply": "回复内容"
}
```

#### 删除留言
```
DELETE https://mir.de5.net/api/comments/{id}
Authorization: Bearer {token}
```

### 后台管理

#### 管理员登录
```
POST https://mir.de5.net/api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

#### 备份留言
```
GET https://mir.de5.net/api/admin/backup
Authorization: Bearer {token}
```

#### 还原留言
```
POST https://mir.de5.net/api/admin/restore
Authorization: Bearer {token}
Content-Type: application/json

{
  "comments": [...]
}
```

### 其他接口

#### 获取地理位置
```
GET https://mir.de5.net/api/location?ip=1.2.3.4
```

#### 统计信息
```
GET https://mir.de5.net/api/comments?action=replied-count
GET https://mir.de5.net/api/comments?action=pending-count
```

## 功能特性

### 首页功能

- ✅ 留言列表展示（支持分页）
- ✅ 留言提交（带IP和地理位置）
- ✅ 联系方式隐私保护（使用 `maskContactInfo` 函数）
- ✅ 留言内容换行显示
- ✅ 管理员回复显示
- ✅ 文件列表展示（带搜索功能）

### 后台管理功能

- ✅ 管理员登录（Token认证）
- ✅ 留言列表查看（支持分页，每页10条）
- ✅ 留言审核（通过/拒绝）
- ✅ 留言编辑
- ✅ 留言回复（自动审核）
- ✅ 留言删除
- ✅ 数据备份（下载JSON文件）
- ✅ 数据还原（上传JSON文件）
- ✅ 统计信息（总数/待审核/已审核）

## 数据库迁移

### 备份数据格式

备份文件包含所有留言的完整信息：

```json
[
  {
    "id": 1,
    "name": "QQ:123456",
    "content": "留言内容",
    "ip": "1.2.3.4",
    "location": "广东省广州市",
    "date": "2026-01-06T03:15:17.760Z",
    "approved": 1,
    "reply": "回复内容",
    "reply_date": "2026-01-06T03:18:35.519Z"
  }
]
```

### 还原注意事项

- 还原操作会清空现有所有数据
- ID 为自增字段，还原时会保留原 ID
- 建议还原前先备份当前数据

## 开发指南

### 本地开发

1. 安装依赖：
```bash
npm install
```

2. 配置环境变量：
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
DINGTALK_ACCESS_TOKEN=your_token
DINGTALK_SECRET=your_secret
```

3. 启动本地服务器（如果需要）：
```bash
npx wrangler dev
```

### 部署到 Cloudflare

1. 登录 Cloudflare
2. 配置 D1 数据库（创建 `176170_xyz`）
3. 配置 Workers（绑定 D1 数据库）
4. 设置自定义域名 `mir.de5.net`
5. 部署 Worker：
```bash
npx wrangler deploy
```

## 环境变量配置

在 Cloudflare Workers 中配置以下环境变量：

| 变量名 | 说明 | 示例 |
|--------|------|--------|
| ADMIN_USERNAME | 管理员用户名 | admin |
| ADMIN_PASSWORD | 管理员密码 | admin123 |
| DINGTALK_ACCESS_TOKEN | 钉钉机器人Token | SEC... |
| DINGTALK_SECRET | 钉钉机器人密钥 | SEC... |

## 注意事项

1. **ID 自增**: 留言 ID 使用数据库自增，不要手动指定
2. **换行显示**: 留言内容中的换行符 `\n` 会在前端转换为 `<br>` 标签
3. **联系方式隐私**: 首页使用 `maskContactInfo` 函数隐藏联系方式，后台显示完整信息
4. **Token 验证**: 管理员 Token 有效期为 24 小时
5. **CORS 配置**: API 已配置 CORS，支持跨域请求
6. **数据备份**: 建议定期备份留言数据

## 更新日志

### 2026-01-06

- ✅ 修复 ID 自增问题（使用数据库自增而非时间戳）
- ✅ 修复留言和回复的换行显示问题
- ✅ 新增后台备份和还原留言功能
- ✅ 首页隐藏联系方式，后台正常显示
- ✅ 后台留言列表分页显示，每页10条
- ✅ 删除所有测试功能、文件、代码和 console 日志
- ✅ 整合所有文档，记录 mir.de5.net 配置
