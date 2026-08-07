# Dark Heresy 2nd Edition

This is an _unofficial_ system for playing Dark Heresy 2nd Edition on [Foundry VTT](https://foundryvtt.com/). This requires >= Foundry 12.

It offers extensive support for character sheets, compendium packs, and automated management to save you time and allow you to focus on role playing. The existing system listed on Foundry was character sheet only and thus this system was created to facilitate the automation features I desired.

---

## About this fork

This is a fork of [mrkeathley/dark-heresy-2nd-vtt](https://github.com/mrkeathley/dark-heresy-2nd-vtt), extended with additional automation for my own table. Everything above and in the _Thanks_ section below is the original author's work — the sections marked **Added in this fork** are mine.

### A disclaimer worth reading first

I'm a programmer, but not in the language Foundry is written in, and I don't know its API. The additions in this fork were built with [Claude Code](https://claude.com/claude-code) doing the implementation while I directed the design, tested it against a real campaign world, and decided what the rules should actually do.

What that means in practice:

- Everything here was verified against a live world before being committed, including numeric before/after comparisons across every character to check that changes didn't quietly alter existing sheets.
- The system ships **data migrations**. They keep a backup of the data they convert, but as with any system update, **back up your world before installing**.
- If something breaks, please open an issue rather than working around it by hand. I'd rather fix the cause.
- Don't assume the code follows Foundry community idioms. It works and it's tested, but it was written by someone learning the platform as they went.

---

## Features

🗡️ The system includes a variety of compendium packs, such as weapons, weapon mods, talents, armor, psychic abilities, ammunition, tools, traits, attack specials (toxic, corrosive, etc.), and consumables and drugs.

💪 During character creation, there are automated bonuses for backgrounds, roles, and elite advances.

🧰 You can easily manage your inventory by dragging and dropping items, such as weapon mods and custom ammunition to build weapons, or storing items in a location on your ship to reduce encumbrance.

🔫 You can also drag weapons and skills to the macro bar for easy access, and the system offers automation support for weapon specials, most talents, attack types, and custom ammunition when you attack. Modifiers like distance and character size are automatically taken into account when targeting an attack.

## Added in this fork

⚡ **Gear that actually changes your character.** Items can carry Active Effects that modify characteristics, skills, specialist skills and armour. Equip a Medi-kit and your Medicae goes up; take it off and it goes back down. Effects apply only while the item is equipped, and things inside a weapon only count while that weapon is in hand.

💊 **Consumables and drugs you can use.** Stimms, de-tox and the like have a quantity and a Use button. Using one rolls its duration, applies its effects for that long, spends a dose, and posts the result to chat.

📦 **Quantities and stacking.** Physical items have a quantity rather than needing one document per copy. Carry weight counts the whole stack, and requisitioning something you already own adds to it instead of creating a second row.

🎯 **Situational bonuses shown where they matter.** A great deal of equipment grants a bonus only in specific circumstances — "+30 to Security when opening locks", "+20 Toughness to resist gas". Rather than applying these blindly, the system shows them on the relevant roll with the condition spelled out and the number the target *would* become, leaving the call to you.

🏷️ **Talents and traits with a specialisation.** Peer, Enemy, Hatred, Resistance, Weapon Training and Unnatural Characteristic let you pick what they were taken for. The choice sets the item's name, the bonus it advises, and — for Unnatural Characteristic — which characteristic is actually raised. Ratings scale properly, so Peer at rank 2 advises +20.

💰 **Requisition Menu and Warband Subtlety.** A player-facing menu browses available gear by Availability, rolls the Influence test for you, and grants items on success. A shared Warband Tracker holds the party's Subtlety, spent automatically for scarce requisitions.

🩸 **Critical damage automation.** Critical results apply their mechanical consequences — Fatigue, Stunned, Prone, Blinded, Blood Loss, death — with one click, and log a permanent injury record. The genuinely conditional and branching results stay as prose on purpose.

💫 **Status effects that affect dice.** Stunned, Prone and Blinded have real numeric consequences on rolls and action availability rather than being cosmetic icons.

🔧 **Under the hood.** Ammunition and weapon modifications are real items on a character instead of data hidden inside the weapon, which is what lets them carry effects at all. Cybernetic armour points now reach the character, carry weight counts what's loaded inside a weapon, and a cancelled drag no longer destroys the item being dragged.

## Install

> This fork is not published to a manifest URL. Install it by cloning this repository into your Foundry `Data/systems` directory, or use the original author's release below for the unmodified system.

Original system:
 - Go to the setup page and choose _Game Systems_.
 - Click the _Install System_ button, and paste in this [manifest link](https://s3-keathley.nyc3.digitaloceanspaces.com/dark-heresy-2nd/system.json)
 - Create a Game World using the "Dark Heresy 2nd Edition" system.

## Links
  - [Foundry VTT](https://foundryvtt.com/)
  - [Dark Heresy 2nd Edition Rules](https://www.drivethrurpg.com/browse/pub/54/Cubicle-7-Entertainment-Ltd/subcategory/179_21610/Dark-Heresy-Second-Edition)
  - [Upstream project](https://github.com/mrkeathley/dark-heresy-2nd-vtt)

## Screenshots

| ![Character Sheet](.github/char_sheet.png)   | ![Weapon Sheet](.github/weapon_sheet.png) |
|:---------------------------------------------|:---:|
| ![Attack Prompt](.github/attack_prompt.png)  | ![Damage Chat](.github/damage_chat.png) |


### Thanks
- I liked the layout of the WH4e sheet on Roll20 and tried to mimic that where possible. Thanks to the authors for that inspiration.
- I studied the original DH2e Foundry VTT project by moo-man. I ended up not using much from there but learned a lot about Foundry. I appreciate the head start!
- My tabletop group for play testing and feedback.

## License
[GNU General Public License v3.0](https://choosealicense.com/licenses/gpl-3.0/)
