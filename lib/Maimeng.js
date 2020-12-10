const Http = require('./Http.js')
const urlencode = require('urlencode');

const DOMAIN = 'api-app.maimengjun.com'
const STATIC = 'http://pic3.maimengjun.com'
const HEADERS = {
    'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
    'user-agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.75 Safari/537.36',
    'referer': 'http://www.maimengjun.com/',
    'accept': 'application/json, text/javascript, */*; q=0.01',
}
// http://api-app.maimengjun.com/prettyImages?page=1&size=30&search_label=%E8%B6%B31
class Maimeng {
    constructor() {
        this.domain = DOMAIN
        this.header = HEADERS
        this.static = STATIC
    }

    async searchAsync(str, page, pageSize) {
        if (!str) throw new Error('请输入关键字')
        str = urlencode(str)
        let images = await Http.ajaxAsync({
            hostname: this.domain,
            path: `/prettyImages?page=${page}&size=${pageSize}&search_label=${str}`,
            method: 'GET',
            dataType: 'json',
            headers: this.header
        })
        return images
    }

    test(cb) {
        cb()
    }
}
module.exports = new Maimeng()

