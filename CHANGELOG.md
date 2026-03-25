# Changelog

## v2.0.0 - 25/03/2026

### 🎮 Nouveau : Suite de Mini-Jeux

Ajout d'une catégorie **Jeux** complète avec 8 mini-jeux interactifs, tous stateless et utilisant les composants Discord (boutons, menus déroulants) :

| Commande | Jeu | Mode |
|----------|-----|------|
| `!minesweeper` | Démineur (5x5) | Solo |
| `!hangman` | Pendu (mots français) | Multi |
| `!morpion` | Morpion (3x3) | Solo / Multi |
| `!p4` | Puissance 4 (7x6) | Solo / Multi |
| `!blackjack` | Blackjack (52 cartes) | Multi |
| `!memory` | Jeu de Mémoire (4x4) | Solo |
| `!reaction` | Test de Réaction | Serveur entier |
| `!battleship` | Bataille Navale (8x8) | Solo / Multi |

**Highlights :**
- 🚢 **Bataille Navale avancée** : Grille 8x8, placement privé des navires (manuel ou aléatoire), double affichage des grilles, ciblage par boutons (ligne → colonne)
- 🃏 **Blackjack** : Deck complet de 52 cartes, croupier IA (règle du 17+), gestion des As et figures
- ⚡ **Test de Réaction** : Ouvert à tout le serveur, détection des faux départs, mesure en ms

---

### 👹 Nouveaux Modes de Malédiction

Ajout de **8 nouveaux types** de malédiction au système `!curse` :

| Type | Effet |
|------|-------|
| ✍️ **SCRIBE** | Épreuve du Scribe : réécrire une phrase exacte sans copier-coller (anti-triche + test de vitesse) |
| 🎩 **POLITE_MODE** | Obligation de dire "s'il vous plaît" et "merci" |
| 💣 **AUTO_DESTRUCT** | Messages s'autodétruisent après quelques secondes |
| 🔢 **BINARY_MODE** | Messages convertis en binaire |
| 👶 **BABY_TALK** | Messages transformés en langage bébé |
| 🎭 **DRAMATIC_MODE** | Messages rendus ultra-dramatiques |
| 🤖 **ROBOT_MODE** | Messages convertis en langage robot |
| 📜 **MEDIEVAL_MODE** | Messages transformés en vieux français |

**Améliorations du système :**
- Protection anti-copier-coller (caractères invisibles piège)
- Test de vitesse avec pénalité de 5 minutes pour les tricheurs
- Les messages respectant les contraintes (Polite, etc.) sont conservés

---

### 🗑️ Suppression du Module Musique

Le module musique (`!play`, `!skip`, `!stop`, etc.) a été supprimé en raison des problèmes persistants de compatibilité avec les protections anti-bot de YouTube et des dépendances instables.

---

### 📂 Réorganisation

- Les mini-jeux sont regroupés dans la catégorie **🎮 Jeux** (dossier `src/commands/games/`)
- Nouvelle section dans le menu `!help` avec le dropdown interactif

---

### 🛠️ Corrections & Améliorations

- Correction des erreurs Discord API `50035` (labels de boutons vides, emojis invalides)
- Protection `allowedMentions: { parse: [] }` sur les commandes sensibles
- Meilleure gestion des collectors et interactions éphémères
