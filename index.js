```js
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

let statusMessage = null;
let servidorOnlineAnterior = null;
let mantenimiento = false;

// ==========================================
// COMANDO DE MANTENIMIENTO
// ==========================================

const comandos = [
  new SlashCommandBuilder()
    .setName("mantenimiento")
    .setDescription("Controlar el mantenimiento del servidor")
    .addSubcommand(sub =>
      sub
        .setName("iniciar")
        .setDescription("Iniciar mantenimiento")
    )
    .addSubcommand(sub =>
      sub
        .setName("terminar")
        .setDescription("Terminar mantenimiento")
    )
    .addSubcommand(sub =>
      sub
        .setName("estado")
        .setDescription("Ver estado del mantenimiento")
    )
].map(comando => comando.toJSON());

// ==========================================
// REGISTRAR COMANDOS
// ==========================================

async function registrarComandos() {
  try {
    const rest = new REST({ version: "10" })
      .setToken(process.env.DISCORD_TOKEN);

    await rest.put(
      Routes.applicationCommands("1554338468799189112"),
      {
        body: comandos
      }
    );

    console.log("Comandos registrados correctamente.");
  } catch (error) {
    console.error("Error registrando comandos:", error);
  }
}

// ==========================================
// ACTUALIZAR SERVER STATUS
// ==========================================

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
        {
          timeout: 5000
        }
      );

      const jugadores = respuesta.players.online;
      const maxJugadores = respuesta.players.max;
      const version = respuesta.version.name;

      // Obtener jugadores
      const listaJugadores = respuesta.players.sample || [];

      let nombres = "Ningún jugador conectado.";

      if (listaJugadores.length > 0) {
        nombres = listaJugadores
          .map(jugador => "👤 " + jugador.name)
          .join("\n");
      }

      // ==========================================
      // EMBED ONLINE
      // ==========================================

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
            value: `${MINECRAFT_IP}:${MINECRAFT_PORT}`,
            inline: false
          },
          {
            name: "🛠️ Mantenimiento",
            value: mantenimiento
              ? "🟡 ACTIVO"
              : "🟢 INACTIVO",
            inline: false
          }
        )
        .setFooter({
          text: "Estado actualizado automáticamente"
        })
        .setTimestamp();

      // ==========================================
      // AVISO SERVIDOR VOLVIÓ ONLINE
      // ==========================================

      if (
        servidorOnlineAnterior === false &&
        !mantenimiento
      ) {
        await canal.send(
          "🟢 **MUNDOXDD ESTÁ ONLINE NUEVAMENTE**\n" +
          "El servidor volvió a estar disponible."
        );
      }

      servidorOnlineAnterior = true;

    } catch (error) {

      // ==========================================
      // EMBED OFFLINE
      // ==========================================

      embed = new EmbedBuilder()
        .setTitle("🎮 MUNDO X - SERVER STATUS")
        .setDescription(
          mantenimiento
            ? "🛠️ **SERVIDOR EN MANTENIMIENTO**"
            : "🔴 **SERVIDOR OFFLINE**"
        )
        .addFields(
          {
            name: "🌐 Dirección",
            value: `${MINECRAFT_IP}:${MINECRAFT_PORT}`,
            inline: false
          },
          {
            name: "🛠️ Mantenimiento",
            value: mantenimiento
              ? "🟡 ACTIVO"
              : "🟢 INACTIVO",
            inline: false
          }
        )
        .setFooter({
          text: "Estado actualizado automáticamente"
        })
        .setTimestamp();

      // ==========================================
      // AVISO SERVIDOR CAÍDO
      // ==========================================

      if (
        servidorOnlineAnterior === true &&
        !mantenimiento
      ) {
        await canal.send(
          "🚨 **MUNDOXDD ESTÁ OFFLINE**\n" +
          "El servidor dejó de responder."
        );
      }

      servidorOnlineAnterior = false;
    }

    // ==========================================
    // CREAR O ACTUALIZAR MENSAJE
    // ==========================================

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
    console.error(
      "Error actualizando estado:",
      error.message
    );
  }
}

// ==========================================
// BOT LISTO
// ==========================================

client.once("ready", async () => {
  console.log(
    `Bot conectado como ${client.user.tag}`
  );

  await registrarComandos();

  await actualizarEstado();

  setInterval(
    actualizarEstado,
    30000
  );
});

// ==========================================
// COMANDOS DE DISCORD
// ==========================================

client.on(
  "interactionCreate",
  async interaction => {

    if (!interaction.isChatInputCommand()) {
      return;
    }

    if (interaction.commandName !== "mantenimiento") {
      return;
    }

    // ==========================================
    // SOLO ADMINISTRADORES
    // ==========================================

    if (
      !interaction.memberPermissions.has(
        "Administrator"
      )
    ) {
      return interaction.reply({
        content:
          "❌ No tienes permisos para controlar el mantenimiento.",
        ephemeral: true
      });
    }

    const accion =
      interaction.options.getSubcommand();

    // ==========================================
    // INICIAR MANTENIMIENTO
    // ==========================================

    if (accion === "iniciar") {

      if (mantenimiento) {
        return interaction.reply({
          content:
            "🛠️ El mantenimiento ya está activo.",
          ephemeral: true
        });
      }

      mantenimiento = true;

      const canal =
        await client.channels.fetch(CHANNEL_ID);

      await canal.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("🛠️ MANTENIMIENTO")
            .setDescription(
              "El servidor **MundoXDD** se encuentra temporalmente en mantenimiento."
            )
            .addFields({
              name: "📢 Estado",
              value: "🟡 Mantenimiento activo"
            })
            .setFooter({
              text: "MundoXDD"
            })
            .setTimestamp()
        ]
      });

      await interaction.reply({
        content:
          "🛠️ Mantenimiento iniciado correctamente.",
        ephemeral: true
      });

      await actualizarEstado();
    }

    // ==========================================
    // TERMINAR MANTENIMIENTO
    // ==========================================

    if (accion === "terminar") {

      if (!mantenimiento) {
        return interaction.reply({
          content:
            "❌ El mantenimiento no está activo.",
          ephemeral: true
        });
      }

      mantenimiento = false;

      const canal =
        await client.channels.fetch(CHANNEL_ID);

      await canal.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              "✅ MANTENIMIENTO FINALIZADO"
            )
            .setDescription(
              "El mantenimiento de **MundoXDD** ha finalizado."
            )
            .addFields({
              name: "📢 Estado",
              value:
                "🟢 El servidor vuelve a estar disponible."
            })
            .setFooter({
              text: "MundoXDD"
            })
            .setTimestamp()
        ]
      });

      await interaction.reply({
        content:
          "✅ Mantenimiento finalizado correctamente.",
        ephemeral: true
      });

      await actualizarEstado();
    }

    // ==========================================
    // ESTADO DEL MANTENIMIENTO
```
