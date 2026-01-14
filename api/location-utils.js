// IP地理位置获取工具函数

/**
 * 通过腾讯地图API获取IP地理位置信息
 * @param {string} ip IP地址
 * @returns {Promise<string>} 地理位置描述，如"湖南省岳阳市君山区"
 */
async function getLocationByIP(ip) {
    // 如果IP是未知或本地地址，直接返回未知
    if (!ip || ip === '未知' || ip === '127.0.0.1' || ip === '::1') {
        return '未知';
    }
    
    try {
        // 使用腾讯地图API获取地理位置信息
        // API文档: https://lbs.qq.com/service/webService/webServiceGuide/webServiceIp
        const apiKey = 'QGHBZ-K7QKP-37IDO-L2HNC-WYIH6-O5BL4'; // 这里使用您提供的key
        const url = `https://apis.map.qq.com/ws/location/v1/ip?ip=${encodeURIComponent(ip)}&key=${apiKey}&output=json`;
        
        // 设置5秒超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Tencent map API response:', data);
            
            // 检查API返回状态
            if (data.status === 0 && data.result) {
                const { ad_info } = data.result;
                if (ad_info) {
                    // 构建地理位置描述
                    let location = '';
                    
                    // 按照国家、省、市、区的顺序构建位置信息
                    if (ad_info.nation && ad_info.nation !== '中国') {
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
                    
                    // 如果没有具体的地址信息，使用adcode查询
                    if (!location && ad_info.adcode) {
                        // 可以通过adcode进一步查询详细地址，这里简化处理
                        location = `地区代码:${ad_info.adcode}`;
                    }
                    
                    return location || '未知';
                }
            } else {
                console.warn('Tencent map API error:', data.message || 'Unknown error');
            }
        } else {
            console.warn('Failed to get location from Tencent map API:', response.status);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('Tencent map API request timeout');
        } else {
            console.error('Error getting location from Tencent map API:', error.message);
        }
    }
    
    // 如果腾讯地图API失败，尝试使用ipinfo.io
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json`, {
            method: 'GET',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            console.log('IPinfo API response:', data);
            
            if (data && data.country) {
                let location = '';
                
                // 构建地理位置描述
                if (data.country && data.country !== 'CN') {
                    location += data.country;
                }
                
                if (data.region) {
                    location += data.region;
                }
                
                if (data.city) {
                    location += data.city;
                }
                
                return location || '未知';
            }
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('IPinfo API request timeout');
        } else {
            console.error('Error getting location from IPinfo API:', error.message);
        }
    }
    
    // 所有方法都失败，返回未知
    return '未知';
}

module.exports = { getLocationByIP };