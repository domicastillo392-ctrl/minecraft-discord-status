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

      const listaJugadores = respuesta.players.sample || [];

      let nombres = "Ningun jugador conectado.";

      if (listaJugadores.length > 0) {
        nombres = listaJugadores
          .map(function (jugador) {
            return "👤 " + jugador.name;
          })
          .join("\n");
      }

      embed = new EmbedBuilder()
        .setTitle("🎮 MUNDO X - SERVER STATUS")
        .setDescription("🟢 SERVIDOR ONLINE")
        .addFields(
          {
            name: "👥 Jugadores",
            value: String(jugadores) + "/" + String(maxJugadores),
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
              String(MINECRAFT_IP) +
              ":" +
              String(MINECRAFT_PORT),
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
          text: "Estado actualizado automaticamente"
        })
        .setTimestamp();

      // SERVIDOR VOLVIO ONLINE

      if (
        servidorOnlineAnterior === false &&
        mantenimiento === false
      ) {
        await canal.send(
          "🟢 MUNDOXDD ESTA ONLINE NUEVAMENTE\n" +
          "El servidor volvio a estar disponible."
        );
      }

      servidorOnlineAnterior = true;

    } catch (error) {

      embed = new EmbedBuilder()
        .setTitle("🎮 MUNDO X - SERVER STATUS")
        .setDescription(
          mantenimiento
            ? "🛠️ SERVIDOR EN MANTENIMIENTO"
            : "🔴 SERVIDOR OFFLINE"
        )
        .addFields(
          {
            name: "🌐 Direccion",
            value:
              String(MINECRAFT_IP) +
              ":" +
              String(MINECRAFT_PORT),
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
          text: "Estado actualizado automaticamente"
        })
        .setTimestamp();

      // SERVIDOR SE CAYO

      if (
        servidorOnlineAnterior === true &&
        mantenimiento === false
      ) {
        await canal.send(
          "🚨 MUNDOXDD ESTA OFFLINE\n" +
          "El servidor dejo de responder."
        );
      }

      servidorOnlineAnterior = false;
    }

    // CREAR O ACTUALIZAR MENSAJE

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

client.once("ready", async function () {
  console.log(
    "Bot conectado como " + client.user.tag
  );

  await registrarComandos();

  await actualizarEstado();

  setInterval(
    actualizarEstado,
    30000
  );
});

// ==========================================
// INTERACCIONES
// ==========================================

client.on(
  "interactionCreate",
  async function (interaction) {

    if (!interaction.isChatInputCommand()) {
      return;
    }

    if (interaction.commandName !== "mantenimiento") {
      return;
    }

    // SOLO ADMINISTRADORES

    if (
      !interaction.memberPermissions.has("Administrator")
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

      if (mantenimiento === true) {
        return interaction.reply({
          content:
            "🛠️ El mantenimiento ya esta activo.",
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
              "El servidor MundoXDD se encuentra temporalmente en mantenimiento."
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

      if (mantenimiento === false) {
        return interaction.reply({
          content:
            "❌ El mantenimiento no esta activo.",
          ephemeral: true
        });
      }

      mantenimiento = false;

      const canal =
        await client.channels.fetch(CHANNEL_ID);

      await canal.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("✅ MANTENIMIENTO FINALIZADO")
            .setDescription(
              "El mantenimiento de MundoXDD ha finalizado."
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
    // ESTADO
    // ==========================================

    if (accion === "estado") {

      await interaction.reply({
        content: mantenimiento
          ? "🛠️ El mantenimiento esta ACTIVO."
          : "🟢 El mantenimiento esta INACTIVO.",
        ephemeral: true
      });
    }
  }
);

// ==========================================
// LOGIN
// ==========================================

client.login(
  process.env.DISCORD_TOKEN
);
```
