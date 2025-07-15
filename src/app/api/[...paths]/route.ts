import { Hono } from "hono";
import { handle } from "hono/vercel";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { prisma } from "@/prisma";
import {
  RELYING_PARTY_ID,
  RELYING_PARTY_NAME,
  RELYING_PARTY_ORIGIN,
} from "@/constants";

const honoApp = new Hono<{
  Variables: {
    user: {
      id: number;
      name: string | null;
      email: string;
    };
  };
}>()
  .basePath("/api")

  .post(
    "/auth/sign-up-with-passkey/options",
    zValidator(
      "json",
      z.object({
        email: z.email(),
      }),
    ),
    async (c) => {
      const { email } = c.req.valid("json");

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return c.json({ error: "User already exists" }, 400);
      }

      const { registrationOptions, challengeRecord } =
        await prisma.$transaction(async (tx) => {
          const registrationOptions = await generateRegistrationOptions({
            rpName: RELYING_PARTY_NAME,
            rpID: RELYING_PARTY_ID,
            userName: email,
            attestationType: "none",
          });

          const challengeRecord = await tx.passkeyChallenge.create({
            data: {
              challenge: registrationOptions.challenge,
            },
          });

          return { registrationOptions, challengeRecord };
        });

      return c.json({
        registrationOptions,
        challengeId: challengeRecord.id,
      });
    },
  )

  .post(
    "/auth/sign-up-with-passkey/verify",
    zValidator(
      "json",
      z.object({
        challengeId: z.string(),
        credential: z.any(),
        name: z.string(),
        email: z.email(),
      }),
    ),
    async (c) => {
      const body = c.req.valid("json");
      const { challengeId, email, name } = body;
      const credential: RegistrationResponseJSON = body.credential;

      const registrationChallenge = await prisma.passkeyChallenge.findUnique({
        where: {
          id: challengeId,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          },
        },
      });

      if (!registrationChallenge) {
        return c.json({ error: "Challenge not found." }, 403);
      }

      const verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: registrationChallenge.challenge,
        expectedOrigin: RELYING_PARTY_ORIGIN,
        expectedRPID: RELYING_PARTY_ID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return c.json({ error: "Verification failed." }, 400);
      }

      const { registrationInfo } = verification;

      const [createdUser] = await prisma.$transaction([
        prisma.user.create({
          data: {
            email: email,
            name: name,
            UserPasskeyCredential: {
              create: {
                id: registrationInfo.credential.id,
                // webAuthnUserId: registrationInfo.
                aaguid: registrationInfo.aaguid,
                counter: registrationInfo.credential.counter,
                publicKey: registrationInfo.credential.publicKey,
                backedUp: registrationInfo.credentialBackedUp,
                deviceType: registrationInfo.credentialDeviceType,
                transports: registrationInfo.credential.transports?.join(","),
              },
            },
            UserSession: {
              create: {},
            },
          },
          include: {
            UserSession: true,
          },
        }),

        prisma.passkeyChallenge.delete({
          where: { id: challengeId },
        }),
      ]);

      setCookie(c, "session-id", createdUser.UserSession[0].id, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });

      return c.newResponse(null, 204);
    },
  )

  .post(
    "/auth/sign-in-with-passkey/options",
    zValidator(
      "json",
      z.object({
        email: z.email(),
      }),
    ),
    async (c) => {
      const { email } = c.req.valid("json");

      const { authenticationOptions, challengeRecord } =
        await prisma.$transaction(async (tx) => {
          const passkeyCredentials =
            await prisma.userPasskeyCredential.findMany({
              where: { user: { email } },
            });

          const authenticationOptions = await generateAuthenticationOptions({
            rpID: RELYING_PARTY_ID,
            allowCredentials: passkeyCredentials.map((credential) => ({
              id: credential.id,
              transports: credential.transports?.split(
                ",",
              ) as AuthenticatorTransportFuture[],
            })),
          });

          const challengeRecord = await tx.passkeyChallenge.create({
            data: {
              challenge: authenticationOptions.challenge,
            },
          });

          return { authenticationOptions, challengeRecord };
        });

      return c.json({
        authenticationOptions,
        challengeId: challengeRecord.id,
      });
    },
  )

  .post(
    "/auth/sign-in-with-passkey/verify",
    zValidator(
      "json",
      z.object({
        challengeId: z.string(),
        credential: z.any(),
      }),
    ),
    async (c) => {
      const body = c.req.valid("json");
      const challengeId = body.challengeId;
      const credential: AuthenticationResponseJSON = body.credential;

      const authenticationChallenge = await prisma.passkeyChallenge.findUnique({
        where: {
          id: challengeId,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          },
        },
      });

      const userPasskeyCredential =
        await prisma.userPasskeyCredential.findUnique({
          where: { id: credential.id },
        });

      if (!authenticationChallenge || !userPasskeyCredential) {
        return c.json({ error: "Challenge not found for the user." }, 404);
      }

      const verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: authenticationChallenge.challenge,
        expectedOrigin: RELYING_PARTY_ORIGIN,
        expectedRPID: RELYING_PARTY_ID,
        credential: {
          id: userPasskeyCredential.id,
          publicKey: userPasskeyCredential.publicKey,
          counter: userPasskeyCredential.counter,
          transports: userPasskeyCredential.transports?.split(
            ",",
          ) as AuthenticatorTransportFuture[],
        },
      });

      if (!verification.verified || !verification.authenticationInfo) {
        return c.json({ error: "Verification failed." }, 400);
      }

      const [, , userSession] = await prisma.$transaction([
        prisma.userPasskeyCredential.update({
          where: { id: userPasskeyCredential.id },
          data: {
            counter: verification.authenticationInfo.newCounter,
            lastUsedAt: new Date(),
          },
        }),

        prisma.passkeyChallenge.delete({
          where: { id: authenticationChallenge.id },
        }),

        prisma.userSession.create({
          data: {
            userId: userPasskeyCredential.userId,
          },
        }),
      ]);

      setCookie(c, "session-id", userSession.id, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });

      return c.newResponse(null, 204);
    },
  )

  // 認証済みチェック Middleware
  .use("/*", async (c, next) => {
    const sessionId = getCookie(c, "session-id");
    if (!sessionId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const userSession = await prisma.userSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    if (!userSession) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    c.set("user", userSession.user);
    await next();
  })

  .post("/auth/add-passkey/options", async (c) => {
    const user = c.get("user");

    const { registrationOptions, challengeRecord } = await prisma.$transaction(
      async (tx) => {
        const userPassKeys = await tx.userPasskeyCredential.findMany({
          where: { userId: user.id },
        });

        const registrationOptions = await generateRegistrationOptions({
          rpName: RELYING_PARTY_NAME,
          rpID: RELYING_PARTY_ID,
          userID: new TextEncoder().encode(user.id.toString()),
          userName: user.email,
          userDisplayName: user.name ?? "",
          attestationType: "none",
          excludeCredentials: userPassKeys.map((passkey) => ({
            id: passkey.id,
            transports: passkey.transports?.split(
              ",",
            ) as AuthenticatorTransportFuture[],
          })),
        });

        const challengeRecord = await tx.passkeyChallenge.create({
          data: {
            challenge: registrationOptions.challenge,
          },
        });

        return { registrationOptions, challengeRecord };
      },
    );

    return c.json({
      registrationOptions,
      challengeId: challengeRecord.id,
    });
  })

  .post(
    "/auth/add-passkey/verify",
    zValidator(
      "json",
      z.object({
        challengeId: z.string(),
        credential: z.any(),
      }),
    ),
    async (c) => {
      const user = c.get("user");
      const body = c.req.valid("json");
      const challengeId = body.challengeId;
      const credential: RegistrationResponseJSON = body.credential;

      const registrationChallenge = await prisma.passkeyChallenge.findUnique({
        where: {
          id: challengeId,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          },
        },
      });

      if (!registrationChallenge) {
        return c.json({ error: "Challenge not found for the user." }, 404);
      }

      const verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: registrationChallenge.challenge,
        expectedOrigin: RELYING_PARTY_ORIGIN,
        expectedRPID: RELYING_PARTY_ID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return c.json({ error: "Verification failed." }, 400);
      }

      const { registrationInfo } = verification;

      const [] = await prisma.$transaction([
        prisma.userPasskeyCredential.create({
          data: {
            id: registrationInfo.credential.id,
            userId: user.id,
            // webAuthnUserId: registrationInfo.
            aaguid: registrationInfo.aaguid,
            counter: registrationInfo.credential.counter,
            publicKey: registrationInfo.credential.publicKey,
            backedUp: registrationInfo.credentialBackedUp,
            deviceType: registrationInfo.credentialDeviceType,
            transports: registrationInfo.credential.transports?.join(","),
          },
        }),

        prisma.passkeyChallenge.delete({
          where: { id: challengeId },
        }),
      ]);

      return c.newResponse(null, 204);
    },
  )

  .get("/auth/passkeys", async (c) => {
    const user = c.get("user");
    const passkeys = await prisma.userPasskeyCredential.findMany({
      where: { userId: user.id },
    });
    return c.json(passkeys);
  })

  .delete("/auth/passkeys/:credentialId", async (c) => {
    const user = c.get("user");
    const credentialId = c.req.param("credentialId");

    await prisma.userPasskeyCredential.delete({
      where: {
        userId: user.id,
        id: credentialId,
      },
    });
    return c.newResponse(null, 204);
  })

  .delete("/auth/logout", async (c) => {
    const sessionId = deleteCookie(c, "session-id");
    await prisma.userSession.delete({
      where: { id: sessionId },
    });
    return c.newResponse(null, 204);
  })

  .get("/user", (c) => {
    const user = c.get("user");
    return c.json(user);
  });

const handler = handle(honoApp);
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
