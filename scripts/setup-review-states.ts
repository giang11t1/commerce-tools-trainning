import { config } from "dotenv";

config({ path: ".env.local", override: true });

import { ClientBuilder } from "@commercetools/ts-client";
import {
  createApiBuilderFromCtpClient,
  type State,
  type StateUpdateAction,
} from "@commercetools/platform-sdk";

const expectedProjectKey = "b2c-sample-project";
const expectedRegion = "us-central1.gcp";
const expectedApiHost = "api.us-central1.gcp.commercetools.com";
const expectedAuthHost = "auth.us-central1.gcp.commercetools.com";
const projectKey = process.env.CT_PROJECT_KEY;
const clientId = process.env.CT_CLIENT_ID;
const clientSecret = process.env.CT_CLIENT_SECRET;
const authUrl = process.env.CT_AUTH_URL;
const apiUrl = process.env.CT_API_URL;
const region = process.env.CT_REGION;

function hostOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

if (
  projectKey !== expectedProjectKey ||
  region !== expectedRegion ||
  hostOf(apiUrl) !== expectedApiHost ||
  hostOf(authUrl) !== expectedAuthHost
) {
  throw new Error(
    `Refusing remote access: expected TEST project ${expectedProjectKey} in ${expectedRegion} (${expectedApiHost}), received project ${projectKey ?? "unset"}, region ${region ?? "unset"}, API host ${hostOf(apiUrl) ?? "unset"}, auth host ${hostOf(authUrl) ?? "unset"}.`
  );
}

if (!clientId || !clientSecret || !apiUrl || !authUrl) {
  throw new Error("Missing commercetools credentials or API URLs in .env.local");
}

const client = new ClientBuilder()
  .withClientCredentialsFlow({
    host: authUrl,
    projectKey,
    credentials: { clientId, clientSecret },
    scopes: [`manage_states:${expectedProjectKey}`],
  })
  .withHttpMiddleware({ host: apiUrl })
  .build();

const projectApi = createApiBuilderFromCtpClient(client).withProjectKey({
  projectKey,
});

const requiredKeys = [
  "review-approved",
  "review-rejected",
  "review-pending",
] as const;
type RequiredKey = (typeof requiredKeys)[number];

const stateNames: Record<RequiredKey, string> = {
  "review-approved": "Review Approved",
  "review-rejected": "Review Rejected",
  "review-pending": "Review Pending",
};

async function listReviewStates(): Promise<State[]> {
  const response = await projectApi
    .states()
    .get({ queryArgs: { where: 'type="ReviewState"', limit: 500 } })
    .execute();
  return response.body.results;
}

async function getState(id: string): Promise<State> {
  const response = await projectApi.states().withId({ ID: id }).get().execute();
  return response.body;
}

function planUpdates(
  key: RequiredKey,
  state: State,
  targetStateIds: { approved?: string; rejected?: string }
): StateUpdateAction[] {
  if (state.type !== "ReviewState") {
    throw new Error(
      `State ${key} has type ${state.type}; refusing to change its type automatically.`
    );
  }

  const actions: StateUpdateAction[] = [];
  if (state.initial !== (key === "review-pending")) {
    actions.push({ action: "changeInitial", initial: key === "review-pending" });
  }

  const roles = state.roles ?? [];
  if (key === "review-approved" && !roles.includes("ReviewIncludedInStatistics")) {
    actions.push({
      action: "addRoles",
      roles: ["ReviewIncludedInStatistics"],
    });
  }
  if (key === "review-rejected" && roles.includes("ReviewIncludedInStatistics")) {
    actions.push({
      action: "removeRoles",
      roles: ["ReviewIncludedInStatistics"],
    });
  }

  if (key === "review-pending" && state.transitions !== undefined) {
    const transitions = state.transitions;
    const desiredIds = [targetStateIds.approved, targetStateIds.rejected].filter(
      (id): id is string => Boolean(id)
    );
    const existingIds = transitions.map((transition) => transition.id);
    const missingIds = desiredIds.filter((id) => !existingIds.includes(id));
    if (missingIds.length) {
      actions.push({
        action: "setTransitions",
        transitions: [
          ...transitions.map((transition) => ({ typeId: "state" as const, id: transition.id })),
          ...missingIds.map((id) => ({ typeId: "state" as const, id })),
        ],
      });
    }
  }

  return actions;
}

async function updateStateSafely(
  key: RequiredKey,
  state: State,
  targetStateIds: { approved?: string; rejected?: string }
): Promise<State> {
  let current = state;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const actions = planUpdates(key, current, targetStateIds);
    if (!actions.length) return current;

    try {
      const response = await projectApi
        .states()
        .withId({ ID: current.id })
        .post({ body: { version: current.version, actions } })
        .execute();
      console.log(`Updated ${key} (version ${response.body.version}).`);
      return response.body;
    } catch (error) {
      const statusCode =
        typeof error === "object" && error !== null && "statusCode" in error
          ? Number(error.statusCode)
          : undefined;
      if (statusCode !== 409 || attempt > 0) throw error;
      current = await getState(current.id);
      console.log(`Concurrent update detected for ${key}; rechecking current state.`);
    }
  }
  return current;
}

async function ensureState(
  key: RequiredKey,
  initial: boolean,
  roles: State["roles"] = [],
  transitions?: State["transitions"]
): Promise<State> {
  const existing = (await listReviewStates()).find((state) => state.key === key);
  if (existing) {
    console.log(`Reusing ${key} (${existing.id}).`);
    return existing;
  }

  console.log(
    `Remote mutation target: project ${expectedProjectKey}, region ${expectedRegion}. Creating ${key}.`
  );
  const response = await projectApi
    .states()
    .post({
      body: {
        key,
        type: "ReviewState",
        name: { "en-US": stateNames[key] },
        initial,
        roles,
        ...(transitions ? { transitions } : {}),
      },
    })
    .execute();
  console.log(`Created ${key} (${response.body.id}).`);
  return response.body;
}

function verifyFinalStates(states: State[]): void {
  const byKey = new Map(states.map((state) => [state.key, state]));
  const pending = byKey.get("review-pending");
  const approved = byKey.get("review-approved");
  const rejected = byKey.get("review-rejected");
  if (!pending || !approved || !rejected) {
    throw new Error("Verification failed: one or more required review states are missing.");
  }
  const transitions = new Set((pending.transitions ?? []).map((state) => state.id));
  const checks = {
    types: [pending, approved, rejected].every((state) => state.type === "ReviewState"),
    pendingInitial: pending.initial,
    pendingTransitions:
      pending.transitions === undefined ||
      (transitions.has(approved.id) && transitions.has(rejected.id)),
    approvedIncludedInStatistics: approved.roles?.includes("ReviewIncludedInStatistics") ?? false,
    rejectedExcludedFromStatistics: !(rejected.roles ?? []).includes("ReviewIncludedInStatistics"),
    approvedTerminal: (approved.transitions ?? []).length === 0,
    rejectedTerminal: (rejected.transitions ?? []).length === 0,
  };
  console.log("Final verified state configuration:");
  for (const key of requiredKeys) {
    const state = byKey.get(key)!;
    console.log(
      JSON.stringify({
        key,
        id: state.id,
        version: state.version,
        type: state.type,
        initial: state.initial,
        roles: state.roles ?? [],
        transitions: (state.transitions ?? []).map((transition) => transition.id),
      })
    );
  }
  console.log(`Verification: ${JSON.stringify(checks)}`);
  if (
    !checks.types ||
    !checks.pendingInitial ||
    !checks.pendingTransitions ||
    !checks.approvedIncludedInStatistics ||
    !checks.rejectedExcludedFromStatistics
  ) {
    throw new Error("Post-setup state verification failed.");
  }
}

async function main(): Promise<void> {
  console.log(
    `Verified remote target: TEST project ${expectedProjectKey}, region ${expectedRegion}, API host ${expectedApiHost}.`
  );

  let states = await listReviewStates();
  const existingInitial = states.find((state) => state.initial);
  if (existingInitial && existingInitial.key !== "review-pending") {
    throw new Error(
      `A different ReviewState (${existingInitial.key}) is already initial; refusing to create another initial state or alter the existing workflow.`
    );
  }

  const approved = await ensureState("review-approved", false, ["ReviewIncludedInStatistics"]);
  const rejected = await ensureState("review-rejected", false);
  const pending = await ensureState("review-pending", true, [], [
    { typeId: "state", id: approved.id },
    { typeId: "state", id: rejected.id },
  ]);

  const targetStateIds = { approved: approved.id, rejected: rejected.id };
  for (const [key, state] of [
    ["review-approved", approved],
    ["review-rejected", rejected],
  ] as const) {
    await updateStateSafely(key, state, targetStateIds);
  }
  await updateStateSafely("review-pending", pending, targetStateIds);

  states = await listReviewStates();
  verifyFinalStates(states);
}

main().catch((error: unknown) => {
  const statusCode =
    typeof error === "object" && error !== null && "statusCode" in error
      ? Number(error.statusCode)
      : undefined;
  const body =
    typeof error === "object" && error !== null && "body" in error
      ? error.body
      : undefined;
  console.error("Review state setup failed.");
  if (statusCode) console.error(`HTTP status: ${statusCode}`);
  if (body && typeof body === "object" && "message" in body) {
    console.error(`API message: ${String(body.message)}`);
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("Unknown setup error.");
  }
  process.exit(1);
});
