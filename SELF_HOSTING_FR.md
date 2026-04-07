# 🚀 Guide d'Auto-Hébergement (Français)

Ce guide vous explique comment héberger votre propre instance de ce bot Discord gratuitement en utilisant **Render** et **UptimeRobot**.

---

## 1. Création de l'Application Discord

1.  Rendez-vous sur le [Discord Developer Portal](https://discord.com/developers/applications).
2.  Cliquez sur **New Application** et donnez-lui un nom.
3.  Allez dans l'onglet **Bot** :
    *   Récupérez votre **Token** (cliquez sur "Reset Token" si nécessaire).
    *   Cochez les **Privileged Gateway Intents** :
        *   ✅ Presence Intent
        *   ✅ Server Members Intent
        *   ✅ Message Content Intent
4.  Allez dans l'onglet **OAuth2** -> **General** :
    *   Récupérez votre **Client ID** et **Client Secret**.
    *   Dans **Redirects**, ajoutez l'URL suivante : `http://localhost:10000/auth/callback` (pour vos tests locaux) et `https://votre-app.render.com/auth/callback` (pour Render).

---

## 2. Préparation du Stockage (Sans BD)

Le bot a besoin d'un salon Discord privé pour sauvegarder ses données de configuration :
1.  Créez un salon textuel privé sur votre serveur.
2.  Assurez-vous que le bot a la permission de **Lire**, **Envoyer** et **Modifier** des messages dans ce salon.
3.  Faites un clic droit sur le salon et cliquez sur **Copier l'identifiant** (Activez le mode développeur dans vos paramètres Discord si vous ne le voyez pas). Cet ID sera votre `STORAGE_CHANNEL_ID`.

---

## 3. Configuration du fichier `.env`

Créez un fichier `.env` à la racine du projet avec ces informations :

```env
DISCORD_TOKEN=votre_token_bot
STORAGE_CHANNEL_ID=id_du_salon_prive
DISCORD_CLIENT_ID=votre_client_id
DISCORD_CLIENT_SECRET=votre_client_secret
DISCORD_REDIRECT_URI=https://votre-app.render.com/auth/callback
SESSION_SECRET=une_phrase_secrete_aleatoire
PORT=10000
```

---

## 4. Hébergement sur Render (Gratuit)

1.  Créez un compte sur [Render](https://render.com/).
2.  Créez un nouveau **Web Service** et connectez votre dépôt GitHub.
3.  Configurez les paramètres suivants :
    *   **Runtime** : Node
    *   **Build Command** : `npm install`
    *   **Start Command** : `node src/bot.js`
4.  Dans l'onglet **Environment**, ajoutez toutes les variables de votre `.env`.

---

## 5. Maintien en Vie avec UptimeRobot

Render met les services gratuits en "sommeil" après 15 minutes d'inactivité. Pour éviter cela :
1.  Créez un compte gratuit sur [UptimeRobot](https://uptimerobot.com/).
2.  Ajoutez un nouveau moniteur :
    *   **Monitor Type** : HTTP(s)
    *   **Friendly Name** : Mon Bot Discord
    *   **URL** : L'URL de votre application Render (ex: `https://mon-bot.onrender.com/`)
    *   **Monitoring Interval** : Toutes les **5 minutes**.
3.  Grâce à cela, UptimeRobot "réveillera" votre bot toutes les 5 minutes, le gardant actif 24h/24 !

---

## 6. Lancement du Dashboard

Une fois déployé, visitez l'URL de votre application Render. Vous pourrez vous connecter avec votre compte Discord et configurer vos serveurs directement via l'interface web !
