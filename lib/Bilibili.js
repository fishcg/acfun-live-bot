const Https = require('./Http.js')

const DOMAIN = 'api.live.bilibili.com'
const STATIC = 'https://api.live.bilibili.com'
const HEADERS = {
  'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
  'user-agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.75 Safari/537.36',
  'referer': 'http://live.bilibili.com/',
  'accept': 'application/json, text/javascript, */*; q=0.01',
}

// .e.g https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=21822460
class Blibili {
  constructor() {
    this.domain = DOMAIN
    this.header = HEADERS
    this.static = STATIC
  }

  async getLiveInfo(roomID) {
    if (!roomID) throw new Error('请输入直播房间号')
    let liveInfo = await Https.ajaxAsync({
      hostname: this.domain,
      path: '/xlive/web-room/v1/index/getInfoByRoom?room_id=' + roomID,
      method: 'GET',
      dataType: 'json',
      headers: this.header,
    })
    return liveInfo
  }
}

module.exports = new Blibili()

