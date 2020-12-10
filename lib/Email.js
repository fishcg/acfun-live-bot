'use strict'

const util = require('util')
const nodemailer = require('nodemailer')
const stransport = require('nodemailer-smtp-transport')
const { email } = require('../app/config')

class Email {
  /**
   * 初始化邮件设置
   *
   * @param {String|Array} recipients 收件人，可为用半角逗号隔开的多个邮箱字符串或组数形式的邮箱列表
   * 如："huateng@qq.com, dinglei@163.com" 或 ["huateng@qq.com", "dinglei@163.com"]
   */
  constructor(recipients) {
    if (!recipients) {
      throw new Error('请指定接收邮件者')
    }
    this.smtpTransport = nodemailer.createTransport(stransport({
      service: email.service,
      auth: {
        user: email.user,
        pass: email.password
      }
    }))
    this.attachments = []
    this.recipients = recipients
  }

  /**
   * 发送邮件
   * @param {String} subject 发送的主题
   * @param {String} html 发送的 html 内容
   * @return {Object} 邮件发送请求结果
   * @throws {Error} 邮件发送失败时抛出异常
   */
  async send(subject, html) {
      if (!subject || !html) {
        throw new Error('发送邮件参数不合法')
      }
      this.smtpTransport.sendMailASync = util.promisify(this.smtpTransport.sendMail)
      let res = await this.smtpTransport.sendMailASync({
        from: email.user,
        to: this.recipients,
        subject: subject,
        html: html,
        attachments: this.attachments
      })
      this.attachments = []
      return res
  }

  /**
   * 添加附件
   *
   * @param {Object[]} attachments 附件信息
   * 如：[{ "filename": "233.jpg", "path": "http://test.com/233.jpg" }]
   * @throws {Error} 附件相关参数不合法时抛出异常
   */
  addAttachment(attachments) {
    if (!Array.isArray(attachments)) {
      throw new Error('邮件附件参数不合法')
    }
    for (let attachment of attachments) {
      if (!(attachment.hasOwnProperty('filename') && attachment.hasOwnProperty('path'))) {
        throw new Error('请指定附件参数名或下载地址')
      }
    }
    this.attachments = attachments
  }
}

module.exports = Email
