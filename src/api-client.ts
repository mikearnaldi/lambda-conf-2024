import { NodeRuntime } from "@effect/platform-node"
import { Effect, Logger, LogLevel } from "effect"
import { Client } from "effect-http"
import { noteApi } from "./api-spec"

/**
 * Derive the API client
 */
const notesApiClient = Client.make(noteApi, {
  baseUrl: "http://localhost:1337"
})

/**
 * Use the API client
 */
const program = Effect.gen(function*() {
  yield* notesApiClient.createNote({ body: { content: `Hey LambdaConf!!!` } })
  yield* notesApiClient.createNote({ body: { content: "Look at that!!!" } })
  const notes = yield* notesApiClient.getNotes({})
  yield* Effect.logDebug(`found ${notes.length} notes`)
  for (const note of notes) {
    yield* Effect.logInfo(note.content)
  }
})

/**
 * Run the program
 */
program.pipe(
  Logger.withMinimumLogLevel(LogLevel.Debug),
  NodeRuntime.runMain
)
