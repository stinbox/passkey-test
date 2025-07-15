"use client";
import {
  PublicKeyCredentialCreationOptionsJSON,
  startRegistration,
  startAuthentication,
  RegistrationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/browser";
import useSWR from "swr";

async function getRegistrationOptions(email: string) {
  const response = await fetch("/api/auth/sign-up-with-passkey/options", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
    }),
  });

  const data = await response.json();

  return data as {
    registrationOptions: PublicKeyCredentialCreationOptionsJSON;
    challengeId: string;
  };
}

async function sendRegistrationChallengeResponse(
  challengeId: string,
  registrationResponse: RegistrationResponseJSON,
  name: string,
  email: string,
) {
  const response = await fetch(`/api/auth/sign-up-with-passkey/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      challengeId: challengeId,
      credential: registrationResponse,
      name: name,
      email: email,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to verify registration response");
  }
}

async function signUpWithPasskey(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  const { registrationOptions, challengeId } = await getRegistrationOptions(
    email,
  );
  const registrationResponse = await startRegistration({
    optionsJSON: registrationOptions,
  });

  await sendRegistrationChallengeResponse(
    challengeId,
    registrationResponse,
    name,
    email,
  );
  alert("Registration successful!");
}

async function getAuthenticationOptions(email: string) {
  const response = await fetch("/api/auth/sign-in-with-passkey/options", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
    }),
  });

  const data = await response.json();

  return data as {
    authenticationOptions: PublicKeyCredentialRequestOptionsJSON;
    challengeId: string;
  };
}

async function sendAuthenticationChallengeResponse(
  challengeId: string,
  authenticationResponse: AuthenticationResponseJSON,
) {
  const response = await fetch(`/api/auth/sign-in-with-passkey/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      challengeId: challengeId,
      credential: authenticationResponse,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to verify authentication response");
  }
}

async function signInWithPasskey(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const email = formData.get("email") as string;

  const { authenticationOptions, challengeId } = await getAuthenticationOptions(
    email,
  );
  const authenticationResponse = await startAuthentication({
    optionsJSON: authenticationOptions,
  });

  await sendAuthenticationChallengeResponse(
    challengeId,
    authenticationResponse,
  );
  alert("Login successful!");
}

async function getAdditionalRegistrationOptions() {
  const response = await fetch("/api/auth/add-passkey/options", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  return data as {
    registrationOptions: PublicKeyCredentialCreationOptionsJSON;
    challengeId: string;
  };
}

async function sendAdditionalRegistrationChallengeResponse(
  challengeId: string,
  registrationResponse: RegistrationResponseJSON,
) {
  const response = await fetch(`/api/auth/add-passkey/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      challengeId: challengeId,
      credential: registrationResponse,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to verify registration response");
  }
}

async function addPasskey(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const { registrationOptions, challengeId } =
    await getAdditionalRegistrationOptions();
  const registrationResponse = await startRegistration({
    optionsJSON: registrationOptions,
  });

  await sendAdditionalRegistrationChallengeResponse(
    challengeId,
    registrationResponse,
  );
  alert("Registration successful!");
}

export default function Home() {
  const passkeysQuery = useSWR("/api/auth/passkeys", async () => {
    const response = await fetch("/api/auth/passkeys");
    if (!response.ok) {
      throw new Error("Failed to fetch passkeys");
    }
    return (await response.json()) as {
      id: string;
      aaguid: string;
      counter: number;
      createdAt: string;
      lastUsedAt: string | null;
    }[];
  });

  return (
    <div>
      <form
        className="flex flex-col gap-4 p-8 max-w-xl"
        onSubmit={signUpWithPasskey}
      >
        <label className="flex flex-col gap-2">
          <span>name</span>
          <input
            className="border rounded p-2"
            type="text"
            name="name"
            placeholder="Enter your name"
            required
          />
        </label>
        <label className="flex flex-col gap-2">
          <span>email</span>
          <input
            className="border rounded p-2"
            type="email"
            name="email"
            placeholder="Enter your email"
            required
          />
        </label>
        <button className="rounded-full border p-2 cursor-pointer">
          パスキーでアカウント登録
        </button>
      </form>
      <hr className="my-8" />
      <form
        className="flex flex-col gap-4 p-8 max-w-xl"
        onSubmit={signInWithPasskey}
      >
        <label className="flex flex-col gap-2">
          <span>email</span>
          <input
            className="border rounded p-2"
            type="email"
            name="email"
            placeholder="Enter your email"
            required
          />
        </label>
        <button className="rounded-full border p-2 cursor-pointer">
          パスキーでログイン
        </button>
      </form>
      <hr className="my-8" />
      <form className="flex flex-col gap-4 p-8 max-w-xl" onSubmit={addPasskey}>
        <button className="rounded-full border p-2 cursor-pointer">
          パスキーを追加する
        </button>
      </form>
      <hr className="my-8" />
      <h2 className="text-2xl font-bold mb-4">Registered Passkeys</h2>
      {passkeysQuery.isLoading && <p>Loading...</p>}
      {passkeysQuery.error && (
        <p className="text-red-500">
          Error loading passkeys: {(passkeysQuery.error as Error).message}
        </p>
      )}
      <ul className="list-disc pl-8">
        {passkeysQuery.data?.map((passkey) => (
          <li key={passkey.id} className="mb-2">
            <div>
              <strong>AAGUID:</strong> {passkey.aaguid}
            </div>
            <div>
              <strong>Counter:</strong> {passkey.counter}
            </div>
            <div>
              <strong>Created At:</strong>{" "}
              {new Date(passkey.createdAt).toLocaleString()}
            </div>
            <div>
              <strong>Last Used At:</strong>{" "}
              {passkey.lastUsedAt
                ? new Date(passkey.lastUsedAt).toLocaleString()
                : "Never"}
            </div>
          </li>
        ))}
      </ul>
      <hr className="my-8" />
    </div>
  );
}
