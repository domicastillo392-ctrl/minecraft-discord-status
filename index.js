const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require("discord.js");
const { status } = require("minecraft-server-util");

const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

const IP = process.env.MINECRAFT_IP;
const PORT = Number(process.env.MINECRAFT_PORT);
const CHANNEL_ID = process.env.CHANNEL_ID;
const CLIENT_ID = "1554338468799189112";

let statusMessage = null;
let previousOnline = null;
let maintenance = false;

const commands = [
new SlashCommandBuilder()
.setName("mantenimiento")
.setDescription("Controlar el mantenimiento")
.addSubcommand(s =>
s.setName("iniciar")
.setDescription("Iniciar mantenimiento")
)
.addSubcommand(s =>
s.setName("terminar")
.setDescription("Terminar mantenimiento")
)
.addSubcommand(s =>
s.setName("estado")
.setDescription("Ver estado del mantenimiento")
)
].map(c => c.toJSON());

async function registerCommands() {
const rest = new REST({
version: "10"
}).setToken(process.env.DISCORD_TOKEN);

await rest.put(
Routes.applicationCommands(CLIENT_ID),
{
body: commands
}
);

console.log("Comandos registrados.");
}

async function updateStatus() {
const channel = await client.channels.fetch(CHANNEL_ID);

if (!channel) {
return;
}

let embed;
let online = false;

try {
const data = await status(
IP,
PORT,
{
timeout: 5000
}
);

```
online = true;

const players = data.players.online;
const max = data.players.max;
const version = data.version.name;

const sample = data.players.sample || [];

const names = sample.length
  ? sample
      .map(p => "👤 " + p.name)
      .join("\n")
  : "Ningun jugador conectado.";

embed = new EmbedBuilder()
  .setTitle("🎮 MUNDO X - SERVER STATUS")
  .setDescription(
    maintenance
      ? "🟡 SERVIDOR EN MANTENIMIENTO"
      : "🟢 SERVIDOR ONLINE"
  )
  .addFields(
    {
      name: "👥 Jugadores",
      value: players + "/" + max,
      inline: true
    },
    {
      name: "🎮 Version",
      value: String(version),
      inline: true
    },
    {
      name: "👤 Jugadores conectados",
      value: names,
      inline: false
    },
    {
      name: "🌐 Direccion",
      value: IP + ":" + PORT,
      inline: false
    },
    {
      name: "🛠️ Mantenimiento",
      value: maintenance
        ? "🟡 ACTIVO"
        : "🟢 INACTIVO",
      inline: false
    }
  )
  .setFooter({
    text: "Estado actualizado automaticamente"
  })
  .setTimestamp();
```

} catch (error) {

```
embed = new EmbedBuilder()
  .setTitle("🎮 MUNDO X - SERVER STATUS")
  .setDescription(
    maintenance
      ? "🛠️ SERVIDOR EN MANTENIMIENTO"
      : "🔴 SERVIDOR OFFLINE"
  )
  .addFields(
    {
      name: "🌐 Direccion",
      value: IP + ":" + PORT,
      inline: false
    },
    {
      name: "🛠️ Mantenimiento",
      value: maintenance
        ? "🟡 ACTIVO"
        : "🟢 INACTIVO",
      inline: false
    }
  )
  .setFooter({
    text: "Estado actualizado automaticamente"
  })
  .setTimestamp();
```

}

if (
previousOnline === true &&
online === false &&
!maintenance
) {
await channel.send(
"🚨 MUNDOXDD ESTA OFFLINE\n" +
"El servidor dejo de
