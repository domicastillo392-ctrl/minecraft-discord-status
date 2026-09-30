const {
Client,
GatewayIntentBits,
EmbedBuilder,
SlashCommandBuilder,
REST,
Routes
} = require("discord.js");

const { status } = require("minecraft-server-util");

const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

const MINECRAFT_IP = process.env.MINECRAFT_IP;
const MINECRAFT_PORT = Number(process.env.MINECRAFT_PORT);
const CHANNEL_ID = process.env.CHANNEL_ID;

const CLIENT_ID = "1554338468799189112";

let statusMessage = null;
let servidorOnlineAnterior = null;
let mantenimiento = false;

// ==========================================
// COMANDO MANTENIMIENTO
// ==========================================

const comandos = [
new SlashCommandBuilder()
.setName("mantenimiento")
.setDescription("Controlar el mantenimiento del servidor")
.addSubcommand(function (sub) {
return sub
.setName("iniciar")
.setDescription("Iniciar mantenimiento");
})
.addSubcommand(function (sub) {
return sub
.setName("terminar")
.setDescription("Terminar mantenimiento");
})
.addSubcommand(function (sub) {
return sub
.setName("estado")
.setDescription("Ver estado del mantenimiento");
})
].map(function (comando) {
return comando.toJSON();
});

// ==========================================
// REGISTRAR COMANDOS
// ==========================================

async function registrarComandos() {
try {
const rest = new REST({
version: "10"
}).setToken(process.env.DISCORD_TOKEN);

```
await rest.put(
  Routes.applicationCommands(CLIENT_ID),
  {
    body: comandos
  }
);

console.log("Comandos registrados correctamente.");
```

} catch (error) {
console.error(
"Error registrando comandos:",
error.message
);
}
}

// ==========================================
// ACTUALIZAR ESTADO DEL SERVIDOR
// ==========================================

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
    .setTitle("🎮 MUNDO X - SERVER STATUS")
    .setDescription(
      mantenimiento
        ? "🟡 SERVIDOR EN MANTENIMIENTO"
        : "🟢 SERVIDOR ONLINE"
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
          String(MINECRAFT_I_
```
