// IP地理位置获取API端点

const { getLocationByIP } = require('./location-utils');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Handle GET request
  if (req.method === 'GET') {
    try {
      const { ip } = req.query;
      
      if (!ip) {
        return res.status(400).json({ error: 'Missing IP parameter' });
      }
      
      // 获取地理位置信息
      const location = await getLocationByIP(ip);
      
      return res.status(200).json({ ip, location });
    } catch (error) {
      console.error('Error getting location:', error);
      return res.status(500).json({ error: 'Failed to get location information' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
};