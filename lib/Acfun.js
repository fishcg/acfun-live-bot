const Https = require('./Https')
const Logger  = require('./Logger')

const HEADERS = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  // 'accept-encoding': 'gzip, deflate, br',
  'accept-language': 'zh-CN,zh;q=0.9',
  'cache-control': 'max-age=0',
  'referer': 'https://www.acfun.cn/v/ac1',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'user-agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.75 Safari/537.36',
  'Origin': 'https://www.acfun.cn',
  'Cookie': '_did=web_7890798013257F33; analytics=GA1.2.1536901869.1564211663; sign_remind=1; uuid=ae932276379f10747a8fcf5abcf0b397; _did=web_7890798013257F33; acPasstoken=ChVpbmZyYS5hY2Z1bi5wYXNzdG9rZW4ScPi_PaSlyds4B4hEGYXugVb4Cp0ANMEAebU_zt6XyATK-fnCAB_WfC0OkBlfOaYr8jxGuvV5HAiUiW1zT4HWKY_weomDg7FIT1dMolk-nAKrq30Qiz-Pmpc0NsGejgB064WR5synK_7uL5g4YDfGsoIaErqF0TDd7uDbNNp-mP7P0DOW_CIgeKhBUi8uZWQUT4FqPNON156K1Ft3pZdBacMm9lofGRgoBTAB; auth_key=494754; ac_username=%E8%89%B2%E9%AC%BC%E9%A2%86%E8%A2%96; acPostHint=d2547e5a728ed235356eb01753ac63a491ea; ac_userimg=https%3A%2F%2Fimgs.aixifan.com%2Fstyle%2Fimage%2F201907%2FUe8Bg2zvAOPpWObXXuVnIwD85so3wpJu.jpg; didv=1605884180361; lsv_js_player_v2_main=0f4135; safety_id=AAJdxFcbjyGwiJhz5iY9pcLk; csrfToken=nUoCptmmhkh1AnUUWSIEfvv0; session_id=94893491ED4EE71; webp_supported=%7B%22lossy%22%3Atrue%2C%22lossless%22%3Atrue%2C%22alpha%22%3Atrue%2C%22animation%22%3Atrue%7D; Hm_lvt_2af69bc2b378fb58ae04ed2a04257ed1=1606917089,1607001967,1607090134,1607156366; isCloseVisit=1607270400000; cur_req_id=509964981EBB7A34_self_dd61ec7237a1c6573fc5dd6bd4196d04; cur_group_id=509964981EBB7A34_self_dd61ec7237a1c6573fc5dd6bd4196d04_0; Hm_lpvt_2af69bc2b378fb58ae04ed2a04257ed1=1607171873; WEBLOGGER_INCREAMENT_ID_KEY=9420; WEBLOGGER_HTTP_SEQ_ID=9024',
}

class Acfun {

  constructor() {
    this.header = HEADERS
    this.reqSuccessCode = 0
  }

  async getLiveUserinfo(userID) {
    let res = await Https.ajaxAsync({
      hostname: 'live.acfun.cn',
      path: `/rest/pc-direct/user/userInfo?userId=${userID}`,
      method: 'GET',
      dataType: 'json',
      headers: HEADERS,
      params: {},
    })
    if (!res || res.result !== this.reqSuccessCode) {
      let errMsg = !res ? '网络请求失败' : res.error_msg
      Logger.error(`获取用户信息失败，userID：${userID}，${errMsg}`)
      return null
    }
    return res.profile
  }

  /**
   * 获取用户直播间 ID
   * 若未开播或未创建直播间，则返回 0
   *
   * @param userID
   * @returns {Promise<*>}
   */
  async getLiveID(userID) {
    let res = await this.getLiveUserinfo(userID)
    if (!res || res.result !== this.reqSuccessCode) {
      return null
    }
    return res.liveId !== undefined ? res.liveId : 0
  }
}

let AC = new Acfun()
module.exports = AC
