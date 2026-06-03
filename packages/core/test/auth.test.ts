import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { FSUtil } from "@opencode-ai/core/fs-util"
import { Global } from "@opencode-ai/core/global"
import { Auth } from "@opencode-ai/core/auth"
import { EventV2 } from "@opencode-ai/core/event"
import { tmpdir } from "./fixture/tmpdir"

const withAuth = <A, E, R>(dir: string, effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.provide(Auth.layer),
    Effect.provide(FSUtil.defaultLayer),
    Effect.provide(EventV2.defaultLayer),
    Effect.provide(Global.layerWith({ data: dir })),
  )

describe("Auth", () => {
  test("stores api credentials", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const tmp = yield* Effect.acquireRelease(
          Effect.promise(() => tmpdir()),
          (tmp) => Effect.promise(() => tmp[Symbol.asyncDispose]()),
        )

        const account = yield* withAuth(
          tmp.path,
          Effect.gen(function* () {
            const auth = yield* Auth.Service
            return yield* auth.create({
              serviceID: Auth.ServiceID.make("anthropic"),
              credential: new Auth.ApiKeyCredential({ type: "api", key: "sk-test" }),
            })
          }),
        )

        const active = yield* withAuth(
          tmp.path,
          Effect.gen(function* () {
            const auth = yield* Auth.Service
            return yield* auth.active(Auth.ServiceID.make("anthropic"))
          }),
        )

        return { account, active }
      }).pipe(Effect.scoped),
    )

    expect(result.account).toBeDefined()
    expect(result.active?.id).toBe(result.account?.id)
    expect(result.active?.credential).toEqual({ type: "api", key: "sk-test" })
  })
})
