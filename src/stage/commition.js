
const Scene = require('telegraf/scenes/base')
const {
    leave
} = require('telegraf/stage')
const helpers = require('../helpers')
const assistant = require('../assistant')
const Markup = require('telegraf/markup')

const scene = new Scene('commitionScene')
scene.enter((ctx) => {
    ctx.reply('لطفا مبلغ مد نظر خود را به تومان به صورت عددی وارد نمایید.', Markup.inlineKeyboard([
        [{text: 'انصراف', callback_data: 'cancel'}]
    ]).resize().extra())
})

scene.action('cancel',(ctx,next) => {
    ctx.deleteMessage()
    next()
},leave())

scene.hears(/\d+/, async(ctx, next) => {
    let c = ctx.match[0]
    c= +c
    c/= 1000
    ctx.setting.setCommition(c)
    let group = await ctx.setting.getActiveGroup()
    // ctx.reply(JSON.parse(groups))
    console.log(group)
    assistant.sendMessage(group, `💫 کمیسیون: ${helpers.toman(c)} 💫`)
    next()
},leave())

scene.hears('خروج',
    leave()
)

module.exports = scene