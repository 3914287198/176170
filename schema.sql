-- Cloudflare D1 数据库表结构
-- 数据库名称: 176170_xyz

CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,           -- 联系方式 (格式: "QQ:123456", "微信:abc", "邮箱:abc@example.com")
    content TEXT NOT NULL,         -- 留言内容
    ip TEXT,                      -- IP地址
    location TEXT,                -- 地理位置
    date TEXT NOT NULL,           -- 提交时间 (ISO格式)
    approved INTEGER DEFAULT 0,   -- 是否已审核 (0: 否, 1: 是)
    reply TEXT,                   -- 管理员回复内容
    reply_date TEXT               -- 管理员回复时间
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_date ON comments(date);
CREATE INDEX IF NOT EXISTS idx_approved ON comments(approved);
CREATE INDEX IF NOT EXISTS idx_reply ON comments(reply);

-- 可选: 从旧的 database.json 导入数据
-- 你可以使用 Cloudflare D1 的导入功能或运行迁移脚本
