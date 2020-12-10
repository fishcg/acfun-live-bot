const util = require('util')
const path = require('path')
const fs = require('fs')
const Https = require('./Https')
const Http = require('./Https')
const oss = require('../component/OSS')
const logger = require('../lib/Logger')
const { hash_hmac, date } = require('../lib/Utils')
const { TEMP_PATH } = require('../config/system')

const DOMAIN = 'www.dilidili.name'
const NEWS_DOMAIN = 'news.dmzj.com'
const STATIC = 'https://cdn-3.haku99.com'
const HEADERS = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'accept-encoding': 'gzip, deflate, br',
  'accept-language': 'zh-CN,zh;q=0.9',
  'cache-control': 'max-age=0',
  'cookie': 'UM_distinctid=165d8713f431c-03be91a8ec41a-54103715-1fa400-165d8713f4532b; show_tip_1=0',
  'referer': 'http://www.dilidili.name/watch3/77388/',
  'user-agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.75 Safari/537.36',
}

let writeFileASync = util.promisify(fs.writeFile)

class Dilidili {

    constructor() {
        this.domain = DOMAIN
        this.newDomain = NEWS_DOMAIN
        this.header = HEADERS
        this.static = STATIC
    }

    /**
     * 下载文件并上传到 OSS 仓库后返回文件地址（数据库存入地址）
     *
     * @param {String} videoUrl 网络地址
     * @return {String} 文件 OSS 地址
     */
    async getVideo(videoUrl) {
        if (!videoUrl) throw new Error('文件网络地址错误（Dilidili）')
        let ossDir = 'video/' + date(Date.parse(new Date()) / 1000, 'yyyyMM/dd') + '/'
        let downloadDir = path.join(TEMP_PATH, 'video')
        if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir)
        videoUrl = videoUrl.replace(this.static, '')
        let extName = path.extname(videoUrl);
        let fileName = hash_hmac('md5', videoUrl) + extName
        let saveName =  ossDir + fileName
        let downloadName = path.join(downloadDir, fileName)
        let res = await Https.ajaxAsync({
            hostname: 'cdn-3.haku99.com',
            path: videoUrl,
            method: 'GET',
            headers: this.header,
        }, 'binary')
        if (!res.success) {
            logger.error(`Dlidili 文件下载失败：${videoUrl}`)
            return null
        }
        await writeFileASync(downloadName, res.data, 'binary')
        let body =  await oss.put(saveName, downloadName)
        if (200 !== body.res.status) {
            logger.error(`dmzj 文件上传 OSS 失败：${downloadName}`)
            return null
        }
        // 删除临时文件
        fs.unlink(downloadName, err => {})
        console.log(saveName)
        return saveName
    }
}

let D = new Dilidili()
D.getVideo('https://cdn-3.haku99.com/hls/2019/01/25/o01Z89ve/out028.ts')
// module.exports = new Dmzj()

