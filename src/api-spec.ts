import { Schema as S } from "@effect/schema"
import { pipe } from "effect"
import { Api, ApiResponse } from "effect-http"

/**
 *  SCHEMA DEFINITIONS
 */
export const Content = S.Struct({
  content: S.String
})
export interface Content extends S.Schema.Type<typeof Content> {}

export const Note = S.extend(
  S.Struct({
    id: S.Int
  }),
  Content
)
export interface Note extends S.Schema.Type<typeof Note> {}

const Notes = S.Array(Note)
interface Notes extends S.Schema.Type<typeof Notes> {}

const NoteError = S.Struct({
  message: S.String,
  details: S.String
})

/**
 * API DEFINITIONS
 */
export const noteApi = pipe(
  Api.make({ title: "Notes API" }),
  Api.addEndpoint(
    pipe(
      Api.post("createNote", "/notes"),
      Api.setRequestBody(Content),
      Api.setResponseBody(Notes),
      Api.setResponseStatus(201),
      Api.addResponse(ApiResponse.make(500, NoteError))
    )
  ),
  Api.addEndpoint(
    pipe(
      Api.get("getNotes", "/notes"),
      Api.setResponseBody(Notes),
      Api.addResponse(ApiResponse.make(500, NoteError))
    )
  ),
  Api.addEndpoint(
    pipe(
      Api.delete("deleteNotes", "/notes"),
      Api.setResponseBody(S.String),
      Api.addResponse(ApiResponse.make(500, NoteError))
    )
  ),
  Api.addEndpoint(
    pipe(
      Api.get("getNote", "/notes/:id"),
      Api.setRequestPath(S.Struct({ id: S.NumberFromString })),
      Api.setResponseBody(Note),
      Api.addResponse(ApiResponse.make(500, NoteError))
    )
  ),
  Api.addEndpoint(
    pipe(
      Api.delete("deleteNote", "/notes/:id"),
      Api.setRequestPath(S.Struct({ id: S.NumberFromString })),
      Api.setResponseBody(S.String),
      Api.addResponse(ApiResponse.make(500, NoteError))
    )
  )
)
