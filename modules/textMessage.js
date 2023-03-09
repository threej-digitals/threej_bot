const { USERPREFERENCES } = require("./tgbot");

const bot = new (require("telegraf").Telegraf)(process.env.BOT_TOKEN);

module.exports.handleText = async (ctx, tgbot) => {
  // Do not process message if not received from private chat
  if (ctx.message.chat.type != "private") return true;

  // stop processing self inline query results
  if (
    typeof ctx.message.via_bot == "object" &&
    ctx.message.via_bot.username == ctx.me
  )
    return;

  // load regional messages
  const commands = require("../messages/commands").commands(
    tgbot.user.LANGCODE || "en"
  )[0];

  ctx.sendChatAction("typing");

  // broadcast command only for admin
  const broadcastMatch = ctx.message.text.match(/broadcast (\d+) (\d+)/);
  if (broadcastMatch) {
    if (tgbot.user.TGID != process.env.BOT_ADMIN) return next();
    if (!ctx.message.reply_to_message)
      return await ctx.reply("Broadcast message not found");

    //get broadcast message id
    const msgId =
      ctx.message.reply_to_message.forward_from_message_id ||
      ctx.message.reply_to_message.message_id;
    const fromChatId =
      ctx.message.reply_to_message.forward_from_chat?.id ||
      ctx.message.reply_to_message.chat.id;

    var uid = broadcastMatch[1] || 1;
    var limit = broadcastMatch[2] || 25;

    // get users list and filter them according to their preference
    var users = await tgbot.getUsers(Number(uid), Number(limit));
    uid = users[users.length - 1].TUID;
    users = users.map((user) => {
      if (
        !(
          user.PREFERENCES == USERPREFERENCES["BLOCKED"] ||
          user.PREFERENCES == USERPREFERENCES["NOUPDATES"]
        )
      )
        return user.TGID;
    });

    var failed = 0;
    var success = 0;
    return tgbot.broadcast(users, async (id) => {
      try {
        await bot.telegram.forwardMessage(id, fromChatId, msgId, {
          disable_notification: true,
        });
        success++;
      } catch (error) {
        failed++;
        // update user preference if bot is blocked by user
        if (error.message == "403: Forbidden: bot was blocked by the user") {
          tgbot.user.TGID = id;
          return await tgbot.updateUserPreference("blocked");
        }
        tgbot.logError(error);
      }
      if (success + failed == users.length) {
        return await ctx.reply(
          `Message broadcasted to ${
            users.length - failed
          } users and last UID was ${uid}`
        );
      }
    });
  }

  var text = ctx.message.text;
  var username = false;
  try {
    //check for sticker link
    var match = text.match(/t\.me\/addstickers\/([\S]+)$/);
    if (match && match.length === 2) {
      ctx.message.sticker = { set_name: match[1] };
      return await require("./stickers").handleStickers(ctx, tgbot);
    }

    //----check for telegram chat link-----//
    match = text.match(
      /([^ \t\n]*)?(t\.me|telegram\.me|telegram\.dog)\/([0-9a-z-_A-Z]*)/
    );
    match && match.length === 4 ? (username = match[3]) : "";

    //-----Check for username-----//
    if (!username) {
      match = text.match(/^.*@([0-9a-zA-Z-_]*).*$/);
      if (match && match.length == 2) {
        username = match[1];
      }
    }

    //----- If username found then user is requesting for a chat ----//
    if (username) {
      const chatDetails = await tgbot.updateAndGetChat(
        { username: username },
        tgbot
      );
      if (typeof chatDetails != "object") {
        if (!chatDetails) return;
        if (!tgbot.knownErrors({ message: chatDetails })) {
          tgbot.logError("error while handling " + JSON.stringify(ctx.update));
        }
        return await ctx.reply(chatDetails);
      }

      return await tgbot.sendFormattedChatDetails(ctx, chatDetails);
    }

    //-----default error message------//
    return await ctx.reply(commands["unknownCommand"]);
  } catch (error) {
    tgbot.logError(
      error.message + JSON.stringify(ctx.update) + error.stack.toString()
    );
    await ctx.reply(commands["unknownError"]);
    await bot.telegram.sendMessage(
      process.env.BOT_ADMIN,
      text + "; Err: " + error.message
    );
  }
};
