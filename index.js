const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const { status } = require("minecraft-server-util");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const MINECRAFT_IP = process.env.MINECRAFT_IP;
const MINECRAFT_PORT = Number(process.env.MINECRAFT_PORT);
const CHANNEL_ID = process.env.CHANNEL_ID;

let statusMessage = null;

async function actualizarEstado() {
  try {
    const canal = await client.channels.fetch(CHANNEL_ID);

    if (!canal) {
      console.log("No se encontró el canal.");
      return;
    }

    let embed;

    try {
      const respuesta = await status(
        MINECRAFT_IP,
        MINECRAFT_PORT,
        { timeout: 5000 }
      );

      const jugadores = respuesta.players.online;
      const maxJugadores = respuesta.players.max;
      const version = respuesta.version.name;

      embed = new EmbedBuilder()
        .setTitle("🎮 MUNDO X - SERVER STATUS")
        .setDescription("🟢 **SERVIDOR ONLINE**")
        .addFields(
          {
            name: "👥 Jugadores",
            value: `${jugadores}/${maxJugadores}`,
            inline: true
          },
          {
            name: "🎮 Versión",
            value: version,
            inline: true
          },
          {
            name: "🌐 Dirección",
            value: `\`${MINECRAFT_IP}:${MINECRAFT_PORT}\``,
            inline: false
          }
        )
        .setFooter({
          text: "Estado actualizado automáticamente"
        })
        .setTimestamp();

    } catch (error) {

      embed = new EmbedBuilder()
        .setTitle("🎮 MUNDO X - SERVER STATUS")
        .setDescription("🔴 **SERVIDOR OFFLINE**")
        .addFields({
          name: "🌐 Dirección",
          value: `\`${MINECRAFT_IP}:${MINECRAFT_PORT}\``,
          inline: false
        })
        .setFooter({
          text: "Estado actualizado automáticamente"
        })
        .setTimestamp();
    }

    if (!statusMessage) {
      statusMessage = await canal.send({
        embeds: [embed]
      });
    } else {
      await statusMessage.edit({
        embeds: [embed]
      });
    }

  } catch (error) {
    console.error("Error:", error.message);
  }
}

client.once("ready", async () => {
  console.log(`Bot conectado como ${client.user.tag}`);

  await actualizarEstado();

  setInterval(actualizarEstado, 30000);
});

client.login(process.env.DISCORD_TOKEN);
