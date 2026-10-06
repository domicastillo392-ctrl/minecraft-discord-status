const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    AuditLogEvent,
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

const fs = require("fs");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildInvites
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ]
});

// ========================================
// CONFIGURACIÓN
// ========================================

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;

const INVITE_LOG_CHANNEL_ID =
    process.env.INVITE_LOG_CHANNEL_ID;

const LOG_CHANNEL_ID =
    process.env.LOG_CHANNEL_ID;

const ROLE_LOG_CHANNEL_ID =
    process.env.ROLE_LOG_CHANNEL_ID;

const BAN_LOG_CHANNEL_ID =
    process.env.BAN_LOG_CHANNEL_ID;

const VOICE_LOG_CHANNEL_ID =
    process.env.VOICE_LOG_CHANNEL_ID;

const AUTO_MUTE_CHANNEL_ID =
    process.env.AUTO_MUTE_CHANNEL_ID;

const AUTO_DELETE_CHANNEL_ID =
    process.env.AUTO_DELETE_CHANNEL_ID;

// ========================================
// DATOS DE INVITACIONES
// ========================================

const INVITE_DATA_FILE = "inviteData.json";

const inviteCache = new Map();

let inviteTotals = {};

let savedInviteData = {
    guilds: {}
};

// ========================================
// CARGAR DATOS
// ========================================

if (fs.existsSync(INVITE_DATA_FILE)) {
    try {
        const data = JSON.parse(
            fs.readFileSync(
                INVITE_DATA_FILE,
                "utf8"
            )
        );

        if (
            data &&
            typeof data === "object"
        ) {
            if (data.guilds) {
                savedInviteData = data;
                inviteTotals =
                    data.inviteTotals || {};
            } else {
                inviteTotals = data;
            }
        }

        console.log(
            "📂 inviteData.json cargado."
        );
    } catch (error) {
        console.log(
            "⚠️ Error leyendo inviteData.json:"
        );
        console.log(error);

        savedInviteData = {
            guilds: {}
        };

        inviteTotals = {};
    }
} else {
    console.log(
        "ℹ️ No existe inviteData.json. Se creará automáticamente."
    );
}

// ========================================
// GUARDAR DATOS
// ========================================

function saveInviteData() {
    try {
        const dataToSave = {
            guilds: {},
            inviteTotals
        };

        for (
            const [
                guildId,
                invites
            ] of inviteCache.entries()
        ) {
            dataToSave.guilds[guildId] = {};

            for (
                const [
                    code,
                    data
                ] of invites.entries()
            ) {
                dataToSave.guilds[guildId][code] = {
                    uses: data.uses || 0,
                    inviterId:
                        data.inviterId || null,
                    inviterTag:
                        data.inviterTag || null
                };
            }
        }

        fs.writeFileSync(
            INVITE_DATA_FILE,
            JSON.stringify(
                dataToSave,
                null,
                2
            )
        );
    } catch (error) {
        console.log(
            "❌ Error guardando inviteData.json:"
        );
        console.log(error);
    }
}

// ========================================
// CARGAR INVITACIONES
// ========================================

async function loadGuildInvites(guild) {
    try {
        const invites =
            await guild.invites.fetch();

        const oldGuildData =
            savedInviteData.guilds?.[guild.id] ||
            {};

        const inviteMap = new Map();

        for (
            const invite of invites.values()
        ) {
            const oldData =
                oldGuildData[invite.code];

            inviteMap.set(
                invite.code,
                {
                    uses: invite.uses || 0,
                    inviterId:
                        invite.inviter?.id ||
                        oldData?.inviterId ||
                        null,
                    inviterTag:
                        invite.inviter?.tag ||
                        oldData?.inviterTag ||
                        null
                }
            );
        }

        inviteCache.set(
            guild.id,
            inviteMap
        );

        console.log(
            `📨 Invitaciones cargadas para ${guild.name}: ${inviteMap.size}`
        );

        saveInviteData();

        return inviteMap;
    } catch (error) {
        console.log(
            `❌ No se pudieron cargar las invitaciones de ${guild.name}:`
        );
        console.log(error);

        return null;
    }
}

// ========================================
// COMANDOS SLASH
// ========================================

const commands = [

    new SlashCommandBuilder()
        .setName("say")
        .setDescription("Envía un mensaje usando el bot")
        .addStringOption(option =>
            option
                .setName("mensaje")
                .setDescription("Mensaje que enviará el bot")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Banea a un usuario")
        .addUserOption(option =>
            option
                .setName("usuario")
                .setDescription("Usuario a banear")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("razon")
                .setDescription("Razón del ban")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Aplica timeout a un usuario")
        .addUserOption(option =>
            option
                .setName("usuario")
                .setDescription("Usuario")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("minutos")
                .setDescription("Duración en minutos")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
        )
        .addStringOption(option =>
            option
                .setName("razon")
                .setDescription("Razón del timeout")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Muestra el ping del bot"),

    new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Expulsa a un usuario")
        .addUserOption(option =>
            option
                .setName("usuario")
                .setDescription("Usuario a expulsar")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("razon")
                .setDescription("Razón de la expulsión")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Envía un embed usando el bot")
        .addStringOption(option =>
            option
                .setName("titulo")
                .setDescription("Título del embed")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("mensaje")
                .setDescription("Contenido del embed")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Elimina mensajes")
        .addIntegerOption(option =>
            option
                .setName("cantidad")
                .setDescription("Cantidad de mensajes")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    new SlashCommandBuilder()
        .setName("server")
        .setDescription("Muestra información del servidor"),

    new SlashCommandBuilder()
        .setName("user")
        .setDescription("Muestra información de un usuario")
        .addUserOption(option =>
            option
                .setName("usuario")
                .setDescription("Usuario")
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Advierte a un usuario")
        .addUserOption(option =>
            option
                .setName("usuario")
                .setDescription("Usuario")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("razon")
                .setDescription("Razón de la advertencia")
                .setRequired(true)
        )

].map(command => command.toJSON());

// ========================================
// REGISTRAR COMANDOS
// ========================================

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
            `✅ ${commands.length} comandos registrados correctamente.`
        );
    } catch (error) {
        console.log(
            "❌ Error registrando comandos:"
        );
        console.log(error);
    }
}

// ========================================
// COMPROBAR STAFF
// ========================================

function isStaff(interaction) {
    if (
        interaction.memberPermissions?.has(
            PermissionFlagsBits.Administrator
        )
    ) {
        return true;
    }

    if (!STAFF_ROLE_ID) {
        return false;
    }

    return interaction.member.roles.cache.has(
        STAFF_ROLE_ID
    );
}

// ========================================
// BOT LISTO
// ========================================

client.once(
    "ready",
    async () => {

        console.log(
            "========================================"
        );

        console.log(
            `✅ Bot conectado como ${client.user.tag}`
        );

        console.log(
            `🆔 ID: ${client.user.id}`
        );

        console.log(
            "========================================"
        );

        await registerCommands();

        for (
            const guild of client.guilds.cache.values()
        ) {
            await loadGuildInvites(guild);
        }
    }
);

// ========================================
// COMANDOS
// ========================================

client.on(
    "interactionCreate",
    async interaction => {

        if (!interaction.isChatInputCommand()) {
            return;
        }

        try {

            // ========================================
            // PING
            // ========================================

            if (
                interaction.commandName === "ping"
            ) {

                const ping =
                    client.ws.ping;

                await interaction.reply(
                    `🏓 Pong! **${ping}ms**`
                );

                return;
            }

            // ========================================
            // SAY
            // ========================================

            if (
                interaction.commandName === "say"
            ) {

                if (!isStaff(interaction)) {
                    return interaction.reply({
                        content:
                            "❌ No tienes permiso para usar este comando.",
                        ephemeral: true
                    });
                }

                const mensaje =
                    interaction.options.getString(
                        "mensaje"
                    );

                await interaction.reply({
                    content:
                        "✅ Mensaje enviado.",
                    ephemeral: true
                });

                await interaction.channel.send(
                    mensaje
                );

                return;
            }

            // ========================================
            // EMBED
            // ========================================

            if (
                interaction.commandName === "embed"
            ) {

                if (!isStaff(interaction)) {
                    return interaction.reply({
                        content:
                            "❌ No tienes permiso para usar este comando.",
                        ephemeral: true
                    });
                }

                const titulo =
                    interaction.options.getString(
                        "titulo"
                    );

                const mensaje =
                    interaction.options.getString(
                        "mensaje"
                    );

                const embed =
                    new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setTitle(titulo)
                        .setDescription(mensaje)
                        .setTimestamp();

                await interaction.reply({
                    content:
                        "✅ Embed enviado.",
                    ephemeral: true
                });

                await interaction.channel.send({
                    embeds: [embed]
                });

                return;
            }

            // ========================================
            // BAN
            // ========================================

            if (
                interaction.commandName === "ban"
            ) {

                if (
                    !interaction.memberPermissions.has(
                        PermissionFlagsBits.BanMembers
                    )
                ) {
                    return interaction.reply({
                        content:
                            "❌ No tienes permiso para banear usuarios.",
                        ephemeral: true
                    });
                }

                const user =
                    interaction.options.getUser(
                        "usuario"
                    );

                const razon =
                    interaction.options.getString(
                        "razon"
                    ) ||
                    "Sin razón especificada.";

                const member =
                    await interaction.guild.members
                        .fetch(user.id)
                        .catch(() => null);

                if (!member) {
                    return interaction.reply({
                        content:
                            "❌ No encontré a ese usuario en el servidor.",
                        ephemeral: true
                    });
                }

                if (!member.bannable) {
                    return interaction.reply({
                        content:
                            "❌ No puedo banear a ese usuario. Revisa la jerarquía de roles.",
                        ephemeral: true
                    });
                }

                await member.ban({
                    reason: razon
                });

                await interaction.reply(
                    `🔨 **${user.tag}** fue baneado.\n📝 Razón: ${razon}`
                );

                return;
            }

            // ========================================
            // KICK
            // ========================================

            if (
                interaction.commandName === "kick"
            ) {

                if (
                    !interaction.memberPermissions.has(
                        PermissionFlagsBits.KickMembers
                    )
                ) {
                    return interaction.reply({
                        content:
                            "❌ No tienes permiso para expulsar usuarios.",
                        ephemeral: true
                    });
                }

                const user =
                    interaction.options.getUser(
                        "usuario"
                    );

                const razon =
                    interaction.options.getString(
                        "razon"
                    ) ||
                    "Sin razón especificada.";

                const member =
                    await interaction.guild.members
                        .fetch(user.id)
                        .catch(() => null);

                if (!member) {
                    return interaction.reply({
                        content:
                            "❌ No encontré a ese usuario.",
                        ephemeral: true
                    });
                }

                if (!member.kickable) {
                    return interaction.reply({
                        content:
                            "❌ No puedo expulsar a ese usuario.",
                        ephemeral: true
                    });
                }

                await member.kick(razon);

                await interaction.reply(
                    `👢 **${user.tag}** fue expulsado.\n📝 Razón: ${razon}`
                );

                return;
            }

            // ========================================
            // TIMEOUT
            // ========================================

            if (
                interaction.commandName === "timeout"
            ) {

                if (
                    !interaction.memberPermissions.has(
                        PermissionFlagsBits.ModerateMembers
                    )
                ) {
                    return interaction.reply({
                        content:
                            "❌ No tienes permiso para aplicar timeout.",
                        ephemeral: true
                    });
                }

                const user =
                    interaction.options.getUser(
                        "usuario"
                    );

                const minutos =
                    interaction.options.getInteger(
                        "minutos"
                    );

                const razon =
                    interaction.options.getString(
                        "razon"
                    ) ||
                    "Sin razón especificada.";

                const member =
                    await interaction.guild.members
                        .fetch(user.id)
                        .catch(() => null);

                if (!member) {
                    return interaction.reply({
                        content:
                            "❌ No encontré a ese usuario.",
                        ephemeral: true
                    });
                }

                if (!member.moderatable) {
                    return interaction.reply({
                        content:
                            "❌ No puedo aplicar timeout a ese usuario.",
                        ephemeral: true
                    });
                }

                await member.timeout(
                    minutos * 60 * 1000,
                    razon
                );

                await interaction.reply(
                    `⏳ **${user.tag}** recibió un timeout de **${minutos} minuto(s)**.\n📝 Razón: ${razon}`
                );

                return;
            }

            // ========================================
            // CLEAR
            // ========================================

            if (
                interaction.commandName === "clear"
            ) {

                if (
                    !interaction.memberPermissions.has(
                        PermissionFlagsBits.ManageMessages
                    )
                ) {
                    return interaction.reply({
                        content:
                            "❌ No tienes permiso para eliminar mensajes.",
                        ephemeral: true
                    });
                }

                const cantidad =
                    interaction.options.getInteger(
                        "cantidad"
                    );

                const mensajes =
                    await interaction.channel.bulkDelete(
                        cantidad,
                        true
                    );

                await interaction.reply({
                    content:
                        `🗑️ Se eliminaron **${mensajes.size} mensajes**.`,
                    ephemeral: true
                });

                return;
            }

            // ========================================
            // SERVER
            // ========================================

            if (
                interaction.commandName === "server"
            ) {

                const guild =
                    interaction.guild;

                const embed =
                    new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setTitle(
                            `📊 Información de ${guild.name}`
                        )
                        .setThumbnail(
                            guild.iconURL({
                                dynamic: true
                            })
                        )
                        .addFields(
                            {
                                name: "👑 Dueño",
                                value:
                                    `<@${guild.ownerId}>`,
                                inline: true
                            },
                            {
                                name: "👥 Miembros",
                                value:
                                    `${guild.memberCount}`,
                                inline: true
                            },
                            {
                                name: "🎭 Roles",
                                value:
                                    `${guild.roles.cache.size}`,
                                inline: true
                            },
                            {
                                name: "💬 Canales",
                                value:
                                    `${guild.channels.cache.size}`,
                                inline: true
                            },
                            {
                                name: "🆔 ID",
                                value:
                                    guild.id,
                                inline: true
                            },
                            {
                                name: "📅 Creado",
                                value:
                                    `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
                                inline: false
                            }
                        )
                        .setTimestamp();

                await interaction.reply({
                    embeds: [embed]
                });

                return;
            }

            // ========================================
            // USER
            // ========================================

            if (
                interaction.commandName === "user"
            ) {

                const user =
                    interaction.options.getUser(
                        "usuario"
                    ) ||
                    interaction.user;

                const member =
                    await interaction.guild.members
                        .fetch(user.id)
                        .catch(() => null);

                const embed =
                    new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setTitle(
                            `👤 Información de ${user.tag}`
                        )
                        .setThumbnail(
                            user.displayAvatarURL({
                                dynamic: true,
                                size: 1024
                            })
                        )
                        .addFields(
                            {
                                name: "👤 Usuario",
                                value:
                                    `${user.tag}`,
                                inline: true
                            },
                            {
                                name: "🆔 ID",
                                value:
                                    user.id,
                                inline: true
                            },
                            {
                                name: "🤖 Bot",
                                value:
                                    user.bot
                                        ? "Sí"
                                        : "No",
                                inline: true
                            },
                            {
                                name: "📅 Cuenta creada",
                                value:
                                    `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`,
                                inline: false
                            }
                        )
                        .setTimestamp();

                if (member) {

                    embed.addFields({
                        name: "📥 Entró al servidor",
                        value:
                            member.joinedTimestamp
                                ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
                                : "Desconocido",
                        inline: false
                    });
                }

                await interaction.reply({
                    embeds: [embed]
                });

                return;
            }

            // ========================================
            // WARN
            // ========================================

            if (
                interaction.commandName === "warn"
            ) {

                if (!isStaff(interaction)) {
                    return interaction.reply({
                        content:
                            "❌ No tienes permiso para usar este comando.",
                        ephemeral: true
                    });
                }

                const user =
                    interaction.options.getUser(
                        "usuario"
                    );

                const razon =
                    interaction.options.getString(
                        "razon"
                    );

                const embed =
                    new EmbedBuilder()
                        .setColor(0xFEE75C)
                        .setTitle(
                            "⚠️ Advertencia"
                        )
                        .addFields(
                            {
                                name: "👤 Usuario",
                                value:
                                    `${user.tag}\n<@${user.id}>`,
                                inline: true
                            },
                            {
                                name: "🛡️ Moderador",
                                value:
                                    `${interaction.user}`,
                                inline: true
                            },
                            {
                                name: "📝 Razón",
                                value:
                                    razon
                            }
                        )
                        .setTimestamp();

                await interaction.reply({
                    embeds: [embed]
                });

                return;
            }

        } catch (error) {

            console.log(
                "❌ Error ejecutando comando:"
            );

            console.log(error);

            if (!interaction.replied) {
                await interaction.reply({
                    content:
                        "❌ Ocurrió un error al ejecutar el comando.",
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
);

// ========================================
// NUEVA INVITACIÓN
// ========================================

client.on(
    "inviteCreate",
    async invite => {

        try {

            if (!invite.guild) return;

            if (
                !inviteCache.has(
                    invite.guild.id
                )
            ) {
                inviteCache.set(
                    invite.guild.id,
                    new Map()
                );
            }

            const guildInvites =
                inviteCache.get(
                    invite.guild.id
                );

            guildInvites.set(
                invite.code,
                {
                    uses:
                        invite.uses || 0,
                    inviterId:
                        invite.inviter?.id ||
                        null,
                    inviterTag:
                        invite.inviter?.tag ||
                        null
                }
            );

            saveInviteData();

            console.log(
                `🆕 Invitación creada: ${invite.code}`
            );

        } catch (error) {

            console.log(
                "❌ Error procesando nueva invitación:"
            );

            console.log(error);
        }
    }
);

// ========================================
// INVITACIÓN ELIMINADA
// ========================================

client.on(
    "inviteDelete",
    async invite => {

        try {

            if (!invite.guild) return;

            const guildInvites =
                inviteCache.get(
                    invite.guild.id
                );

            if (!guildInvites) return;

            guildInvites.delete(
                invite.code
            );

            saveInviteData();

            console.log(
                `🗑️ Invitación eliminada: ${invite.code}`
            );

        } catch (error) {

            console.log(
                "❌ Error procesando invitación eliminada:"
            );

            console.log(error);
        }
    }
);

// ========================================
// DETECTAR INVITACIÓN UTILIZADA
// ========================================

client.on(
    "guildMemberAdd",
    async member => {

        try {

            const guild =
                member.guild;

            const logChannel =
                guild.channels.cache.get(
                    INVITE_LOG_CHANNEL_ID
                );

            const oldInvites =
                inviteCache.get(
                    guild.id
                ) || new Map();

            const previousInvites =
                new Map(oldInvites);

            let newInvites;

            try {

                newInvites =
                    await guild.invites.fetch();

            } catch (error) {

                console.log(
                    "❌ No se pudieron obtener las invitaciones actuales."
                );

                return;
            }

            let usedInvite = null;
            let biggestIncrease = 0;

            for (
                const invite of newInvites.values()
            ) {

                const oldData =
                    previousInvites.get(
                        invite.code
                    );

                const oldUses =
                    oldData?.uses || 0;

                const newUses =
                    invite.uses || 0;

                const increase =
                    newUses - oldUses;

                if (
                    increase >
                    biggestIncrease
                ) {

                    biggestIncrease =
                        increase;

                    usedInvite =
                        invite;
                }
            }

            const updatedMap =
                new Map();

            for (
                const invite of newInvites.values()
            ) {

                const oldData =
                    previousInvites.get(
                        invite.code
                    );

                updatedMap.set(
                    invite.code,
                    {
                        uses:
                            invite.uses || 0,
                        inviterId:
                            invite.inviter?.id ||
                            oldData?.inviterId ||
                            null,
                        inviterTag:
                            invite.inviter?.tag ||
                            oldData?.inviterTag ||
                            null
                    }
                );
            }

            inviteCache.set(
                guild.id,
                updatedMap
            );

            saveInviteData();

            if (
                !usedInvite ||
                biggestIncrease <= 0
            ) {
                console.log(
                    `❓ No se pudo determinar qué invitación utilizó ${member.user.tag}`
                );

                return;
            }

            const oldData =
                previousInvites.get(
                    usedInvite.code
                );

            const inviterId =
                usedInvite.inviter?.id ||
                oldData?.inviterId ||
                null;

            const inviterTag =
                usedInvite.inviter?.tag ||
                oldData?.inviterTag ||
                "Desconocido";

            if (!inviterId) return;

            if (
                !inviteTotals[inviterId]
            ) {
                inviteTotals[inviterId] = 0;
            }

            inviteTotals[inviterId]++;

            saveInviteData();

            const totalInvites =
                inviteTotals[inviterId];

            console.log(
                `📨 ${member.user.tag} entró mediante ${inviterTag}`
            );

            if (!logChannel) return;

            const embed =
                new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle(
                        "📨 Nueva invitación utilizada"
                    )
                    .setThumbnail(
                        member.user.displayAvatarURL({
                            dynamic: true
                        })
                    )
                    .addFields(
                        {
                            name: "👤 Usuario",
                            value:
                                `${member.user.tag}\n<@${member.id}>`,
                            inline: true
                        },
                        {
                            name: "📨 Invitador",
                            value:
                                `<@${inviterId}>\n${inviterTag}`,
                            inline: true
                        },
                        {
                            name: "📊 Invitaciones",
                            value:
                                `${totalInvites}`,
                            inline: true
                        },
                        {
                            name: "🔗 Código",
                            value:
                                `\`${usedInvite.code}\``,
                            inline: true
                        }
                    )
                    .setFooter({
                        text:
                            `ID: ${member.id}`
                    })
                    .setTimestamp();

            await logChannel.send({
                embeds: [embed]
            });

        } catch (error) {

            console.log(
                "❌ Error detectando invitación:"
            );

            console.log(error);
        }
    }
);

// ========================================
// MENSAJES ELIMINADOS
// ========================================

client.on(
    "messageDelete",
    async message => {

        try {

            if (!message.guild) return;
            if (message.author?.bot) return;

            const channel =
                message.guild.channels.cache.get(
                    LOG_CHANNEL_ID
                );

            if (!channel) return;

            const contenido =
                message.content?.trim() ||
                "Sin contenido de texto.";

            const embed =
                new EmbedBuilder()
                    .setColor(0xED4245)
                    .setTitle(
                        "🗑️ Mensaje eliminado"
                    )
                    .setThumbnail(
                        message.author?.displayAvatarURL({
                            dynamic: true
                        }) || null
                    )
                    .addFields(
                        {
                            name: "👤 Usuario",
                            value:
                                message.author
                                    ? `${message.author.tag}\n<@${message.author.id}>`
                                    : "Desconocido",
                            inline: true
                        },
                        {
                            name: "📍 Canal",
                            value:
                                `<#${message.channel.id}>`,
                            inline: true
                        },
                        {
                            name: "💬 Mensaje",
                            value:
                                contenido.substring(
                                    0,
                                    1024
                                )
                        }
                    )
                    .setTimestamp();

            await channel.send({
                embeds: [embed]
            });

        } catch (error) {

            console.log(
                "❌ Error en mensaje eliminado:"
            );

            console.log(error);
        }
    }
);

// ========================================
// MENSAJES EDITADOS
// ========================================

client.on(
    "messageUpdate",
    async (
        oldMessage,
        newMessage
    ) => {

        try {

            if (!newMessage.guild) return;
            if (newMessage.author?.bot) return;

            if (
                oldMessage.content ===
                newMessage.content
            ) {
                return;
            }

            const channel =
                newMessage.guild.channels.cache.get(
                    LOG_CHANNEL_ID
                );

            if (!channel) return;

            const antes =
                oldMessage.content?.trim() ||
                "Sin contenido.";

            const despues =
                newMessage.content?.trim() ||
                "Sin contenido.";

            const embed =
                new EmbedBuilder()
                    .setColor(0xFEE75C)
                    .setTitle(
                        "✏️ Mensaje editado"
                    )
                    .setThumbnail(
                        newMessage.author?.displayAvatarURL({
                            dynamic: true
                        }) || null
                    )
                    .addFields(
                        {
                            name: "👤 Usuario",
                            value:
                                `${newMessage.author.tag}\n<@${newMessage.author.id}>`,
                            inline: true
                        },
                        {
                            name: "📍 Canal",
                            value:
                                `<#${newMessage.channel.id}>`,
                            inline: true
                        },
                        {
                            name: "📝 Antes",
                            value:
                                antes.substring(
                                    0,
                                    1024
                                )
                        },
                        {
                            name: "📝 Después",
                            value:
                                despues.substring(
                                    0,
                                    1024
                                )
                        }
                    )
                    .setTimestamp();

            await channel.send({
                embeds: [embed]
            });

        } catch (error) {

            console.log(
                "❌ Error en mensaje editado:"
            );

            console.log(error);
        }
    }
);

// ========================================
// ROLES
// ========================================

client.on(
    "guildMemberUpdate",
    async (
        oldMember,
        newMember
    ) => {

        try {

            const channel =
                newMember.guild.channels.cache.get(
                    ROLE_LOG_CHANNEL_ID
                );

            if (!channel) return;

            const oldRoles =
                new Set(
                    oldMember.roles.cache.keys()
                );

            const newRoles =
                new Set(
                    newMember.roles.cache.keys()
                );

            const addedRole =
                newMember.roles.cache.find(
                    role =>
                        !oldRoles.has(
                            role.id
                        )
                );

            const removedRole =
                oldMember.roles.cache.find(
                    role =>
                        !newRoles.has(
                            role.id
                        )
                );

            if (addedRole) {

                const embed =
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setTitle(
                            "➕ Rol añadido"
                        )
                        .addFields(
                            {
                                name: "👤 Usuario",
                                value:
                                    `${newMember.user.tag}\n<@${newMember.id}>`,
                                inline: true
                            },
                            {
                                name: "🎭 Rol",
                                value:
                                    `${addedRole}`,
                                inline: true
                            }
                        )
                        .setTimestamp();

                await channel.send({
                    embeds: [embed]
                });
            }

            if (removedRole) {

                const embed =
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setTitle(
                            "➖ Rol eliminado"
                        )
                        .addFields(
                            {
                                name: "👤 Usuario",
                                value:
                                    `${newMember.user.tag}\n<@${newMember.id}>`,
                                inline: true
                            },
                            {
                                name: "🎭 Rol",
                                value:
                                    removedRole.name,
                                inline: true
                            }
                        )
                        .setTimestamp();

                await channel.send({
                    embeds: [embed]
                });
            }

        } catch (error) {

            console.log(
                "❌ Error detectando cambio de rol:"
            );

            console.log(error);
        }
    }
);

// ========================================
// ROL CREADO
// ========================================

client.on(
    "roleCreate",
    async role => {

        try {

            const channel =
                role.guild.channels.cache.get(
                    ROLE_LOG_CHANNEL_ID
                );

            if (!channel) return;

            const embed =
                new EmbedBuilder()
                    .setColor(0x57F287)
                    .setTitle(
                        "🎭 Rol creado"
                    )
                    .addFields({
                        name: "Rol",
                        value:
                            `${role.name}\n${role}`
                    })
                    .setTimestamp();

            await channel.send({
                embeds: [embed]
            });

        } catch (error) {

            console.log(
                "❌ Error registrando rol creado:"
            );

            console.log(error);
        }
    }
);

// ========================================
// ROL ELIMINADO
// ========================================

client.on(
    "roleDelete",
    async role => {

        try {

            const channel =
                role.guild.channels.cache.get(
                    ROLE_LOG_CHANNEL_ID
                );

            if (!channel) return;

            const embed =
                new EmbedBuilder()
                    .setColor(0xED4245)
                    .setTitle(
                        "🗑️ Rol eliminado"
                    )
                    .addFields({
                        name: "Rol",
                        value:
                            role.name
                    })
                    .setTimestamp();

            await channel.send({
                embeds: [embed]
            });

        } catch (error) {

            console.log(
                "❌ Error registrando rol eliminado:"
            );

            console.log(error);
        }
    }
);

// ========================================
// BAN / UNBAN
// ========================================

client.on(
    "guildBanAdd",
    async ban => {

        try {

            const channel =
                ban.guild.channels.cache.get(
                    BAN_LOG_CHANNEL_ID
                );

            if (!channel) return;

            let moderator =
                "Desconocido";

            try {

                const logs =
                    await ban.guild.fetchAuditLogs({
                        type:
                            AuditLogEvent.MemberBanAdd,
                        limit: 10
                    });

                const entry =
                    logs.entries.find(
                        entry =>
                            entry.target?.id ===
                                ban.user.id &&
                            Date.now() -
                                entry.createdTimestamp <
                                10000
                    );

                if (entry?.executor) {
                    moderator =
                        `<@${entry.executor.id}>`;
                }

            } catch {}

            const embed =
                new EmbedBuilder()
                    .setColor(0xED4245)
                    .setTitle(
                        "🔨 Usuario baneado"
                    )
                    .setThumbnail(
                        ban.user.displayAvatarURL({
                            dynamic: true
                        })
                    )
                    .addFields(
                        {
                            name: "👤 Usuario",
                            value:
                                `${ban.user.tag}\n<@${ban.user.id}>`,
                            inline: true
                        },
                        {
                            name: "🛡️ Moderador",
                            value:
                                moderator,
                            inline: true
                        }
                    )
                    .setFooter({
                        text:
                            `ID: ${ban.user.id}`
                    })
                    .setTimestamp();

            await channel.send({
                embeds: [embed]
            });

        } catch (error) {

            console.log(
                "❌ Error detectando ban:"
            );

            console.log(error);
        }
    }
);

client.on(
    "guildBanRemove",
    async ban => {

        try {

            const channel =
                ban.guild.channels.cache.get(
                    BAN_LOG_CHANNEL_ID
                );

            if (!channel) return;

            const embed =
                new EmbedBuilder()
                    .setColor(0x57F287)
                    .setTitle(
                        "🔓 Usuario desbaneado"
                    )
                    .setThumbnail(
                        ban.user.displayAvatarURL({
                            dynamic: true
                        })
                    )
                    .addFields({
                        name: "👤 Usuario",
                        value:
                            `${ban.user.tag}\n<@${ban.user.id}>`
                    })
                    .setTimestamp();

            await channel.send({
                embeds: [embed]
            });

        } catch (error) {

            console.log(
                "❌ Error detectando unban:"
            );

            console.log(error);
        }
    }
);

// ========================================
// TIMEOUT LOG
// ========================================

client.on(
    "guildMemberUpdate",
    async (
        oldMember,
        newMember
    ) => {

        try {

            const oldTimeout =
                oldMember.communicationDisabledUntilTimestamp;

            const newTimeout =
                newMember.communicationDisabledUntilTimestamp;

            if (
                oldTimeout ===
                newTimeout
            ) {
                return;
            }

            const channel =
                newMember.guild.channels.cache.get(
                    BAN_LOG_CHANNEL_ID
                );

            if (!channel) return;

            if (
                newTimeout &&
                newTimeout > Date.now()
            ) {

                const duracionMs =
                    newTimeout -
                    Date.now();

                const duracionMinutos =
                    Math.ceil(
                        duracionMs /
                        60000
                    );

                let duracionTexto;

                if (
                    duracionMinutos < 60
                ) {

                    duracionTexto =
                        `${duracionMinutos} minuto(s)`;

                } else {

                    const horas =
                        Math.floor(
                            duracionMinutos /
                            60
                        );

                    const minutos =
                        duracionMinutos %
                        60;

                    duracionTexto =
                        `${horas} hora(s)`;

                    if (minutos > 0) {
                        duracionTexto +=
                            ` y ${minutos} minuto(s)`;
                    }
                }

                let moderator =
                    "Desconocido";

                try {

                    const logs =
                        await newMember.guild.fetchAuditLogs({
                            type:
                                AuditLogEvent.MemberUpdate,
                            limit: 10
                        });

                    const entry =
                        logs.entries.find(
                            entry => {

                                if (
                                    !entry.target ||
                                    entry.target.id !==
                                        newMember.id
                                ) {
                                    return false;
                                }

                                if (
                                    Date.now() -
                                        entry.createdTimestamp >
                                    10000
                                ) {
                                    return false;
                                }

                                return (
                                    entry.changes ||
                                    []
                                ).some(
                                    change =>
                                        change.key ===
                                        "communication_disabled_until"
                                );
                            }
                        );

                    if (entry?.executor) {
                        moderator =
                            `<@${entry.executor.id}>`;
                    }

                } catch {}

                const embed =
                    new EmbedBuilder()
                        .setColor(0xFEE75C)
                        .setTitle(
                            "⏳ Timeout aplicado"
                        )
                        .setThumbnail(
                            newMember.user.displayAvatarURL({
                                dynamic: true
                            })
                        )
                        .addFields(
                            {
                                name: "👤 Usuario",
                                value:
                                    `${newMember.user.tag}\n<@${newMember.id}>`,
                                inline: true
                            },
                            {
                                name: "🛡️ Moderador",
                                value:
                                    moderator,
                                inline: true
                            },
                            {
                                name: "⏱️ Duración",
                                value:
                                    duracionTexto,
                                inline: true
                            },
                            {
                                name: "⏰ Termina",
                                value:
                                    `<t:${Math.floor(newTimeout / 1000)}:F>\n<t:${Math.floor(newTimeout / 1000)}:R>`
                            }
                        )
                        .setTimestamp();

                await channel.send({
                    embeds: [embed]
                });

                return;
            }

            if (
                oldTimeout &&
                (
                    !newTimeout ||
                    newTimeout <= Date.now()
                )
            ) {

                const embed =
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setTitle(
                            "🔊 Timeout retirado"
                        )
                        .addFields({
                            name: "👤 Usuario",
                            value:
                                `${newMember.user.tag}\n<@${newMember.id}>`
                        })
                        .setTimestamp();

                await channel.send({
                    embeds: [embed]
                });
            }

        } catch (error) {

            console.log(
                "❌ Error detectando timeout:"
            );

            console.log(error);
        }
    }
);

// ========================================
// VOZ
// ========================================

client.on(
    "voiceStateUpdate",
    async (
        oldState,
        newState
    ) => {

        try {

            const channel =
                newState.guild.channels.cache.get(
                    VOICE_LOG_CHANNEL_ID
                );

            if (!channel) return;

            if (
                !oldState.channelId &&
                newState.channelId
            ) {

                const embed =
                    new EmbedBuilder()
                        .setColor(0x57F287)
                        .setTitle(
                            "🔊 Entrada a canal de voz"
                        )
                        .addFields(
                            {
                                name: "👤 Usuario",
                                value:
                                    `${newState.member.user.tag}\n<@${newState.member.id}>`,
                                inline: true
                            },
                            {
                                name: "📍 Canal",
                                value:
                                    `<#${newState.channelId}>`,
                                inline: true
                            }
                        )
                        .setTimestamp();

                await channel.send({
                    embeds: [embed]
                });
            }

            if (
                oldState.channelId &&
                !newState.channelId
            ) {

                const embed =
                    new EmbedBuilder()
                        .setColor(0xED4245)
                        .setTitle(
                            "🔇 Salida de canal de voz"
                        )
                        .addFields(
                            {
                                name: "👤 Usuario",
                                value:
                                    `${oldState.member.user.tag}\n<@${oldState.member.id}>`,
                                inline: true
                            },
                            {
                                name: "📍 Canal",
                                value:
                                    `<#${oldState.channelId}>`,
                                inline: true
                            }
                        )
                        .setTimestamp();

                await channel.send({
                    embeds: [embed]
                });
            }

            if (
                oldState.channelId &&
                newState.channelId &&
                oldState.channelId !==
                    newState.channelId
            ) {

                const embed =
                    new EmbedBuilder()
                        .setColor(0xFEE75C)
                        .setTitle(
                            "🔄 Cambio de canal de voz"
                        )
                        .addFields(
                            {
                                name: "👤 Usuario",
                                value:
                                    `${newState.member.user.tag}\n<@${newState.member.id}>`,
                                inline: true
                            },
                            {
                                name: "📤 Desde",
                                value:
                                    `<#${oldState.channelId}>`,
                                inline: true
                            },
                            {
                                name: "📥 Hacia",
                                value:
                                    `<#${newState.channelId}>`,
                                inline: true
                            }
                        )
                        .setTimestamp();

                await channel.send({
                    embeds: [embed]
                });
            }

        } catch (error) {

            console.log(
                "❌ Error registrando voz:"
            );

            console.log(error);
        }
    }
);

// ========================================
// AUTO-MUTE
// ========================================

client.on(
    "voiceStateUpdate",
    async (
        oldState,
        newState
    ) => {

        try {

            if (!AUTO_MUTE_CHANNEL_ID) {
                return;
            }

            if (
                newState.channelId ===
                    AUTO_MUTE_CHANNEL_ID &&
                oldState.channelId !==
                    AUTO_MUTE_CHANNEL_ID
            ) {

                if (
                    newState.member &&
                    !newState.serverMute
                ) {

                    try {

                        await newState.member.voice.setMute(
                            true,
                            "Entrada al canal de auto-mute"
                        );

                        console.log(
                            `🔇 ${newState.member.user.tag} fue silenciado automáticamente.`
                        );

                    } catch (error) {

                        console.log(
                            "❌ No se pudo silenciar al usuario:"
                        );

                        console.log(error);
                    }
                }
            }

            if (
                oldState.channelId ===
                    AUTO_MUTE_CHANNEL_ID &&
                newState.channelId !==
                    AUTO_MUTE_CHANNEL_ID
            ) {

                if (
                    newState.member &&
                    newState.serverMute
                ) {

                    try {

                        await newState.member.voice.setMute(
                            false,
                            "Salida del canal de auto-mute"
                        );

                        console.log(
                            `🔊 ${newState.member.user.tag} fue desilenciado automáticamente.`
                        );

                    } catch (error) {

                        console.log(
                            "❌ No se pudo quitar el mute:"
                        );

                        console.log(error);
                    }
                }
            }

        } catch (error) {

            console.log(
                "❌ Error en auto-mute:"
            );

            console.log(error);
        }
    }
);

// ========================================
// AUTO-DELETE
// ========================================

client.on(
    "messageCreate",
    async message => {

        try {

            if (!message.guild) return;
            if (message.author.bot) return;

            if (
                message.channel.id !==
                AUTO_DELETE_CHANNEL_ID
            ) {
                return;
            }

            const hasVideo =
                message.attachments.some(
                    attachment =>
                        attachment.contentType?.startsWith(
                            "video/"
                        )
                );

            const hasLink =
                /https?:\/\/\S+/i.test(
                    message.content
                );

            if (
                hasVideo ||
                hasLink
            ) {
                return;
            }

            await message.delete();

            const warning =
                await message.channel.send(
                    `${message.author}, en este canal solo se permiten **videos y enlaces**.`
                );

            setTimeout(
                async () => {
                    try {
                        await warning.delete();
                    } catch {}
                },
                5000
            );

        } catch (error) {

            console.log(
                "❌ Error en auto-delete:"
            );

            console.log(error);
        }
    }
);

// ========================================
// LOGIN
// ========================================

client.login(TOKEN);
