/**
 * 钉钉通知使用示例
 * 当有新留言时发送通知
 */

const DingTalkRobot = require('./dingtalk');

// 从环境变量获取机器人参数，如果不存在则使用默认值（仅用于测试）
const accessToken = process.env.DINGTALK_ACCESS_TOKEN || 'ada335c55c006ddc351eaad285a0d1d6d45e8e0a7a917170909edba0405eb34e';
const secret = process.env.DINGTALK_SECRET || 'SECe15f72fe6b681f05e537fc413fdb42e6f5da3571cdf4bca3c79c3a4e841398e4';

// 创建机器人实例
const robot = new DingTalkRobot(accessToken, secret);

// 发送新留言通知
async function sendNewCommentNotice(contact, content, time, commentId, location) {
    try {
        // 构造直接定位到特定留言的URL
        const baseUrl = process.env.ADMIN_URL || 'https://www.176170.xyz/adminlogin.html';
        const commentUrl = `${baseUrl}#comment-${commentId}`;
        
        const result = await robot.sendActionCardMulti(
            '你有新的留言',
            `💬你有新的留言：
- 📞联系方式：${contact}
- 📝留言内容：${content}
- 🌏来自：${location}
- ⏰时间：${time}`,
            [
                {title: '去回复', actionURL: commentUrl},
                {title: '忽略', actionURL: ''}
            ],
            1 // 1=水平排列
        );
        
        if (result.success) {
            console.log('通知发送成功');
        } else {
            console.log('通知发送失败:', result.error || result.data);
        }
        
        return result;
    } catch (error) {
        console.error('发送通知时出错:', error.message);
        return { success: false, error: error.message };
    }
}

// 直接发送示例（无需任何提示）
// (async () => {
//     await sendNewCommentNotice(
//         'QQ:2013720',
//         '系统升级',
//         '2025/10/21 21:29:40'
//     );
// })();

module.exports = { sendNewCommentNotice };