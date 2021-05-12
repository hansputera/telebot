const axios = require("axios").default;
const Telegraf = require('telegraf').Telegraf;
const bot = new Telegraf('');
const fs = require('fs');
const path = require('path');
const delay = ms => new Promise(resolve => setTimeout(() => resolve(), ms));
const commands = require('./commands.js');
const chalk = require('chalk');
const dns = require("dns");
const ytdl = require("ytdl-core");
const Canvas = require("canvas-constructor");
const { exec } = require("child_process");
const eslintRule = require("./lib/eslintDocs");
bot.util = require("./util");
function addUser(userId)
{
    const fileName = path.resolve(__dirname, 'local', `user-${userId}.json`);
    if (fs.existsSync(fileName)) return false;
    else {
        const obj = {
            userId,
            credits: Math.floor(Math.random() * 20),
            bio: "Hello there!",
            items: []
        }
        fs.writeFileSync(fileName, JSON.stringify(obj, null, 2));
        return true;
    }
}

function checkUser(userId)
{
    const fileName = path.resolve(__dirname, 'local', `user-${userId}.json`);
    return fs.existsSync(fileName);
}

function user(userId) {
    const fileName = path.resolve(__dirname, 'local', `user-${userId}.json`);
    return JSON.parse(fs.readFileSync(fileName,"utf-8"));
}

function parseCommand(message) {
    const entity = message.entities[0];

    const rawCommand = message.text.substring(1, entity.length);
    let command;
    if (rawCommand.search("@") === -1)
        command = rawCommand;
    else
        command = rawCommand.substring(0, rawCommand.search("@"));

    let args = [];
    if (message.text.length > entity.length) {
        args = message.text.slice(entity.length + 1).split(" ");
    }

    return {args, command};
}


bot.help(async(ctx) => {
    const adaGa = checkUser(ctx.from.id);
    if (!adaGa) return await ctx.reply('🛠 Registrasi dulu yuk di private chat aku @' + (await bot.telegram.getMe()).username);
    const emojis = ["💡", "🔖", "📃"];
    const randEmoji = Math.floor(Math.random() * emojis.length);
    const emoji = emojis[randEmoji];
    let text = "";
    commands.forEach(command => {
        text += `${command.emoji} ${command.command} - ${command.description}\n`;
    });
    const member = await ctx.getChatMember(ctx.from.id);

    await ctx.replyWithMarkdown(`${emoji} ꜱᴇʟᴀᴍᴀᴛ ᴅᴀᴛᴀɴɢ ᴅɪ ᴍᴇɴᴜ ʙᴀɴᴛᴜᴀɴ ${emoji}\n✨✨ 𝓑𝓮𝓻𝓲𝓴𝓾𝓽 𝓪𝓭𝓪𝓵𝓪𝓱 𝓭𝓪𝓯𝓽𝓪𝓻 𝓹𝓮𝓻𝓲𝓷𝓽𝓪𝓱𝓷𝔂𝓪 ✨\n\n${text}`, {
        reply_markup: {
            inline_keyboard: [[{
                text: "🗑",
                callback_data: JSON.stringify({
                    id: ctx.from.id,
                    admin: member.status === "administrator",
                    deleteAct: true
                })
            }]],
            remove_keyboard: true,
            selective: true
        },
        reply_to_message_id: ctx.message.message_id
    });
});


bot.command("bin", async(ctx) => {
    const input = parseCommand(ctx.message).args.join(" ").trim();
    if (!input) return await ctx.reply("Mohon masukan teks yang akan di masukan ke dalam bin!", {
        reply_to_message_id: ctx.message.message_id
    });
    const m = await ctx.reply("Mohon tunggu ...", { reply_to_message_id: ctx.message.message_id });
    const { data } = await axios.post("https://bin.hansputera.me/documents", input);
    await ctx.telegram.editMessageText(m.chat.id, m.message_id, "", `Berikut adalah tautannya: https://bin.hansputera.me/${data.key}`);
});

bot.command("tosticker", async(ctx) => {
    const replyMsg = ctx.message.reply_to_message;
    if (!replyMsg.photo) return await ctx.reply("Mohon reply pesan yang mengandung foto!");
    const photos = replyMsg.photo.filter(pht => pht.file_id !== pht.file_id);
    if (photos.length > 1) {
        for (const photo of photos) {
            const url = await ctx.telegram.getFileLink(photo.file_id);
            await ctx.replyWithSticker({
                url
            });
        }
    } else {
        const url = await ctx.telegram.getFileLink(replyMsg.photo[0].file_id);
        await ctx.replyWithSticker({ url });
    }
});

bot.command("mock", async(ctx) => {
    const input = parseCommand(ctx.message).args.join(" ").trim();
    if (!input) return await ctx.replyWithMarkdown("**Mohon masukan teks yang akan di mock!**");
    const firstText = input.split(";")[0];
    const secondText = input.split(";")[1];
    const { data } = await axios.get(`https://api.imgflip.com/caption_image?username=REPLACE_IT&password=REPLACE_IT&template_id=102156234&text0=${firstText}${secondText ? `&text1=${secondText}` : ""}`);
    await ctx.replyWithPhoto({ filename: "mOcK SpOnGeBoB", url: data.data.url }, { caption: "InI dIa MoCk ImAgeNyA" });
});

bot.command("mcstatus", async(ctx) => {
    const input = parseCommand(ctx.message).args.join(" ").trim();
    if (!input) return await ctx.replyWithMarkdown("**Mohon masukan ip minecraft server!**");
    try {
        const m = await ctx.reply("Mohon tunggu ...");
        const { data } = await axios.get(`https://api.mcsrvstat.us/2/${input}`);
        await ctx.deleteMessage(m.message_id);
        await ctx.replyWithPhoto(`https://mcapi.us/server/image?ip=${data.ip}&theme=dark`);
        await ctx.replyWithMarkdown(`Alamat minecraft ditemukan, berikut adalah informasinya:\n\n- IP: \`${data.ip}\`\n- Port: \`${data.port}\`\n- Online: ${data.online ? "Ya" : "Tidak"}, (${data.players.online}/${data.players.max}) players\n+ \`${data.version}\``);
    } catch {
        await ctx.reply("Alamat Minecraft tidak dapat ditemukan!");
    }
});

bot.command("eslint", async(ctx) => {
    const { args } = parseCommand(ctx.message);
    const ruleInput = args.join(" ");
    if (!ruleInput) return await ctx.reply("Masukan nama rule!", {
        reply_to_message_id: ctx.message.message_id
    });
    let rules = await eslintRule.findRule(ruleInput);
    if (!rules.length) return await ctx.reply("Coba lebih spesifik lagi untuk mendapatkan hasil!", {
        reply_to_message_id: ctx.message.message_id
    });
    if (rules.length > 5) rules = rules.splice(0, 5);
    const buttons = rules.map((rule, index) => [{
        text: `${index+1}. ${rule.name}`,
        callback_data: rule.url
    }]);
    await ctx.reply("Silahkan pilih opsi dibawah ini:", {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: {
            inline_keyboard: buttons,
            selective: true
        }
    });
});

bot.command("exec", (ctx) => {
    if (ctx.from.id !== 1270194202) return;
    const input = parseCommand(ctx.message).args.join(" ");
    if (!input) return ctx.reply("Masukin kodenya sayang <3");
    exec(input, (error, stdout, stderr) => {
        if (error) ctx.replyWithMarkdown(`\`\`\`${error}\`\`\``);
        else if (stderr) ctx.replyWithMarkdown(`\`\`\`${stderr}\`\`\``);
        else ctx.replyWithMarkdown(`\`\`\`${stdout}\`\`\``);
    });
});
bot.command("eval", async(ctx) => {
    if (ctx.from.id !== 1270194202) return;
    if (ctx.message.reply_to_message) {
        return await ctx.replyWithMarkdown(`\`\`\`${JSON.stringify(ctx.message.reply_to_message)}\`\`\``, {
            reply_to_message_id: ctx.message.message_id
        });
    }
    const args = parseCommand(ctx.message).args;
    const input = args.join(" ");
    if (!input) return await ctx.reply("Masukin kodenya sayang <3");
    try {
        let code = eval(input);
        code = require("util").inspect(code, { depth: 0 });
        if (code.length > 500) {
            const { data: hasteData } = await axios.post("https://bin.hansputera.me/documents", code);
            code = `https://bin.hansputera.me/${hasteData.key}.js`;
        }
        await ctx.replyWithMarkdown(`\`\`\`${code}\`\`\``, {
            reply_to_message_id: ctx.message.message_id
        });
    } catch(e) {
        await ctx.replyWithMarkdown(`\`\`\`${e}\`\`\``,  {
            reply_to_message_id: ctx.message.message_id
        });
    }
});

bot.command("profile", async(ctx) => {

    if (!checkUser(ctx.from.id)) return await ctx.reply("Kamu harus mempunyai data, silahkan registrasi menggunakan perintah /start@inihanif_bot");
    const b = new Canvas.Canvas(500, 500);
    const photos = await bot.telegram.getUserProfilePhotos(ctx.from.id);
    const photo = await bot.telegram.getFileLink(photos.photos.shift().shift().file_id);
    b.printImage(await Canvas.resolveImage("https://images.unsplash.com/photo-1620153874520-aabdacf78006?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"), 0, 0);
    b.setShadowColor("rgba(0,0,0,0)");
    b.setColor("black");
    b.printCircle(250, 180, 105);
    b.printCircularImage(await Canvas.resolveImage(photo.origin + photo.pathname), 250, 180, 100);
    b.setTextFont("Arial Black");
    b.setTextSize(40);
    b.setColor("white");
    b.setShadowColor("white");
    b.setShadowBlur(20);
    b.printText(`@${ctx.from.username}`, 75, 320);
    const info = user(ctx.from.id);
    b.setTextSize(25);
    b.setShadowColor("");
    b.printRectangle(50, 340, 400, 10);
    b.printText(`+ Balance: $${info.credits}`, 50, 390);
    b.printText(`+ ID: ${info.userId}`, 50, 430);
    const result = await b.toBufferAsync();
    await ctx.replyWithPhoto({ source: result }, { caption: info.bio });
});

bot.command("ytmp4", async(ctx) => {
    const title = parseCommand(ctx.message).args.join(" ");
    if (!title) return await ctx.replyWithMarkdown("**❌ Maaf, kamu harus memasukan judul video!**");
    const { data } = await axios.get(`https://youtube.hansputera.me/search?q=${encodeURIComponent(title)}`);
    if (data.error) return await ctx.replyWithMarkdown("**🛑 Video tidak dapat ditemukan!**")
    let videos = data.data.videos;
    if (videos.length > 10) videos = videos.splice(0, 10);

    const buttonsComp = videos.map((video, index) => [{
        text: `${index+1}. ${video.title}`,
        callback_data: JSON.stringify({ id: ctx.from.id, ytId: video.id, type: "mp4" })
    }]);
    await ctx.replyWithMarkdown("**🔍 Silahkan pilih video dibawah ini:**", {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: {
            inline_keyboard: buttonsComp,
            selective: true
        }
    });
});

bot.command("ytmp3", async(ctx) => {
    const title = parseCommand(ctx.message).args.join(" ");
    if (!title) return await ctx.replyWithMarkdown("**❌ Maaf, kamu harus memasukan judul video!**");
    const { data } = await axios.get(`https://youtube.hansputera.me/search?q=${encodeURIComponent(title)}`);
    if (data.error) return await ctx.replyWithMarkdown("**🛑 Video tidak dapat ditemukan!**")
    let videos = data.data.videos;
    if (videos.length > 10) videos = videos.splice(0, 10);

    const buttonsComp = videos.map((video, index) => [{
        text: `${index+1}. ${video.title}`,
        callback_data: JSON.stringify({ id: ctx.from.id, ytId: video.id, type: "mp3" })
    }]);
    await ctx.replyWithMarkdown("**🔍 Silahkan pilih video dibawah ini:**", {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: {
            inline_keyboard: buttonsComp,
            selective: true
        }
    });
});

bot.command("ping", async (ctx) => {
    const awal = Date.now();
    const m = await ctx.reply("Pinging ...");
    await ctx.deleteMessage(m.message_id);
    await ctx.replyWithMarkdown(`Pong!! \`${((Date.now() - awal) / 1000).toFixed(2)}\` detik.`);
});

bot.command("fromsticker", async(ctx) => {
    const replyMsg = ctx.message.reply_to_message;
    if (!replyMsg) return await ctx.reply("Mohon reply satu message yang berisi sticker!");
    else if (!replyMsg.sticker) return await ctx.reply("Reply message mu tidak mengandung sticker!");
    const file = await ctx.telegram.getFileLink(replyMsg.sticker.file_id);
    if (replyMsg.sticker.is_animated) {
        await ctx.reply("Belum bisa convert ke video h3h3");
    } else return await ctx.replyWithPhoto({ filename: replyMsg.sticker.set_name, url: file.origin + file.pathname }, { caption: "Sticker telah diubah ke foto:D" });
});

bot.command("reverse", async(ctx) => {
    const input = parseCommand(ctx.message).args.join(" ");
    if (!input) return await ctx.reply("❌ Mohon text yang ingin dibalik!");
    let reversed = "";
    for (let i = input.length - 1; i >= 0; i--) {
        reversed +=  input[i];
    }
    await ctx.reply(reversed, {
        reply_to_message_id: ctx.message.message_id
    });
});

function trimArray(array, length = 10) {
    const len = array.length - length;
    const temp = array.slice(0, length);
    temp.push(`...${len} more.`);
    return temp;
  }

bot.command("npm", async(ctx) => {
    const input = parseCommand(ctx.message).args.join(" ");
    if (!input) return await ctx.reply("❌ Mohon masukan nama module yang ingin dicari!");
    const m = await ctx.replyWithMarkdown("🛄 Mohon tunggu ...");
    try {
        const { data } = await axios.get(`https://registry.npmjs.com/${encodeURIComponent(input)}`);
        const version = data.versions[data["dist-tags"].latest];
        let deps = version.dependencies ? Object.keys(version.dependencies) : null;
        let mantainers = data.maintainers.map(user => user.name);
        if (mantainers.length > 10) mantainers = trimArray(mantainers);
        if (deps && deps.length > 10) deps = trimArray(deps);
        await ctx.deleteMessage(m.message_id);
        await ctx.replyWithMarkdown(`▶️ Result: [${data.name}](https://npmjs.com/package/${input})\n\n🔹 **Description:** ${data.description}\n🆙 **Version:** ${data["dist-tags"].latest}\n©️ **License:** ${data.license ? data.license : 'None.'}\n👤 **Author:** ${data.author ? data.author.name : "Unknown"}\n⏰ **Modified:** ${new Date(data.time.modified).toDateString()}\n🗃️ **Dependencies:** ${deps && deps.length ? deps.map(x => `\`${x}\``) : "None"}\n👥 **Maintainers:** ${mantainers.map(x => `\`x\``).join(" ")}`);
    } catch(e) {
        console.log(e);
        await ctx.telegram.editMessageText(m.chat.id, m.message_id, "", "Module yang kamu masukan tidak ada, coba lebih spesifik lagi!");
    }
});

bot.command("resolvedns", async(ctx) => {
    const input = parseCommand(ctx.message).args.join(" ").trim();
    if (!input) return await ctx.reply("👋 Mohon masukan dns!");
    dns.resolveAny(input, (err, address) => {
        if (err) ctx.reply(err.errno, {
            reply_to_message_id: ctx.message.message_id
        });
        else {
            const txts = address.map(
                function(addr) {
                    if (addr.type === "A" || addr.type === "AAAA") return `\`${addr.address} (${addr.type})\``;
                    else if (addr.type === "MX") return `\`${addr.exchange} (${addr.type})\``;
                    else if (addr.type === "NS") return `\`${addr.value} (${addr.type})\``;
                    else if (addr.type === "TXT") return `\`${addr.entries[0]} (${addr.type})\``;
                    else if (addr.type === "SRV") return `\`${addr.name}:${addr.port} (${addr.type})\``;
                    else if (addr.type === "CNAME" || addr.type === "PTR") return `\`${addr.value} (${addr.type})\``;
                    else if (addr.type === "NAPTR") return `\`${addr.service} (${addr.type})\``;
                    else if (addr.type === "SOA") return `\`${addr.nsname} - ${addr.hostmaster} (${addr.type})\``;
                }
            ).join("\n");
            ctx.replyWithMarkdown(`**📡 Result: ${input}**\n\n${txts}\n\n**Note: Jika tidak ada, mungkin saya tidak bisa menemukan sepenuhnya**`, {
                reply_to_message_id: ctx.message.message_id
            });
        }
    });
});

bot.start(async (ctx) => {
    const chat = await ctx.getChat();
    const isGroup = chat.title ? true : false;
    if (isGroup) {
        await ctx.reply('🔐 Gunakan perintah start di private chat!');
    } else {
        const m = await ctx.reply('⚙️ Bekerja ...');
        const isAvailable = checkUser(ctx.from.id);
        await delay(500);
        await ctx.deleteMessage(m.message_id);
        if (isAvailable) {
            await ctx.reply('📖 Kamu tidak perlu menggunakan start lagi karena kamu sudah terdaftar!');
        } else {
            addUser(ctx.from.id);
            await ctx.reply('📝 Data kamu telah dimasukan ke dalam database kami. Mulai dari sekarang kamu bisa menggunakan fitur saya, yuk mulai dengan /help');
        }
    }
});

bot.on("new_chat_members", (ctx) => {
    const members = ctx.message.new_chat_members;
    members.forEach(member => {
        ctx.replyWithMarkdown(`Selamat datang @${member.username} di **${ctx.chat.title}**`);
    });
});

bot.on("left_chat_member", (ctx) => {
    const member = ctx.message.left_chat_member;
    ctx.replyWithMarkdown(`Yah, si @${member.username} telah keluar dari **${ctx.chat.title}**`);
});

bot.on("callback_query", async(ctx) => {
    // define its eslint.
    if (ctx.update.callback_query.data.includes("eslint")) {
        const { name, detail, resources, versionText } = await eslintRule.getRule(ctx.update.callback_query.data);
        await ctx.replyWithMarkdown(`Halo @${ctx.update.callback_query.from.username}, ini permintaanmu.\n\nRule: [${name}](${ctx.update.callback_query.data})\nDetail: ${detail}\nResources: ${resources.map(resource => `[${resource.name}](${resource.url})`).join(" | ")}\n\`${versionText}\``);
        await ctx.answerCbQuery("Sukses mendapatkan informasi tentang rule " + name);
        return;
    }
    const json = JSON.parse(ctx.update.callback_query.data);
    if ((ctx.update.callback_query.from.id === json.id || json.admin) && json.deleteAct) {
        // delete action
        await ctx.deleteMessage(ctx.update.callback_query.message.message_id);
    } else if (ctx.update.callback_query.from.id === json.id && json.ytId) {
        try {
            // ytmp command
            json.url = `https://youtu.be/${json.ytId}`;
            await ctx.deleteMessage(ctx.update.callback_query.message.message_id);
            const type = json.type;
            const awal = Date.now();
            let vv;
            if (type === "mp4") vv = ytdl(json.url, {
                format: "mp4",
                quality: "highest",
                lang: "id"
            }).pipe(fs.createWriteStream(path.join(__dirname, "collects-yt", `video-${json.id}.mp4`)));
            else if (type === "mp3") vv = ytdl(json.url, {
                format: "audioonly",
                quality: "highest",
                lang: "id"
            }).pipe(fs.createWriteStream(path.join(__dirname, "collects-yt", `video-${json.id}.mp3`)));
            const pm = await ctx.reply("✍ Penyelesaian ...");
            const info = await ytdl.getInfo(json.url, {
                    "lang": "id"
            });
            vv.on("finish", () => {
                const size = fs.statSync(path.join(__dirname, "collects-yt", `video-${json.id}.${json.type}`)).size;
                const humanSize = bot.util.humanFileSize(size);
                if (type === "mp4") ctx.replyWithVideo({ filename: info.videoDetails.title, source: fs.readFileSync(path.join(__dirname, "collects-yt", `video-${json.id}.${json.type}`)) }).then(() => {
                    ctx.deleteMessage(pm.message_id);
                    const akhir = Date.now() - awal;
                    ctx.replyWithMarkdown(`**💌 Terdownload**\n\n- Video: [${info.videoDetails.title}](${json.url})\n- Channel: ${info.videoDetails.author.name}\n- Waktu Download: ${akhir.toFixed(2)} miliseconds.\n- Uploaded at: ${info.videoDetails.uploadDate}\n- Size: \`${humanSize}\``);
                });
                else if (type === "mp3") ctx.replyWithAudio({ filename: info.videoDetails.title, source: fs.readFileSync(path.join(__dirname, "collects-yt", `video-${json.id}.${json.type}`)) }).then(() => {
                    ctx.deleteMessage(pm.message_id);
                    const akhir = Date.now() - awal;
                    ctx.replyWithMarkdown(`**💌 Terdownload**\n\n- Video: [${info.videoDetails.title}](${json.url})\n- Channel: ${info.videoDetails.author.name}\n- Waktu Download: ${akhir.toFixed(2)} miliseconds.\n- Uploaded at: ${info.videoDetails.uploadDate}\n- Size: \`${humanSize}\``);
                });
                fs.unlinkSync(path.join(__dirname, "collects-yt", `video-${json.id}.${json.type}`));
            });
        } catch (e) {
            await ctx.deleteMessage(ctx.update.callback_query.message.message_id);
            await ctx.reply(`\`${e}\``);
        }
    } else {
        await ctx.answerCbQuery("Kamu tidak mempunyai hak untuk mengeklik pesan ini!");
    }
});

bot.telegram.setMyCommands(commands.map(cmd => ({ command: cmd.command, description: cmd.description }))).catch((e) => {
    console.log(chalk.bgRed(`Error: ${e}`));
});

bot.launch().then(async () => {
    const me = await bot.telegram.getMe();
    console.log(chalk.blue(`Logged in as: ${me.username}`));
});