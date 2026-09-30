```js
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

const {
  status
} = require("minecraft-server-util");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds
  ]
});

const MINECRAFT_IP = process.env.MINECRAFT_IP;
const MINECRAFT_PORT = Number(process.env.MINECRAFT_PORT);
const STATUS_CHANNEL_ID = process.env.STATUS_CHANNEL_ID;

const CHECK_INTERVAL = 30000;

let statusMessage = null;

async function actualizarEstado() {

  try {

    const canal = await client.channels.fetch(
      STATUS_CHANNEL_ID
    );

    if (!canal) {
      console.log("No se encontró el canal de estado.");
      return;
    }

    let embed;

    try {

      const respuesta = await status(
        MINECRAFT_IP,
        MINECRAFT_PORT,
        {
          timeout: 5000
        }
      );

      const jugadores = respuesta.players.online;
      const maxJugadores = respuesta.players.max;
      const version = respuesta.version.name;

      const listaJugadores =
        respuesta.players.sample || [];

      let nombres =
        "Ningún jugador conectado.";

      if (listaJugadores.length > 0) {

        nombres = listaJugadores
          .map(
            jugador =>
              `👤 \`${jugador.name}\``
          )
          .join("\n");
      }

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
            name: "👤 Jugadores conectados",
            value: nombres,
            inline: false
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

    try {

      const mensajes = await canal.messages.fetch({
        limit: 20
      });

      for (const [id, mensaje] of mensajes) {

        if (
          mensaje.author.id === client.user.id
        ) {

          await mensaje.delete().catch(() => {});

        }
      }

    } catch (error) {

      console.log(
        "No se pudieron eliminar algunos mensajes anteriores."
      );

    }

    statusMessage = await canal.send({
      embeds: [embed]
    });

    console.log(
      "Estado de Minecraft actualizado."
    );

  } catch (error) {

    console.error(
      "Error:",
      error.message
    );

  }
}

client.once(
  "ready",
  async () => {

    console.log(
      `Bot conectado como ${client.user.tag}`
    );

    await actualizarEstado();

    setInterval(
      actualizarEstado,
      CHECK_INTERVAL
    );

  }
);

client.login(
  process.env.DISCORD_TOKEN
);
```
