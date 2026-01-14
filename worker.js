var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (url.pathname === "/" || url.pathname === "/health" || url.pathname === "/api") {
      return new Response(JSON.stringify({
        status: "ok",
        message: "Comment API is running",
        database: env.DB ? "connected" : "not connected",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        path: url.pathname
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/api/comments") {
      if (request.method === "GET") {
        return handleGetComments(url, env, corsHeaders);
      } else if (request.method === "POST") {
        return handlePostComment(request, env, corsHeaders);
      }
    }
    if (url.pathname === "/api/location") {
      if (request.method === "GET") {
        return handleGetLocation(url, corsHeaders);
      }
    }
    if (url.pathname === "/api/test-dingtalk") {
      if (request.method === "GET") {
        return handleTestDingTalk(env, corsHeaders);
      }
    }
    const commentMatch = url.pathname.match(/^\/api\/comments\/([^\/]+)\/(.+)$/);
    if (commentMatch) {
      const commentId = commentMatch[1];
      const action = commentMatch[2];
      if (action === "approve" && request.method === "POST") {
        return handleApproveComment(commentId, env, corsHeaders);
      } else if (action === "reply" && request.method === "POST") {
        return handleReplyComment(commentId, request, env, corsHeaders);
      } else if (action === "edit" && request.method === "PUT") {
        return handleEditComment(commentId, request, env, corsHeaders);
      }
    }
    const deleteMatch = url.pathname.match(/^\/api\/comments\/([^\/]+)$/);
    if (deleteMatch && request.method === "DELETE") {
      const commentId = deleteMatch[1];
      return handleDeleteComment(commentId, env, corsHeaders);
    }
    if (url.pathname === "/api/admin/login" && request.method === "POST") {
      return handleAdminLogin(request, env, corsHeaders);
    }
    if (url.pathname === "/api/admin/backup" && request.method === "GET") {
      return handleBackupComments(env, corsHeaders);
    }
    if (url.pathname === "/api/admin/restore" && request.method === "POST") {
      return handleRestoreComments(request, env, corsHeaders);
    }
    return new Response(JSON.stringify({
      error: "Not Found",
      path: url.pathname,
      method: request.method
    }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};
async function handleGetComments(url, env, corsHeaders) {
  const page = parseInt(url.searchParams.get("page")) || 1;
  const limit = parseInt(url.searchParams.get("limit")) || 10;
  const action = url.searchParams.get("action");
  const isAdmin = url.searchParams.get("admin") === "true";
  const offset = (page - 1) * limit;
  try {
    if (action === "replied-count") {
      const result = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM comments WHERE reply IS NOT NULL AND reply != ""'
      ).first();
      return new Response(JSON.stringify({ count: result.count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (action === "pending-count") {
      const result = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM comments WHERE reply IS NULL OR reply = ""'
      ).first();
      return new Response(JSON.stringify({ count: result.count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const totalResult = await env.DB.prepare("SELECT COUNT(*) as total FROM comments").first();
    const comments = await env.DB.prepare(
      "SELECT * FROM comments ORDER BY date DESC LIMIT ? OFFSET ?"
    ).bind(limit, offset).all();
    let processedComments = comments.results;
    if (!isAdmin) {
      processedComments = processedComments.map((comment) => {
        const maskedName = maskContactName(comment.name);
        const hasReply = comment.reply && comment.reply.trim() !== "";
        return {
          ...comment,
          name: maskedName,
          // 姓名脱敏 QQ:前3位***后4位 / WX:前2位***后2位
          ip: null,
          // ✅ 关键：隐藏IP地址，返回null不显示
          // 无回复则隐藏评论内容，有回复则显示完整内容
          content: hasReply ? comment.content : "",
          // 标记是否需要隐藏
          isHidden: !hasReply
        };
      });
    }
    return new Response(JSON.stringify({
      comments: processedComments,
      totalComments: totalResult.total,
      currentPage: page,
      totalPages: Math.ceil(totalResult.total / limit)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch comments" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
__name(handleGetComments, "handleGetComments");
__name2(handleGetComments, "handleGetComments");

// 核心修改：优化联系方式脱敏逻辑
function maskContactName(name) {
  if (!name || !name.includes(":")) {
    return name;
  }
  const [type, info] = name.split(":", 2);
  // 如果信息长度过短（小于等于3位），直接隐藏全部
  if (info.length <= 3) {
    return `${type}:***`;
  }
  
  // 针对不同类型的联系方式做差异化脱敏
  switch (type.toLowerCase()) {
    case "qq":
      // QQ号：保留前3位和后4位，中间用***代替（例：QQ:123****7890）
      return `${type}:${info.slice(0, 3)}****${info.slice(-4)}`;
    case "wx":
    case "微信":
      // 微信号：保留前2位和后2位，中间用***代替（例：WX:ab****yz）
      return `${type}:${info.slice(0, 2)}****${info.slice(-2)}`;
    default:
      // 其他类型：保留前2位和后1位，中间用***代替（例：电话:13****9）
      return `${type}:${info.slice(0, 2)}****${info.slice(-1)}`;
  }
}
__name(maskContactName, "maskContactName");
__name2(maskContactName, "maskContactName");

async function handlePostComment(request, env, corsHeaders) {
  try {
    const { name, content, ip, location } = await request.json();
    if (!name || !content) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const insertResult = await env.DB.prepare(
      "INSERT INTO comments (name, content, ip, date, approved, reply, reply_date, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      name,
      content,
      ip || null,
      now,
      0,
      null,
      null,
      location || null
    ).run();
    if (insertResult.success) {
      const newComment = await env.DB.prepare(
        "SELECT id, name, content, ip, location, date, approved FROM comments WHERE name = ? AND content = ? ORDER BY id DESC LIMIT 1"
      ).bind(name, content).first();
      const commentId = newComment ? newComment.id : null;
      try {
        await sendDingTalkNotification(name, content, ip, location, commentId, env);
      } catch (error) {
      }
      return new Response(JSON.stringify({
        success: true,
        id: commentId,
        name: newComment?.name,
        content: newComment?.content,
        date: newComment?.date,
        approved: newComment?.approved,
        location: newComment?.location,
        ip: null
        // 提交评论时也隐藏IP返回
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } else {
      throw new Error("Failed to insert comment");
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to submit comment" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
__name(handlePostComment, "handlePostComment");
__name2(handlePostComment, "handlePostComment");

async function handleApproveComment(commentId, env, corsHeaders) {
  try {
    await env.DB.prepare(
      "UPDATE comments SET approved = 1 WHERE id = ?"
    ).bind(commentId).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to approve comment" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
__name(handleApproveComment, "handleApproveComment");
__name2(handleApproveComment, "handleApproveComment");

async function handleReplyComment(commentId, request, env, corsHeaders) {
  try {
    const { reply } = await request.json();
    if (!reply) {
      return new Response(JSON.stringify({ error: "Missing reply content" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    await env.DB.prepare(
      "UPDATE comments SET reply = ?, reply_date = ?, approved = 1 WHERE id = ?"
    ).bind(reply, (/* @__PURE__ */ new Date()).toISOString(), commentId).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to reply to comment" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
__name(handleReplyComment, "handleReplyComment");
__name2(handleReplyComment, "handleReplyComment");

async function handleEditComment(commentId, request, env, corsHeaders) {
  try {
    const { content, approved } = await request.json();
    if (!content) {
      return new Response(JSON.stringify({ error: "Missing content" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    let updateSql = "UPDATE comments SET content = ?";
    const params = [content];
    if (approved !== void 0) {
      updateSql += ", approved = ?";
      params.push(approved ? 1 : 0);
    }
    updateSql += " WHERE id = ?";
    params.push(commentId);
    await env.DB.prepare(updateSql).bind(...params).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to edit comment" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
__name(handleEditComment, "handleEditComment");
__name2(handleEditComment, "handleEditComment");

async function handleAdminLogin(request, env, corsHeaders) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return new Response(JSON.stringify({ error: "Username and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const ADMIN_USERNAME = env.ADMIN_USERNAME || "admin";
    const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "admin123";
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const token = btoa(`${Date.now()}-${Math.random()}`);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
    const result = await env.DB.prepare(
      "INSERT INTO admin_tokens (token, expires_at) VALUES (?, ?)"
    ).bind(token, expiresAt).run();
    return new Response(JSON.stringify({
      success: true,
      token
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "\u767B\u5F55\u5931\u8D25", details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
__name(handleAdminLogin, "handleAdminLogin");
__name2(handleAdminLogin, "handleAdminLogin");

async function handleDeleteComment(commentId, env, corsHeaders) {
  try {
    await env.DB.prepare(
      "DELETE FROM comments WHERE id = ?"
    ).bind(commentId).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to delete comment" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
__name(handleDeleteComment, "handleDeleteComment");
__name2(handleDeleteComment, "handleDeleteComment");

async function handleBackupComments(env, corsHeaders) {
  try {
    const result = await env.DB.prepare(
      "SELECT * FROM comments ORDER BY date DESC"
    ).all();
    const backupData = JSON.stringify(result.results, null, 2);
    return new Response(backupData, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="comments_backup_' + (/* @__PURE__ */ new Date()).toISOString().split("T")[0] + '.json"'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "\u5907\u4EFD\u5931\u8D25" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
__name(handleBackupComments, "handleBackupComments");
__name2(handleBackupComments, "handleBackupComments");

async function handleRestoreComments(request, env, corsHeaders) {
  try {
    const { comments: backupComments } = await request.json();
    if (!Array.isArray(backupComments)) {
      return new Response(JSON.stringify({ error: "\u5907\u4EFD\u6570\u636E\u683C\u5F0F\u9519\u8BEF" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    await env.DB.prepare("DELETE FROM comments").run();
    let successCount = 0;
    for (const comment of backupComments) {
      try {
        await env.DB.prepare(
          "INSERT INTO comments (id, name, content, ip, location, date, approved, reply, reply_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
          comment.id,
          comment.name,
          comment.content,
          comment.ip || null,
          comment.location || null,
          comment.date,
          comment.approved || 0,
          comment.reply || null,
          comment.reply_date || null
        ).run();
        successCount++;
      } catch (error) {
      }
    }
    return new Response(JSON.stringify({
      success: true,
      message: `\u6210\u529F\u8FD8\u539F ${successCount} \u6761\u7559\u8A00`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "\u8FD8\u539F\u5931\u8D25" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
__name(handleRestoreComments, "handleRestoreComments");
__name2(handleRestoreComments, "handleRestoreComments");

async function handleTestDingTalk(env, corsHeaders) {
  try {
    const testComment = {
      name: "QQ:123****678",
      content: "\u8FD9\u662F\u4E00\u6761\u6D4B\u8BD5\u7559\u8A00",
      ip: "220.128.168.9",
      location: "\u5E7F\u4E1C\u7701\u5E7F\u5DDE\u5E02",
      commentId: "test_" + Date.now()
    };
    await sendDingTalkNotification(
      testComment.name,
      testComment.content,
      testComment.ip,
      testComment.location,
      testComment.commentId,
      env
    );
    return new Response(JSON.stringify({
      success: true,
      message: "\u6D4B\u8BD5\u901A\u77E5\u5DF2\u53D1\u9001\uFF0C\u8BF7\u68C0\u67E5\u9489\u9489\u7FA4"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
__name(handleTestDingTalk, "handleTestDingTalk");
__name2(handleTestDingTalk, "handleTestDingTalk");

async function sendDingTalkNotification(name, content, ip, location, commentId, env) {
  try {
    const accessToken = env.DINGTALK_ACCESS_TOKEN;
    const secret = env.DINGTALK_SECRET;
    if (!accessToken || !secret) {
      console.warn("DingTalk robot not configured, skipping notification");
      return;
    }
    const timestamp = Date.now();
    const signStr = `${timestamp}
${secret}`;
    const textEncoder = new TextEncoder();
    const keyData = textEncoder.encode(secret);
    const messageData = textEncoder.encode(signStr);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signature = btoa(String.fromCharCode(...signatureArray));
    const dingTalkUrl = `https://oapi.dingtalk.com/robot/send?access_token=${accessToken}&timestamp=${timestamp}&sign=${encodeURIComponent(signature)}`;
    const beijingTime = (/* @__PURE__ */ new Date()).toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
    const adminUrl = "https://www.176170.xyz/adminlogin.html";
    const commentUrl = `${adminUrl}#comment-${commentId}`;
    const message = {
      msgtype: "actionCard",
      actionCard: {
        title: "\u4F60\u6709\u65B0\u7684\u7559\u8A00",
        text: `\u{1F4AC}\u4F60\u6709\u65B0\u7684\u7559\u8A00\uFF1A
- \u{1F4DE}\u8054\u7CFB\u65B9\u5F0F\uFF1A${name}
- \u{1F4DD}\u7559\u8A00\u5185\u5BB9\uFF1A${content}
- \u{1F30F}\u6765\u81EA\uFF1A${location || "\u672A\u77E5"}
- \u23F0\u65F6\u95F4\uFF1A${beijingTime}`,
        btnOrientation: "1",
        btns: [
          { title: "\u53BB\u56DE\u590D", actionURL: commentUrl },
          { title: "\u5FFD\u7565", actionURL: "" }
        ]
      }
    };
    const response = await fetch(dingTalkUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message)
    });
    const result = await response.json();
    if (result.errcode === 0) {
    } else {
      console.warn("\u274C \u9489\u9489\u901A\u77E5\u53D1\u9001\u5931\u8D25:", result);
    }
  } catch (error) {
  }
}
__name(sendDingTalkNotification, "sendDingTalkNotification");
__name2(sendDingTalkNotification, "sendDingTalkNotification");

async function handleGetLocation(url, corsHeaders) {
  const ip = url.searchParams.get("ip");
  if (!ip) {
    return new Response(JSON.stringify({ error: "Missing IP parameter" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  try {
    const apiKey = "QGHBZ-K7QKP-37IDO-L2HNC-WYIH6-O5BL4";
    const tencentUrl = `https://apis.map.qq.com/ws/location/v1/ip?ip=${encodeURIComponent(ip)}&key=${apiKey}&output=json`;
    const response = await fetch(tencentUrl);
    if (response.ok) {
      const data = await response.json();
      if (data.status === 0 && data.result && data.result.ad_info) {
        const { ad_info } = data.result;
        let location = "";
        if (ad_info.nation && ad_info.nation !== "\u4E2D\u56FD") {
          location += ad_info.nation;
        }
        if (ad_info.province && ad_info.province !== ad_info.nation) {
          location += ad_info.province;
        }
        if (ad_info.city && ad_info.city !== ad_info.province) {
          location += ad_info.city;
        }
        if (ad_info.district && ad_info.district !== ad_info.city) {
          location += ad_info.district;
        }
        if (!location && ad_info.adcode) {
          location = `\u5730\u533A\u4EE3\u7801:${ad_info.adcode}`;
        }
        return new Response(JSON.stringify({
          ip,
          location: location || "\u672A\u77E5"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } else {
        console.warn("Tencent map API error:", data.message || "Unknown error");
      }
    } else {
      console.warn("Failed to get location from Tencent map API:", response.status);
    }
  } catch (error) {
  }
  try {
    const ipinfoUrl = `https://ipinfo.io/${encodeURIComponent(ip)}/json`;
    const response = await fetch(ipinfoUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && data.country) {
        let location = "";
        if (data.country && data.country !== "CN") {
          location += data.country;
        }
        if (data.region) {
          location += data.region;
        }
        if (data.city) {
          location += data.city;
        }
        return new Response(JSON.stringify({
          ip,
          location: location || "\u672A\u77E5"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
  } catch (error) {
  }
  return new Response(JSON.stringify({
    ip,
    location: "\u672A\u77E5"
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
__name(handleGetLocation, "handleGetLocation");
__name2(handleGetLocation, "handleGetLocation");

export {
  worker_default as default
};