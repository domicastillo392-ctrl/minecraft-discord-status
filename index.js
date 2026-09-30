const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const { status } = require("minecraft-server-util");

const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

const MINECRAFT_IP = "mundoxdddd.aternos.me";
const MINECRAFT_PORT = 33524;
const CHANNEL_ID = process.env.CHANNEL_ID;

let statusMessage = null;

async function actualizarEstado() {
try {
const canal = await client.channels.fetch(CHANNEL_ID);

```
if (!canal) {
  console.log("No se encontro el canal.");
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
    "Ningun jugador conectado.";

  if (listaJugadores.length > 0) {
    nombres = listaJugadores
      .map(function (jugador) {
        return "👤 " + jugador.name;
      })
      .join("\n");
  }

  embed = new EmbedBuilder()
    .setTitle("🎮 MUNDO XDD - SERVER STATUS")
    .setDescription(
      "🟢 **SERVIDOR ONLINE**"
    )
    .addFields(
      {
        name: "👥 Jugadores",
        value:
          String(jugadores) +
          "/" +
          String(maxJugadores),
        inline: true
      },
      {
        name: "🎮 Version",
        value: String(version),
        inline: true
      },
      {
        name: "👤 Jugadores conectados",
        value: nombres,
        inline: false
      },
      {
        name: "🌐 Direccion",
        value:
          MINECRAFT_IP +
          ":" +
          MINECRAFT_PORT,
        inline: false
      }
    )
    .setFooter({
      text:
        "Estado actualizado automaticamente"
    })
    .setTimestamp();

} catch (error) {

  embed = new EmbedBuilder()
    .setTitle("🎮 MUNDO XDD - SERVER STATUS")
    .setDescription(
      "🔴 **SERVIDOR OFFLINE**"
    )
    .addFields({
      name: "🌐 Direccion",
      value:
        MINECRAFT_IP +
        ":" +
        MINECRAFT_PORT,
      inline: false
    })
    .setFooter({
      text:
        "Estado actualizado automaticamente"
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
```

} catch (error) {

```
console.error(
  "Error actualizando estado:",
  error.message
);
```

}
}

client.once("ready", async function () {

console.log(
"Bot conectado como " +
client.user.tag
);

await actualizarEstado();

setInterval(
actualizarEstado,
30000
);
});

client.login(
process.env.DISCORD_TOKEN
);
