import "dotenv/config"

import { NodeRuntime } from "@effect/platform-node"
import { Schema as S } from "@effect/schema"
import * as sqlite from "@effect/sql-sqlite-node"
import { Config, Context, Effect, Layer } from "effect"
import { Middlewares, RouterBuilder, ServerError } from "effect-http"
import { NodeServer } from "effect-http-node"
import { Content, Note, noteApi } from "./api-spec"
import { TracingLive } from "./tracing"

const appError = (message: string) =>
  Effect.mapError((e: Error) =>
    ServerError.makeJson(500, {
      message,
      details: e.message
    })
  )

/**
 * Create a repository for the notes
 */
const makeRepository = Effect.gen(function*() {
  const sql = yield* sqlite.client.SqliteClient
  return {
    createNoteTable: () => sql`CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, content TEXT UNIQUE)`,
    createNote: sqlite.schema.void({
      Request: Content,
      execute: (body) => sql`INSERT INTO notes ${sql.insert(body)}`
    }),
    getAllNotes: sqlite.schema.findAll({
      Request: S.Void,
      Result: Note,
      execute: () => sql`SELECT * FROM notes`
    }),
    deleteAllNotes: sqlite.schema.void({
      Request: S.Void,
      execute: () => sql`DELETE FROM notes`
    }),
    getNote: sqlite.schema.single({
      Request: S.Int,
      Result: Note,
      execute: (id) => sql`SELECT * FROM notes WHERE id = ${id}`
    }),
    deleteNote: sqlite.schema.void({
      Request: S.Int,
      execute: (id) => sql`DELETE FROM notes WHERE id = ${id}`
    })
  }
})

/**
 * Sqlite service
 */
const SqliteService = sqlite.client.layer({
  filename: Config.succeed("notes.db")
})

/**
 * Abtract Repository so it can be mocked in tests
 */
class NoteRepository extends Context.Tag("NoteRepository")<
  NoteRepository,
  Effect.Effect.Success<typeof makeRepository>
>() {
  static Live = Layer.effect(this, makeRepository).pipe(
    Layer.provide(SqliteService)
  )
}

/**
 * The main application
 */
const app = Effect.gen(function*() {
  const repository = yield* NoteRepository

  yield* repository.createNoteTable()

  return RouterBuilder.make(noteApi).pipe(
    // POST /notes
    RouterBuilder.handle("createNote", ({ body }) =>
      Effect.gen(function*() {
        yield* repository.createNote(body)
        const notes = yield* repository.getAllNotes()
        return notes
      }).pipe(Effect.withSpan("createNote"), appError("could not create note"))),
    // GET /notes
    RouterBuilder.handle("getNotes", () =>
      Effect.gen(function*() {
        const notes = yield* repository.getAllNotes()
        return notes
      }).pipe(Effect.withSpan("getNotes"), appError("could not get notes"))),
    // DELETE /notes
    RouterBuilder.handle("deleteNotes", () =>
      Effect.gen(function*() {
        yield* repository.deleteAllNotes()
        return "Deleted all notes"
      }).pipe(
        Effect.withSpan("deleteNotes"),
        appError("could not delete notes")
      )),
    // GET /notes/:id
    RouterBuilder.handle("getNote", ({ path }) =>
      Effect.gen(function*() {
        const note = yield* repository.getNote(path.id)
        return note
      }).pipe(
        Effect.withSpan("getNote", { attributes: { "note.id": path.id } }),
        appError("could not get note")
      )),
    // DELETE /notes/:id
    RouterBuilder.handle("deleteNote", ({ path }) =>
      Effect.gen(function*() {
        yield* repository.deleteNote(path.id)
        return "Deleted note"
      }).pipe(
        Effect.withSpan("deleteNote", {
          attributes: { "note.id": path.id }
        }),
        appError("could not delete note")
      )),
    RouterBuilder.build,
    Middlewares.errorLog
  )
})

/**
 * Final Layer
 */
const AppLayer = NoteRepository.Live.pipe(
  Layer.provide(TracingLive)
)

/**
 * Run the application
 */
app.pipe(
  Effect.tap(Effect.logInfo(`Visit: http://localhost:1337/docs#/`)),
  Effect.flatMap(NodeServer.listen({ port: 1337 })),
  Effect.provide(AppLayer),
  NodeRuntime.runMain
)
