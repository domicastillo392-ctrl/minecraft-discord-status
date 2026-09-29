const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const { status } = require("minecraft-server-util");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// CONFIGURACIÓN
const MINECRAFT_IP = "mundoxdddd.aternos.me";
const MINECRAFT_PORT = 33524;
const CHANNEL_ID = "1327512663349137408";

// Cada 30 segundos
const UPDATE_TIME = 30000;

async function actualizarEstado() {
  const canal = await client.channels.fetch(CHANNEL_ID);

  if (!canal) return;

  try {
    const respuesta = await status(MINECRAFT_IP, MINECRAFT_PORT);

    const jugadores = respuesta.players.online;
    const maxJugadores = respuesta.players.max;
    const version = respuesta.version.name;

    const embed = new EmbedBuilder()
      .setTitle("🎮 Estado del servidor Minecraft")
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
        }
      )
      .setTimestamp();

    await canal.send({ embeds: [embed] });

  } catch (error) {
    const embed = new EmbedBuilder()
      .setTitle("🎮 Estado del servidor Minecraft")
      .setDescription("🔴 **SERVIDOR OFFLINE**")
      .setTimestamp();

    await canal.send({ embeds: [embed] });
  }
}

client.once("ready", () => {
  console.log(`Bot conectado como ${client.user.tag}`);

  actualizarEstado();
  setInterval(actualizarEstado, UPDATE_TIME);
});

client.login(process.env.DISCORD_TOKEN);
