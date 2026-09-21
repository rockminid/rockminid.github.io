# Security Specification for Geochemical Identifier

## 1. Data Invariants
1. **User Isolation**: A user can only read, create, update, and delete documents within their own `/users/{userId}` path hierarchy (`request.auth.uid == userId`).
2. **Identity Integrity**: In `/users/{userId}/savedSamples/{sampleId}`, the incoming `userId` must strictly match `request.auth.uid` and `{userId}`.
3. **Immutability of Key Fields**: `createdAt`, `userId`, and `id` can never be changed on update.
4. **Volume & Type Validation**:
   - `name`: string, 1-120 chars.
   - `sampleType`: string, one of `rock`, `mineral`, `custom`.
   - `oxides`: map/object with valid numeric concentrations.
   - `notes`: string, max 2000 chars.
   - `tags`: list of strings, max size 15.
   - `databaseRefs`: map of external IDs (Mindat, Webmineral, RRUFF, EarthChem).
5. **Default Deny**: All unspecified paths are closed to all reads and writes.

## 2. The Dirty Dozen Payloads (Designed to Fail)
1. **Unauthenticated Read**: Attempting to read `/users/user123/savedSamples/sample1` without auth -> REJECT.
2. **Cross-User Snooping**: `user_A` attempting to read `/users/user_B/savedSamples/sample1` -> REJECT.
3. **Cross-User Insertion**: `user_A` attempting to write to `/users/user_B/savedSamples/sample1` -> REJECT.
4. **Identity Spoofing**: `user_A` writing to `/users/user_A/savedSamples/sample1` with `userId: "user_B"` -> REJECT.
5. **Missing Required Fields**: Payload missing required `oxides` or `sampleType` -> REJECT.
6. **Negative or Giant Concentrations**: `oxides` containing non-numeric values -> REJECT.
7. **Giant String Injection (Denial of Wallet)**: `name` with 50,000 characters -> REJECT.
8. **Malicious Path ID Injection**: Submitting an invalid `{sampleId}` with path traversal characters -> REJECT.
9. **Unbounded Array Injection**: `tags` array containing 500 items -> REJECT.
10. **Immutability Breach**: Updating an existing sample and attempting to change `userId` or `createdAt` -> REJECT.
11. **Catch-All Probe**: Attempting to read `/test/connection` with write permissions or probe arbitrary collections -> REJECT.
12. **PII Leak Attempt**: Unauthorized user reading `/users/{userId}` profile directly -> REJECT.
