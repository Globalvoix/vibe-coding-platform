# Generation Resilience Implementation

## Overview
This document describes the implementation of resilient code generation that survives page refreshes. Previously, when users refreshed the page during an active code generation, the process would stop completely. Now, generations continue in the background and can only be stopped explicitly via the stop button.

## Architecture

### 1. Database Layer (`lib/generation-sessions-db.ts`)
Creates and manages generation session tracking:
- `generation_sessions` table with columns:
  - `id`: Unique session ID
  - `project_id`: Associated project
  - `user_id`: Owner
  - `sandbox_id`: Sandbox being generated to
  - `status`: active|completed|error|cancelled
  - `progress`: JSONB field for storing generation progress
  - `created_at`, `updated_at`, `completed_at`: Timestamps

Key functions:
- `createGenerationSession()`: Initialize a new generation session
- `updateGenerationSessionProgress()`: Store progress as generation proceeds
- `completeGenerationSession()`: Mark as completed/error
- `getActiveGenerationSession()`: Retrieve current active session
- `cancelGenerationSession()`: Stop a generation

### 2. Session Tracker (`lib/generation-session-tracker.ts`)
Utility class for managing session state during generation:
```typescript
class GenerationSessionTracker {
  initialize(sandboxId)
  updateProgress(progress)
  complete(status)
  cancel()
  static getSession(sessionId)
  static isCancelled(sessionId)
}
```

Progress stages tracked:
- `analyzing`: Building generation blueprint
- `generating`: Writing files
- `validating`: Checking generated code
- `installing-deps`: Installing dependencies
- `done`: Completed

### 3. Server-Side Integration (`ai/tools/generate-files.ts`)
Modified to use session tracking:
- Creates session on tool execution
- Updates progress throughout generation pipeline
- Checks for cancellation at key points
- Completes session when done or on error

Example flow:
```
1. Tool called → Create session
2. Analyzing → Update progress
3. Generating → Check for cancellation, update progress
4. Validating → Update progress
5. Installing deps → Update progress
6. Complete → Mark session complete
```

### 4. API Endpoints

#### GET `/api/projects/[id]/generation-status`
Returns current status of any active generation session:
```json
{
  "isActive": true,
  "session": {
    "id": "...",
    "status": "active|completed|error|cancelled",
    "progress": {...},
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### POST `/api/projects/[id]/generation-stop`
Stops an active generation session:
```json
{
  "success": true,
  "sessionId": "...",
  "message": "Generation stopped"
}
```

#### GET `/api/projects/[id]/generation-progress`
Polls for latest generation progress (used for real-time updates):
- Returns current session status and progress
- Includes cache-control headers to prevent caching

### 5. Client-Side Implementation (`app/chat.tsx`)

#### State Management
- `activeGenerationId`: Tracks if there's an active generation
- `generationCheckIntervalRef`: Manages polling interval

#### Effects

1. **Initial Check** - On mount and projectId change:
   ```typescript
   - Fetch current generation status
   - Set activeGenerationId if session exists
   ```

2. **Progress Polling** - While isLoading is true:
   ```typescript
   - Poll generation-progress every 2 seconds
   - Update UI with latest status
   ```

#### UI Changes

1. **Stop Button** - Existing button now stops generation when active:
   ```typescript
   if (isLoading) {
     handleStopGeneration()
   } else {
     validateAndSubmitMessage()
   }
   ```

2. **Generation Banner** - Shows when generation is in progress but stream has ended:
   ```
   "Generation in progress. It will continue in the background."
   [Stop Button]
   ```

3. **Input Control** - Stop button is enabled even when input is disabled:
   ```typescript
   disabled={isInputDisabled && !isLoading}
   ```

## User Experience

### Normal Flow (No Refresh)
1. User clicks send
2. Loading state → UI streams generation updates → Complete
3. Works as before

### With Refresh During Generation
1. User clicks send
2. Generation starts
3. **User refreshes page**
4. Page loads → Detection runs → Shows "Generation in progress" banner
5. Generation continues server-side
6. User can:
   - Wait for completion
   - Click stop to cancel
   - Perform other actions

## Implementation Details

### Session ID Generation
- Uses `toolCallId` as session ID
- Ensures uniqueness and ties session to specific generation call

### Progress Tracking
- Serialized to JSON in database
- Includes stage, message, file count, and error info
- Updated frequently to provide real-time feedback

### Cancellation Mechanism
- `GenerationSessionTracker.isCancelled()` checks database
- Generation loop checks between file writes
- Clean exit when cancelled detected

### Database Cleanup
- `cleanupOldSessions()` removes completed sessions older than 24 hours
- Called periodically to prevent unbounded growth

## Error Handling

1. **Session Creation Fails**: Graceful degradation, generation continues without tracking
2. **Database Updates Fail**: Best-effort basis, generation continues
3. **Stop Request Fails**: User sees error toast, can retry
4. **Generation Errors**: Session marked as error, user notified

## Limitations

1. **Stream Continuation**: HTTP stream connection is lost on refresh, client loses real-time updates
   - Mitigation: Polling endpoint provides updates every 2 seconds
   
2. **UI Message Loss**: Chat messages from stream are lost on refresh
   - Mitigation: Messages saved to database via `useChatPersistence`
   - Next refresh will restore them from DB

3. **Long Generation**: Very long generations may timeout at server level
   - Mitigation: npm install step is detached, other long operations should consider same

## Future Enhancements

1. **WebSocket Support**: Replace polling with WebSocket for real-time updates
2. **Batch Operations**: Allow multiple simultaneous generations
3. **Generation Queueing**: Queue generations if sandbox busy
4. **Resume File Writing**: Save line numbers to resume partially written files
5. **Webhook Notifications**: Notify user when generation completes via webhook
6. **Generation History**: Store generation history for audit/replay

## Files Modified

- `lib/generation-sessions-db.ts` (new)
- `lib/generation-session-tracker.ts` (new)
- `app/api/projects/[id]/generation-status/route.ts` (new)
- `app/api/projects/[id]/generation-stop/route.ts` (new)
- `app/api/projects/[id]/generation-progress/route.ts` (new)
- `ai/tools/generate-files.ts` (modified)
- `app/chat.tsx` (modified)

## Testing Checklist

- [ ] Generate code normally (stream completes)
- [ ] Refresh page during generation
- [ ] Verify "Generation in progress" banner appears
- [ ] Verify files still get generated after refresh
- [ ] Click stop button on active generation
- [ ] Verify generation actually stops
- [ ] Generate again successfully after stopping
- [ ] Check database cleanup removes old sessions
- [ ] Verify error handling when database unavailable
