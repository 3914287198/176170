/**
 * 钉钉机器人消息发送工具（Node.js版本）
 * 支持：文本、Markdown、链接、ActionCard（单/多按钮）、FeedCard
 */

const crypto = require('crypto');

class DingTalkRobot {
    /**
     * 初始化机器人参数
     * @param {string} accessToken 机器人token
     * @param {string} secret 加签密钥
     */
    constructor(accessToken, secret) {
        this.accessToken = accessToken;
        this.secret = secret;
        this.apiUrl = 'https://oapi.dingtalk.com/robot/send';
    }

    /**
     * 生成带加签的请求URL
     */
    getRequestUrl() {
        const timestamp = Date.now();
        const signStr = timestamp + "\n" + this.secret;
        const signature = encodeURIComponent(Buffer.from(crypto.createHmac('sha256', this.secret).update(signStr).digest('base64')).toString());
        return `${this.apiUrl}?access_token=${this.accessToken}&timestamp=${timestamp}&sign=${signature}`;
    }

    /**
     * 发送POST请求
     */
    async sendPostRequest(postData) {
        try {
            const url = this.getRequestUrl();
            // console.log('Sending request to:', url);
            
            // 在Vercel环境中使用全局fetch，在本地环境中使用node-fetch
            let fetchFunction;
            if (typeof fetch !== 'undefined') {
                // Vercel环境
                fetchFunction = fetch;
            } else {
                // 本地环境
                const { default: fetch } = await import('node-fetch');
                fetchFunction = fetch;
            }
            
            const response = await fetchFunction(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postData)
            });

            const result = await response.json();
            return {
                success: result.errcode === 0,
                data: result,
                http_code: response.status
            };
        } catch (error) {
            return {
                success: false,
                error: `请求错误: ${error.message}`,
                http_code: 0
            };
        }
    }

    /**
     * 1. 发送文本消息
     * @param {string} content 消息内容（需含关键词）
     * @param {string[]} atMobiles @的手机号列表
     * @param {boolean} isAtAll 是否@所有人
     */
    async sendText(content, atMobiles = [], isAtAll = false) {
        const message = {
            msgtype: 'text',
            text: { content },
            at: { atMobiles, isAtAll }
        };
        return await this.sendPostRequest(message);
    }

    /**
     * 2. 发送Markdown消息
     * @param {string} title 消息标题
     * @param {string} text Markdown内容
     * @param {string[]} atMobiles @的手机号列表
     * @param {boolean} isAtAll 是否@所有人
     */
    async sendMarkdown(title, text, atMobiles = [], isAtAll = false) {
        const message = {
            msgtype: 'markdown',
            markdown: { title, text },
            at: { atMobiles, isAtAll }
        };
        return await this.sendPostRequest(message);
    }

    /**
     * 3. 发送链接消息（带预览卡片）
     * @param {string} title 标题
     * @param {string} text 描述文本
     * @param {string} messageUrl 跳转链接
     * @param {string} picUrl 图片URL（可选）
     */
    async sendLink(title, text, messageUrl, picUrl = '') {
        const message = {
            msgtype: 'link',
            link: {
                title,
                text,
                messageUrl,
                picUrl
            }
        };
        return await this.sendPostRequest(message);
    }

    /**
     * 4. 发送单按钮卡片（整体跳转）
     * @param {string} title 标题
     * @param {string} text 内容（支持Markdown）
     * @param {string} singleTitle 按钮文字
     * @param {string} singleUrl 跳转链接
     */
    async sendActionCardSingle(title, text, singleTitle, singleUrl) {
        const message = {
            msgtype: 'actionCard',
            actionCard: {
                title,
                text,
                singleTitle,
                singleURL: singleUrl
            }
        };
        return await this.sendPostRequest(message);
    }

    /**
     * 5. 发送多按钮卡片（独立跳转）
     * @param {string} title 标题
     * @param {string} text 内容（支持Markdown）
     * @param {Array<{title: string, actionURL: string}>} btns 按钮数组
     * @param {number} btnOrientation 排列方向（0垂直，1水平）
     */
    async sendActionCardMulti(title, text, btns, btnOrientation = 0) {
        const message = {
            msgtype: 'actionCard',
            actionCard: {
                title,
                text,
                btns,
                btnOrientation
            }
        };
        return await this.sendPostRequest(message);
    }

    /**
     * 6. 发送FeedCard（多图文卡片）
     * @param {Array<{title: string, messageURL: string, picURL: string}>} links 图文数组
     */
    async sendFeedCard(links) {
        const message = {
            msgtype: 'feedCard',
            feedCard: { links }
        };
        return await this.sendPostRequest(message);
    }
}

module.exports = DingTalkRobot;