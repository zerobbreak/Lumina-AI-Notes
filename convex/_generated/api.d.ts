/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as aiEditor from "../aiEditor.js";
import type * as aiNotes from "../aiNotes.js";
import type * as aiTranscription from "../aiTranscription.js";
import type * as analytics from "../analytics.js";
import type * as collaboration from "../collaboration.js";
import type * as crons from "../crons.js";
import type * as files from "../files.js";
import type * as flashcards from "../flashcards.js";
import type * as notes from "../notes.js";
import type * as presence from "../presence.js";
import type * as quizzes from "../quizzes.js";
import type * as recordings from "../recordings.js";
import type * as search from "../search.js";
import type * as shared_aiClient from "../shared/aiClient.js";
import type * as shared_diagram from "../shared/diagram.js";
import type * as shared_noteQuality from "../shared/noteQuality.js";
import type * as shared_transcript from "../shared/transcript.js";
import type * as tags from "../tags.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiEditor: typeof aiEditor;
  aiNotes: typeof aiNotes;
  aiTranscription: typeof aiTranscription;
  analytics: typeof analytics;
  collaboration: typeof collaboration;
  crons: typeof crons;
  files: typeof files;
  flashcards: typeof flashcards;
  notes: typeof notes;
  presence: typeof presence;
  quizzes: typeof quizzes;
  recordings: typeof recordings;
  search: typeof search;
  "shared/aiClient": typeof shared_aiClient;
  "shared/diagram": typeof shared_diagram;
  "shared/noteQuality": typeof shared_noteQuality;
  "shared/transcript": typeof shared_transcript;
  tags: typeof tags;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
