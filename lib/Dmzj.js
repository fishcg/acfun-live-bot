const util = require('util')
const path = require('path')
const fs = require('fs')
const Https = require('./Https')
const oss = require('../component/OSS')
const logger = require('../lib/Logger')
const { hash_hmac, date } = require('../lib/Utils')
const { TEMP_PATH } = require('../config/system')

const DOMAIN = 'www.dmzj.com'
const NEWS_DOMAIN = 'news.dmzj.com'
const STATIC = 'https://images.missevan.com'
const HEADERS = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'accept-encoding': 'gzip, deflate, br',
  'accept-language': 'zh-CN,zh;q=0.9',
  'cache-control': 'max-age=0',
  'cookie': 'UM_distinctid=165d8713f431c-03be91a8ec41a-54103715-1fa400-165d8713f4532b; show_tip_1=0',
  'referer': 'https://news.dmzj.com/article/12875.html',
  'upgrade-insecure-requests': '1',
  'if-modified-since': 'Thu, 04 Jan 2018 01:57:35 GMT',
  'if-none-match': "5a4d8a0f-a939e",
  'user-agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.75 Safari/537.36',
}

let writeFileASync = util.promisify(fs.writeFile)

class Dmzj {

  constructor() {
    this.domain = DOMAIN
    this.newDomain = NEWS_DOMAIN
    this.header = HEADERS
    this.static = STATIC
  }

  /**
   * 下载图片并上传到 OSS 仓库后返回图片地址
   *
   * @param {String} imageUrl 图片网络地址
   * @return {String} 图片 OSS 地址
   */
  async getImage(imageUrl) {
    if (!imageUrl) throw new Error('图片网络地址错误（dmzj）')
    let ossDir = 'news/' + date(Date.parse(new Date()) / 1000, 'yyyyMM/dd') + '/'
    let downloadDir = path.join(TEMP_PATH, 'news')
    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir)
    imageUrl = imageUrl.replace(this.static, '')
    let extName = path.extname(imageUrl);
    let imageName = hash_hmac('md5', imageUrl) + extName
    let saveName =  ossDir + imageName
    let downloadName = path.join(downloadDir, imageName)
    let res = await Https.ajaxAsync({
      hostname: 'images.dmzj.com',
      path: imageUrl,
      method: 'GET',
      headers: this.header,
    }, 'binary')
    if (!res.success) {
      logger.error(`dmzj 图片下载失败：${imageUrl}`)
      return null
    }
    await writeFileASync(downloadName, res.data, 'binary')
    let body =  await oss.put(saveName, downloadName)
    if (200 !== body.res.status) {
      logger.error(`dmzj 图片上传 OSS 失败：${downloadName}`)
      return null
    }
    // 删除临时图片
    fs.unlink(downloadName, err => {})
    return saveName
  }
}

module.exports = new Dmzj()

