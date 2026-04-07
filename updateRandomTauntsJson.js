const fs = require('fs');

const frPath = './src/public/locales/fr.json';
const enPath = './src/public/locales/en.json';

const fr = JSON.parse(fs.readFileSync(frPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// Updates to dashboard.tabs.general
fr.dashboard.tabs.general.random_taunts = "😈 Moqueries Aléatoires";
fr.dashboard.tabs.general.random_taunts_chance = "🎲 Probabilité (% par message)";

en.dashboard.tabs.general.random_taunts = "😈 Random Taunts";
en.dashboard.tabs.general.random_taunts_chance = "🎲 Probability (% per message)";

// Updates to events
if(!fr.events) fr.events = {};
fr.events.random_taunts = {
    "insults": [
        "Tiens, le looser de service {user} a encore parlé...",
        "{user}, on t'a pas sonné le looser.",
        "Alerte au gogol ! {user} vient de faire une apparition.",
        "Encore {user}... Même avec une carte Uno Reverse tu pourrais pas sauver ta dignité.",
        "Oh la la, {user} vient de polluer le chat..."
    ],
    "praises": [
        "Gloire au King {user} ! 👑",
        "Place au grand {user}, notre seigneur ! 🙌",
        "Silence, notre King {user} a parlé. Tout le monde écoute !",
        "Que ton nom soit béni, {user}. Le serveur n'est rien sans toi.",
        "👑 Le ROI {user} honore le salon de sa présence !"
    ]
};

if(!en.events) en.events = {};
en.events.random_taunts = {
    "insults": [
        "Look, the resident looser {user} spoke again...",
        "{user}, no one asked you, looser.",
        "Idiot alert! {user} just made an appearance.",
        "Again {user}... Even an Uno Reverse card couldn't save your dignity.",
        "Oh no, {user} just polluted the chat..."
    ],
    "praises": [
        "Glory to the King {user}! 👑",
        "Make way for the great {user}, our lord! 🙌",
        "Silence, our King {user} has spoken. Everyone listen!",
        "Blessed be your name, {user}. This server is nothing without you.",
        "👑 The KING {user} graces the channel with their presence!"
    ]
};

fs.writeFileSync(frPath, JSON.stringify(fr, null, 2));
fs.writeFileSync(enPath, JSON.stringify(en, null, 2));

console.log("Translations updated with random_taunts config");
