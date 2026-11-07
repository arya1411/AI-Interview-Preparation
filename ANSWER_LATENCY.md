# Answer-loading investigation

Checked on 2026-11-05.

## Confirmed behavior

The app does not synthesize all roles in the background. `Frontend/src/utils/roles.js` is static selection data. Preparation/test/core generation is triggered by creating a session, and Generate More requests ten questions for the current session's role. Opening a study question requests a detailed explanation only if one has not already been loaded from the session.

The original study UI had two avoidable waits:

1. Session questions already include a short `answer`, generated at session creation. Expanding a question did not render that answer, so the first visible response depended on a second AI request for a detailed explanation.
2. `generateAndSaveExplanation` publishes generated content before starting its database save, but SessionDetail gated rendering with `!isLoadingExplain`. That flag stayed true until the save promise completed, so a slow save still hid an available response.

The backend waits for a complete Groq response before returning JSON; this route does not stream text. Saved explanations are hydrated from the session and reused without a new AI request on reopening. There is a per-question in-flight guard against duplicate requests in the current page.

## Changes

- Show the stored short answer immediately when a question expands.
- Clear the generation loader as soon as the generated response arrives, while saving continues.
- Keep an existing explanation visible during regeneration.
- Disable regeneration while that question's previous request/save remains in flight.
- Add a deferred-save regression check alongside the existing explanation validation/save-failure tests.

Detailed generation now requires an explicit Generate explanation click; expanding a question does not trigger AI generation. Saved explanations are reused on later visits. Successful persistence confirms “Explanation generated and saved”; regeneration remains available via New explanation. Database persistence is preserved. No model, prompt, answer quality setting or hosting configuration was changed.

## Measurements

These are individual diagnostic samples, not production percentiles or a guarantee:

| Check | Observed time |
| --- | --- |
| Direct Groq request using the application's model/prompt/settings, synthetic JavaScript closure question | 766 ms wall time |
| Provider-reported queue time for that request | 153 ms |
| Provider-reported prompt processing | 31 ms |
| Provider-reported completion generation | 392 ms (186 completion tokens) |
| First database connection and `SELECT 1` in a separate diagnostic process | 870 ms |
| Subsequent `SELECT 1` on that connection | 48 ms |
| Local `/ping` | 60 ms |
| Hosted `/ping` | 185 ms |

Provider timing categories are not the same as end-to-end wall time. A trivial query does not measure actual authenticated session loading or an explanation write. Health checks do not measure Groq calls or database work. No account data was changed by these checks.

The configured local development API is localhost. The base frontend `.env` points to the hosted backend; Vite's development-local override takes precedence locally. Test the environment where the user experiences the delay.

## What remains uncertain

The reported long delay was not reproduced by the permitted direct-provider and health checks. A full authenticated timing test was rejected by automatic approval review because it proposed minting a token for an existing account. It was not executed. Browser access was also unavailable, so the full click-to-visible path has not been measured or visually verified.

The installed Groq SDK defaults to a 60-second per-attempt timeout with two retries; frontend Axios has a 60-second timeout. Transient provider/network failures could therefore produce long waits and a client timeout while the server is still retrying. This is a possible contributor, not an observed cause in this sample. No failure/retry policy was changed without a reproduction.

For an actual slow occurrence, capture Network durations for the session GET, explanation POST and explanation-save POST, together with whether the backend was idle beforehand. Compare a first-open question, reopening that question, and opening it after a page reload. That separates page/session latency, new generation, persistence and cache reuse.
