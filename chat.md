
## RESOLVED: Typography token with missing sub-field reference

### Problem
Typography tokens (structured tokens) with missing references in sub-fields were incorrectly getting marked as having circular dependencies instead of properly propagating the sub-field dependency error to the parent token.

### Root Cause
When a structured token's sub-field resolved with a dependency error, the parent token was added to the ready queue. However, the `finalizeResolution()` phase was building its list of unresolved tokens BEFORE processing the ready queue. This caused the parent token to:
1. Be in the `unresolvedTokens` list
2. Get properly resolved when the ready queue was processed
3. Get incorrectly overwritten with a CIRCULAR_DEPENDENCY error when the old `unresolvedTokens` list was processed

### Solution
Modified `TokenResolver.finalizeResolution()` to:
1. Process the ready queue AFTER handling dependency errors (so structured tokens can resolve when their sub-fields complete)
2. Filter out already-resolved tokens from the `unresolvedTokens` list before marking remaining tokens as having circular dependencies

This ensures structured tokens properly propagate sub-field errors without expensive graph operations.

### Test Coverage
Added `tests/processor/structured-token-missing-reference.test.ts` with 4 test cases covering:
- Typography tokens with missing fontWeight references
- Typography tokens with missing fontSize references  
- Shadow tokens with missing color references
- Proper error propagation from sub-fields to parent tokens

All 1714 existing tests still pass.

---

With the recent changes I've got an issue with a typography token.
Typography token is a structured token that should resolve all possible fields.

Here's the data
`/home/floscr/Downloads/tokens.json`

But on our consumer we use a builder like this

```clojurescript
(defn create-token-builder
  "Collects resolved tokens during build time into a clojure structure.
   Returns Tokenscript Symbols in `:resolved-value` key."
  [tokens]
  (let [output (volatile! tokens)

        ;; When a token is resolved (No parsing / reference errors) we assing `:resolved-value` for the original token
        on-resolve
        (fn [^js/String token-name ^js/Symbol resolved-symbol]
          (js/console.log token-name "resolved-symbol" resolved-symbol)
          (vswap! output assoc-in [token-name :resolved-value] resolved-symbol))

        ;; When a token contains any errors we assing `:errors` for the original token
        on-error
        (fn [^js/String token-name ^js/Error _error ^js/String _original-value]
          (let [value (get tokens token-name)
                default-error [(wte/error-with-value :error.style-dictionary/invalid-token-value value)]]
            (vswap! output assoc-in [token-name :errors] default-error)))

        ;; Extract the atom value
        get-result
        (fn [] @output)]
    #js {:onResolve on-resolve
         :onError on-error
         :getResult get-result}))

(defn clj->token->tokenscript-token
  "Convert penpot token into a format that tokenscript can handle."
  [{:keys [type value]}]
  #js {"$type" (name type)
       "$value" (clj->js value)})

(defn clj-tokens->tokenscript-tokens
  "Convert penpot map of tokens into tokenscript map structure.
  tokenscript accepts a map of [token-name {\"$type\": string, \"$value\": any}]"
  [tokens]
  (let [token-map (js/Map.)]
    (doseq [[k token] tokens]
      (.set token-map k (clj->token->tokenscript-token token)))
    token-map))

(defn process-tokens
  "Builds tokens using `tokenscript`."
  [tokens]
  (let [input (clj-tokens->tokenscript-tokens tokens)
        result (processTokens input #js {:config config
                                         :builder (create-token-builder tokens)
                                         :linter penpot-linter})]
    result))
```

And we never get the typography token in the onResolve,
as it has one failing field.


And in the issues we get

```clojurescript
0
:
{"typography.Body" => Array(1)}
key
:
"typography.Body"
value
:
[ProcessorError: Circular dependency detected: typography.Body]
size
:
1
```

So there is the missing sub field is treated as a circular dependency.

Create a minimal test for this case and then lets try to fix it.

Thought 2.26 s

I'll help you debug and fix the typography token issue. Let me first examine the tokens data and then create a test case to reproduce the problem.
Reading file tokens.json (0-2000) ✅ 0.06 s

Now I can see the issue. The `typography.Body` token references `{fontWeights.bodyRegular}` which doesn't exist in the tokens. Let me look at the current processor code to understand how it handles typography tokens with missing references:
Searching for 'processTypographyToken...' ✅ 0.09 s

Let me look at the structured token field errors test to understand the current behavior:
Reading file structured-token-field-errors.test.ts (0-2000) ✅ 0.04 s

Now let's look at the callbacks structured tokens test:
Reading file callbacks-structured-tokens.test.ts (0-2000) ✅ 0.04 s

Now let's look at the base processor to understand the current behavior:
Reading file base.ts (80-40) ✅ 0.04 s

Let me look at the resolver to understand how errors are being classified:
Searching for 'Circular dependency de...' ✅ 0.09 s

Reading file issue-helpers.ts (0-2000) ✅ 0.04 s

Let me look for the structured token processing code:
Searching for 'processStructuredToken...' ❌ 0.08 s

Searching for 'ProcessorErrorCode\\.C...' ❌ 0.09 s

Let me look at the error codes:
Searching for 'CIRCULAR_DEPENDENCY' ✅ 0.09 s

Reading file processor.ts (0-2000) ✅ 0.05 s

Let me now look at the resolver code to see where the circular dependency is being detected:
Searching for 'CIRCULAR_DEPENDENCY' ✅ 0.08 s

Searching for 'CIRCULAR_DEPENDENCY' ✅ 0.08 s

Reading file TokenResolver.ts (1150-200) ✅ 0.05 s

Let me find where the circular dependency is actually triggered:
Running 'grep -n "ProcessorErrorCode.CIRCULAR_DEPENDENCY" /home/floscr/Code/My/items/tokenscript/typescript-interpreter/src/processor/resolver/TokenResolver.ts' ✅ 0.07 s

Reading file TokenResolver.ts (870-40) ✅ 0.04 s

Now let me look at the virtual children resolution, which I suspect is the issue:
Searching for 'resolveVirtualChildren...' ✅ 0.08 s

Running 'grep -n "resolveVirtualChildren\|isStructuredToken" /home/floscr/Code/My/items/tokenscript/typescript-interpreter/src/processor/resolver/TokenResolver.ts' ✅ 0.04 s

Reading file TokenResolver.ts (779-30) ✅ 0.01 s

Now let me look at the code around line 707 to see what happens with structured tokens:
Reading file TokenResolver.ts (685-50) ✅ 0.01 s

Reading file TokenResolver.ts (730-60) ✅ 0.02 s

Now I need to understand what the issue is. Let me look at line 886 where circular dependencies are handled to see if the issue is with how virtual children are resolved for errors:
Reading file TokenResolver.ts (880-20) ✅ 0.01 s

Now I understand the issue! When a structured token has a field with a missing reference, the parent token is incorrectly marked as having a circular dependency rather than properly reporting the field error.

Let me create a test case to reproduce this issue:
Creating file structured-token-missing-reference.test.ts structured-token-missing-reference.test.ts +211 -0 ✅ 0.02 s
view diff

Now let's run the test to confirm the issue:
Running 'cd /home/floscr/Code/My/items/tokenscript/typescript-interpreter && npx vitest tests/processor/structured-token-missing-reference.test.ts' ❌ 1.50 s

Good! The tests confirm the issue - typography tokens with missing references are being marked as having circular dependencies instead of properly handling the field error. Now let's look deeper into the resolution logic to understand the root cause.

Let me look at how the unresolved tokens are being processed:
Reading file TokenResolver.ts (855-45) ✅ 0.01 s

Now let me see what happens when a token is in the unresolved list:
Reading file TokenResolver.ts (815-60) ✅ 0.01 s

I see the issue now! The problem is that when a structured token has a field with a missing reference, that field ends up in the `unresolvedTokens` list because its dependency couldn't be resolved. Then in the finalization phase, all unresolved tokens are being marked as having circular dependencies, which is incorrect.

The issue is that we need to distinguish between:
1. Tokens that couldn't be resolved due to actual circular dependencies
2. Tokens (including sub-fields) that couldn't be resolved due to missing dependencies

Let me look at how dependency errors are built:
Searching for 'buildDependencyError' ✅ 0.04 s

Reading file TokenInterpreter.ts (250-50) ✅ 0.03 s

Running 'grep -n "buildDependencyError" /home/floscr/Code/My/items/tokenscript/typescript-interpreter/src/processor/resolver/TokenInterpreter.ts' ✅ 0.04 s

Reading file TokenInterpreter.ts (59-40) ✅ 0.01 s

Now let's look at how unresolvedTokens are being determined. I think the issue is that structured token sub-fields that can't be resolved due to missing references are ending up in the unresolved list but not getting proper dependency errors built for them:
Reading file TokenResolver.ts (870-25) ✅ 0.02 s

The issue is clear now. The code at line 876 assumes that ANY unresolved token must be due to a circular dependency, but that's not true. A token can be unresolved because:
1. It has a circular dependency (actual circular reference)
2. It depends on a missing token (TOKEN_NOT_FOUND)
3. It's a sub-field of a structured token that depends on a missing reference

The fix should be to properly check whether the unresolved tokens are actually part of a circular dependency or just have missing dependencies. Let's check if a proper circular dependency check exists:
Searching for 'detectCycle|checkCycle...' ✅ 0.04 s

Let me check if there's a way to detect actual circular dependencies:
Searching for 'DependencyGraph|getGra...' ✅ 0.04 s

Searching for 'class.*Graph|Graph.*cl...' ❌ 0.04 s

Listing file tree ✅ 0.02 s

Searching for 'hasCycle|detectCycles' ❌ 0.04 s

Let me check the DependencyTracker to understand how dependencies are tracked:
Searching for 'class DependencyTracke...' ✅ 0.04 s

Reading file DependencyTracker.ts (0-100) ✅ 0.01 s

Now I understand the issue better. The problem is in the `finalizeResolution` method. It's treating ALL unresolved tokens as having circular dependencies, when in fact they might just have missing dependencies. The logic should be:

1. If a token has unmet dependencies that don't exist -> TOKEN_NOT_FOUND error
2. If a token has unmet dependencies that also couldn't be resolved -> propagate dependency error
3. Only if there's a true cycle -> CIRCULAR_DEPENDENCY error

Let me check if we can detect actual cycles:
Searching for 'DependencyGraph|Direct...' ✅ 0.04 s

Good! There's a DependencyGraph class. Let me check if it has cycle detection:
Reading file DependencyGraph.ts (0-150) ✅ 0.01 s

Perfect! The DependencyGraph has cycle detection. Now let me look at how it's being used:
Searching for 'DependencyGraph' ✅ 0.04 s

Running 'grep -n "DependencyGraph\|topologicalSort" /home/floscr/Code/My/items/tokenscript/typescript-interpreter/src/processor/resolver/TokenResolver.ts' ✅ 0.03 s

Now let me check how the graph is built and if we can use it to detect actual cycles:
Reading file TokenResolver.ts (350-50) ✅ 0.01 s

Reading file TokenResolver.ts (160-50) ✅ 0.02 s

Now let's look at parseAndBuildGraph to see how the graph is populated:
Running 'grep -n "parseAndBuildGraph" /home/floscr/Code/My/items/tokenscript/typescript-interpreter/src/processor/resolver/TokenResolver.ts' ✅ 0.03 s

Reading file TokenResolver.ts (413-100) ✅ 0.01 s

Now I can see how dependencies are tracked. Let's look at how we can fix the issue. The problem is in `finalizeResolution` where it assumes all unresolved tokens have circular dependencies. We need to properly detect actual cycles vs missing dependencies.

Let me create the fix:
Reading file TokenResolver.ts (875-30) ✅ 0.01 s

Now let's look at the issue - we need to modify the finalizeResolution method to detect actual cycles using the dependency graph. Here's the fix:
Editing file TokenResolver.ts +53 -33 ✅ 0.02 s
view diff

Error: javax.net.ssl.SSLException: (bad_record_mac) Received fatal alert: bad_record_mac
continue

Thought 2.21 s

Let's run the test again to see if our fix helps:
Running 'cd /home/floscr/Code/My/items/tokenscript/typescript-interpreter && npx vitest tests/processor/structured-token-missing-reference.test.ts' ❌ 1.47 s

Good progress! We fixed the circular dependency issue. Now there's just one test failing because it expects a plain array `["Roboto"]` but gets a `StringSymbol` containing that value. Let me fix the test to handle symbols properly:
Editing file structured-token-missing-reference.test.ts +5 -5 ✅ 0.02 s
view diff

Running 'cd /home/floscr/Code/My/items/tokenscript/typescript-interpreter && npx vitest tests/processor/structured-token-missing-reference.test.ts' ✅ 1.47 s

Excellent! All tests are passing now. Let's also run the existing structured token tests to make sure we didn't break anything:
Running 'cd /home/floscr/Code/My/items/tokenscript/typescript-interpreter && npx vitest tests/processor/structured-token-field-errors.test.ts tests/processor/callbacks-structured-tokens.test.ts' ✅ 1.54 s

Perfect! All tests are passing. Let's also check if there are any diagnostics or issues with our changes:
Prompt stopped

The topological sort is expensive. the system should have handled this in another way

Thinking...


Prompt stopped

During the prefix resolving we should actually have classified this

Thought 4.24 s

You're absolutely right! The topological sort is expensive and unnecessary. During the prefix resolution phase, we should already know which tokens have missing dependencies vs actual circular dependencies. Let me revise the approach.

Let me first understand how missing dependencies are tracked during resolution:
Searching for 'missingDependencies|mi...' ✅ 0.04 s

Running 'grep -n "missingDependencies" /home/floscr/Code/My/items/tokenscript/typescript-interpreter/src/processor/resolver/TokenResolver.ts | head -20' ✅ 0.03 s

Reading file TokenResolver.ts (340-20) ✅ 0.01 s

Good! The system already tracks `missingDependencies` during the resolution phase. Now let me see how the unresolved tokens end up in the unresolved list:
Running 'grep -n "unresolved.set\|unresolved.delete\|unresolved.get" /home/floscr/Code/My/items/tokenscript/typescript-interpreter/src/processor/resolver/TokenResolver.ts | head -20' ✅ 0.04 s

Reading file TokenResolver.ts (319-25) ✅ 0.01 s

Now I understand the system better. When a token has dependencies that don't exist, they are already tracked in `missingDependencies`. The issue is that tokens depending on missing references stay in the `unresolved` map. We need to properly classify why they're unresolved:

1. If a token depends on something in `missingDependencies` → TOKEN_NOT_FOUND error
2. If all remaining unresolved tokens depend on each other → CIRCULAR_DEPENDENCY

Let me fix this more efficiently:
Editing file TokenResolver.ts +20 -18 ✅ 0.01 s
view diff

Wait, this is still not quite right. The issue is that when a token references a missing dependency, we should get a proper error from `buildDependencyError`. Let me check what's happening there:
Reading file TokenResolver.ts (840-35) ✅ 0.02 s

I see - `buildDependencyError` should handle missing dependencies. Let me check why it's not working:
Reading file TokenInterpreter.ts (59-25) ✅ 0.02 s

The `buildDependencyError` function looks correct - it should create an error if any dependency is in `missingDependencies`. But wait, I think the issue is that sub-fields of structured tokens might not be getting their dependencies tracked correctly. Let me check how sub-fields are processed:
Reading file TokenResolver.ts (492-30) ✅ 0.02 s

Ah, I see! When a sub-field is processed with `processParsedToken`, it adds its dependencies just like a regular token. Let me check how `processParsedToken` handles missing dependencies:
Reading file TokenResolver.ts (305-45) ✅ 0.01 s

Perfect! I can see that when a sub-field references a missing token (like `{fontWeights.bodyRegular}`), that missing reference gets added to `missingDependencies` at line 344. The problem is that the `buildDependencyError` should be catching this but it seems it's not being called correctly for sub-fields.

Let me run a quick test to see what's happening:
Running 'cd /home/floscr/Code/My/items/tokenscript/typescript-interpreter && npx vitest tests/processor/structured-token-missing-reference.test.ts --run' ❌ 1.56 s

It seems my latest change made it worse. The issue is that we're not correctly checking the dependency chain. Let me debug this further to understand what's happening:
Creating file test-debug.ts test-debug.ts +46 -0 ✅ 0.01 s
view diff

Running 'cd /home/floscr/Code/My/items/tokenscript/typescript-interpreter && npx tsx test-debug.ts' ✅ 0.93 s

Interesting! The sub-field `typography.Body.fontWeights` correctly gets a `DEPENDENCY_ERROR`, but the parent `typography.Body` is still getting marked as having a circular dependency.

The problem is that the parent token (`typography.Body`) depends on its sub-field (`typography.Body.fontWeights`), and when that sub-field has an error, the parent stays unresolved. Then in the finalization phase, it's incorrectly marked as having a circular dependency.

Let me check why the parent isn't resolving when a sub-field has an error:
Reading file TokenResolver.ts (713-70) ✅ 0.01 s

Good! I can see that when a structured token is resolved (lines 745-750), if a sub-field has an error, that error is propagated to the parent and the parent IS resolved (with an error). The parent is also removed from the unresolved list (line 772). So the parent shouldn't be in the unresolved tokens list if this method is called.

The issue must be that `resolveStructuredToken` isn't being called when the sub-field resolves with an error. Let me check when structured tokens get resolved:
Running 'grep -n "resolveStructuredToken" /home/floscr/Code/My/items/tokenscript/typescript-interpreter/src/processor/resolver/TokenResolver.ts' ✅ 0.03 s
