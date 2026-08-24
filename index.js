const { 
  Client, 
  GatewayIntentBits, 
  PermissionFlagsBits, 
  ChannelType, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
const express = require('express');

// Sunucu Uptime
const app = express();
app.get('/', (req, res) => res.send('System Online'));
app.listen(3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

const PREFIX = '.';
const tempVoiceChannels = new Map();

// --- YETKİLENDİRME AYARLARI ---
// Botu kullanmasına izin vermek istediğin Kişi ID'lerini buraya yaz
const AUTHORIZED_USERS = [
  '472426472959639553',
  '812246018179072030',
  '310618601709109259',
];

// Botu kullanmasına izin vermek istediğin Rol ID'lerini buraya yaz
const AUTHORIZED_ROLES = [
  '1541146082812235816'
];

// Yetki Kontrol Fonksiyonu
function isAuthorized(member) {
  if (AUTHORIZED_USERS.includes(member.id)) return true;
  if (member.roles.cache.some(role => AUTHORIZED_ROLES.includes(role.id))) return true;
  return false;
}

client.on('ready', () => {
  console.log(`[SYSTEM] ${client.user.tag} aktif.`);
  client.user.setActivity('.yardım');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Yetki Kontrolü
  if (!isAuthorized(message.member)) {
    return message.reply('❌ Bu botu kullanma yetkin yok.');
  }

  // Rol Yükseltme (.up)
  if (command === 'up') {
    const member = message.mentions.members.first();
    if (!member) return message.reply('Bir kullanıcı etiketlemelisin.');

    const guildRoles = [...message.guild.roles.cache.values()].sort((a, b) => a.position - b.position);
    const memberHighestRole = member.roles.highest;
    const higherRoles = guildRoles.filter(r => r.position > memberHighestRole.position && !r.managed && r.name !== '@everyone');

    if (higherRoles.length === 0) return message.reply('Kullanıcı verilebilecek en yüksek rolde.');

    const nextRole = higherRoles[0];
    try {
      await member.roles.add(nextRole);
      message.channel.send(`**${member.user.username}** kullanıcısına **${nextRole.name}** rolü verildi.`);
    } catch (e) {
      message.channel.send('Rol verilirken yetki hatası oluştu.');
    }
  }

  // Rol Düşürme (.unup)
  if (command === 'unup') {
    const member = message.mentions.members.first();
    if (!member) return message.reply('Bir kullanıcı etiketlemelisin.');

    const highestRole = member.roles.highest;
    if (highestRole.name === '@everyone') return message.reply('Kullanıcının alınabilecek bir rolü yok.');

    try {
      await member.roles.remove(highestRole);
      message.channel.send(`**${member.user.username}** kullanıcısından **${highestRole.name}** rolü alındı.`);
    } catch (e) {
      message.channel.send('Rol alınırken yetki hatası oluştu.');
    }
  }

  // Ban (.ban)
  if (command === 'ban') {
    const member = message.mentions.members.first();
    if (!member) return message.reply('Banlanacak kişiyi etiketle.');
    const reason = args.slice(1).join(' ') || 'Sebep yok.';

    try {
      await member.ban({ reason });
      message.channel.send(`**${member.user.tag}** yasaklandı. Sebep: ${reason}`);
    } catch (e) {
      message.channel.send('İşlem başarısız.');
    }
  }

  // Kick (.kick)
  if (command === 'kick') {
    const member = message.mentions.members.first();
    if (!member) return message.reply('Atılacak kişiyi etiketle.');

    try {
      await member.kick();
      message.channel.send(`**${member.user.tag}** atıldı.`);
    } catch (e) {
      message.channel.send('İşlem başarısız.');
    }
  }

  // Mute (.mute)
  if (command === 'mute') {
    const member = message.mentions.members.first();
    const minutes = parseInt(args[1]) || 10;
    if (!member) return message.reply('Kullanım: `.mute @üye 15`');

    try {
      await member.timeout(minutes * 60 * 1000);
      message.channel.send(`**${member.user.username}** ${minutes} dakika susturuldu.`);
    } catch (e) {
      message.channel.send('İşlem başarısız.');
    }
  }

  // Çekiliş (.çekiliş)
  if (command === 'çekiliş' || command === 'cekilis') {
    const duration = parseInt(args[0]);
    const prize = args.slice(1).join(' ');

    if (!duration || !prize) return message.reply('Kullanım: `.çekiliş <saniye> <ödül>`');

    const giveawayMsg = await message.channel.send(`🎉 **ÇEKİLİŞ** 🎉\nÖdül: **${prize}**\nSüre: **${duration} saniye**\nKatılmak için 🎉 tepkisine bas!`);
    await giveawayMsg.react('🎉');

    setTimeout(async () => {
      const fetchedMsg = await message.channel.messages.fetch(giveawayMsg.id);
      const reaction = fetchedMsg.reactions.cache.get('🎉');
      const users = await reaction.users.fetch();
      const validUsers = users.filter(u => !u.bot);

      if (validUsers.size === 0) return message.channel.send('Çekiliş katılım olmadığı için iptal edildi.');

      const winner = validUsers.random();
      message.channel.send(`🎉 Tebrikler ${winner}, **${prize}** kazandın!`);
    }, duration * 1000);
  }

  // Kanal Aç (.kanal-aç)
  if (command === 'kanal-aç' || command === 'kanalaç') {
    const name = args.join(' ');
    if (!name) return message.reply('Kanal ismi belirt.');

    await message.guild.channels.create({ name, type: ChannelType.GuildText });
    message.channel.send(`Kanal oluşturuldu: #${name}`);
  }

  // Rol Aç (.rol-aç)
  if (command === 'rol-aç' || command === 'rolaç') {
    const name = args.join(' ');
    if (!name) return message.reply('Rol ismi belirt.');

    await message.guild.roles.create({ name });
    message.channel.send(`Rol oluşturuldu: ${name}`);
  }

  // Ses Kanalında Kalma (.afk-ses)
  if (command === 'afk-ses') {
    const channelId = args[0];
    if (!channelId) return message.reply('Kanal ID gir.');

    const { joinVoiceChannel } = require('@discordjs/voice');
    try {
      joinVoiceChannel({
        channelId: channelId,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: true
      });
      message.channel.send('Sese bağlantı sağlandı.');
    } catch (e) {
      message.channel.send('Sese girilemedi.');
    }
  }

  // Özel Ses Kurulum (.özel-ses-kur)
  if (command === 'özel-ses-kur') {
    const joinChannel = await message.guild.channels.create({
      name: '➕ Odaya Gir',
      type: ChannelType.GuildVoice
    });

    message.channel.send(`Özel ses kanalı sistemi kuruldu: ${joinChannel}`);
  }
});

// Otomatik Ses Kanalı Oluşturucu
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (newState.channel && newState.channel.name === '➕ Odaya Gir') {
    const guild = newState.guild;
    const user = newState.member;

    const createdChannel = await guild.channels.create({
      name: `🔊 ${user.user.username}'in Odası`,
      type: ChannelType.GuildVoice,
      parent: newState.channel.parentId,
      permissionOverwrites: [
        { id: user.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers] }
      ]
    });

    await newState.setChannel(createdChannel);
    tempVoiceChannels.set(createdChannel.id, user.id);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('lock_voice').setLabel('🔒 Kilitle').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('limit_voice').setLabel('👥 Limit (5)').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('kick_voice').setLabel('❌ Odaları Sil').setStyle(ButtonStyle.Danger)
    );

    const textPerm = createdChannel.permissionsFor(guild.roles.everyone);
    if (textPerm.has(PermissionFlagsBits.SendMessages)) {
      await createdChannel.send({
        content: `${user}, özel ses odası yönetim paneli:`,
        components: [row]
      });
    }
  }

  if (oldState.channel && tempVoiceChannels.has(oldState.channel.id)) {
    if (oldState.channel.members.size === 0) {
      await oldState.channel.delete().catch(() => {});
      tempVoiceChannels.delete(oldState.channel.id);
    }
  }
});

// Panel Buton Kontrolleri
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const channel = interaction.channel;
  const ownerId = tempVoiceChannels.get(channel.id);

  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: 'Bu oda sana ait değil.', ephemeral: true });
  }

  if (interaction.customId === 'lock_voice') {
    const isLocked = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id)?.deny.has(PermissionFlagsBits.Connect);
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: isLocked ? true : false });
    interaction.reply({ content: isLocked ? 'Oda açıldı.' : 'Oda kilitlendi.', ephemeral: true });
  }

  if (interaction.customId === 'limit_voice') {
    await channel.setUserLimit(5);
    interaction.reply({ content: 'Limit 5 kişi olarak ayarlandı.', ephemeral: true });
  }

  if (interaction.customId === 'kick_voice') {
    await channel.delete();
    tempVoiceChannels.delete(channel.id);
  }
});

client.login(process.env.TOKEN);    const minutes = parseInt(args[1]) || 10;
    if (!member) return message.reply('Kullanım: `.mute @üye 15`');

    try {
      await member.timeout(minutes * 60 * 1000);
      message.channel.send(`**${member.user.username}** ${minutes} dakika susturuldu.`);
    } catch (e) {
      message.channel.send('İşlem başarısız.');
    }
  }

  // Çekiliş
  if (command === 'çekiliş' || command === 'cekilis') {
    if (!isMod) return message.reply('Yetkin yok.');
    const duration = parseInt(args[0]);
    const prize = args.slice(1).join(' ');

    if (!duration || !prize) return message.reply('Kullanım: `.çekiliş <saniye> <ödül>`');

    const giveawayMsg = await message.channel.send(`🎉 **ÇEKİLİŞ** 🎉\nÖdül: **${prize}**\nSüre: **${duration} saniye**\nKatılmak için 🎉 tepkisine bas!`);
    await giveawayMsg.react('🎉');

    setTimeout(async () => {
      const fetchedMsg = await message.channel.messages.fetch(giveawayMsg.id);
      const reaction = fetchedMsg.reactions.cache.get('🎉');
      const users = await reaction.users.fetch();
      const validUsers = users.filter(u => !u.bot);

      if (validUsers.size === 0) return message.channel.send('Çekiliş katılım olmadığı için iptal edildi.');

      const winner = validUsers.random();
      message.channel.send(`🎉 Tebrikler ${winner}, **${prize}** kazandın!`);
    }, duration * 1000);
  }

  // Kanal Aç
  if (command === 'kanal-aç' || command === 'kanalaç') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.reply('Yetkin yok.');
    const name = args.join(' ');
    if (!name) return message.reply('Kanal ismi belirt.');

    await message.guild.channels.create({ name, type: ChannelType.GuildText });
    message.channel.send(`Kanal oluşturuldu: #${name}`);
  }

  // Rol Aç
  if (command === 'rol-aç' || command === 'rolaç') {
    if (!isMod) return message.reply('Yetkin yok.');
    const name = args.join(' ');
    if (!name) return message.reply('Rol ismi belirt.');

    await message.guild.roles.create({ name });
    message.channel.send(`Rol oluşturuldu: ${name}`);
  }

  // Ses Kanalında Kalma (AFK Ses)
  if (command === 'afk-ses') {
    if (!isMod) return message.reply('Yetkin yok.');
    const channelId = args[0];
    if (!channelId) return message.reply('Kanal ID gir.');

    const { joinVoiceChannel } = require('@discordjs/voice');
    try {
      joinVoiceChannel({
        channelId: channelId,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: true
      });
      message.channel.send('Sese bağlantı sağlandı.');
    } catch (e) {
      message.channel.send('Sese girilemedi.');
    }
  }

  // Özel Ses Kurulum
  if (command === 'özel-ses-kur') {
    if (!isMod) return message.reply('Yetkin yok.');
    
    const joinChannel = await message.guild.channels.create({
      name: '➕ Odaya Gir',
      type: ChannelType.GuildVoice
    });

    message.channel.send(`Özel ses kanalı sistemi kuruldu: ${joinChannel}`);
  }
});

// Otomatik Ses Kanalı Oluşturucu
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (newState.channel && newState.channel.name === '➕ Odaya Gir') {
    const guild = newState.guild;
    const user = newState.member;

    const createdChannel = await guild.channels.create({
      name: `🔊 ${user.user.username}'in Odası`,
      type: ChannelType.GuildVoice,
      parent: newState.channel.parentId,
      permissionOverwrites: [
        { id: user.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers] }
      ]
    });

    await newState.setChannel(createdChannel);
    tempVoiceChannels.set(createdChannel.id, user.id);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('lock_voice').setLabel('🔒 Kilitle').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('limit_voice').setLabel('👥 Limit (5)').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('kick_voice').setLabel('❌ Odaları Sil').setStyle(ButtonStyle.Danger)
    );

    const textPerm = createdChannel.permissionsFor(guild.roles.everyone);
    if (textPerm.has(PermissionFlagsBits.SendMessages)) {
      await createdChannel.send({
        content: `${user}, özel ses odası yönetim paneli:`,
        components: [row]
      });
    }
  }

  if (oldState.channel && tempVoiceChannels.has(oldState.channel.id)) {
    if (oldState.channel.members.size === 0) {
      await oldState.channel.delete().catch(() => {});
      tempVoiceChannels.delete(oldState.channel.id);
    }
  }
});

// Panel Buton Kontrolleri
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const channel = interaction.channel;
  const ownerId = tempVoiceChannels.get(channel.id);

  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: 'Bu oda sana ait değil.', ephemeral: true });
  }

  if (interaction.customId === 'lock_voice') {
    const isLocked = channel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id)?.deny.has(PermissionFlagsBits.Connect);
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: isLocked ? true : false });
    interaction.reply({ content: isLocked ? 'Oda açıldı.' : 'Oda kilitlendi.', ephemeral: true });
  }

  if (interaction.customId === 'limit_voice') {
    await channel.setUserLimit(5);
    interaction.reply({ content: 'Limit 5 kişi olarak ayarlandı.', ephemeral: true });
  }

  if (interaction.customId === 'kick_voice') {
    await channel.delete();
    tempVoiceChannels.delete(channel.id);
  }
});

client.login(process.env.TOKEN);
