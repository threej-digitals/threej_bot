require("dotenv").config();
const bot = new (require("telegraf").Telegraf)(process.env.BOT_TOKEN);
const tgbot = new (require("./modules/tgbot").Tgbot)(
  parseInt(process.env.BOT_ADMIN)
);
const { CATEGORIES } = require("./modules/tgbot");
const LANGUAGES = {
  ar: "اللغة العربية",
  bn: "বাংলা",
  cn: "中国人",
  de: "Deutsche",
  en: "English",
  es: "Español",
  fr: "Français",
  gu: "ગુજરાતી",
  hi: "हिंदी",
  id: "Indonesian",
  it: "Italiano",
  ja: "日本語",
  kn: "ಕನ್ನಡ",
  ko: "한국어",
  ky: "Кыргызча",
  la: "Latine",
  ms: "Melayu",
  ml: "മലയാളം",
  mr: "मराठी",
  ne: "नेपाली",
  nl: "Deutsch",
  no: "norsk",
  pa: "ਪੰਜਾਬੀ",
  fa: "فارسی",
  pt: "Português",
  ru: "Pусский",
  sa: "संस्कृत",
  sv: "svenska",
  ta: "தமிழ்",
  te: "తెలుగు",
  th: "ภาษาไทย",
  tr: "Türk",
  uk: "Український",
  ur: "اردو",
  uz: "O'zbek",
  vi: "tiếng Việt",
  mt: "multiple",
  "": "Other",
};

// Update chat flag when new ANONYMOUS vote received from poll
bot.on("poll", (ctx) =>
  require("./modules/handleReport").handleReport(ctx, tgbot)
);

bot.on("channel_post", async (ctx) => {
  if (!(ctx.channelPost || ctx.channelPost.reply_markup)) return;
  if (process.env.TGDIRECTORYCHATID != ctx.channelPost.chat.id) return;
  let username =
    ctx.channelPost.reply_markup.inline_keyboard[1][0].url.split("/")[3];

  var chatDetails = await tgbot.getChatFromDB(username);
  sharingLink = `${process.env.TGPAGELINK}?tgcontentid=${
    chatDetails.CID
  }&username=${chatDetails.USERNAME || ""}`;

  return await tgbot.postLinkToReddit(
    `${chatDetails.TITLE} · 👥 ${chatDetails.SUBSCOUNT || ""} · ${
      CATEGORIES[chatDetails.CATEGORY]
    } · ${LANGUAGES[chatDetails.CLANGUAGE]}`,
    sharingLink
  );
});

//return if received action is not performed by a user
bot.use(async (ctx, next) => {
  // console.log(JSON.stringify(ctx.update));
  if (
    typeof ctx.from == "undefined" &&
    typeof ctx.callbackQuery == "undefined" &&
    typeof ctx.myChatMember == "undefined"
  )
    return true;

  // log user and proceed
  try {
    if (
      !(await tgbot.logUser(
        ctx.from || ctx.callbackQuery.from || ctx.myChatMember.from
      ))
    )
      return true;
  } catch (error) {
    tgbot.logError(error);
    return true;
  }

  return await next();
});

// handle bot commands
bot.use(async (ctx, next) => {
  if (ctx?.message?.entities && ctx.message.entities[0].type == "bot_command") {
    return await require("./modules/commands").handleCommands(
      ctx.update,
      tgbot
    );
  }
  return await next();
});

bot.on("sticker", (ctx) =>
  require("./modules/stickers").handleStickers(ctx, tgbot)
);

// handle change in chat memeber status
bot.on("my_chat_member", (ctx) =>
  require("./modules/myChatMember").myChatMember(ctx, tgbot)
);

// handle callback queries
bot.on("callback_query", (ctx) =>
  require("./modules/callbackHandler").handleCallback(ctx, tgbot)
);

// handle inline queries
bot.on("inline_query", (ctx) =>
  require("./modules/inlineQueryHandler").handleInlineQueries(ctx, tgbot)
);

// handle text message received from user
bot.on("text", (ctx) =>
  require("./modules/textMessage").handleText(ctx, tgbot)
);

// handle errors
bot.catch((err) => {
  tgbot.logError(err);
});

// Launch bot
bot.launch({
  polling: {
    allowed_updates: [
      "callback_query",
      "inline_query",
      "message",
      "chat_member",
      "chat_join_request",
      "my_chat_member",
      "poll",
    ],
  },
});
// Production
/*
bot.launch({
    webhook:{
        domain: process.env.webhookDomain,
        hookPath: process.env.WEBHOOKPATH,
        secretToken: process.env.SECRETTOKEN,
        port: 443,
        allowed_updates: [
            'callback_query',
            'inline_query',
            'message',
            'chat_member',
            'chat_join_request',
            'my_chat_member',
            'poll'
        ]
    }
})
*/

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

process.on("uncaughtException", function (err) {
  console.log(err);
});
