/*
  Warnings:

  - The primary key for the `UserPasskeyChallenge` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `UserPasskeyChallenge` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserPasskeyChallenge" (
    "userId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "challenge" TEXT NOT NULL,
    CONSTRAINT "UserPasskeyChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserPasskeyChallenge" ("challenge", "userId") SELECT "challenge", "userId" FROM "UserPasskeyChallenge";
DROP TABLE "UserPasskeyChallenge";
ALTER TABLE "new_UserPasskeyChallenge" RENAME TO "UserPasskeyChallenge";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
