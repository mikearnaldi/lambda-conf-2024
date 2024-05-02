import { Schema as S } from "@effect/schema"
import { pipe } from "effect"
import { Api, ApiResponse } from "effect-http"

/**
 *  SCHEMA DEFINITIONS
 */
export class Content extends S.Class<Content>("Content")({
  content: S.String
}) {}

export class Note extends Content.extend<Note>("Note")({
  id: S.Int
}) {
  static Array = S.Array(this)
}

export class NoteApiError extends S.TaggedError<NoteApiError>()("NoteApiError", {
  message: S.String,
  details: S.String
}) {}

/**
 * API DEFINITIONS
 */
export const noteApi = pipe(
  Api.make({ title: "Notes API" }),
  Api.addEndpoint(
    pipe(
      Api.post("createNote", "/notes"),
      Api.setRequestBody(Content),
      Api.setResponseBody(Note.Array),
      Api.setResponseStatus(201),
      Api.addResponse(ApiResponse.make(500, NoteApiError))
    )
  ),
  Api.addEndpoint(
    pipe(
      Api.get("getNotes", "/notes"),
      Api.setResponseBody(Note.Array),
      Api.addResponse(ApiResponse.make(500, NoteApiError))
    )
  ),
  Api.addEndpoint(
    pipe(
      Api.delete("deleteNotes", "/notes"),
      Api.setResponseBody(S.String),
      Api.addResponse(ApiResponse.make(500, NoteApiError))
    )
  ),
  Api.addEndpoint(
    pipe(
      Api.get("getNote", "/notes/:id"),
      Api.setRequestPath(S.Struct({ id: S.NumberFromString })),
      Api.setResponseBody(Note),
      Api.addResponse(ApiResponse.make(500, NoteApiError))
    )
  ),
  Api.addEndpoint(
    pipe(
      Api.delete("deleteNote", "/notes/:id"),
      Api.setRequestPath(S.Struct({ id: S.NumberFromString })),
      Api.setResponseBody(S.String),
      Api.addResponse(ApiResponse.make(500, NoteApiError))
    )
  )
)
