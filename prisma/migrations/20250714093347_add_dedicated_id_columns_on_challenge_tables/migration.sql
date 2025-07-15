/*
  Warnings:

  - The primary key for the `UserPasskeyAuthenticationChallenge` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `UserPasskeyRegistrationChallenge` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The required column `id` was added to the `UserPasskeyAuthenticationChallenge` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `id` was added to the `UserPasskeyRegistrationChallenge` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserPasskeyAuthenticationChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "challenge" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserPasskeyAuthenticationChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserPasskeyAuthenticationChallenge" ("challenge", "createdAt", "userId") SELECT "challenge", "createdAt", "userId" FROM "UserPasskeyAuthenticationChallenge";
DROP TABLE "UserPasskeyAuthenticationChallenge";
ALTER TABLE "new_UserPasskeyAuthenticationChallenge" RENAME TO "UserPasskeyAuthenticationChallenge";
CREATE TABLE "new_UserPasskeyRegistrationChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "challenge" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserPasskeyRegistrationChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserPasskeyRegistrationChallenge" ("challenge", "createdAt", "userId") SELECT "challenge", "createdAt", "userId" FROM "UserPasskeyRegistrationChallenge";
DROP TABLE "UserPasskeyRegistrationChallenge";
ALTER TABLE "new_UserPasskeyRegistrationChallenge" RENAME TO "UserPasskeyRegistrationChallenge";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
