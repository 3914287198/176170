// 备份和还原API处理器
const { neon } = require('@neondatabase/serverless');

// 初始化 Neon PostgreSQL 客户端
// 优先使用 VERCEL 环境变量，然后是 POSTGRES_URL，最后是 DATABASE_URL
let databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

// 清理数据库URL，移除可能的空格和其他无效字符
if (databaseUrl) {
  databaseUrl = databaseUrl.trim();
}

let sql;

// 创建数据库表（如果不存在）
async function initializeDatabase() {
  try {
    // 确保数据库连接已初始化
    if (!databaseUrl) {
      throw new Error('Database URL not found in environment variables');
    }
    
    // 验证URL格式
    try {
      new URL(databaseUrl);
    } catch (urlError) {
      throw new Error('Database URL format is invalid: ' + databaseUrl);
    }
    
    if (!sql) {
      sql = neon(databaseUrl);
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// 确保数据库已初始化
let dbInitialized = false;
async function ensureDatabaseInitialized() {
  if (!dbInitialized) {
    dbInitialized = await initializeDatabase();
  }
  return dbInitialized;
}

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 验证认证令牌
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // 确保数据库已初始化
    const isDbReady = await ensureDatabaseInitialized();
    if (!isDbReady) {
      return res.status(500).json({ error: 'Database initialization failed' });
    }
    
    // 确保数据库连接已初始化
    if (!databaseUrl) {
      return res.status(500).json({ error: 'Database URL not found in environment variables' });
    }
    
    // 验证URL格式
    try {
      new URL(databaseUrl);
    } catch (urlError) {
      return res.status(500).json({ 
        error: 'Database URL format is invalid',
        url: databaseUrl,
        message: urlError.message
      });
    }
    
    if (!sql) {
      sql = neon(databaseUrl);
    }
    
    // 验证令牌是否有效
    const adminTokenResult = await sql`SELECT * FROM admin_tokens WHERE token = ${token}`;
    if (adminTokenResult.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // 处理不同的HTTP方法
    if (req.method === 'GET') {
      // 备份数据库
      try {
        // 获取所有数据
        const comments = await sql`SELECT * FROM comments`;
        const files = await sql`SELECT * FROM files`;
        const adminCredentials = await sql`SELECT * FROM admin_credentials`;
        const adminTokens = await sql`SELECT * FROM admin_tokens`;
        
        const backupData = {
          comments: comments,
          files: files,
          adminCredentials: adminCredentials,
          adminTokens: adminTokens,
          backupDate: new Date().toISOString(),
          version: '1.0'
        };
        
        return res.status(200).json(backupData);
      } catch (error) {
        console.error('Backup error:', error);
        return res.status(500).json({ error: 'Failed to create backup: ' + error.message });
      }
    } else if (req.method === 'POST') {
      // 还原数据库
      try {
        const backupData = req.body;
        
        if (!backupData) {
          return res.status(400).json({ error: 'Backup data is required' });
        }
        
        // 还原数据
        // 注意：这里需要谨慎处理，避免破坏现有数据
        
        // 开始事务
        await sql`BEGIN`;
        
        try {
          // 清空现有数据表
          await sql`DELETE FROM comments`;
          await sql`DELETE FROM files`;
          await sql`DELETE FROM admin_credentials`;
          await sql`DELETE FROM admin_tokens`;
          
          // 插入备份的数据
          if (backupData.comments && Array.isArray(backupData.comments)) {
            for (const comment of backupData.comments) {
              await sql`
                INSERT INTO comments (id, name, content, date, approved, ip, location, reply, reply_date)
                VALUES (${comment.id}, ${comment.name}, ${comment.content}, ${comment.date}, ${comment.approved}, ${comment.ip}, ${comment.location}, ${comment.reply}, ${comment.reply_date})
              `;
            }
          }
          
          if (backupData.files && Array.isArray(backupData.files)) {
            for (const file of backupData.files) {
              await sql`
                INSERT INTO files (id, name, type, url, note, children, expanded, created_at)
                VALUES (${file.id}, ${file.name}, ${file.type}, ${file.url}, ${file.note}, ${file.children}, ${file.expanded}, ${file.created_at})
              `;
            }
          }
          
          if (backupData.adminCredentials && Array.isArray(backupData.adminCredentials)) {
            for (const credential of backupData.adminCredentials) {
              await sql`
                INSERT INTO admin_credentials (id, username, password, created_at)
                VALUES (${credential.id}, ${credential.username}, ${credential.password}, ${credential.created_at})
              `;
            }
          }
          
          if (backupData.adminTokens && Array.isArray(backupData.adminTokens)) {
            for (const token of backupData.adminTokens) {
              await sql`
                INSERT INTO admin_tokens (id, token, created_at)
                VALUES (${token.id}, ${token.token}, ${token.created_at})
              `;
            }
          }
          
          // 提交事务
          await sql`COMMIT`;
          
          return res.status(200).json({ message: 'Database restored successfully' });
        } catch (error) {
          // 回滚事务
          await sql`ROLLBACK`;
          throw error;
        }
      } catch (error) {
        console.error('Restore error:', error);
        return res.status(500).json({ error: 'Failed to restore database: ' + error.message });
      }
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Backup/restore error:', error);
    return res.status(500).json({ error: 'Backup/restore failed: ' + error.message });
  }
};