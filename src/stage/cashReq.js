const Scene = require('telegraf/scenes/base')
const WizardScene = require('telegraf/scenes/wizard')
const Transaction = require('../model/Transaction')
const { leave } = require('telegraf/stage')
const User = require('../model/User')
const Markup = require('telegraf/markup')
const Composer = require('telegraf/composer')

const numericH = new Composer()

numericH.hears(/^\d*$/, async ctx => {
  if (isNaN(ctx.message.text)) {
    return ctx.reply('فرمت وارد شده صحیح نیست دوباره امتحان کنید')
  }
  let num = +ctx.match[0]
  if (num / 1000 > ctx.user.charge) {
    ctx.reply(
      'مبلغ وارد شده بیشتر از وجه تضمیت شماست لطفا دوباره امتحان کنیدو جهت انصراف کلمه خروج را ارسال کنید.'
    )
  } else {
    ctx.reply(`لطفا مبلغ مد نظر خود را به تومان و حروف وارد نمایید.
              برای مثال:  پنج میلیون تومان`)
    ctx.session.num = num
    // ctx.session.state = 'alphebetic asked'
    ctx.wizard.next()
  }
})

numericH.hears('خروج', leave())

numericH.action(
  'cancel',
  (ctx, next) => {
    ctx.deleteMessage()
    next()
  },
  leave()
)

const alphH = new Composer()
const finalH = new Composer()

alphH.on('text', ctx => {
  ctx.session.alph = ctx.message.text
  ctx.reply(
    'در صورتی که توضیحاتی برای درخواست خود دارید وارد نمایید در غیر اینصورت کلمه تایید را وارد نمایید.'
  )
  ctx.wizard.next()
})

finalH.on('text', async (ctx, next) => {
  if (ctx.message != 'تایید') {
    ctx.session.exp = ctx.message.text
  }
  let c = await ctx.setting.getCode()
  let transaction = new Transaction({
    code: c,
    userId: ctx.message.from.id,
    charge: ctx.session.num,
    chargeStr: ctx.session.alph,
    ischarge: false,
    explain: ctx.session.exp
  })

  delete ctx.session.num
  delete ctx.session.alph
  delete ctx.session.exp

  transaction = await transaction.save()

  ctx.reply(`درخواست شما با موفقیت ثبت گردید و نتیجه ی درخواست پس از بررسی به حضورتان اعلام می گردد.

📃 شماره درخواست : ${transaction.code}
          
📣 توجه داشته باشید درخواست حسابداری شما به دلیل محدودیت های بانکی و یا زمانبر بودن پیگیری تراکنش ها ممکن است تا 24 ساعت به طول بیانجامد لذا در طول این مدت از مراجعه به خصوصی مدیران جدا خودداری نمایید. از صبر و شکیبایی شما سپاسگذاریم.`)

  /**
   * todo user information is also needed
   */
  let caption = 'درخواست وجه\n'
  caption += `مقدار به عدد: ${transaction.charge} \n`
  caption += `مقدار به حروف: ${transaction.chargeStr}\n`
  caption += `توضیحات کاربر: ${transaction.explain}\n`
  caption += ``
  let owner = await User.findOne({
    role: 'bot-owner'
  })
  ctx.telegram.sendMessage(owner.userId, caption, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'تایید',
            callback_data: `confirmtransaction:${transaction.code}`
          },
          {
            text: 'رد',
            callback_data: `rejecttransaction:${transaction.code}`
          }
        ],
        [
          {
            text: 'انجام شد',
            callback_data: `donetransaction:${transaction.code}`
          }
        ]
      ]
    }
  })

  next()
},leave())

alphH.hears('خروج', leave())

alphH.action(
  'cancel',
  (ctx, next) => {
    ctx.deleteMessage()
    next()
  },
  leave()
)

numericH.use(ctx => ctx.reply('متوجه نشدم دوباره امتحان کنید'))
alphH.use(ctx => ctx.reply('متوجه نشدم دوباره امتحان کنید'))

const scene = new WizardScene(
  'cashReq',
  ctx => {
    ctx.reply(
      'لطفا مبلغ مد نظر خود را به تومان به صورت عددی وارد نمایید.',
      Markup.inlineKeyboard([[{ text: 'انصراف', callback_data: 'cancel' }]])
        .resize()
        .extra()
    )
    ctx.wizard.next()
    //   ctx.session.state = 'numeric asked'
  },
  numericH,
  alphH,
  finalH
)

// const cashReqScene = new Scene('cashReq')
// cashReqScene.enter(ctx => {
//   ctx.reply(
//     'لطفا مبلغ مد نظر خود را به تومان به صورت عددی وارد نمایید.',
//     Markup.inlineKeyboard([[{ text: 'انصراف', callback_data: 'cancel' }]])
//       .resize()
//       .extra()
//   )
//   ctx.session.state = 'numeric asked'
// })
// cashReqScene.hears('خروج', leave())

// cashReqScene.action(
//   'cancel',
//   (ctx, next) => {
//     ctx.deleteMessage()
//     next()
//   },
//   leave()
// )

// cashReqScene.on(
//   'text',
//   async (ctx, next) => {
//     let done = false
//     switch (ctx.session.state) {
//       case 'numeric asked':
//         if (isNaN(ctx.message.text)) {
//           ctx.reply('فرمت وارد شده صحیح نیست دوباره امتحان کنید')
//         } else {
//           ctx.reply(`لطفا مبلغ مد نظر خود را به تومان و حروف وارد نمایید.
//                 برای مثال:  پنج میلیون تومان`)
//           let num = +ctx.message.text
//           if (num / 1000 > ctx.user.charge) {
//             ctx.reply(
//               'مبلغ وارد شده بیشتر از وجه تضمیت شماست لطفا دوباره امتحان کنیدو جهت انصراف کلمه خروج را ارسال کنید.'
//             )
//           } else {
//             ctx.session.num = num
//             ctx.session.state = 'alphebetic asked'
//           }
//         }
//         break
//       case 'alphebetic asked':
//         ctx.session.alph = ctx.message.text
//         ctx.reply(
//           'در صورتی که توضیحاتی برای درخواست خود دارید وارد نمایید در غیر اینصورت کلمه تایید را وارد نمایید.'
//         )
//         ctx.session.state = 'explaines asked'
//         break
//       case 'explaines asked':
//         if (ctx.message != 'تایید') {
//           ctx.session.exp = ctx.message.text
//         }
//         let c = await ctx.setting.getCode()
//         let transaction = new Transaction({
//           code: c,
//           userId: ctx.message.from.id,
//           charge: ctx.session.num,
//           chargeStr: ctx.session.alph,
//           ischarge: false,
//           explain: ctx.session.exp
//         })

//         delete ctx.session.num
//         delete ctx.session.alph
//         delete ctx.session.exp

//         transaction = await transaction.save()

//         ctx.reply(`درخواست شما با موفقیت ثبت گردید و نتیجه ی درخواست پس از بررسی به حضورتان اعلام می گردد.

//             📃 شماره درخواست : ${transaction.code}
            
//             📣 توجه داشته باشید درخواست حسابداری شما به دلیل محدودیت های بانکی و یا زمانبر بودن پیگیری تراکنش ها ممکن است تا 24 ساعت به طول بیانجامد لذا در طول این مدت از مراجعه به خصوصی مدیران جدا خودداری نمایید. از صبر و شکیبایی شما سپاسگذاریم.`)

//         /**
//          * todo user information is also needed
//          */
//         let caption = 'درخواست وجه\n'
//         caption += `مقدار به عدد: ${transaction.charge} \n`
//         caption += `مقدار به حروف: ${transaction.chargeStr}\n`
//         caption += `توضیحات کاربر: ${transaction.explain}\n`
//         caption += ``
//         let owner = await User.findOne({
//           role: 'bot-owner'
//         })
//         ctx.telegram.sendMessage(owner.userId, caption, {
//           reply_markup: {
//             inline_keyboard: [
//               [
//                 {
//                   text: 'تایید',
//                   callback_data: `confirmtransaction:${transaction.code}`
//                 },
//                 {
//                   text: 'رد',
//                   callback_data: `rejecttransaction:${transaction.code}`
//                 }
//               ],
//               [
//                 {
//                   text: 'انجام شد',
//                   callback_data: `donetransaction:${transaction.code}`
//                 }
//               ]
//             ]
//           }
//         })
//         done = true

//         break
//     }
//     if (done) next()
//   },
//   leave()
// )

module.exports = scene
