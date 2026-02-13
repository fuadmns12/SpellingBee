# Spelling Bee Structure

- `host/SpellingBeeHostPage.tsx`: halaman host/juri (create room, approve player, start/end game, scoring).
- `player/SpellingBeeJoinPage.tsx`: halaman player (join room, wait approval, bell).
- `shared/constants.ts`: opsi setup + helper id (`createRoomId`, `createPlayerId`).
- `shared/types.ts`: tipe setup lintas host/player.

Route tetap:
- `app/games/spelling-bee/page.tsx` -> host wrapper
- `app/games/spelling-bee/join/[roomId]/page.tsx` -> player wrapper
