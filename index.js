```js
const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

const { status } = require("minecraft-server-util");

// ===============================
// VARIABLES DE RAILWAY
// ===============================

const TOKEN = process.env.DISCORD_TOKEN;

const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const STATUS_CHANNEL_ID = process.env.STATUS_CHANNEL_ID;
const PLAYER_CHANNEL_ID = process.env.PLAYER_CHANNEL_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

// Minecraft desde Railway
const MC_HOST = process.env.MINECRAFT_IP;
const MC_PORT = Number(process.env.MINECRAFT_PORT);

// ===============================
// CONFIGURACIÓN
// ===============================

const HIGH_PING = 300;
const CHECK_INTERVAL = 30000;

// ===============================
// CLIENTE DISCORD
// ===============================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// ===============================
// ESTADO
// ===============================

let serverOnline = null;
let highPing = false;

// Último mensaje del canal de estado
let lastStatusMessage = null;

// Jugadores anteriores
let previousPlayers = null;

// ===============================
// COMANDOS
// ===============================

const commands = [

    new SlashCommandBuilder()
        .setName("status")
        .setDescription("Muestra el estado del servidor de Minecraft"),

    new SlashCommandBuilder()
        .setName("mantenimiento")
        .setDescription("Anuncia un mantenimiento del servidor")
        .addStringOption(option =>
            option
                .setName("motivo")
                .setDescription("Motivo del mantenimiento")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        ),

    new SlashCommandBuilder()
        .setName("cerrar")
        .setDescription("Anuncia el cierre del servidor")
        .addStringOption(option =>
            option
                .setName("motivo")
                .setDescription("Motivo del cierre")
                .setRequired(true)
        )
        .setDefaultMemberPermissions(
            PermissionFlagsBits.Administrator
        )

].map(command => command.toJSON());

// ===============================
// REGISTRAR COMANDOS
// ===============================

async function registerCommands() {

    try {

        const rest = new REST({
            version: "10"
        }).setToken(TOKEN);

        await rest.put(
            Routes.applicationGuildCommands(
                CLIENT_ID,
                GUILD_ID
            ),
            {
                body: commands
            }
        );

        console.log(
            "✅ Comandos registrados correctamente."
        );

    } catch (error) {

        console.error(
            "❌ Error registrando comandos:",
            error
        );

    }
}

// ===============================
// LOGS
// ===============================

async function sendLog(message) {

    try {

        const channel = await client.channels.fetch(
            LOG_CHANNEL_ID
        );

        if (channel) {
            await channel.send(message);
        }

    } catch (error) {

        console.error(
            "❌ Error enviando log:",
            error
        );

    }
}

// ===============================
// MENSAJE DE ESTADO
// ===============================

async function sendStatusMessage(
    content = null,
    embeds = []
) {

    try {

        const channel = await client.channels.fetch(
            STATUS_CHANNEL_ID
        );

        if (!channel) {

            console.error(
                "❌ No se encontró STATUS_CHANNEL_ID"
            );

            return;
        }

        // Eliminar mensaje anterior
        if (lastStatusMessage) {

            try {

                await lastStatusMessage.delete();

            } catch {

                console.log(
                    "ℹ️ El mensaje anterior de estado ya no existe."
                );

            }

            lastStatusMessage = null;
        }

        // Enviar nuevo mensaje
        lastStatusMessage = await channel.send({
            content,
            embeds
        });

    } catch (error) {

        console.error(
            "❌ Error enviando mensaje de estado:",
            error
        );

    }
}

// ===============================
// ENTRADA / SALIDA DE JUGADORES
// ===============================

async function checkPlayers(currentPlayers) {

    // Primera comprobación
    if (previousPlayers === null) {

        previousPlayers = currentPlayers;

        return;
    }

    // Jugadores que entraron
    const joinedPlayers = currentPlayers.filter(
        player => !previousPlayers.includes(player)
    );

    // Jugadores que salieron
    const leftPlayers = previousPlayers.filter(
        player => !currentPlayers.includes(player)
    );

    // Obtener canal
    let playerChannel = null;

    try {

        playerChannel = await client.channels.fetch(
            PLAYER_CHANNEL_ID
        );

    } catch (error) {

        console.error(
            "❌ No se pudo encontrar PLAYER_CHANNEL_ID."
        );

        console.error(
            "Revisa que PLAYER_CHANNEL_ID tenga el ID correcto."
        );

    }

    // ===============================
    // JUGADORES QUE ENTRARON
    // ===============================

    for (const player of joinedPlayers) {

        if (playerChannel) {

            await playerChannel.send(
                `🟢 **${player} entró al servidor**\n` +
                `👥 Jugadores online: **${currentPlayers.length}**`
            );

        }
    }

    // ===============================
    // JUGADORES QUE SALIERON
    // ===============================

    for (const player of leftPlayers) {

        if (playerChannel) {

            await playerChannel.send(
                `🔴 **${player} salió del servidor**\n` +
                `👥 Jugadores online: **${currentPlayers.length}**`
            );

        }
    }

    // Guardar lista actual
    previousPlayers = currentPlayers;
}

// ===============================
// COMPROBAR MINECRAFT
// ===============================

async function checkMinecraft() {

    try {

        const result = await status(
            MC_HOST,
            MC_PORT,
            {
                timeout: 5000
            }
        );

        const ping = result.roundTripLatency;
        const players = result.players.online;

        // Obtener nombres de jugadores
        const currentPlayers =
            result.players.sample
                ? result.players.sample.map(
                    player => player.name
                )
                : [];

        console.log(
            `🟢 Minecraft ONLINE | Ping: ${ping}ms | Jugadores: ${players}`
        );

        // Comprobar jugadores
        await checkPlayers(currentPlayers);

        // ===============================
        // SERVIDOR VUELVE ONLINE
        // ===============================

        if (serverOnline === false) {

            const embed = new EmbedBuilder()
                .setTitle("🟢 SERVIDOR ONLINE")
                .setDescription(
                    "¡El servidor de Minecraft ha vuelto a estar disponible!"
                )
                .addFields(
                    {
                        name: "📡 Ping",
                        value: `${ping} ms`,
                        inline: true
                    },
                    {
                        name: "👥 Jugadores",
                        value: `${players}`,
                        inline: true
                    }
                )
                .setTimestamp();

            await sendStatusMessage(
                "@everyone",
                [embed]
            );

            await sendLog(
                `🟢 El servidor volvió a estar ONLINE | Ping: ${ping}ms | Jugadores: ${players}`
            );
        }

        serverOnline = true;

        // ===============================
        // PING ALTO
        // ===============================

        if (ping >= HIGH_PING && !highPing) {

            highPing = true;

            await sendStatusMessage(
                `⚠️ @everyone **PING ALTO**\n` +
                `El servidor tiene actualmente **${ping} ms** de ping.`
            );

            await sendLog(
                `⚠️ Ping alto detectado: ${ping}ms`
            );
        }

        // ===============================
        // PING NORMAL
        // ===============================

        if (ping < HIGH_PING && highPing) {

            highPing = false;

            await sendStatusMessage(
                `🟢 **PING NORMAL**\n` +
                `El ping volvió a la normalidad: **${ping} ms**.`
            );

            await sendLog(
                `🟢 Ping volvió a la normalidad: ${ping}ms`
            );
        }

    } catch (error) {

        console.log(
            "🔴 Minecraft OFFLINE"
        );

        // ===============================
        // SERVIDOR OFFLINE
        // ===============================

        if (serverOnline !== false) {

            const embed = new EmbedBuilder()
                .setTitle("🔴 SERVIDOR OFFLINE")
                .setDescription(
                    "El servidor de Minecraft no está disponible actualmente."
                )
                .setTimestamp();

            await sendStatusMessage(
                "@everyone",
                [embed]
            );

            await sendLog(
                "🔴 El servidor de Minecraft está OFFLINE."
            );
        }

        serverOnline = false;

        highPing = false;

        // Reiniciar jugadores
        previousPlayers = null;
    }
}

// ===============================
// BOT LISTO
// ===============================

client.once(
    "clientReady",
    async () => {

        console.log(
            `🤖 Bot conectado como ${client.user.tag}`
        );

        console.log(
            `🎮 Minecraft: ${MC_HOST}:${MC_PORT}`
        );

        console.log(
            `🚪 Canal jugadores: ${PLAYER_CHANNEL_ID}`
        );

        console.log(
            `📡 Canal estado: ${STATUS_CHANNEL_ID}`
        );

        console.log(
            `📜 Canal logs: ${LOG_CHANNEL_ID}`
        );

        await registerCommands();

        // Primera comprobación
        checkMinecraft();

        // Comprobar cada 30 segundos
        setInterval(
            checkMinecraft,
            CHECK_INTERVAL
        );

    }
);

// ===============================
// INTERACCIONES
// ===============================

client.on(
    "interactionCreate",
    async interaction => {

        if (!interaction.isChatInputCommand()) {
            return;
        }

        // ===============================
        // /STATUS
        // ===============================

        if (
            interaction.commandName === "status"
        ) {

            try {

                const result = await status(
                    MC_HOST,
                    MC_PORT,
                    {
                        timeout: 5000
                    }
                );

                const ping = result.roundTripLatency;
                const players = result.players.online;

                const embed = new EmbedBuilder()
                    .setTitle("🎮 Estado de MundoXDD")
                    .setDescription(
                        "🟢 **Servidor ONLINE**"
                    )
                    .addFields(
                        {
                            name: "📡 Ping",
                            value: `${ping} ms`,
                            inline: true
                        },
                        {
                            name: "👥 Jugadores",
                            value: `${players}`,
                            inline: true
                        }
                    )
                    .setTimestamp();

                await interaction.reply({
                    embeds: [embed]
                });

            } catch {

                await interaction.reply({
                    content:
                        "🔴 **El servidor de Minecraft está OFFLINE.**"
                });

            }

            await sendLog(
                `📊 ${interaction.user.tag} utilizó **/status**`
            );
        }

        // ===============================
        // /MANTENIMIENTO
        // ===============================

        if (
            interaction.commandName ===
            "mantenimiento"
        ) {

            const motivo =
                interaction.options.getString(
                    "motivo"
                );

            await interaction.reply({
                content:
                    `🔧 @everyone **MANTENIMIENTO**\n\n` +
                    `📋 Motivo: **${motivo}**`
            });

            await sendLog(
                `🔧 ${interaction.user.tag} ejecutó **/mantenimiento** | Motivo: ${motivo}`
            );
        }

        // ===============================
        // /CERRAR
        // ===============================

        if (
            interaction.commandName === "cerrar"
        ) {

            const motivo =
                interaction.options.getString(
                    "motivo"
                );

            await interaction.reply({
                content:
                    `🔴 @everyone **SERVIDOR CERRADO**\n\n` +
                    `📋 Motivo: **${motivo}**`
            });

            await sendLog(
                `🔴 ${interaction.user.tag} ejecutó **/cerrar** | Motivo: ${motivo}`
            );
        }

    }
);

// ===============================
// ERRORES
// ===============================

client.on(
    "error",
    error => {

        console.error(
            "❌ Error de Discord:",
            error
        );

    }
);

// ===============================
// LOGIN
// ===============================

client.login(TOKEN);
```

### Variables que debes tener en Railway

```text
DISCORD_TOKEN
CLIENT_ID
GUILD_ID
STATUS_CHANNEL_ID
PLAYER_CHANNEL_ID
LOG_CHANNEL_ID
MINECRAFT_IP
MINECRAFT_PORT
```

Y para tu servidor:

```text
MINECRAFT_IP = mundoxdddd.aternos.me
MINECRAFT_PORT = 33524
```

**Importante:** no pongas `mundoxdddd.aternos.me:33524` completo en `MINECRAFT_IP`; van separados.
