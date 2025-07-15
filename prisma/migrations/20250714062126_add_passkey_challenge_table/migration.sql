-- CreateTable
CREATE TABLE "UserPasskeyChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "challenge" TEXT NOT NULL,
    CONSTRAINT "UserPasskeyChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
