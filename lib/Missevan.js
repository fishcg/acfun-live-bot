const Http = require('./Http.js')

const DOMAIN = 'www.maimengjun.com'
const STATIC = 'http://pic3.maimengjun.com'
const HEADERS = {
    'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
    'user-agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.75 Safari/537.36',
    'referer': 'http://www.maimengjun.com/',
    'accept': 'application/json, text/javascript, */*; q=0.01',
}

class Maimeng {
    constructor() {
        this.domain = DOMAIN
        this.header = HEADERS
        this.static = STATIC
    }

    async searchAsync(str) {
        if (!str) throw new Error('请输入关键字')
        let sound = await Http.ajaxAsync({
            hostname: this.domain,
            path: 'search/image?s=' + str,
            method: 'GET',
            dataType: 'json',
            headers: this.header
        })
        return sound
    }

    test(cb) {
        cb()
    }
}
module.exports = new Maimeng()

