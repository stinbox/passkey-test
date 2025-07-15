/*
  Warnings:

  - You are about to drop the `UserPasskeyAuthenticationChallenge` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserPasskeyRegistrationChallenge` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UserPasskeyAuthenticationChallenge";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UserPasskeyRegistrationChallenge";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "PasskeyChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "challenge" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
