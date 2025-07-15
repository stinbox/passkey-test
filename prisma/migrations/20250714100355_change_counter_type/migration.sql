/*
  Warnings:

  - You are about to alter the column `counter` on the `UserPasskeyCredential` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserPasskeyCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "aaguid" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "publicKey" BLOB NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "deviceType" TEXT NOT NULL,
    "transports" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastUsedAt" DATETIME,
    CONSTRAINT "UserPasskeyCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserPasskeyCredential" ("aaguid", "backedUp", "counter", "createdAt", "deviceType", "id", "lastUsedAt", "publicKey", "transports", "updatedAt", "userId") SELECT "aaguid", "backedUp", "counter", "createdAt", "deviceType", "id", "lastUsedAt", "publicKey", "transports", "updatedAt", "userId" FROM "UserPasskeyCredential";
DROP TABLE "UserPasskeyCredential";
ALTER TABLE "new_UserPasskeyCredential" RENAME TO "UserPasskeyCredential";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
