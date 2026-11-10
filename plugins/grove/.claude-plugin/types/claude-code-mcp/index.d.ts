// The inputs of the MCP tools the session had connected when this mod
// was last saved, from each server's tools/list inputSchema.
// Merges into the engine's ToolCallInput (types/ McpToolInputs) so
// `e.tool === "mcp__<server>__<tool>"` narrows to the tool's arguments.
// Written again at a save of the mod with a server connected.
export {}
declare module 'claude-code' {
  interface McpToolInputs {
    /** Adds a relationship between two entities in the Teamwork Graph (e.g. linking two Jira work items, marking one as blocking another, attaching a remote link, or connecting a Jira work item to an Atlas project or goal). */
    mcp__claude_ai_Atlassian_MCP__addGraphContext: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** Type of relationship to create. Determines which entity types 'objectIdentifier' and 'targetObjectIdentifier' must resolve to. */
      relationshipType: "jira-work-item-links-jira-work-item" | "jira-work-item-blocks-jira-work-item" | "jira-work-item-links-jira-work-item-remote-link" | "jira-work-item-tracks-atlassian-project" | "jira-work-item-contributes-to-atlassian-goal"
      /** Identifier of the source entity. Accepts an ARI, a full URL, or a stable key (e.g. ENG-123 for a Jira work item). Format depends on relationshipType. */
      objectIdentifier: string
      /** Identifier of the target entity. Accepts an ARI, a full URL, or a stable key (e.g. ATLAS-20426 for an Atlas project). Format depends on relationshipType. */
      targetObjectIdentifier: string
      /** Optional display label for the target. Used by relationships that surface a title (e.g. remote links); ignored otherwise. */
      title?: string
    }
    /** Add a comment to a Jira issue, or edit an existing one: omit commentId to add, or pass one from listJiraIssueComments to edit. Returns the commentId, needed to edit or delete it later. When no file was appended through inlineFileId, it also returns the echoed body and its format (appliedContentFormat). */
    mcp__claude_ai_Atlassian_MCP__addOrEditJiraIssueComment: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** Issue key (e.g. PROJ-123) or a Jira issue URL */
      issueIdOrKey: string
      /** Comment text. Markdown by default; set contentFormat: html to pass HTML instead. Required unless adding a new comment purely to embed a file via inlineFileId. Editing replaces the whole comment body: pass the full intended text (fetch the current comment first to preserve it), or "" for media only. Editing a body that already contains inline media must use contentFormat: html — markdown drops it. For HTML body shapes (inline media, panels, tables), first get the format guide via the generic operation runner (execute) as name=getContentFormatGuide, inputs={toolName: "addOrEditJiraIssueComment"}. */
      commentBody?: string
      /** Body format for commentBody. Defaults to markdown. html preserves inline media across a read-modify-write; a body fetched as HTML can be written straight back (Jira resolves media collection/filename server-side and omits them on read — not data loss). Requires the HTML content-format feature; when it is disabled the call is rejected rather than downgraded, because markdown would store the HTML tags as literal text and drop the media. */
      contentFormat?: "markdown" | "html"
      /** Restrict comment visibility to a Jira group or role. Shape: `{"type":"group"|"role","value":"<name>"}`. Role and group names are site-specific, so do not reuse a name from another site. On JSM this does not make a comment internal — a restricted comment stays customer-visible (`jsdPublic: true`). Use `jsmCommentType: "internalNote"` for that. */
      commentVisibility?: {}
      /** JSM comment type. Use internalNote for an internal note or publicComment for a customer-visible comment. Applies when adding or editing a JSM comment. Omit for existing Jira behavior. */
      jsmCommentType?: "internalNote" | "publicComment"
      /** ID of an existing comment to edit. When omitted, a new comment is added. */
      commentId?: string
      /** Media file ID(s) from uploadAttachmentToJiraIssue to append inline to the comment, e.g. ["id1","id2"]. Requires contentFormat: html and a matching inlineFileCollection (paired by index). Appends at the end; for exact placement, author the media node in the HTML commentBody instead. A file already embedded in the body is rejected (would duplicate). */
      inlineFileId?: unknown[]
      /** Media collection(s) from the upload step, paired to inlineFileId by index (a single value applies to all). Required whenever inlineFileId is set. */
      inlineFileCollection?: unknown[]
      /** Optional file name(s) (from the upload step's fileName), paired to inlineFileId by index. Only selects the render shape: images render as a block image, other files as an inline chip. Omit to default to the image shape. */
      inlineFileName?: unknown[]
      /** Format of the echoed comment body. Defaults to the format written, so an html write reads back as html. Bodies markdown cannot represent (media, panels, statuses, @mentions) are always echoed as HTML so a follow-up edit does not destroy them. An explicit markdown request is overridden for those bodies, with a warning saying so; appliedContentFormat in the response reports the format you actually got. */
      responseContentFormat?: "markdown" | "html"
    }
    /** Returns the accountId of the current user */
    mcp__claude_ai_Atlassian_MCP__atlassianUserInfo: {}
    /** Create a new Confluence page, blog post, live doc, whiteboard, database, embed, smart link, or folder. Before choosing body.format or authoring a body, call getContentFormatGuide through execute with name=getContentFormatGuide and inputs={toolName}. Use createConfluencePage for pages, blog posts, and live docs; createConfluenceWhiteboard for whiteboards; or createConfluenceDatabase for databases. Space instructions describe how to author content in a Confluence space. Apply relevant guidance to the content you create or update. Follow this decision rule: 1. Before authoring, call getConfluenceSpace for the target space unless getConfluenceContent returned metadata.hasSpaceInstructions=false for content in that space. If getConfluenceSpace already returned for the same cloudId and space during the current task, reuse its spaceInstructions and do not call it again. 2. When the value is true or unknown and instructions have not been loaded, you must call getConfluenceSpace once before authoring through execute with name=getConfluenceSpace, top-level cloudId, and inputs={spaceIdOrKey}. 3. Apply any returned spaceInstructions. If a successful response omits them, no instructions are configured; author with defaults and do not block. After a successful getConfluenceSpace call, do not make a separate getConfluenceSpaceInstructions call. */
    mcp__claude_ai_Atlassian_MCP__createConfluenceContent: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** Parent destination for the new content. Use { "spaceId": "<numeric-space-id>" } to create at the homepage / sidebar root. Use { "spaceId": "<numeric-space-id>", "parentContentId": "<numeric-content-id>" } to create under an existing content item. Use { "parentContentId": "<numeric-content-id>" } when the parent content ID should be resolved to its space before creation. Use { "parentContentUrl": "<confluence-content-url>" } when the parent content URL should be resolved before creation. Supported parentContentUrl paths include /pages/{id}, /blog/{id}, /whiteboard/{id}, /database/{id}, and /folder/{id}. If the destination is described only by space key or title, resolve it first to one of the supported parent shapes above. */
      parent: {}
      /** Type of content to create. One of: page, live_doc, blogpost, whiteboard, database, embed, smart_link, folder, slide. */
      contentType: string
      /** Title for the new content. 1-255 characters. */
      title: string
      /** Before composing this body, follow the space-instruction decision rule in the tool description. Reuse known instruction state and do not repeat the space lookup per write. Body content. For whiteboard and database it is technically optional, but only omit it when the user explicitly asked for an empty/blank board or database. Never omit body as a fallback because you could not load the authoring guidance — load it first via getContentFormatGuide through the generic operation runner (execute) as name=getContentFormatGuide, inputs={toolName} (createConfluencePage / createConfluenceWhiteboard / createConfluenceDatabase), then build a real body. A blank whiteboard (no shapes, stickies, connectors, or layout) is almost never the intended result. For doc types (page, live_doc, blogpost): format is html or markdown, value is the content string. Prefer HTML. Use markdown only when you are confident the content needs only basic text formatting and has no rich Confluence elements to create, such as panels, layouts, media, whiteboard embeds, or Remixes. If unsure, use HTML. For embed and smart_link: format must be url, value must be the URL to embed (e.g. https://example.com/design). For whiteboard: format must be svg and value must be the complete initial SVG document with root width, height, and viewBox. For database: format must be csv and value must be the complete initial CSV payload. For a synced (Smart) Folder (contentType=folder): format must be url and value must be the https URL of the external Google Drive, OneDrive, or SharePoint folder to sync from. Requires the confluence_smart_folders_milestone_1 experiment; otherwise the create returns FEATURE_NOT_ENABLED. Do not pass patches, edit envelopes, or context on create. Omit for a plain folder (no sync source) and for slide. */
      body?: {}
      /** If true, create the content as a draft instead of publishing it. Only supported when contentType is page or blogpost. */
      draft?: boolean
      /** If true, the created content is private to the caller: only the creator has view and edit access. Supported for page, live_doc, blogpost, whiteboard, database, and folder, including creation at the homepage / sidebar root. Private creation is not supported for embed, smart_link, or slide. This sets General access to VIEW_RESTRICTED and gives the creator one Specific access grant, update (Can edit), which already includes read/view. Do not add a separate read grant for the creator. Omit or pass false for default visibility. */
      private?: boolean
      /** Optional page width for doc types only: page, live_doc, and blogpost. Omit unless the user explicitly requests a width; omission creates a narrow page. Do not infer wide or max from body content or layout. Accepted values are narrow, wide, and max. Non-doc content types do not support this field. */
      contentWidth?: "narrow" | "wide" | "max"
    }
    /** Create a new Jira issue. Custom fields go in additional_fields: keyed by field name, values are resolved automatically, so no field lookup is needed first (user fields take accountIds); keyed by customfield_* ID, pass the value in Jira's format. A rejected create returns a repairHint and names the field at fault where there is one, with its allowedValues when known, so retry from that. If sprint assignment fails, the response still has the new issue's key and sprintAssignment.assigned: false — do not create it again. */
    mcp__claude_ai_Atlassian_MCP__createJiraIssue: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** Project key (e.g. PROJ). */
      projectKey: string
      /** Issue summary / title. */
      summary: string
      /** Issue type name (e.g. Bug, Task, Story, Epic). Use listJiraProjectIssueTypesMetadata to list valid types for this project if unsure. */
      issueType: string
      /** Issue description in markdown, or HTML with contentFormat html. Converted to Jira ADF automatically. */
      description?: string
      /** Body format for description. Defaults to markdown; html adds panels, tables and status lozenges. For HTML body shapes, first get the format guide via the generic operation runner (execute) as name=getContentFormatGuide, inputs={toolName: "createJiraIssue"}. Inline media needs an existing issue: create first, then embed with editJiraIssue. When the HTML content-format feature is disabled the call is rejected rather than downgraded, because markdown would store the HTML tags as literal text. */
      contentFormat?: "markdown" | "html"
      /** Priority name (e.g. High, Medium, Low, Highest, Lowest). */
      priority?: string
      /** Account ID of the assignee. Resolve a name with listJiraIssueAssignableUsers, which returns only users who can be assigned in this project; lookupJiraAccountId resolves any user and does not check that. */
      assignee?: string
      /** List of label strings (e.g. ["bug", "needs-triage"]). */
      labels?: unknown[]
      /** Parent issue key for sub-tasks or child issues (e.g. PROJ-10). */
      parent?: string
      /** Additional Jira fields. Keys can be human-readable field names or raw customfield_* IDs. Values can be human-readable (resolved automatically) or already-correct Jira shapes. Examples: {"Story Points": 8} ← number field by name {"Team": "Backend"} ← option/select by name {"Reviewers": ["alice@acme.com", "bob@acme.com"]} ← multi-user by accountId {"Component Area": "Platform / Auth"} ← cascading select as "Parent / Child" {"customfield_10010": 8} ← raw ID (no resolution needed, fastest) {"components": [{"name": "Backend"}]} ← system array field (raw shape) {"fixVersions": [{"name": "v2.0"}]} ← system array field (raw shape) On error, the response includes allowedValues and a repairHint for self-correction. */
      additional_fields?: {}
      /** Optional sprint assignment after the issue is created. Accepts a numeric sprint ID, an exact sprint name, or "active" to resolve an active sprint. Numeric sprint IDs assign directly and do not need board lookup. When omitted, createJiraIssue behaves exactly as before and does not make sprint calls. */
      assignToSprint?: string
    }
    /** Find Atlassian operations that are not already in your tool list. Searches ~327 operations across Jira, Confluence, Compass, Bitbucket, Focus, Goals, Projects, Loom, Talent, Teams, Capacity-planning, Assets, JSM, Artifacts, Insights. Returns up to 5 matches with the exact name and inputs needed to call the matching execute-family tool (executeRead, executeWrite, or executeDestructive), then a briefer name-and-summary list of further matches — re-query with narrower terms to get one of those in full. Read all 5 before choosing. Only use an operation name from discover results or one already in your tool list; never guess, assume, or invent a name — when unsure, call discover first. */
    mcp__claude_ai_Atlassian_MCP__discover: {
      /** What you want to do, as a verb plus the object and, if you know it, the product: "transition a jira issue", "list confluence spaces", "get pull request comments". Naming the product scopes the searchAsk for one thing per call; for a goal spanning two products, call discover once per product. If nothing fits, re-query using the product's own noun (issue, page, space, repository, sprint) rather than a synonym. */
      query: string
    }
    /** Edit an existing Jira issue. Custom fields go in additional_fields: keyed by field name, values are resolved automatically (user fields take accountIds); keyed by customfield_* ID, pass the value in Jira's format. Every field is set, not appended: send the full list for labels, components and other multi-value fields. Change status or move to a sprint with transitionJiraIssue, and convert Task↔Sub-task with convertJiraIssueHierarchy. Empty description or environment with "". When editing a body that holds inline media, use contentFormat: html, or the media is dropped. Reorder on a board with rankBeforeIssue or rankAfterIssue; fields are saved first, so a failed reorder leaves the edit applied and returns ranking.ranked: false. The response shows only getJiraIssue's default fields, so other fields you set are not echoed back. */
    mcp__claude_ai_Atlassian_MCP__editJiraIssue: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** Issue key (e.g. PROJ-123). */
      issueIdOrKey: string
      /** Jira fields payload to set, keyed by field name or customfield_* ID. To clear a field, pass explicit null (e.g. {"resolution": null}). Rich-text fields (description/environment) default to markdown; set contentFormat: html to author them in HTML. Editing a body that already contains inline media must use contentFormat: html — markdown drops it. For HTML body shapes (inline media, panels, tables), first get the format guide via the generic operation runner (execute) as name=getContentFormatGuide, inputs={toolName: "editJiraIssue"}. */
      fields?: {}
      /** Additional Jira fields. Keys can be human-readable field names or raw customfield_* IDs. Values can be human-readable (resolved automatically) or already-correct Jira shapes. Examples: {"Story Points": 8} ← number field by name {"Team": "Backend"} ← option/select by name {"Reviewers": ["alice@acme.com", "bob@acme.com"]} ← multi-user by accountId {"Component Area": "Platform / Auth"} ← cascading select as "Parent / Child" {"customfield_10010": 8} ← raw ID (no resolution needed, fastest) {"components": [{"name": "Backend"}]} ← system array field (raw shape) {"fixVersions": [{"name": "v2.0"}]} ← system array field (raw shape) On error, the response includes allowedValues and a repairHint for self-correction. */
      additional_fields?: {}
      /** Media file ID(s) from uploadAttachmentToJiraIssue to append inline to the description, e.g. ["id1","id2"]. Requires contentFormat: html and a matching inlineFileCollection (paired by index). Appends at the end, keeping existing content; for exact placement, author the media node in the HTML description instead. A file already embedded in the body is rejected (would duplicate). */
      inlineFileId?: unknown[]
      /** Media collection(s) from the upload step, paired to inlineFileId by index (a single value applies to all). Required whenever inlineFileId is set. */
      inlineFileCollection?: unknown[]
      /** Optional file name(s) (from the upload step's fileName), paired to inlineFileId by index. Only selects the render shape: images render as a block image, other files as an inline chip. Omit to default to the image shape. */
      inlineFileName?: unknown[]
      /** Body format for rich-text fields (description/environment). Defaults to markdown. html preserves inline media across a read-modify-write; a body fetched as HTML can be written straight back (Jira resolves media collection/filename server-side and omits them on read — not data loss). Requires the HTML content-format feature; when it is disabled the call is rejected rather than downgraded, because markdown would store the HTML tags as literal text and drop the media. */
      contentFormat?: "markdown" | "html"
      /** Output format for rich-text fields in the returned issue. Defaults to markdown. Bodies markdown cannot represent (media, panels, expands, statuses, @mentions) are always returned as HTML, so a follow-up edit does not destroy them. An explicit markdown request is overridden for those bodies, with a warning saying so; appliedContentFormat in the response reports the format you actually got. */
      responseContentFormat?: "markdown" | "html"
      /** Optional. Rank this issue immediately before the given issue key or ID (LexoRank relative anchor). Mutually exclusive with rankAfterIssue. When omitted, editJiraIssue does not make ranking calls. */
      rankBeforeIssue?: string
      /** Optional. Rank this issue immediately after the given issue key or ID (LexoRank relative anchor). Mutually exclusive with rankBeforeIssue. When omitted, editJiraIssue does not make ranking calls. */
      rankAfterIssue?: string
      /** Optional. Numeric Rank field id for this rank call (e.g. 10020). Pass only when the user explicitly provides a Rank field id, or asks to reorder on a specific board's Rank field. For a named board, call getJiraBoardConfig first and use ranking.rankCustomFieldId. Do not invent or guess this id. Omit for ordinary reorders so Jira uses its default Rank field. Ignored unless rankBeforeIssue or rankAfterIssue is also set. */
      rankCustomFieldId?: number
      /** Optional invocation attribution. Jira MCP cards set jira_mcp_card; omit for model/tool-loop calls. */
      actionSource?: "jira_mcp_card" | "model_tool_call"
    }
    /** Run a destructive Atlassian operation by name (deletes or irreversibly changes data) across all Atlassian products. Only use an operation name from discover results or one already in your tool list; never guess, assume, or invent a name — when unsure, call discover first. Copy input names exactly from the operation’s discover result or tool schema. After an input validation error, correct the inputs using the error guidance before retrying; if the input contract is missing, call discover for that operation first. If the user provides a Jira/Confluence URL, pass it directly as cloudId — no need to call getAccessibleAtlassianResources. Pass all inputs as a flat object — the server routes each to the right location (path, query, or body) automatically. Use responseFields for field filtering, e.g. ["key","fields.summary","fields.status.name"]. Use view to select a named output preset (e.g. "compact", "evidence", "full") when the operation supports views. */
    mcp__claude_ai_Atlassian_MCP__executeDestructive: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId?: string
      /** Operation name to run. Only use an operation name from discover results or one already in your tool list; never guess, assume, or invent a name — when unsure, call discover first. */
      name: string
      /** Flat input object — pass all parameters here. The server routes each to path, query, or body automatically. */
      inputs?: {}
      /** Dot-notation fields to return, e.g. ["key","fields.summary"]. Filters response. */
      responseFields?: string[]
      /** Named output view preset (e.g. "compact", "evidence", "full"). Only applies when the operation declares views. Overridden by responseFields if both are supplied. */
      view?: string
    }
    /** Run a read-only Atlassian operation by name across all Atlassian products. Only use an operation name from discover results or one already in your tool list; never guess, assume, or invent a name — when unsure, call discover first. Copy input names exactly from the operation’s discover result or tool schema. After an input validation error, correct the inputs using the error guidance before retrying; if the input contract is missing, call discover for that operation first. If the user provides a Jira/Confluence URL, pass it directly as cloudId — no need to call getAccessibleAtlassianResources. Pass all inputs as a flat object — the server routes each to the right location (path, query, or body) automatically. Use responseFields for field filtering, e.g. ["key","fields.summary","fields.status.name"]. Use view to select a named output preset (e.g. "compact", "evidence", "full") when the operation supports views. */
    mcp__claude_ai_Atlassian_MCP__executeRead: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId?: string
      /** Operation name to run. Only use an operation name from discover results or one already in your tool list; never guess, assume, or invent a name — when unsure, call discover first. */
      name: string
      /** Flat input object — pass all parameters here. The server routes each to path, query, or body automatically. */
      inputs?: {}
      /** Dot-notation fields to return, e.g. ["key","fields.summary"]. Filters response. */
      responseFields?: string[]
      /** Named output view preset (e.g. "compact", "evidence", "full"). Only applies when the operation declares views. Overridden by responseFields if both are supplied. */
      view?: string
    }
    /** Run a write Atlassian operation by name (creates or updates data, non-destructive) across all Atlassian products. Only use an operation name from discover results or one already in your tool list; never guess, assume, or invent a name — when unsure, call discover first. Copy input names exactly from the operation’s discover result or tool schema. After an input validation error, correct the inputs using the error guidance before retrying; if the input contract is missing, call discover for that operation first. If the user provides a Jira/Confluence URL, pass it directly as cloudId — no need to call getAccessibleAtlassianResources. Pass all inputs as a flat object — the server routes each to the right location (path, query, or body) automatically. Use responseFields for field filtering, e.g. ["key","fields.summary","fields.status.name"]. Use view to select a named output preset (e.g. "compact", "evidence", "full") when the operation supports views. */
    mcp__claude_ai_Atlassian_MCP__executeWrite: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId?: string
      /** Operation name to run. Only use an operation name from discover results or one already in your tool list; never guess, assume, or invent a name — when unsure, call discover first. */
      name: string
      /** Flat input object — pass all parameters here. The server routes each to path, query, or body automatically. */
      inputs?: {}
      /** Dot-notation fields to return, e.g. ["key","fields.summary"]. Filters response. */
      responseFields?: string[]
      /** Named output view preset (e.g. "compact", "evidence", "full"). Only applies when the operation declares views. Overridden by responseFields if both are supplied. */
      view?: string
    }
    /** Returns the cloudId(s) available to the current user */
    mcp__claude_ai_Atlassian_MCP__getAccessibleAtlassianResources: {}
    /** (Beta) Find a person's strongest collaborators across Atlassian work, ranked by collaboration score. Omit accountId, name, and email to use the current user; otherwise supply accountId or resolve one person with name and/or email. Limit controls the number returned. This tool is in beta and is not generally available. Usage is not billed during beta. Pricing details will be announced when the tool becomes generally available. */
    mcp__claude_ai_Atlassian_MCP__getCollaborators: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** Atlassian account ID to analyze */
      accountId?: string
      /** Resolve the target user by display name */
      name?: string
      /** Resolve the target user by email; combine with name to disambiguate */
      email?: string
      /** Maximum collaborators to return */
      limit?: string
    }
    /** REQUIRED: Supply at least one content locator: content_id or content_url. Read any Confluence content (page, blog, live doc, comment, whiteboard, embed, database, folder). */
    mcp__claude_ai_Atlassian_MCP__getConfluenceContent: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** Required when content_url is omitted. Numeric Confluence content ID, or a Confluence tiny link key (the encoded part from /wiki/x/ URLs, e.g. 4_sXAQ). Recognized Confluence content URLs are also accepted and converted to the content ID, but prefer content_url for URLs. One of content_id or content_url is required. */
      content_id?: string
      /** Required when content_id is omitted. Full URL of the Confluence content. Supported: pages/live docs (/pages/{id}), blog URLs (/blog/{id}), whiteboards (/whiteboard/{id}), databases (/database/{id}), folders (/folder/{id}), embeds (/embed/{id}), and TinyUrl (/wiki/x/{key}). Prefer this for URLs copied from Confluence. One of content_id or content_url is required. */
      content_url?: string
      /** Response shape for document-style reads. summary = title + excerpt + counts (default, cheap). ai_summary = the generated AI summary when available, otherwise null; it does not fall back to the standard excerpt. outline = heading tree (cheap, for navigation). full = body in the requested format (use when intending to edit). Non-document content such as whiteboards, databases, folders, and embeds does not support detail; content_format is a separate representation selector for formats such as whiteboard svg/png, database csv, or embed url. */
      detail?: "summary" | "ai_summary" | "outline" | "full"
      /** Body format. Doc types: html (default) or markdown. Document HTML can contain supported macro wrappers instead of content displayed in Confluence web. When visible macro content is required, use resolveConfluenceContentMacros with the returned numeric content ID and all=true; use discover if its full contract is needed. Whiteboards support only svg and png: use svg to inspect content or prepare edits, or png for a screenshot. Never use html or markdown for a whiteboard. PNG is read-only and returns a short-lived presigned URL in body.value, not the image content. Databases: csv. URL-backed content such as embeds: url. For an embed or Smart Link, including a Smart Folder child, explicitly request content_format=url and omit detail to read the destination URL in body.value. Then follow retrievalGuidance to read the target. Omitting content_format preserves the existing envelope-only embed read. */
      content_format?: "html" | "markdown" | "url" | "svg" | "png" | "csv"
      /** If true, read the draft version instead of current. Only supported for pages and blog posts. */
      draft?: boolean
    }
    /** Retrieves connected context from Teamwork Graph for any Atlassian entity. Returns all relationships and linked objects within one traversal – including cross-product and third-party connections. Use when the answer requires connections between entities, not just a single entity's fields. Supported entry points: Jira: issues, projects, sprints, versions, comments Confluence: pages, blogposts, whiteboards, databases, spaces Goals, Projects, Focus Areas, Tags and updates People: users, teams, organisations DevOps: PRs, repos, deployments, services, builds, designs Loom: videos, meetings Compass: components Assets: objects Incidents, conversations, calendar events, external documents After calling this tool, call getGraphObject on returned ARIs to get full content. The utilisation of this tool may consume up to 10 Rovo Credits. If the user or organization does not have any Rovo Credits available, the tool call will fail. */
    mcp__claude_ai_Atlassian_MCP__getGraphContext: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** Type of object to fetch context for. */
      objectType: "AtlassianGoal" | "AtlassianGoalUpdate" | "AtlassianHomeComment" | "AtlassianHomeTag" | "AtlassianProject" | "AtlassianProjectUpdate" | "AtlassianTeam" | "AtlassianUser" | "CompassComponent" | "ConfluenceBlogPost" | "ConfluenceComment" | "ConfluenceDatabase" | "ConfluencePage" | "ConfluenceSpace" | "ConfluenceWhiteboard" | "ExternalCalendarEvent" | "ExternalConversation" | "ExternalDeployment" | "ExternalDesign" | "ExternalDocument" | "ExternalOrganisation" | "ExternalPosition" | "ExternalPullRequest" | "ExternalRepository" | "ExternalService" | "FocusFocusArea" | "JiraSpace" | "JiraSprint" | "JiraVersion" | "JiraWorkItem" | "JiraWorkItemComment" | "AssetsObject" | "LoomMeeting" | "LoomMeetingRecurrence" | "LoomVideo"
      /** Identifier for the object. It could be a key (e.g. ENG-1234), ID, ARI, or full URL; format depends on objectType. */
      objectIdentifier: string
      /** 'summary' (counts/metadata) or 'full' (detailed content). */
      detailLevel?: "summary" | "full"
      /** Filter full results to specific relationship types to save tokens (e.g. 'jira-work-item-links-external-build' for Jira work items). */
      relationshipTypes?: unknown[]
      /** Filter results to only include relationships targeting specific object types (e.g. AtlassianUser, ConfluenceComment). */
      targetObjectTypes?: unknown[]
      /** Optional time range to filter relationships by creation or update time. */
      timeRange?: {}
      /** Max number of related items to return. */
      first?: number
      /** Pagination cursor for fetching the next page of results. */
      after?: string
    }
    /** Fetches the entire available data for one or more objects (Atlassian or third-party) using their ARIs or URLs. Use for the objects gathered from getGraphContext tool. */
    mcp__claude_ai_Atlassian_MCP__getGraphObject: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** A list of object identifiers to hydrate. Supports both ARIs (e.g. 'ari:cloud:jira::issue/123') and full browser URLs (e.g. 'https://mysite.atlassian.net/browse/PROJ-1'). At most 25 per call. */
      objects: unknown[]
    }
    /** Get a Jira or JSM issue by key or ID. Use for one known issue; use searchJiraIssuesUsingJql to find or list many issues. Reports how many comments an issue has, not the comments themselves — for those use listJiraIssueComments. View "evidence" also returns the issue's links to other issues. */
    mcp__claude_ai_Atlassian_MCP__getJiraIssue: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** Issue key (PROJ-123), numeric ID, or a Jira issue URL */
      issueIdOrKey: string
      /** Custom Jira field IDs to fetch (e.g. ["customfield_10010", "customfield_10020"]). Overrides the view's fetch strategy. For custom fields in normal use, prefer view: "evidence", which fetches and maps them automatically. Use ["*all"] to fetch every field (expensive — prefer view: "full" instead). */
      fields?: unknown[]
      /** When true, also return compact metadata for fields the authenticated user can edit on this issue, including type, allowed values, and operations. Omit unless preparing an edit: this makes an extra Jira REST call. */
      includeEditableFields?: boolean
      /** When true, each entry in `fields` is interpreted as a Jira field key (e.g. "summary", "description") instead of a field id. Matches the Jira REST `fieldsByKeys` query parameter. Ignored when `fields` is omitted (default field list uses ids). */
      fieldsByKeys?: boolean
      /** Additional Jira expand tokens (comma-separated), e.g. "renderedFields,changelog". Merged with any expand the server adds for custom-field mapping (e.g. "names"); duplicate tokens removed. Note "changelog" here returns only the newest page, sorted newest-first, and it accepts startAt/maxResults then ignores them — so it cannot be paged and reports a longer history as complete. Use listJiraIssueChangelogs to read all of it (oldest-first); do not mix their orderings. */
      expand?: string
      /** Issue entity property keys to return (Jira `properties` query param, repeated per key). Omit unless you rely on app-specific issue properties. */
      properties?: unknown[]
      /** When true, forwards Jira's `failFast` query flag for this GET. Omit for Jira default behavior. */
      failFast?: boolean
      /** Format for rich-text bodies — description and environment, plus any comment bodies the view returns. Defaults to markdown. Set html to receive HTML, which is lossless, so you can pass it straight back to editJiraIssue/addOrEditJiraIssueComment with contentFormat: html. Bodies holding anything markdown cannot represent — inline media, panels, expands, layouts, statuses, @mentions, dates, emoji — are returned as HTML automatically, because markdown would drop those nodes or turn them into literal text on write-back. An explicit markdown request is overridden for those bodies, with a warning saying so; appliedContentFormat in the response reports the format you actually got. */
      responseContentFormat?: "markdown" | "html"
      /** Optional invocation attribution. Jira MCP cards set jira_mcp_card; omit for model/tool-loop calls. */
      actionSource?: "jira_mcp_card" | "model_tool_call"
      /** Output view preset. Default: "compact". Options: "compact", "evidence", "full". compact = minimal fields for scanning; evidence = decision-relevant detail; full = complete response. */
      view?: "compact" | "evidence" | "full"
    }
    /** Read one or more known Loom objects by ARI, share URL, or embed URL. Supported objects currently include async videos and meeting recordings. Use expand to request transcripts, agent briefs, action items, comments, attached links, or developer context logs. Each identifier gets its own status and result in request order. */
    mcp__claude_ai_Atlassian_MCP__getLoomObjectsContent: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** One to ten Loom ARIs, share URLs, or embed URLs to retrieve. Do not pass a bare video ID (the 32-character hex string); it is rejected. If you only have a video ID, send https://www.loom.com/share/{videoId}, or take the ari or url from listLoomObjects. Send at most five identifiers when expand includes transcript. Results preserve this request order and duplicates. */
      identifiers: string[]
      /** Optional content components to include for each Loom recording. "links" is every link attached to the video — manually set, a workspace default, or auto-detected. "logs" is developer context logs (console, network, and desktop grounding rows merged into one paged sequence; bug-report and action-log recordings only). */
      expand?: Array<"transcript" | "agentBrief" | "actionItems" | "comments" | "links" | "logs">
      /** Opaque nextCursor values from prior component responses. Pass each value exactly as returned. Never write, edit or combine cursors. Include the matching component in expand. */
      resume?: string[]
    }
    /** (Beta) Get people’s profiles and optional immediate reporting relationships. Provide cloudId and exactly one selector: identifier (an array of 1–10 Atlassian account IDs or IdentityUser ARIs), name, or email. Name and email each resolve one person; use name: "me" for yourself. If a name is ambiguous, use the returned candidates to disambiguate with an account ID or exact email; do not guess. The profile is always requested. Set manager: true, directReports: true, or both in one call. Results contain identity and requested reporting facets, each with a status. Use successful results when others fail; partial or unavailable data does not establish that a relationship is absent. Reporting relationships do not establish expertise, ownership, or delivery responsibility. This tool is in beta and is not generally available. Usage is not billed during beta. Pricing details will be announced when the tool becomes generally available. */
    mcp__claude_ai_Atlassian_MCP__getPeopleInfo: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** One or more Atlassian account IDs or IdentityUser ARIs (maximum 10). Cannot be combined with name or email. */
      identifier?: string[]
      /** Resolve target user by name, or "me" for the current user. Ambiguous names require disambiguation. */
      name?: string
      /** Resolve target user by exact email, or "me" for the current user. */
      email?: string
      /** Request direct reports alongside the profile. Can be combined with manager. */
      directReports?: boolean
      /** Request the immediate manager alongside the profile. Can be combined with directReports. */
      manager?: boolean
    }
    /** (Beta) Get authored or explicitly selected work activity for the current user, up to 10 people by identifiers, or one person by name or exact email. Defaults to the last seven days with counts and up to five summary items per section. Filter using activity, types, and time bounds; countsOnly omits previews. This tool is in beta and is not generally available. Usage is not billed during beta. Pricing details will be announced when the tool becomes generally available. */
    mcp__claude_ai_Atlassian_MCP__getWorkActivity: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** Work scope: "me" by default; use "user" with identifiers. Name/email selects "user" when scope is omitted */
      scope?: "me" | "user"
      /** User identifier: raw AAID, IdentityUser ARI, or gated IdentityThirdPartyUser ARI. Accepts at most 10 user identifiers per call. */
      identifiers?: string[]
      /** Resolve one person by name using the same resolver as people.describe. Mutually exclusive with email and other person selectors. Ambiguous names return candidates without retrieving work. Omit scope or use user. */
      name?: string
      /** Resolve one person by exact, case-insensitive email using the same resolver as people.describe. Mutually exclusive with name and other person selectors. Omit scope or use user. */
      email?: string
      /** Up to 25 pre-expanded identifiers for one logical actor hierarchy; this is not a batch. */
      actorIdentifiers?: string[]
      /** How far back to look (default: 7d) */
      since?: string
      /** Inclusive activity lower bound. YYYY-MM-DD means UTC; supply an ISO datetime with an explicit offset for a local calendar window. */
      from?: string
      /** Exclusive activity upper bound. YYYY-MM-DD means UTC; supply an ISO datetime with an explicit offset for a local calendar window. */
      to?: string
      /** Compatibility fuzzy topic input */
      query?: string
      /** Compatibility fuzzy topic input */
      search?: string
      /** Add private passive browsing counts/items for your own work; invalid when scope is user */
      includeViewed?: boolean
      /** Return full-window counts without item previews or hydration */
      countsOnly?: boolean
      /** Item detail: summary (default), full product hydration, or none (IDs/tags only) */
      hydrate?: "full" | "summary" | "none"
      /** Comma-separated section names: jira,pr,projects,goals,docs,calendar,videos,dev,comments. The alias meetings also selects calendar. */
      types?: string
      /** Exact comma-separated activity selectors (default: authored): authored, reviewed, commented, updated, contributed, assigned, owned, mentioned, all. Event selectors: created (creator and creation date), resolved (current-assignee resolution cohort with actor evidence), merged (authored PR merge date). Selectors form a union; all retains legacy relationship semantics. */
      activity?: string
      /** Maximum item previews returned and hydrated per section (default: 5) */
      itemsPerSection?: string
      /** Order each returned section by heuristic importance before applying itemsPerSection */
      ranked?: boolean
      /** Concurrent user work reads in an identifiers batch (default: 5, max: 20) */
      batchConcurrency?: string
      /** Fail an identifiers batch if any user work read fails */
      strict?: boolean
      /** topic */
      topic?: string[]
    }
    /** (Beta) Returns native and inferred projects, owned goals, and focus areas for up to 10 root identifiers per call, including their immediate reports by default. Includes project ownership and contribution relationships, status, and updates. This tool is in beta and is not generally available. Usage is not billed during beta. Pricing details will be announced when the tool becomes generally available. */
    mcp__claude_ai_Atlassian_MCP__getWorkPortfolio: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** full keeps original output. compact shares coverageRef via data.coverage and evidenceRefs/representativeRef via data.evidence. Missing section failures/coverage reasons mean none; equal title/name, ari/id and record/representative URLs appear once. Refs are portfolio-local. */
      view?: "full" | "compact"
      /** Select 1–10 roots by account ID or IdentityUser ARI, returning a batch with one portfolio per root, including for a single entry. Use "me" for yourself, including alongside other roots, or omit all selectors for a single current-user portfolio. Each also includes its immediate reports by default; do not add those reports as roots again. Use includeDirectReports=false for a flat batch. Cannot combine with name or email. */
      identifiers?: string[]
      /** Resolve one person by name. If multiple people match, use the returned candidates to identify the intended person; ask the user if unclear, then retry with email set to the candidate's exact email, or identifiers set to [candidate.accountId]. Omit name from the retry request. */
      name?: string
      /** Resolve one person by exact email. */
      email?: string
      /** true returns the root AND each immediate report’s work in this call. false returns only the selected root(s). Never includes grandchildren for a single root. */
      includeDirectReports?: boolean
      /** Nonempty subset of projects, goals, focusAreas. Default: all three. */
      kinds?: Array<"projects" | "goals" | "focusAreas">
      /** Project relationships: owner and/or contributor. Default: both. Goals and focus areas are owned. */
      projectRoles?: Array<"owner" | "contributor">
      /** Include active inferred projects with their linked evidence, independently of native project filters. */
      includeInferredProjects?: boolean
      /** Atlassian project filter; default in progress. Does not filter inferred-project health. */
      atlasProjectStatus?: "active" | "on_track" | "at_risk" | "off_track" | "completed" | "pending" | "paused"
      /** Omit for in-progress OR pending goals. An explicit status selects only that state; active excludes pending. */
      goalStatus?: "active" | "on_track" | "at_risk" | "off_track" | "completed" | "pending" | "paused" | "cancelled"
      /** Omit for in-progress OR pending focus areas. An explicit status selects only that state; active excludes pending. */
      focusAreaStatus?: "active" | "on_track" | "at_risk" | "off_track" | "completed" | "pending" | "paused"
      /** Include directly linked native goals/projects with separate relationship coverage. */
      includeLinks?: boolean
      /** Records per person per source collection, 1–100. Atlassian and inferred projects have independent limits. */
      limitPerCollection?: string
      /** Maximum direct reports to query, 1–100; omitted reports remain explicit in coverage. */
      reportLimit?: string
    }
    /** Get a paginated list of comments for a Jira issue. Use this instead of getJiraIssue when an issue has many comments — getJiraIssue embeds at most 20 and cannot page them. Page with startAt until isLast is true; total is the full comment count. Each comment reports any visibility restriction on it and, on JSM, whether it is internal (jsdPublic: false) — check both before quoting or summarising a comment. Comments are returned as a flat list: a non-null parentId means the comment is a reply, and parentId identifies its root/parent comment. Group comments by parentId to reconstruct threads. Set reactionDetail when emoji reaction data is needed. For the issue's own fields, use getJiraIssue. */
    mcp__claude_ai_Atlassian_MCP__listJiraIssueComments: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** Issue key (PROJ-123), numeric ID, or a Jira issue URL */
      issueIdOrKey: string
      /** Zero-based index of the first comment to return (for pagination). Defaults to 0. */
      startAt?: number
      /** Maximum number of comments to return per page (1-100). Defaults to 100. Read total from the response for the full count. With view: "full" the page is capped at 20, because a larger full-view page can exceed the client's token limit and fail the whole call; the response echoes the effective value. */
      maxResults?: number
      /** Order comments by created date — "created"/"+created" (oldest first) or "-created" (newest first). */
      orderBy?: "created" | "-created" | "+created"
      /** Comma-separated list of extra data to include on each comment, e.g. "renderedBody" (HTML-rendered body) or "properties". */
      expand?: string
      /** Format for comment bodies. Defaults to markdown. Set html to receive HTML, which is lossless, so a body can be passed straight back to addOrEditJiraIssueComment with contentFormat: html. Fetch as html before editing any comment, since markdown drops images, panels and expands and returns statuses/@mentions as literal text. A page holding any such comment is returned as HTML automatically. An explicit markdown request is overridden for those bodies, with a warning saying so; appliedContentFormat in the response reports the format you actually got. */
      responseContentFormat?: "markdown" | "html"
      /** Reaction enrichment level. "none" (default) returns comments only, with no Reactions API call. "summary" adds emoji counts and whether the current user reacted. "users" also names who reacted — ask for it only when attribution is requested, since it costs an extra request per distinct emoji and reports when it could not expand every one. */
      reactionDetail?: "none" | "summary" | "users"
      /** Output view preset. Default: "compact". Options: "compact", "evidence", "full". compact = minimal fields for scanning; evidence = decision-relevant detail; full = complete response. */
      view?: "compact" | "evidence" | "full"
    }
    /** Semantically search Jira, Confluence, and connected third-party content using Rovo Search. ALWAYS use this tool to search for Jira and Confluence content unless CQL or JQL is specified. The utilisation of this tool may consume up to 10 Rovo Credits. If the user or organization does not have any Rovo Credits available, the tool call will fail. */
    mcp__claude_ai_Atlassian_MCP__search: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** The search query. */
      query: string
      /** Filter results by product. ALL searches everything. JIRA returns only Jira issues/boards/projects. CONFLUENCE returns only Confluence pages/blogs/spaces. THIRD_PARTY returns content from ready connected external sources. */
      targetApp?: "ALL" | "JIRA" | "CONFLUENCE" | "THIRD_PARTY"
      limit?: number
    }
    /** Search Confluence content with CQL */
    mcp__claude_ai_Atlassian_MCP__searchConfluence: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** CQL query string (max 4096 chars). Examples: `type = page AND space = "DEV"`, `title ~ "onboarding" AND lastmodified > "2025-01-01"`, `creator = currentUser() AND type IN (page, blogpost) ORDER BY lastmodified DESC`. */
      cql: string
      /** JSON-encoded execution context, e.g. {"spaceKey":"DEV"}. Restricts the search to the supplied scope. */
      cqlcontext?: string
      /** Comma-separated list of content properties to expand on each result. Common values: `space`, `version`, `body.view`, `metadata.labels`, `ancestors`. Use sparingly to avoid large responses. */
      expand?: string
      /** Max number of results to return per page (1-100). Defaults to 25. */
      limit?: number
      /** Opaque pagination cursor returned by a previous call. Omit to start from the first page. */
      cursor?: string
    }
    /** Search for Jira issues using JQL, with an optional approximate count. Use view: "evidence" to fetch and map custom fields. Page with nextPageToken until isLast is true. For one known issue, use getJiraIssue. JQL only returns issues; inferring anything else from issue rows is silently incomplete. Use the purpose-built operation for sprints, boards, board config, field history, worklogs, releases, accountIds, issue types, projects and statuses. */
    mcp__claude_ai_Atlassian_MCP__searchJiraIssuesUsingJql: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** JQL query string e.g. "project = PROJ AND status = 'In Progress'". If the tool returns a repairHint, follow it and retry. */
      jql: string
      /** Default "issues". Never count for normal search or if nextPageToken used. If total for same query is known, reuse it. Use "count" only when no trusted count exists and either the user asks or a downstream step needs it. Use "all" only if both count and issues required. */
      searchResultMode?: "issues" | "count" | "all"
      /** Maximum results to return (default 50, max 100) */
      maxResults?: number
      /** Fields per issue (e.g. ["summary", "status", "customfield_10010"]). customfield_* IDs are site-specific — discover the correct id for story points etc. on this Cloud site. Honoured exactly when supplied. Values map to issues[].fields.customFields (human labels), not raw customfield_* keys. The default "compact" view omits custom fields; use view: "evidence" for velocity/sprint JQL (fetches and maps all custom fields) or pass explicit customfield_* IDs. */
      fields?: unknown[]
      /** Pagination token from a previous response to fetch the next page */
      nextPageToken?: string
      /** Format for rich-text bodies (description, environment, comments) when the view returns them. Defaults to markdown; html is lossless for a later editJiraIssue. Issues holding anything markdown cannot represent (media, panels, expands, statuses, @mentions) are returned as HTML automatically, decided per issue. An explicit markdown request is overridden for those bodies, with a warning saying so; appliedContentFormat in the response reports the format you actually got. */
      responseContentFormat?: "markdown" | "html"
      /** Optional invocation attribution. Jira MCP cards set jira_mcp_card; omit for model/tool-loop calls. */
      actionSource?: "jira_mcp_card" | "model_tool_call"
      /** Output view preset. Default: "compact". Options: "compact", "evidence", "full". compact = minimal fields for scanning; evidence = decision-relevant detail; full = complete response. */
      view?: "compact" | "evidence" | "full"
    }
    /** Move a Jira issue through its workflow and/or into a sprint or the backlog — at least one is required. Take transitionId from listJiraIssueTransitions; transitionName is the transition's own name, not the target status. Returns the status the issue actually landed in, so no read-back is needed. If the sprint/backlog move fails after the status change succeeds, the status change stays — retry the move alone, not the whole call. */
    mcp__claude_ai_Atlassian_MCP__transitionJiraIssue: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** Issue key like PROJ-123 */
      issueIdOrKey: string
      /** Transition ID (get from listJiraIssueTransitions). Provide either transitionId or transitionName. */
      transitionId?: string
      /** Name of the transition itself, not the target status — the two often differ, so "Done" does not match a transition named "Review->Done". Provide either transitionId or transitionName. */
      transitionName?: string
      /** Optional Jira field values to apply during the workflow transition. */
      fields?: {}
      /** Optional Jira field update operations to apply during the workflow transition. A comment passed here may be dropped without error — the transition reports success and no comment is created. Use addOrEditJiraIssueComment instead. */
      update?: {}
      /** Optional issue history metadata to attach to the workflow transition. */
      historyMetadata?: {}
      /** Assign the issue into this sprint. Mutually exclusive with assignToBacklog. */
      sprintId?: number
      /** Set true to assign the issue to the backlog, mutually exclusive with sprintId. Optionally use boardId to target a specific board's backlog. */
      assignToBacklog?: boolean
      /** Only used when assignToBacklog is true: targets this specific board's backlog (board IDs from listJiraBoards). Ignored otherwise. */
      boardId?: number
      /** Optional invocation attribution. Jira MCP cards set jira_mcp_card; omit for model/tool-loop calls. */
      actionSource?: "jira_mcp_card" | "model_tool_call"
    }
    /** Update Confluence docs, whiteboards, or databases. For edits to classic pages (type=page), fetch the full draft in the intended body format with getConfluenceContent(draft=true, detail=full), and use that content and its returned snapshotToken. If the token is missing, published-base or stale, refetch the draft and reapply the edit. Update draft=true saves the draft; omit it to publish, according to user intent. Before choosing body.format or authoring an edit, call getContentFormatGuide through execute with name=getContentFormatGuide and inputs={toolName}. Use updateConfluencePage for pages, blog posts, and live docs; updateConfluenceWhiteboard for whiteboards; or updateConfluenceDatabase for databases. Space instructions describe how to author content in a Confluence space. Apply relevant guidance to the content you create or update. Follow this decision rule: 1. Before authoring, call getConfluenceSpace for the target space unless getConfluenceContent returned metadata.hasSpaceInstructions=false for content in that space. If getConfluenceSpace already returned for the same cloudId and space during the current task, reuse its spaceInstructions and do not call it again. 2. When the value is true or unknown and instructions have not been loaded, you must call getConfluenceSpace once before authoring through execute with name=getConfluenceSpace, top-level cloudId, and inputs={spaceIdOrKey}. 3. Apply any returned spaceInstructions. If a successful response omits them, no instructions are configured; author with defaults and do not block. After a successful getConfluenceSpace call, do not make a separate getConfluenceSpaceInstructions call. */
    mcp__claude_ai_Atlassian_MCP__updateConfluenceContent: {
      /** Site UUID or Jira/Confluence URL for this operation's Atlassian site. cloudId is never silently auto-resolved or reused for you — call getAccessibleAtlassianResources ONCE per session, cache the returned cloudId, and pass it explicitly on this and every subsequent call, since most operations need it. `execute` and its read/write/destructive variants strictly require it for cloudId-scoped operations and fail without it. Not needed for cloudId-less operations (e.g. Bitbucket), which ignore this field. */
      cloudId: string
      /** Numeric Confluence content ID. One of contentId or contentUrl is required. */
      contentId?: string
      /** Full URL of the Confluence content. One of contentId or contentUrl is required. Clear Confluence URLs for pages/live docs (/pages/{id}), blogs (/blog/{id}), whiteboards (/whiteboard/{id}), databases (/database/{id}), and folders (/folder/{id}) are normalized to their numeric content ID before the update is sent, so URLs copied from the product should work directly. */
      contentUrl?: string
      /** Opaque token from the most recent getConfluenceContent or updateConfluenceContent response for this content. Each successful update returns the current snapshot.token; pass it to the next update, because changes to the content make earlier tokens stale. On snapshot_stale, re-read the content with getConfluenceContent and reapply the change to the latest body before retrying; do not resend the same payload with currentSnapshot.token. Required for doc-type updates that mutate page/blog/live_doc content or contentWidth. Not used for whiteboard svg or database csv object updates. */
      snapshotToken?: string
      /** New title for the content. 1-255 characters. Omit to keep existing title. */
      title?: string
      /** Before composing this body, follow the space-instruction decision rule in the tool description. Reuse known instruction state and do not repeat the space lookup per write. Body update object with format and value. Doc types accept format html or markdown. Prefer HTML. Use markdown only when you are confident the content needs only basic text formatting and has no rich Confluence elements to preserve or create, such as panels, layouts, media, whiteboard embeds, or Remixes. If unsure, use HTML. Re-read existing rich content as HTML before editing and preserve its content and embeds. Whiteboards accept format svg and should include context.content with the current SVG when applying a patch. Databases accept format csv and should include context.content with the current CSV when applying an edit envelope. Put the raw patch/envelope directly in value; do not wrap it in an extra JSON object or {"content": "..."} wrapper. For whiteboards, value is a patch, not a full SVG replacement. For databases, value is an edit envelope, not a create payload. Mutually exclusive with edits. */
      body?: {}
      /** Granular edit operations. Array of tool-call objects, each with name (replaceNode, insertNodeAfter, insertNodeBefore, deleteNode, removeNodes, moveNode, appendNodeToEnd, setAttrs), localId, value, and arguments. Mutually exclusive with body. */
      edits?: unknown[]
      /** If true, validate and preview the result without persisting. For edits, returns the resulting HTML. For body replacement, echoes the input. */
      dryRun?: boolean
      /** If true, update the draft version instead of current. Only supported for page and blogpost doc edits. */
      draft?: boolean
      /** Optional version comment/message for the content update. */
      versionMessage?: string
      /** Whether to mark the new content version as a minor edit. */
      minorEdit?: boolean
      /** Atlassian account ID of the new owner to transfer page ownership to. Optional. This is an account ID (e.g. 5b10ac8d82e05b22cc7d4ef5), never an email/username or a content ID. The new owner must already have edit permission. */
      ownerId?: string
      /** Optional page width for doc types only: page, live_doc, and blogpost. Accepted values are narrow, wide, and max. The default width is narrow. Omit to keep the existing content width unchanged. A width-only update is valid and requires snapshotToken, but does not require title, body, or edits. Non-doc content types do not support this field. */
      contentWidth?: "narrow" | "wide" | "max"
    }
    /** Create a doc, or apply several operations to one doc atomically. */
    mcp__claude_ai_Claude_Docs__batch: {
      batch?: unknown[]
      container?: {
        kind: string
        id?: string
        create?: {}
      }
      verbose?: boolean
      opId?: string
    }
    /** Create one object in a doc: a tab, its contents, a comment, an upload record. */
    mcp__claude_ai_Claude_Docs__create: {
      object: "file" | "node" | "utterance" | "enum" | "blob"
      engine?: string
      payload: {} | string
      container?: {
        kind: string
        id: string
        version?: string
      }
      verbose?: boolean
      opId?: string
      artifact?: string
    }
    /** Delete one object from a doc: a tab or a comment. A doc keeps at least one tab (deleting its last refuses `last_tab`): to start over, rewrite that tab's contents with `update`, never delete and recreate the tab. */
    mcp__claude_ai_Claude_Docs__delete: {
      ref: {
        object: "project" | "file" | "node" | "utterance"
        id: string
      }
      engine?: string
      container?: {
        kind: string
        id: string
        version?: string
      }
      payload?: {} | string
      verbose?: boolean
      opId?: string
    }
    /** Export one tab inline as base64: pdf, docx, html, text, markdown or notion (Notion-flavored markdown, what notion-create-pages takes). To just keep the file in the doc's files, create a blob {from: {object: "file", id}, format} instead (no large result). */
    mcp__claude_ai_Claude_Docs__export: {
      container: {
        kind: string
        id: string
        version?: string
      }
      file: string
      format: "markdown" | "text" | "html" | "docx" | "pdf" | "notion"
      paper?: "letter" | "a4"
      maxBytes?: number
      /** "fit": send it only when a refusal offers it or a docx's notes say `(file too large to deliver)`, and only where you have a shell or file tools (your client then saves the large result as a file). The file may keep the pictures that fit. `data.notes` counts those left out: tell the user how many. Those counts come first, in the result's first 2,000 characters. */
      pictures?: "fit"
    }
    /** Docs guides: topic.instructions repeats the server instructions. Read it only if your client dropped them. Also topic.<name>, refusal.<code>. After a doc's birth → ["topic.index"]. */
    mcp__claude_ai_Claude_Docs__guide: {
      /** topic.<name> (instructions, index, editing, tabs, comments, charts, chart-definition, diagram, uploads, sharing, skill) or refusal.<code>; several per call is fine. */
      items?: unknown[]
    }
    /** List a tab's or a doc's comment history (threads, replies, resolves). */
    mcp__claude_ai_Claude_Docs__query: {
      container?: {
        kind: string
        id: string
        version?: string
      }
      object?: "utterance"
      payload?: {} | string
    }
    /** Read a doc (lists its tabs), a tab's contents, or a comment. A claude.ai/[code/]artifact/[<title>-]<id> link → `ref {"object":"project","id":"<id>"}` first; reads inside it take `container {"kind":"project","id":"<id>"}`. */
    mcp__claude_ai_Claude_Docs__read: {
      ref: {
        object: "project" | "file" | "node" | "utterance" | "enum" | "blob"
        id: string
      }
      engine?: string
      container?: {
        kind: string
        id: string
        version?: string
      }
      payload?: {} | string
    }
    /** Edit a tab's contents, rename a doc or tab, or change a stored value. */
    mcp__claude_ai_Claude_Docs__update: {
      ref: {
        object: "project" | "file" | "node" | "utterance" | "enum"
        id: string
      }
      engine?: string
      payload: {} | string
      container?: {
        kind: string
        id: string
        version?: string
      }
      verbose?: boolean
      opId?: string
      answering?: string
    }
    /** Cancel one or more identified events the user can manage. Cancellation may notify attendees. For an event the user does not organize, use calendar_update_events with updateType: "RSVP" instead. */
    "mcp__claude_ai_Notion__notion-calendar-cancel-events": {
      /** Events to cancel. */
      events: Array<{
        /** Calendar containing the event. */
        calendar: {
          /** Account that owns the event calendar. */
          accountId: string
          /** Event calendar identifier within the account. */
          calendarId: string
        }
        /** Identifier of the event to cancel. */
        eventId: string
        /** Optional summary of the event, used by agent UI. */
        eventSummary?: string
      }>
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Create one or more events on writable calendars. Use this after the date, time, attendees, and target calendar are known. Creating events may notify attendees. */
    "mcp__claude_ai_Notion__notion-calendar-create-events": {
      /** Date-times of returned events will be expressed in this time-zone */
      timeZone: string
      /** Events to create. */
      events: Array<{
        /** Title of the event. */
        summary: string
        /** Description of the event. */
        description?: string
        /** Physical location where the event takes place, or remote conference link/info. */
        location?: string
        /** Recurrence rules in RRULE format (e.g., ['RRULE:FREQ=WEEKLY;COUNT=10']). Can also include EXDATE for exception dates (e.g., ['RRULE:FREQ=WEEKLY;COUNT=10', 'EXDATE:2026-03-24T13:00:00']). */
        recurrenceRules?: string[]
        /** When the event is happening */
        period: {
          /** Whether the event period uses all-day dates or date-times. */
          type: "DATE"
          /** Start of the event. */
          start: {
            /** Date in ISO 8601 format (no time) */
            date: string
          }
          /** End of the event. */
          end: {
            /** Date in ISO 8601 format (no time) */
            date: string
          }
        } | {
          /** Whether the event period uses all-day dates or date-times. */
          type: "DATE_TIME"
          /** Start of the event. */
          start: {
            /** Date-time in ISO 8601 format, in UTC (ending with Z), or with TZ offset, or without TZ offset if `timeZone` is specified in which case will be interpreted as local time in that timeZone */
            dateTime: string
            /** IANA time zone for the event start date-time. */
            timeZone?: string
          }
          /** End of the event. */
          end: {
            /** Date-time in ISO 8601 format, in UTC (ending with Z), or with TZ offset, or without TZ offset if `timeZone` is specified in which case will be interpreted as local time in that timeZone */
            dateTime: string
            /** IANA time zone for the event end date-time. */
            timeZone?: string
          }
        }
        /** Attendees to invite to the event */
        attendees?: Array<{
          /** Email address of the attendee. */
          email: string
          /** Totally optional, provide only if you are sure of the attendee's name */
          displayName?: string
          /** Set only if the user was explicit about an attendee not being required */
          isOptional?: boolean
        }>
        /** Resources (such as rooms) to invite to the event. Must be from the same account as `event.calendar`. */
        resources?: Array<{
          /** Email address of the resource. */
          email?: string
          /** Display name of the resource. */
          displayName?: string
          /** Set only if the user was explicit about a resource not being required */
          isOptional: boolean
        }>
        /** Will create the event on the primary, default calendar if not specified. */
        calendar?: {
          /** Account that owns the target calendar. */
          accountId: string
          /** Target calendar identifier within the account. */
          calendarId: string
        }
        /** Whether to disable conferencing for this event. */
        disableConferencing?: boolean
      }>
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** List rooms or other calendar resources available for specific times. Resource discovery is scoped to the connected account of the target calendar and only works with Google Workspace accounts that have admin permissions to view Calendar resources. */
    "mcp__claude_ai_Notion__notion-calendar-list-calendar-resources": {
      /** Specific time slots to check. Returns available resources for each time slot independently. */
      timeSlots: Array<{
        /** Start of the time slot to check, as an ISO 8601 date-time. */
        startAt: string
        /** End of the time slot to check, as an ISO 8601 date-time. */
        endAt: string
      }>
      /** Minimum room capacity (number of people). MUST include the meeting organizer/user themselves in the count. For a 1-on-1, pass 2. For a meeting with N invitees besides the user, pass N+1. */
      minCapacity: number
      /** Maximum number of resources to return per time slot (default: 20, max: 40) */
      maxCount?: number
      /** If true, do not narrow rooms to the user's working-location building for this day. Set this when the user is explicitly asking about rooms in a different office (e.g. for a visiting team). */
      ignoreWorkingLocation?: boolean
      /** Date-times of returned events will be expressed in this time-zone */
      timeZone: string
      /** Calendar of the event the rooms will be attached to. Rooms are scoped to a single account. */
      calendar?: {
        /** Account that owns the target calendar. */
        accountId: string
        /** Target calendar identifier within the account. */
        calendarId: string
      }
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** List calendars grouped by connected account. Use this to identify a target or conflict calendar before another Calendar operation. */
    "mcp__claude_ai_Notion__notion-calendar-list-calendars": {
      /** Return only accounts linked to these email addresses. Useful to get calendars from a work account only for example. Do not specify if you are interested in getting the whole picture of someone's agenda across work and personal accounts. */
      onlyAccountEmails?: string[]
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Find contacts by name or email across the user's connected Calendar accounts. Use this to resolve attendee identities before another Calendar operation. */
    "mcp__claude_ai_Notion__notion-calendar-list-contacts": {
      /** Optional search queries to filter contacts by name or email. Results matching any query are included. */
      queries?: string[]
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** List detailed events for coworkers in the same organization within a time range. Use this when event titles or context are needed, not only free/busy availability. */
    "mcp__claude_ai_Notion__notion-calendar-list-coworkers-events": {
      /** Emails of relevant coworkers */
      coworkerEmails: string[]
      /** Start of the time range, as an ISO 8601 date-time. */
      timeMin: string
      /** End of the time range, as an ISO 8601 date-time. */
      timeMax: string
      /** Date-times of returned events will be expressed in this time-zone */
      timeZone: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** List the user's events across connected calendars within a time range. Use this to inspect the user's own schedule or identify events before changing them. */
    "mcp__claude_ai_Notion__notion-calendar-list-events": {
      /** Start of the time range, as an ISO 8601 date-time. */
      timeMin: string
      /** End of the time range, as an ISO 8601 date-time. */
      timeMax: string
      /** Date-times of returned events will be expressed in this time-zone */
      timeZone: string
      /** Whether to include event invites the user has declined */
      includeDeclinedInvites?: boolean
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Update one or more identified events, including timing, attendees, recurrence, resources, or RSVP status. Updates require permission and may notify attendees. */
    "mcp__claude_ai_Notion__notion-calendar-update-events": {
      /** Date-times of returned events will be expressed in this time-zone */
      timeZone: string
      /** Event updates to apply. */
      updates: Array<{
        /** Must be set to the exact string "RSVP" in upper case. */
        updateType: "RSVP"
        /** Event to update. */
        event: {
          /** Calendar containing the event. */
          calendar: {
            /** Account that owns the event calendar. */
            accountId: string
            /** Event calendar identifier within the account. */
            calendarId: string
          }
          /** Identifier of the event to update. */
          eventId: string
          /** Optional summary of the event, used by agent UI. */
          eventSummary?: string
        }
        /** RSVP update to apply to the event. */
        rsvp: {
          /** The calendar user's RSVP status */
          responseStatus: "needsAction" | "accepted" | "declined" | "tentative"
          /** Optional comment accompanying the RSVP. */
          comment?: string
        }
      } | {
        /** Must be set to the exact string "UPDATE" in upper case. */
        updateType: "UPDATE"
        /** Event to update. */
        event: {
          /** Calendar containing the event. */
          calendar: {
            /** Account that owns the event calendar. */
            accountId: string
            /** Event calendar identifier within the account. */
            calendarId: string
          }
          /** Identifier of the event to update. */
          eventId: string
          /** Optional summary of the event, used by agent UI. */
          eventSummary?: string
        }
        /** Changes to apply to the event. */
        update: {
          /** Updated title of the event. */
          summary?: string
          /** Updated description of the event. */
          description?: string
          /** Physical location where the event takes place, or remote conference link/info. */
          location?: string
          /** Recurrence rules in RRULE format (e.g., ['RRULE:FREQ=WEEKLY;COUNT=10']). Can also include EXDATE for exception dates (e.g., ['RRULE:FREQ=WEEKLY;COUNT=10', 'EXDATE:2026-03-24T13:00:00']). */
          recurrenceRules?: string[]
          /** When the event is happening */
          period?: {
            /** Whether the updated event period uses all-day dates or date-times. */
            type: "DATE"
            /** Updated start of the event. */
            start: {
              /** Date in ISO 8601 format (no time) */
              date: string
            }
            /** Updated end of the event. */
            end: {
              /** Date in ISO 8601 format (no time) */
              date: string
            }
          } | {
            /** Whether the updated event period uses all-day dates or date-times. */
            type: "DATE_TIME"
            /** Updated start of the event. */
            start: {
              /** Date-time in ISO 8601 format, in UTC (ending with Z), or with TZ offset, or without TZ offset if `timeZone` is specified in which case will be interpreted as local time in that timeZone */
              dateTime: string
              /** IANA time zone for the updated event start date-time. */
              timeZone?: string
            }
            /** Updated end of the event. */
            end: {
              /** Date-time in ISO 8601 format, in UTC (ending with Z), or with TZ offset, or without TZ offset if `timeZone` is specified in which case will be interpreted as local time in that timeZone */
              dateTime: string
              /** IANA time zone for the updated event end date-time. */
              timeZone?: string
            }
          }
          /** Updated list of attendees for the event */
          attendees?: Array<{
            /** Email address of the attendee. */
            email: string
            /** Totally optional, provide only if you are sure of the attendee's name */
            displayName?: string
            /** Set only if the user was explicit about an attendee not being required */
            isOptional?: boolean
          }>
          /** Updated list of resources (such as rooms) for the event. Must be from the same account as `event.calendar`. */
          resources?: Array<{
            /** Email address of the resource. */
            email?: string
            /** Display name of the resource. */
            displayName?: string
            /** Set only if the user was explicit about a resource not being required */
            isOptional: boolean
          }>
          /** Whether to add conferencing to this event. Only adds conferencing if the event has attendees and doesn't already have conferencing. */
          addConferencing?: boolean
        }
      }>
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Mark an existing Notion page as a skill without changing its content. The page must be in the current workspace, and the authenticated user must have permission to edit it. Use this tool only when the user wants the page's current contents designated as a skill. If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. */
    "mcp__claude_ai_Notion__notion-convert-page-to-skill": {
      /** The full Notion URL of the page to mark as a skill. */
      page_url: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Create an attachment and upload it to Notion. Provide exactly one source: - content for small UTF-8 text artifacts such as HTML, Markdown, plain text, CSV, JSON, XML, CSS, YAML, TSV, calendar, GPX, or SVG files. - source_url for a direct, publicly reachable HTTPS file URL. - source_file_id for a file this exact integration already uploaded. When create_file_upload is available, use it for local files so the upload has the same owner. For content and source_url, filename must use a supported extension and content_type must agree with it. Omit content_type to infer it. source_file_id takes neither because the stored upload carries both. For larger files, redirects, or authenticated downloads, upload through the Notion File Upload API with this integration's token and pass source_file_id. The response includes a markdown_source value. To place the uploaded file on a page, pass that source to create-pages or update-page. To attach it to a comment, include suggested_markdown on a separate line in create-comment markdown. Unattached uploads remain temporary and are deleted once they expire: content and source_url open a fresh one-hour window, while source_file_id keeps the window that opened when the file was first uploaded, so place that source promptly and upload the file again if it has already expired. "HTML", "HTML block", "HTML artifact", and "HTML embed" all mean an HTML file placed with <embed source="file-upload://..." /> so Notion renders the sandboxed preview. Never place HTML in a code block or file block. Use <file source="file-upload://..." /> for other files. */
    "mcp__claude_ai_Notion__notion-create-attachment": {
      /** The filename to create in Notion, including a supported extension such as .html, .md, .pdf, or .png. Required with content and source_url. Omit it with source_file_id; the stored upload already carries a filename. */
      filename?: string
      /** Optional MIME type, such as text/html or application/pdf. It must match the filename extension; omit it to infer the type from the filename. Omit it with source_file_id; the stored upload already carries a content type. */
      content_type?: string
      /** The complete UTF-8 text content of the file. Maximum 200 KiB after UTF-8 encoding. Requires filename. Examples: <example><!doctype html><html><body><h1>Report</h1></body></html></example> or <example># Notes Hello</example>. */
      content?: string
      /** A direct, publicly reachable HTTPS URL from which Notion can download the file within one minute. Notion makes a metadata-only HEAD request when supported, then a GET. Redirects, private network addresses, custom request headers, and cookies are not supported. Downloads are limited to 5 MiB for free workspaces and 50 MiB for paid workspaces. Requires filename. Example: <example>https://storage.example.com/report.pdf?signature=...</example>. */
      source_url?: string
      /** The ID of a file upload this exact integration already created. Use create_file_upload when available; otherwise run `ntn files create` or use the Notion File Upload API with this integration's token. Its status must be uploaded. An upload created with a different token is not visible. Example: <example>1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b</example>. */
      source_file_id?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Add a comment to a page or specific content. Provide `page_id` to identify the page, then choose ONE targeting mode: - `page_id` alone: Add a top-level comment to the page - `page_id` + `selection_with_ellipsis`: Highlight selected text within one block, or comment on the block where the match starts if no inline highlight can be resolved. No matching content returns an error. - `reply_to_comment_id`: Reply to a comment using its `id` from get-comments (page_id is still required) - `discussion_id`: Reply to an existing discussion (page_id is still required) Provide exactly one content format: - `markdown`: Preferred. Inline Notion-flavored Markdown for comment text. For exact syntax, read the MCP resource `notion://docs/notion-flavored-markdown-spec` through your MCP client's resource-reading interface, or call the Notion "fetch" tool with this URI if your client does not support reading MCP resources. Do NOT pass this URI to any other URL-fetching tool. Use only the Rich text types and Mentions syntax that comments support. Comments support inline formatting (bold, italic, strikethrough, underline, code, links), inline math using `$Equation$`, user, page, and database mentions such as `<mention url="user://..." />`, and date mentions such as `<date start="YYYY-MM-DD" />`. To attach a file created by `create-file-upload` or `create-attachment`, include its returned `suggested_markdown` on a separate line; up to three file attachments are supported. Do not use UI shortcuts like `@today`, `@name`, `[[page]]`, or autocomplete-style emoji syntax; those are editor affordances, not markdown syntax. Mention tags must include a real `url` where required by the spec. Other block-level Markdown such as headings, lists, tables, blockquotes, and fenced code blocks is stored as plain comment text rather than rendered as blocks. - `rich_text`: Array of rich text objects. */
    "mcp__claude_ai_Notion__notion-create-comment": {
      /** The page ID, with or without dashes, or a Notion page URL. */
      page_id: string
      /** The ID of the comment to reply to. */
      reply_to_comment_id?: string
      /** The ID or URL of an existing discussion to reply to (e.g., discussion://pageId/blockId/discussionId). */
      discussion_id?: string
      /** Unique content snippet: ~10 characters from each end, joined by "...". A match within one block's text gets an inline comment on that text; otherwise, comment on the block where the match starts. No match returns an error. */
      selection_with_ellipsis?: string
      /** An array of rich text objects that represent the content of the comment. Provide exactly one of rich_text or markdown. */
      rich_text?: Array<{
        /** All rich text objects contain an annotations object that sets the styling for the rich text. */
        annotations?: {
          /** Whether the text is formatted as bold. */
          bold?: boolean
          /** Whether the text is formatted as italic. */
          italic?: boolean
          /** Whether the text is formatted with a strikethrough. */
          strikethrough?: boolean
          /** Whether the text is formatted with an underline. */
          underline?: boolean
          /** Whether the text is formatted as code. */
          code?: boolean
          /** The color of the text. */
          color?: string
        }
      } & ({
        /** Always `text` */
        type?: "text"
        /** If a rich text object's type value is `text`, then the corresponding text field contains an object including the text content and any inline link. */
        text: {
          /** The actual text content of the text. */
          content: string
          /** An object with information about any inline link in this text, if included. */
          link?: {
            /** The URL of the link. */
            url: string
          } | null
        }
      } | {
        /** Always `mention` */
        type?: "mention"
        /** Mention objects represent an inline mention of a database, date, link preview mention, page, template mention, or user. A mention is created in the Notion UI when a user types `@` followed by the name of the reference. */
        mention: {
          /** Always `user` */
          type?: "user"
          /** Details of the user mention. */
          user: {
            /** The ID of the user. */
            id: string
            /** The user object type name. */
            object?: "user"
          }
        } | {
          /** Always `date` */
          type?: "date"
          /** Details of the date mention. */
          date: {
            /** The start date of the date object. */
            start: string
            /** The end date of the date object, if any. */
            end?: string | null
            /** The time zone of the date object, if any. E.g. America/Los_Angeles, Europe/London, etc. */
            time_zone?: string | null
          }
        } | {
          /** Always `page` */
          type?: "page"
          /** Details of the page mention. */
          page: {
            /** The ID of the page in the mention. */
            id: string
          }
        } | {
          /** Always `database` */
          type?: "database"
          /** Details of the database mention. */
          database: {
            /** The ID of the database in the mention. */
            id: string
          }
        } | {
          /** Always `template_mention` */
          type?: "template_mention"
          /** Details of the template mention. */
          template_mention: {
            /** Always `template_mention_date` */
            type?: "template_mention_date"
            /** The date of the template mention. */
            template_mention_date: "today" | "now"
          } | {
            /** Always `template_mention_user` */
            type?: "template_mention_user"
            /** The user of the template mention. */
            template_mention_user: "me"
          }
        } | {
          /** Always `custom_emoji` */
          type?: "custom_emoji"
          /** Details of the custom emoji mention. */
          custom_emoji: {
            /** The ID of the custom emoji. */
            id: string
            /** The name of the custom emoji. */
            name?: string
            /** The URL of the custom emoji. */
            url?: string
          }
        }
      } | {
        /** Always `equation` */
        type?: "equation"
        /** Notion supports inline LaTeX equations as rich text objects with a type value of `equation`. */
        equation: {
          /** A KaTeX compatible string. */
          expression: string
        }
      })>
      /** The content of the comment as a Markdown string. Provide exactly one of markdown or rich_text. For exact syntax, read the MCP resource `notion://docs/notion-flavored-markdown-spec` through your MCP client's resource-reading interface, or call the Notion "fetch" tool with this URI if your client does not support reading MCP resources. Do NOT pass this URI to any other URL-fetching tool. Use only the Rich text types and Mentions syntax that comments support. Comments support inline formatting (bold, italic, strikethrough, underline, code, links), inline math using $Equation$, user, page, and database mentions such as <mention url="user://..." />, and date mentions such as <date start="YYYY-MM-DD" />. To attach a file created by create-file-upload or create-attachment, include its returned suggested_markdown on a separate line; up to three file attachments are supported. Do not use UI shortcuts like @today, @name, [[page]], or autocomplete-style emoji syntax; those are editor affordances, not markdown syntax. Mention tags must include a real url where required by the spec. Other block-level Markdown such as fenced code blocks, headings, lists, tables, and blockquotes is stored as plain comment text rather than rendered as blocks. Example: <example>Looks good.</example>. */
      markdown?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Creates a new Notion database using SQL DDL syntax, or a canonical typed database for tasks, projects, or skills. Provide exactly one of: - schema: a CREATE TABLE statement. If no title property is provided, "Name" is auto-added. - database_type: one of tasks, projects, or skills. The database is created with the canonical required properties and typed metadata used by Notion. For schema, use CREATE TABLE with double-quoted column names and single-quoted type options. If no title property is provided, "Name" is auto-added. Property type syntax: - Simple: TITLE, RICH_TEXT, DATE, PEOPLE, CHECKBOX, URL, EMAIL, PHONE_NUMBER, FILES - SELECT('opt':color, ...) / MULTI_SELECT('opt':color, ...) - STATUS('Backlog':gray:to_do, 'Building':blue:in_progress, 'Shipped':green:complete); groups are to_do, in_progress, complete - NUMBER [FORMAT 'dollar'] / FORMULA('expression') - RELATION('ds') for a one-way relation - RELATION('ds', DUAL) for a two-way relation - RELATION('ds', DUAL 'Children') with a synced property name - RELATION('ds', DUAL 'Children' 'children') with a synced name and synced_id (for self-relations) - ROLLUP('rel_prop', 'target_prop', 'function') - UNIQUE_ID [PREFIX 'X'] / CREATED_TIME / LAST_EDITED_TIME - Any column: COMMENT 'description text' Colors: default, gray, brown, orange, yellow, green, blue, purple, pink, red. Returns Markdown with schema, SQLite definition, and data source ID in <data-source> tag for use with update_data_source and query_data_sources tools. */
    "mcp__claude_ai_Notion__notion-create-database": {
      /** The parent under which to create the new database. If omitted, the database will be created as a private page at the workspace level. */
      parent?: {
        /** The ID of the parent page, with or without dashes. */
        page_id: string
        /** Always `page_id` */
        type?: "page_id"
      }
      /** The title of the new database. */
      title?: string
      /** The description of the new database. */
      description?: string
      /** SQL DDL CREATE TABLE statement defining the database schema. Cannot be combined with database_type. Column names must be double-quoted and type options use single quotes. Property type syntax: - Simple: TITLE, RICH_TEXT, DATE, PEOPLE, CHECKBOX, URL, EMAIL, PHONE_NUMBER, FILES - SELECT('opt':color, ...) / MULTI_SELECT('opt':color, ...) - STATUS('Backlog':gray:to_do, 'Building':blue:in_progress, 'Shipped':green:complete); groups are to_do, in_progress, complete - NUMBER [FORMAT 'dollar'] / FORMULA('expression') - RELATION('ds') for a one-way relation - RELATION('ds', DUAL) for a two-way relation - RELATION('ds', DUAL 'Children') with a synced property name - RELATION('ds', DUAL 'Children' 'children') with a synced name and synced_id (for self-relations) - ROLLUP('rel_prop', 'target_prop', 'function') - UNIQUE_ID [PREFIX 'X'] / CREATED_TIME / LAST_EDITED_TIME - Any column: COMMENT 'description text' Colors: default, gray, brown, orange, yellow, green, blue, purple, pink, red. Examples: - Minimal: <example>CREATE TABLE ("Name" TITLE)</example> - With options: <example>CREATE TABLE ("Name" TITLE, "Budget" NUMBER FORMAT 'dollar', "Tags" MULTI_SELECT('eng':blue, 'design':pink), "Task ID" UNIQUE_ID PREFIX 'PRJ')</example> - Self-relations are a two-step flow: create the database, then use its data source ID with update_data_source to add paired properties such as RELATION('ds', DUAL 'Children' 'children'). */
      schema?: string
      /** Create a canonical typed database with Notion's required properties and metadata. Supported types: tasks, projects, skills. Example: <example>tasks</example>. Use title "Tasks" when needed. */
      database_type?: "tasks" | "projects" | "skills"
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Create a short-lived URL for uploading one local file directly to Notion. After calling this tool, send exactly one multipart/form-data POST request to `upload_url`. Put the file in the `file` form field and include every header returned in `upload_headers`. Files are limited to 20 MiB for this single-part upload flow, and workspace file-size limits still apply. The upload response includes `markdown_source` and `suggested_markdown`, which can be passed directly to create-pages or update-page, or included on a separate line in create-comment markdown to attach the file. The URL is short-lived, can upload only the FileUpload created by this call, and runs as this same integration. <examples> 1. Prepare an image upload: {"filename":"diagram.png"} 2. Prepare a PDF upload with an explicit MIME type: {"filename":"report.pdf","content_type":"application/pdf"} </examples> */
    "mcp__claude_ai_Notion__notion-create-file-upload": {
      /** The filename to create in Notion, including a supported extension such as .pdf, .png, or .zip. */
      filename: string
      /** Optional MIME type, such as application/pdf or image/png. Prefer omitting it so the type is inferred from the filename: a type that disagrees with the extension is stored as given, and the file then renders as the wrong kind. */
      content_type?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Creates an empty Notion Folder. Set parent.page_id for a top-level Folder owned by a page, or parent.folder_id to create a nested Folder inside another Folder. A page-owned Folder is not inserted into the page's content. A nested Folder is appended to its parent Folder's content. The Folder inherits access from its parent. This tool creates only the empty Folder. It is non-idempotent and creates a new Folder on every successful call. */
    "mcp__claude_ai_Notion__notion-create-folder": {
      /** Where to create the Folder. */
      parent: {
        /** The ID of the page that will own the Folder. */
        page_id: string
      } | {
        /** The ID of the Folder that will contain the new Folder. */
        folder_id: string
      }
      /** The title of the new Folder. */
      title: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Creates one or more Notion pages with the specified properties and content. ## Core rules **IMPORTANT**: Before writing page content, read the MCP resource `notion://docs/notion-flavored-markdown-spec` through your MCP client's resource-reading interface, or call the Notion "fetch" tool with this URI if your client does not support reading MCP resources. Do NOT pass this URI to any other URL-fetching tool. Do NOT guess or hallucinate Markdown syntax. Do not put the page title at the top of content; set it in properties. By default, use native Notion mentions for references you add to existing Notion pages, databases, data sources, people, and dates. Use Markdown links only for external URLs or when the user requests a plain link. For a person, use a user mention with their user URL, found with search using query_type "user"; do not write "@Name" as plain text. For a specific date or time, such as a due date or meeting time, use a date mention. The Markdown specification gives the mention syntax. Use a named destination as parent. Otherwise use "creation_mode": "draft" for a durable private page. Do not combine draft mode with parent, or move or share it without direction. For a meeting note, use create_meeting_note if available, even in a Meetings database, unless the user wants a regular page. For a database destination, ALWAYS fetch first. Use its collection:// URL as data_source_id, exact property names, and title property. Never put a database ID in page_id. Outside a database, the only allowed property is the required "title". For reusable instructions, set "is_skill": true. Before creating a skill, read the MCP resource `notion://docs/skills` through your MCP client's resource-reading interface. If your client does not support reading MCP resources, call the Notion "fetch" tool with this URI instead. Do NOT pass this URI to any other URL-fetching tool. Do not mark ordinary pages or drafts as skills. Report any "warnings" in the result to the user. */
    "mcp__claude_ai_Notion__notion-create-pages": {
      /** The pages to create. */
      pages: Array<{
        /** The properties of the new page, which is a JSON map of property names to SQLite values. For pages in a database, use the SQLite schema definition shown in <database>. For pages outside of a database, the only allowed property is "title", which is the title of the page and is automatically shown at the top of the page as a large heading. **IMPORTANT**: Some property types require specific formats: - Date properties: Split into "date:{property}:start", "date:{property}:end" (optional), and "date:{property}:is_datetime" (0 or 1) - Place properties: Split into "place:{property}:name", "place:{property}:address", "place:{property}:latitude", "place:{property}:longitude", and "place:{property}:google_place_id" (optional) - Number properties: Use JavaScript numbers (not strings) - Checkbox properties: Use "__YES__" for checked, "__NO__" for unchecked - Relation properties: Use an array of related page URLs or page IDs, e.g. ["https://www.notion.so/26ab1f9f4c5f80b18d3bd10a6b1d2f4e", "26ab1f9f-4c5f-80b1-8d3b-d10a6b1d2f4e"] - Person properties: Use an array of user IDs, user or agent URLs, or group references copied from fetch output ("space_permission_group-<UUID>"). Bare group UUIDs are also supported. - Files properties: Use a JSON array of file IDs, Notion Folder URLs, and/or <folder> tags copied from fetch output. Folders are stored as native Folder references, not ordinary links. **Special property naming**: Properties named "id" or "url" (case insensitive) must be prefixed with "userDefined:" (e.g., "userDefined:URL", "userDefined:id") */
        properties?: {}
        /** The content of the new page, using Notion Markdown. For people and dates, use user and date mentions rather than plain text; notion://docs/notion-flavored-markdown-spec gives the syntax. */
        content?: string
        /** The ID of a template to apply to this page. When specified, do not provide 'content' as the template will provide it. Properties can still be set alongside the template. Get template IDs from the <templates> section in the fetch tool results. Template application is asynchronous: the page starts blank and content appears shortly after. */
        template_id?: string
        /** An emoji character (e.g. "🚀"), a custom emoji by name (e.g. ":rocket_ship:"), a Notion icon identifier as returned by fetch (e.g. "icons/pizza_blue"), or an external image URL. Use "none" to explicitly set no icon. Omit to leave unchanged. Keep the title free of a duplicate leading emoji because the icon renders separately. */
        icon?: string
        /** An external image URL for the page cover. Use "none" to explicitly set no cover. Omit to leave unchanged. */
        cover?: string
        /** Set to true only when the user asks for reusable instructions or a repeatable workflow. Do not mark ordinary reference pages, one-time documents, or drafts as skills. Before creating a skill, read the MCP resource `notion://docs/skills` through your MCP client's resource-reading interface. If your client does not support reading MCP resources, call the Notion "fetch" tool with this URI instead. Do NOT pass this URI to any other URL-fetching tool. False has the same effect as omitting the field. */
        is_skill?: boolean
        /** Preserve internal Markdown links instead of converting them to native mentions. */
        preserve_internal_links?: boolean
      }>
      /** If the user explicitly names a private or shared destination, omit "creation_mode" and use that parent. Otherwise, use "draft" when the user clearly wants a durable page but has not named a destination. Prefer this explicit draft mode over omitting the parent. Draft mode is server-enforced: it creates a private workspace-level page and cannot be combined with "parent". Create it without first asking where it should live. After creation, tell the user it is private and offer to move it once they name a destination. */
      creation_mode?: "draft"
      /** All pages in one call share this parent. Pass "memory" to save a personal memory; see notion://docs/memory. Otherwise use a page (page_id), database page (database_id), data source (data_source_id), or teamspace root (teamspace_id, from get_teams). Teamspace roots require a user-backed connection and permission to add top-level pages. A database_id cannot be used when the database has more than one data source; fetch it and use the right collection:// URL as data_source_id. If omitted, pages are private at the workspace level. When no destination is named, prefer explicit "creation_mode": "draft" over omitting the parent. */
      parent?: "memory" | {
        /** The ID of the parent page (with or without dashes), for example, 195de9221179449fab8075a27c979105 */
        page_id: string
        /** Always `page_id` */
        type?: "page_id"
      } | {
        /** The ID of the parent database (with or without dashes), for example, 195de9221179449fab8075a27c979105 */
        database_id: string
        /** Always `database_id` */
        type?: "database_id"
      } | {
        /** The ID of the parent data source (collection), with or without dashes. For example, f336d0bc-b841-465b-8045-024475c079dd */
        data_source_id: string
        /** Always `data_source_id` */
        type?: "data_source_id"
      } | {
        /** The ID of the teamspace in which to create top-level pages (with or without dashes). */
        teamspace_id: string
      }
      /** Default to true for page creation. Set to false only when the next step needs the created pages immediately, or when async execution rejects the request as too large. When this create operation is accepted for background execution, it returns an async_task result. Use get_async_task to wait for a succeeded status before taking a dependent action on the pages. For pages created with template_id, a succeeded status does not mean template content is ready; fetch and retry until it is ready before changing or relying on that content. If omitted or false, the tool keeps the existing synchronous result shape. */
      allow_async?: boolean
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Propose one precise, reviewable change without changing accepted page content. Copy old_text exactly from fetch, use one suggestion per localized change, and use get_suggested_edit to inspect it before any later resolution. If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. */
    "mcp__claude_ai_Notion__notion-create-suggested-edit": {
      /** Page UUID or URL containing the target text. */
      page_id: string
      /** Unique, non-empty exact text copied from the accepted Notion Markdown returned by fetch. */
      old_text: string
      /** Proposed Notion Markdown. With replace, it replaces old_text; use an empty string to suggest deletion. With insert_before or insert_after, it is only the text to insert and old_text remains unchanged. */
      new_text: string
      /** How to apply new_text relative to old_text. Defaults to replace. */
      mode?: "replace" | "insert_before" | "insert_after"
      /** Exact page title or database title/text property name. Omit for page body text. */
      property_name?: string
      /** Optional inline Markdown comment that starts the suggestion thread. */
      comment?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Create a new view on a Notion database. Use fetch first to get database_id, parent_page_id, and the collection:// data_source_id. The caller needs edit access to the database or parent page and access to the data source. Provide exactly one placement: database_id adds a view tab to that database; parent_page_id appends an inline linked database view to that page. Always provide data_source_id. Supported types: table, board, list, calendar, timeline, gallery, form, chart, map, and dashboard. The optional configure field uses the view DSL for filters, sorts, grouping, and display. Read notion://docs/view-dsl-spec through the MCP resource interface, or pass that URI to the Notion fetch tool. Do not guess the syntax. */
    "mcp__claude_ai_Notion__notion-create-view": {
      /** The data source (collection) ID. Accepts a collection:// URI from <data-source> tags or a bare UUID. */
      data_source_id: string
      /** The name of the view. */
      name: string
      /** The type of view to create. */
      type: "table" | "board" | "list" | "calendar" | "timeline" | "gallery" | "form" | "chart" | "map" | "dashboard"
      /** The database to add a view tab to. Accepts a Notion URL or a bare UUID. Mutually exclusive with `parent_page_id`; exactly one must be provided. */
      database_id?: string
      /** A page to create an inline linked database view on, like the UI /linked command. Accepts a Notion URL or a bare UUID. The new linked view block is appended at the end of the page and references `data_source_id`. Mutually exclusive with `database_id`; exactly one must be provided. */
      parent_page_id?: string
      /** Whether the new linked view block shows its data source title above the view, like the Show data source title toggle in the Notion app. Defaults to true. Only valid with `parent_page_id`. */
      show_data_source_title?: boolean
      /** View configuration DSL directives and examples: - FILTER "Property" = "value" — filter rows. Relation values must be a page URL or UUID; person values must be a user URI (user://<user_id>), user UUID, or "me". Names are not supported for either. - QUICK FILTER "Property" — add a quick filter to the view's filter bar with no criteria; add a condition to preselect one (QUICK FILTER "Status" = "Done") - SORT BY "Property" ASC — sort rows - GROUP BY "Property" [BY OPTION | BY GROUP] [SHOW EMPTY | HIDE EMPTY] — group by property (required for board views) - SUB GROUP BY "Property" [BY OPTION | BY GROUP] [SHOW EMPTY | HIDE EMPTY] — add board sub-grouping BY OPTION and BY GROUP apply only to status properties and rollups that return status values (Show original or Show unique). For select and multi_select properties, omit both modifiers, even if the property is named "Status" (for example, GROUP BY "Status"). - CARD LAYOUT default | compact — set board or gallery card layout - CALENDAR BY "Property" — date property (required for calendar views) - TIMELINE BY "Start" TO "End" — date range (required for timeline views) - MAP BY "Property" — location property (required for map views) - CHART column|bar|line|donut|number — chart type with optional AGGREGATE, COLOR, HEIGHT, SORT, STACK BY, CAPTION - FORM CLOSE|OPEN — close/open form submissions - FORM ANONYMOUS true|false — toggle anonymous submissions - FORM PERMISSIONS none|reader|editor — set submission permissions - SHOW "Prop1", "Prop2" — set visible properties - COVER "Property" — cover image property <example>SHOW "Name", "Status", "Due Date"</example> <example>GROUP BY "Status" BY GROUP SHOW EMPTY; SUB GROUP BY "Priority"; CARD LAYOUT compact</example> <example>FILTER "Status" = "In Progress"; SORT BY "Due Date" ASC</example> <example>CALENDAR BY "Due Date"</example> <example>TIMELINE BY "Start" TO "End"</example> <example>FILTER "Company" = "Acme"</example> */
      configure?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Delete a comment you wrote. Get the comment ID from get_comments or create_comment. If it is the last comment in its discussion, the discussion is removed too. Use this only when the user asks to delete a comment; to fix a comment, use update_comment instead. You can only delete your own comments. */
    "mcp__claude_ai_Notion__notion-delete-comment": {
      /** The comment ID, with or without dashes. Use the id of a <comment> from get_comments, or the id returned by create_comment. */
      comment_id: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Move Notion databases to Trash. They can be restored with the restore_pages tool or from Trash in Notion. Each database goes to Trash with all of its rows. Pass a full-page or inline database that owns its data, not a linked view. To move a page or database row to Trash, use delete_pages. Use this tool only when the user explicitly asks to delete specific databases. Never use it on your own initiative to clean up, deduplicate, or reorganize content. Without user_confirmed: true, nothing is trashed and the error lists what would be moved to Trash; show that list to the user and retry only after they confirm. */
    "mcp__claude_ai_Notion__notion-delete-databases": {
      /** IDs of the databases to move to Trash, 1 to 20. Each must be a full-page or inline database that owns its data, not a linked view. Duplicate IDs are processed once. */
      database_ids: string[]
      /** Set to true only after the user explicitly asked to delete these exact databases, or confirmed after you showed them the list. If omitted or false, nothing is trashed and the error lists what would be moved to Trash so you can confirm with the user. */
      user_confirmed?: boolean
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Move Notion pages to Trash. They can be restored with the restore_pages tool or from Trash in Notion. Database rows are pages. To move a database to Trash, use delete_databases. To remove content inside a page, use update_page instead. Use this tool only when the user explicitly asks to delete specific pages. Never use it on your own initiative to clean up, deduplicate, or reorganize content. Without user_confirmed: true, nothing is trashed and the error lists what would be moved to Trash; show that list to the user and retry only after they confirm. */
    "mcp__claude_ai_Notion__notion-delete-pages": {
      /** IDs of the pages to move to Trash, 1 to 20. Database rows are pages. Duplicate IDs are processed once. */
      page_ids: string[]
      /** Set to true only after the user explicitly asked to delete these exact pages, or confirmed after you showed them the list. If omitted or false, nothing is trashed and the error lists what would be moved to Trash so you can confirm with the user. */
      user_confirmed?: boolean
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Download the contents of a small UTF-8 text attachment created by the Notion MCP `create-attachment` tool. Pass the `file_upload_id` returned by `create-attachment`. The attachment must belong to the requesting integration, have completed uploading, and use a supported text format such as HTML, Markdown, plain text, CSV, JSON, XML, CSS, YAML, TSV, calendar, GPX, or SVG. The response contains the complete text in `content` so you can save it locally, edit it, and call `create-attachment` again to upload a new version. Downloads are limited to 200 KiB. This tool does not fetch arbitrary URLs or return binary files. For larger or binary attachments, use the signed file URL returned when reading the containing Notion page. <examples> 1. Download a text attachment: {"file_upload_id":"12345678-90ab-cdef-1234-567890abcdef"} </examples> If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. */
    "mcp__claude_ai_Notion__notion-download-attachment": {
      /** The FileUpload ID returned by the create-attachment tool. */
      file_upload_id: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Download a spec-compliant Notion Skill as a complete tar.gz archive containing SKILL.md and its supporting files and nested folders. Pass the skill page ID. Returns a temporary signed url. Download and extract the archive to read or use the skill. If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. */
    "mcp__claude_ai_Notion__notion-download-skill": {
      /** Identifier for a Notion skill page. */
      id: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Duplicate a Notion page. The page must be within the current workspace, and you must have permission to access it. The duplication completes asynchronously, so do not rely on the new page identified by the returned ID or URL to be populated immediately. Let the user know that the duplication is in progress and that they can check back later using the 'fetch' tool or by clicking the returned URL and viewing it in the Notion app. */
    "mcp__claude_ai_Notion__notion-duplicate-page": {
      /** The page ID, with or without dashes, or a Notion page URL. */
      page_id: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Retrieves details about a Notion entity (page, database, data source, or saved database view) by URL or ID. Provide a URL or ID in `id`. Make multiple calls for multiple entities. For pages, use path, verification, edit time, and truncation metadata to assess the source. Treat recency as context, not proof. Report material uncertainty when sources conflict. Pages use Notion-flavored Markdown. For the complete specification, read the MCP resource `notion://docs/notion-flavored-markdown-spec` through your MCP client's resource-reading interface, or call the Notion "fetch" tool with this URI if your client does not support reading MCP resources. Do NOT pass this URI to any other URL-fetching tool. Pass a `notion://docs/*` URI as `id` to read that MCP documentation resource. Databases return data sources in `<data-source url="collection://...">` tags. Fetch the collection:// URL for its schema and use it with update_data_source or query_data_sources. Multi-source databases return more than one data source. Saved views return filters, sorts, and display settings. To query their rows, use query_data_sources with `mode: "view"`. A null cover or icon means none; an omitted one means unavailable, not absent. Keep a page's Markdown icon attribute for edit round trips. File URLs expire; re-fetch to refresh them. Uploaded media blocks use stable `notion-file-block://` sources; keep them when editing or copying Markdown. Get download URLs with get_file_download_urls, or set `include_file_urls` to true for a `references` map. Before relying on page content, check `truncated`, `unknown_block_count`, and `unknown_block_ids` for omitted subtrees. Set `include_discussions` to true for discussion counts, markers, previews, and `discussion://` URLs that correlate with get_comments. Use get_tool_access to check tool availability, parameter restrictions, and upgrade links for this connection. */
    "mcp__claude_ai_Notion__notion-fetch": {
      /** The ID or URL of the Notion page, database, or data source to fetch. Supports notion.so URLs, Notion Sites URLs (*.notion.site), raw UUIDs, and data source URLs (collection://...). Pass "memory" to fetch the connected user's About page and memory database in this workspace without creating them. Pass a notion://docs/* URI to read that documentation resource. Also accepts an explicit saved view URL (view://...) from a database response. If a database block ID returns a validation error, use the collection:// URL from that error. Example: <example>notion://docs/notion-flavored-markdown-spec</example>. */
      id: string
      /** Whether to include meeting note transcripts. Defaults to false. When true, full transcripts are included; when false, a placeholder with the meeting note URL is shown instead. */
      include_transcript?: boolean
      /** Whether to include discussion/comment indicators in the page output. When true, adds a <page-discussions> summary with discussion count, preview snippets, and discussion:// URLs. Use with the get_comments tool to retrieve full discussion content. Defaults to false. */
      include_discussions?: boolean
      /** Whether to return signed download URLs for uploaded files. Defaults to false. When false, page Markdown cites uploaded files by stable notion-file-block:// references and the response has no references map; call get_file_download_urls with the references when you need those files' contents. When true, the response's references map gives the signed URL for each reference. */
      include_file_urls?: boolean
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Retrieves the current status of an async task that was started by another tool (for example, "create_pages" called with "allow_async": true). The status is one of "queued", "running", "retrying", "succeeded", or "failed". When the task has succeeded, the operation's result is included; when it has failed, an error is included instead. Poll this tool with the "task_id" from the original tool's "async_task" response. Wait briefly between polls — the original response includes a suggested backoff. <examples> 1. Check a task's status: {"task_id": "task_abc123"} </examples> */
    "mcp__claude_ai_Notion__notion-get-async-task": {
      /** The ID of the async task to retrieve, as returned in the async_task response of the tool that started it. */
      task_id: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Get comments and discussions from a Notion page. Returns discussions with full comment content in XML format. By default, returns page-level discussions only. On supported Business connections, pending suggested edits use `kind="suggested_edit"` and their `discussion://` URL can be passed to `get_suggested_edit`. Resolved suggestions stay retired. Check `suggested_edits_status` to distinguish an empty result from unavailable suggestion discovery. Comments you wrote have `by-you="true"`. Tip: Use the `fetch` tool with `include_discussions: true` first to see where discussions are anchored in the page content, then use this tool to retrieve full discussion threads. The `discussion://` URLs in the fetch output match the discussion IDs returned here. Parameters: - `include_all_blocks`: Include discussions on child blocks (default: false) - `include_resolved`: Include resolved discussions (default: false) - `discussion_id`: Fetch a specific discussion by ID or URL <example>{"page_id": "page-uuid"}</example> <example>{"page_id": "page-uuid", "include_all_blocks": true}</example> <example>{"page_id": "page-uuid", "discussion_id": "discussion://pageId/blockId/discussionId"}</example> */
    "mcp__claude_ai_Notion__notion-get-comments": {
      /** The page ID, with or without dashes, or a Notion page URL. */
      page_id: string
      /** Include resolved discussions in the response. Defaults to false. */
      include_resolved?: boolean
      /** Include discussions on child blocks, not just page-level discussions. Defaults to false. */
      include_all_blocks?: boolean
      /** Fetch a specific discussion by ID or discussion URL (e.g., discussion://pageId/blockId/discussionId). */
      discussion_id?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Use this tool to view the Notion skills the user has enabled for you and other external MCP clients, each with a name and a description of when it should be used. If you choose to use one of these skills, mention to the user that you are loading the skill from Notion first, then download them. */
    "mcp__claude_ai_Notion__notion-get-enabled-skills": {
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Get signed download URLs for files that fetch output cites by stable `notion-file-block://` references. Pass up to 25 references exactly as they appear in the page Markdown. Each reference resolves independently: `files` lists the ones that resolved and `unresolved` lists the rest with a reason. The URLs expire after a few minutes; call this tool again for fresh ones. Keep the stable references, not the URLs, when editing or copying page Markdown. <examples> 1. Get download URLs: {"references":["notion-file-block://12345678-90ab-4def-8234-567890abcdef/abcdef12-3456-4890-abcd-ef1234567890?space_id=fedcba98-7654-4321-8fed-cba987654321&name=diagram.png"]} </examples> */
    "mcp__claude_ai_Notion__notion-get-file-download-urls": {
      /** Stable notion-file-block:// file references, copied exactly from the Markdown returned by fetch. Up to 25 per call. */
      references: string[]
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Retrieves permission groups in the current workspace that you can see, with their IDs and names. People properties reference a group as `space_permission_group-<id>`. Use this tool to find the name of a group in a People property value, or to find a group by name before setting it in a People property. Listings are sorted by name and searches return the closest matches first. Results are limited to a maximum of 25 groups. <examples> 1. List groups (up to the limit): {} 2. Search for groups by name: {"query": "engineering"} 3. Look up a group from a People property value: {"query": "space_permission_group-141083e9-5e66-4c8f-8a38-bce5762903c2"} </examples> */
    "mcp__claude_ai_Notion__notion-get-groups": {
      /** Optional group name to search for (case-insensitive), or a group ID from a People property value (`space_permission_group-<id>` or the bare ID) to look up that group. */
      query?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Get the current Notion connection's workspace and authenticated user. Call with {}. Returns the workspace ID and name, and the user's ID, name, type, and email when available. Use this tool to identify the connected account. To check tool availability, use get_tool_access. */
    "mcp__claude_ai_Notion__notion-get-self": {
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Get the latest turn's status for a Custom Agent session without waiting. If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. */
    "mcp__claude_ai_Notion__notion-get-session-status": {
      /** Use the complete session_url returned by session tools, unchanged. Format: session://<spaceId>/<sessionId>. Shorthand session://<sessionId> and thread://<sessionId> use the connected workspace. Fully qualified URLs must refer to that workspace. */
      session_url: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Read the exact before-and-after diff and currently allowed actions for one pending suggested edit. Call this before deciding whether to accept or reject it. If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. */
    "mcp__claude_ai_Notion__notion-get-suggested-edit": {
      /** Pending suggested-edit discussion URL returned by get_comments or create_suggested_edit. */
      suggested_edit_url: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Retrieves a list of teams (teamspaces) in the current workspace. Shows which teams exist, user membership status, IDs, names, and roles. Teams are returned split by membership status and limited to a maximum of 10 results. <examples> 1. List all teams (up to the limit of each type): {} 2. Search for teams by name: {"query": "engineering"} 3. Find a specific team: {"query": "Product Design"} </examples> */
    "mcp__claude_ai_Notion__notion-get-teams": {
      /** Optional search query to filter teams by name (case-insensitive). */
      query?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Get current tool availability, parameter restrictions, and available upgrade links for this Notion connection. Call with {} to get the full access map before using a conditionally available tool, unless current access is already in context. Reuse this map across tools. When current_tool_access.ai_search.status is "available", use ai_search for every content search; otherwise use search. Tool availability and restricted_parameters are independent: omit restricted options even when the tool is available. Optionally pass tool_names, for example ["search", "ai_search"], to narrow the result. Unknown names and tools not exposed to this connection are omitted. When ai_search is available, legacy search is also omitted from this map; user lookup uses ai_search with query_type="user". This tool does not grant access or change the workspace. */
    "mcp__claude_ai_Notion__notion-get-tool-access": {
      /** Optional RunTool names to include, such as search and ai_search. Omit to return all tools visible to this connection. Unknown or unexposed names are omitted. An empty list returns an empty map. */
      tool_names?: string[]
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Retrieves a list of users in the current workspace. Shows workspace members and guests with their IDs, names, emails (if available), and types (person or bot). Supports cursor-based pagination to iterate through all users in the workspace. <examples> 1. List all users (first page): {} 2. Search for users by name or email: {"query": "john"} 3. Get next page of results: {"start_cursor": "abc123"} 4. Set custom page size: {"page_size": 20} 5. Fetch a specific user by ID: {"user_id": "00000000-0000-4000-8000-000000000000"} 6. Fetch the current user: {"user_id": "self"} </examples> */
    "mcp__claude_ai_Notion__notion-get-users": {
      /** Optional search query to filter users by name or email (case-insensitive). */
      query?: string
      /** Cursor for pagination. Use the next_cursor value from the previous response to get the next page. */
      start_cursor?: string
      /** Number of users to return per page (1–100; default 100). */
      page_size?: number
      /** Return only the user matching this ID. Pass "self" to fetch the current user. */
      user_id?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** List what changed in a Notion page or database between two times, who changed it, and whether they used AI, an agent, or an MCP client. Each block, property, row, data source, or view that changed is listed once, with how it looked at the start and at the end of the time range. The range defaults to the last 24 hours. Filter by authors or sources to list only the records those people, agents, or kinds of edits touched; before and after still include everyone's edits, so use a shorter range to isolate one author. To read the whole page at a time, use view_version. Comments are not listed. Changes inside a page's inline databases are not listed either; pass an inline database's url to read them. Requires edit access to the page. */
    "mcp__claude_ai_Notion__notion-get-version-changes": {
      /** The page or database to read: a page URL, database URL, data source (collection://) URL, or ID. */
      page: string
      /** Start of the time range, not included, as an ISO 8601 time with a time zone, such as "2026-10-10T18:05:02Z". Leave it out unless the user names a time; it defaults to 24 hours before end_time. */
      start_time?: string
      /** End of the time range, included, as an ISO 8601 time with a time zone, such as "2026-10-10T18:05:02Z". Must be after start_time. Leave it out unless the user names a time; it defaults to now. */
      end_time?: string
      /** Only return records that these people or agents changed: user:// URLs or agent URLs. Each record's before and after still include everyone's edits in the range, and contributors lists everyone who edited it. */
      authors?: string[]
      /** Only return records changed through these, such as ["notion_ai", "custom_agent", "mcp"] for changes made by AI. Each record's before and after still include every edit in the range, and contributors lists everyone who edited it. */
      sources?: Array<"notion_ai" | "custom_agent" | "mcp" | "database_automation">
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** List the current user's favorite pages and databases in sidebar order. Use this when the user refers to a favorite or pinned workspace item. Follow cursor pagination when the complete list is needed. */
    "mcp__claude_ai_Notion__notion-list-favorite-pages": {
      /** Maximum results to return (1-200). */
      limit?: number
      /** Opaque pagination cursor from the previous response. */
      cursor?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** List the pages that link to or mention a Notion page (backlinks), in the same workspace. Returns IDs, titles and URLs only; fetch a result to read it. Only pages you can open are listed. Follow next_cursor for more. */
    "mcp__claude_ai_Notion__notion-list-page-backlinks": {
      /** ID or URL of the page or database to find backlinks for. */
      page_id: string
      /** Only return these kinds of backlinks. page_mention is an inline @-mention in text, a title, or a caption; link_to_page is a link-to-page block; property_mention is a mention in a database property; comment_mention is a mention in a comment. Omit for all kinds. */
      types?: Array<"page_mention" | "link_to_page" | "property_mention" | "comment_mention">
      /** Maximum backlinks to return (1-100; default 25). */
      page_size?: number
      /** next_cursor from the previous call. */
      cursor?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** List the current user's top-level pages and databases in their Private sidebar section. Use this to browse private workspace structure. For content searches, including keywords and titles, use ai_search when get_tool_access reports it is available; otherwise use search. Follow cursor pagination when the complete list is needed. */
    "mcp__claude_ai_Notion__notion-list-private-pages": {
      /** Maximum results to return (1-200). */
      limit?: number
      /** Opaque pagination cursor from the previous response. */
      cursor?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** List pages and databases the current user recently viewed, ranked by recency and visit frequency. Use this to recover likely navigation context when the user refers to something they were recently working on. This reflects views, not edits; to find pages the user edited, use search with filters.edited_by_user_ids: ["me"] and sort: "last_edited". Follow cursor pagination when the complete list is needed. */
    "mcp__claude_ai_Notion__notion-list-recent-pages": {
      /** Maximum results to return (1-200). */
      limit?: number
      /** Opaque pagination cursor from the previous response. */
      cursor?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** List short summaries of saved events in a Custom Agent session. If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. */
    "mcp__claude_ai_Notion__notion-list-session-events": {
      /** Use the complete session_url returned by session tools, unchanged. Format: session://<spaceId>/<sessionId>. Shorthand session://<sessionId> and thread://<sessionId> use the connected workspace. Fully qualified URLs must refer to that workspace. */
      session_url: string
      /** Maximum number of committed events to return. */
      count: number
      /** Load the previous page of events ending before this sequence number. */
      before_sequence?: number
      /** Load the next page of events starting after this sequence number. */
      after_sequence?: number
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** List pages and databases in the current user's Shared sidebar section. Use this to browse content shared directly with the user. For content searches, including keywords and titles, use ai_search when get_tool_access reports it is available; otherwise use search. Follow cursor pagination when the complete list is needed. */
    "mcp__claude_ai_Notion__notion-list-shared-pages": {
      /** Maximum results to return (1-200). */
      limit?: number
      /** Opaque pagination cursor from the previous response. */
      cursor?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Search memories that the user's connected agents saved in earlier sessions: context, preferences, corrections, and decisions. Returns the best matches, not every memory. To list, count, or filter memories, fetch id "memory" and run query-data-sources on its data source. The first time you use memory in a conversation, whether searching or saving, read notion://docs/memory once. */
    "mcp__claude_ai_Notion__notion-memory-search": {
      /** Words or a short phrase to find in personal memories. */
      query: string
      /** Maximum number of memories to return. Defaults to 10 and cannot exceed 50. */
      limit?: number
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Move one or more Notion pages or databases to a new parent. */
    "mcp__claude_ai_Notion__notion-move-pages": {
      /** An array of up to 100 page or database IDs to move. IDs are v4 UUIDs and can be supplied with or without dashes (e.g. extracted from a <page> or <database> URL given by the "search" or "fetch" tool). Data Sources under Databases can't be moved individually. */
      page_or_database_ids: string[]
      /** The new parent under which the pages will be moved. This can be a page, the workspace, a database, or a specific data source under a database when there are multiple. Moving pages to the workspace level adds them as private pages and should rarely be used. */
      new_parent: {
        /** The ID of the parent page (with or without dashes), for example, 195de9221179449fab8075a27c979105 */
        page_id: string
        /** Always `page_id` */
        type?: "page_id"
      } | {
        /** The ID of the parent database (with or without dashes), for example, 195de9221179449fab8075a27c979105 */
        database_id: string
        /** Always `database_id` */
        type?: "database_id"
      } | {
        /** The ID of the parent data source (collection), with or without dashes. For example, f336d0bc-b841-465b-8045-024475c079dd */
        data_source_id: string
        /** Always `data_source_id` */
        type?: "data_source_id"
      } | {
        /** The parent type. */
        type: "workspace"
      }
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Query data source rows, SQL, or a saved view. Use the required top-level `data` object. Do not pass query parameters at the top level. If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. First fetch every data source's schema and collection:// URL. Missing-column recovery: try a schema-backed error suggestion or refetch. If correction fails, next call MUST be fetch, NOT SQL, even with new hints. Rebuild from current `<sqlite-table>`; never guess names/IDs. Modes (default: sql): - rows preserves mentions, links, formatting, dates, and equations. Use before rich-text repairs/rewrites. - sql runs read-only SQLite. No `VALUES`; inline rows: `WITH "ids"("x") AS (SELECT 'a' UNION ALL SELECT 'b')`. Use only table/column names in fetched `<sqlite-table>`, never property IDs. Schema keys name properties; schema/view listings (e.g. `displayProperties`) may be unqueryable. Formula/rollup columns must be listed; otherwise use rows/fetch. System `url`/`createdTime` are columns; other metadata must be listed. Never guess `Name`, `Title`, `page_id`, `rowid`, `lastEditedTime`. User `url`/`id` use `userDefined:` columns (e.g. `"userDefined:url"`). Date properties expand to `date:<Name>:start`, `:end`, `:is_datetime`; `created_time` keeps its base name. Bind untrusted values with `?` and `params`. Include needed filters; view filters don't apply. SQL may omit mentions/formatting and link destinations. This is not proof of corrupt properties. - view runs saved filters/sorts. is_archived defaults false (active); true selects archived rows. If has_more, pass next_cursor as start_cursor with the same is_archived. View mode has no tool-specific plan quota. SQL is unlimited on Business and Enterprise with Notion AI. Other plans have a shared workspace limit for single-data-source SQL and cannot query multiple data sources at once. */
    "mcp__claude_ai_Notion__notion-query-data-sources": {
      /** Mode parameter reference and examples. Put `mode`, `query`, `data_source_urls`, `data_source_url`, `params`, `limit`, filters (`filter`), sorts (`sort`), and view arguments (`view_url`, `start_cursor`, `page_size`, `is_archived`) inside `data`, never at the tool-argument root. All examples below are complete tool arguments with exactly one outer `data` wrapper. Pass them as shown; do not add another wrapper. SQL mode: - Use single quotes for SQL string values, such as `"Status" = 'Done'`. Use double quotes for table and column names. In SQL, `''` is an empty string. - Prefer `?` placeholders for values. For text values, the `params` array uses JSON strings, so `[""]` passes an empty string and `["__YES__"]` passes a checked checkbox value. Do not add SQL quote marks around a bound value. - Checkbox SQL values: `'__YES__'` means checked; `'__NO__'` means unchecked. Rows mode: Return up to 100 rows with faithful rich-text property values and optional structured filters and sorts. Example: <example>{"data":{"mode":"rows","data_source_url":"collection://f336d0bc-b841-465b-8045-024475c079dd","filter":{"type":"group","operator":"and","filters":[{"type":"property","property":"Status","propertyType":"select","operator":"enum_is","value":{"type":"exact","value":"In Progress"}}]},"limit":20}}</example> Examples: - Simple SQL: <example>{"data":{"data_source_urls":["collection://f336d0bc-b841-465b-8045-024475c079dd"],"query":"SELECT * FROM [collection://f336d0bc-b841-465b-8045-024475c079dd] LIMIT 10"}}</example> - SQL parameters: <example>{"data":{"mode":"sql","data_source_urls":["collection://f336d0bc-b841-465b-8045-024475c079dd"],"query":"SELECT * FROM [collection://f336d0bc-b841-465b-8045-024475c079dd] WHERE Status = ? AND Priority = ?","params":["In Progress","High"]}}</example> - Checkbox query: <example>{"data":{"data_source_urls":["collection://f336d0bc-b841-465b-8045-024475c079dd"],"query":"SELECT * FROM [collection://f336d0bc-b841-465b-8045-024475c079dd] WHERE Completed = ?","params":["__YES__"]}}</example> View mode: Execute a specific database view's query with its filters and sorts. Omit "is_archived" or set it to false for non-archived rows. Set "is_archived": true to apply the view inside the archived partition. When the response has "has_more": true, pass its "next_cursor" as "start_cursor" in a follow-up view-mode request with the same "is_archived" value. Example: <example>{"data":{"mode":"view","view_url":"https://www.notion.so/f336d0bcb841465b8045024475c079dd?v=0123456789abcdef0123456789abcdef","is_archived":false}}</example> */
      data: {
        /** Notion data source URLs whose SQLite tables are available to the query; each data source is exposed as a table named by its URL. Obtain them from the fetch tool, in the format: collection://f336d0bc-b841-465b-8045-024475c079dd */
        data_source_urls: string[]
        /** Read-only SQLite query to execute against the data sources. Use a data source URL as the table name, e.g. SELECT * FROM "collection://..." WHERE .... Use only table and column names shown in the fetched `<sqlite-table>` definition; date properties use the expanded column names listed there, not the base name. Example: if the fetched schema has a date property `Due`, use `"date:Due:start"`, not `"Due"`. Properties of type `created_time` or `last_edited_time` keep their exact fetched base columns (e.g. `"Created"` only if listed). A formula or another property with a date-looking name or result does not automatically have `date:` columns or become queryable. Copy actual fetched columns, not property labels. Include every needed filter in WHERE (filters on views of the data source are not automatically applied). For time comparisons or ordering, normalize text timestamps with datetime(...) or date(...). SQL text values can omit rich-text mentions and formatting, and links can lose their destination. Use faithful rows mode or fetch the page before rewriting a rich-text property. */
        query: string
        /** Optional mode parameter. Defaults to 'sql' if not specified. SQL mode does not accept is_archived; that parameter belongs only to view mode. */
        mode?: "sql"
        /** Positional parameters bound to `?` placeholders in the query. Prefer parameterized queries over string interpolation. Use "__YES__" for checked checkboxes and "__NO__" for unchecked checkboxes. */
        params?: Array<string | number | boolean | null>
      } | {
        /** Mode for executing a database view's existing query */
        mode: "view"
        /** URL of a specific database view to query. Example: https://www.notion.so/workspace/db-id?v=view-id */
        view_url: string
        /** Cursor for pagination. Use the next_cursor value from the previous response to get the next page. */
        start_cursor?: string
        /** Number of rows to return per page (default: 100, max: 100). */
        page_size?: number
        /** Optional archive selector. Omitted or false queries non-archived rows only; true queries archived rows only. */
        is_archived?: boolean
      } | {
        /** Return data source rows with rich-text mentions, links, formatting, dates, and equations preserved. */
        mode: "rows"
        /** One Notion data source URL obtained from a fetch result. */
        data_source_url: string
        /** Structured filter using exact property names from the data source schema. Supports an outer Boolean group plus one nested group level. */
        filter?: {
          /** Selects the filter or filter-value variant. */
          type: "group"
          /** Comparison or Boolean operation applied by this filter. */
          operator: "and" | "or"
          /** Child filters combined by the Boolean group operator. */
          filters: Array<unknown /* $ref #/$defs/workflowPropertyFilter */ | {
            /** Selects the filter or filter-value variant. */
            type: "group"
            /** Comparison or Boolean operation applied by this filter. */
            operator: "and" | "or"
            /** Child filters combined by the Boolean group operator. */
            filters: Array<unknown /* $ref #/$defs/workflowPropertyFilter */>
          }>
        }
        /** Structured property sorts applied in order. */
        sort?: Array<{
          /** Exact data source property name to sort. */
          property: string
          /** One of: `ascending`, `descending` */
          direction: "ascending" | "descending"
        }>
        /** Number of rows to return (default: 50, max: 100). */
        limit?: number
      }
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Query the current user's meeting notes data source. Use search first to resolve people IDs for attendee filters. By default, results already include meetings where the current user is an attendee or creator; do not add a current-user filter. Treat words such as summaries, notes, todos, action items, and deliverables as requested meeting output, not title terms. Example: "What are my meeting todos?" needs no title filter for "todos". Add a title filter only when the user clearly names a meeting, such as "standup", "sprint planning", or "1:1 with Alice". Generic date phrases like "recent meetings", "latest meetings", "meetings this week", or "yesterday's meetings" should be interpreted as date range filters — never as title filters. Unless the user asks about a meeting whose title contains another person's name, treat that person as an attendee or creator. Use their name as a title fallback only after attendee filtering returns no results. Title keyword matching is case-insensitive; capitalization does not matter. Matching is lexical, so simplify a filter to one term when it returns no results. The filter parameter contains the complete property, date, Boolean-combination, and example reference. If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. */
    "mcp__claude_ai_Notion__notion-query-meeting-notes": {
      /** Meeting note filter reference. Title keyword searching uses a filter on property "title" (for example, string_contains). Returns up to 50 rows of matching meeting notes. Filterable properties: - "title" (text) — meeting title - "attendees" (person) — meeting attendees - "created_time" (date) — when the meeting note was created - "created_by" (person) — who created the meeting note - "last_edited_time" (date) — when the meeting note was last edited - "last_edited_by" (person) — who last edited the meeting note Combinator filters use "filters" (not "operands"): { "operator": "and" | "or", "filters": [ ... ] } Date filtering (recommended default: date_is_within): - Prefer "date_is_within" for relative windows like "past N days/weeks/months". - Relative (common): { type: "relative", value: "the_past_week" | "the_past_month" | "this_week" } - Relative (custom): { type: "relative", value: "custom", direction: "past" | "future", unit: "day" | "week" | "month" | "year", count: <number> } - Exact range: { type: "exact", value: { type: "daterange", start_date: "YYYY-MM-DD", end_date: "YYYY-MM-DD" } } - Single-date operators ("date_is", "date_is_before", "date_is_after", "date_is_on_or_before", "date_is_on_or_after"): - Exact: { type: "exact", value: { type: "date", start_date: "YYYY-MM-DD" } } - Relative shortcuts: today | tomorrow | yesterday | one_week_ago | one_week_from_now | one_month_ago | one_month_from_now Title keyword filtering (OR vs AND): - Use OR ("operator": "or") when unsure or for broad discovery. - Use AND ("operator": "and") when the user is specific and you want to narrow results. - Break multi-word phrases into individual terms and filter on each term separately. Examples: - Past week: <example>{"operator":"and","filters":[{"property":"created_time","filter":{"operator":"date_is_within","value":{"type":"relative","value":"the_past_week"}}}]}</example> - Past 3 days: <example>{"operator":"and","filters":[{"property":"created_time","filter":{"operator":"date_is_within","value":{"type":"relative","value":"custom","direction":"past","unit":"day","count":3}}}]}</example> - Exact date range: <example>{"operator":"and","filters":[{"property":"created_time","filter":{"operator":"date_is_within","value":{"type":"exact","value":{"type":"daterange","start_date":"2025-01-01","end_date":"2025-12-31"}}}}]}</example> - Created after a date: <example>{"operator":"and","filters":[{"property":"created_time","filter":{"operator":"date_is_after","value":{"type":"exact","value":{"type":"date","start_date":"2025-06-01"}}}}]}</example> - Specific attendee: <example>{"operator":"and","filters":[{"property":"attendees","filter":{"operator":"person_contains","value":[{"type":"exact","value":{"table":"notion_user","id":"<user-id>"}}]}}]}</example> - Attendee since a date: <example>{"operator":"and","filters":[{"property":"created_time","filter":{"operator":"date_is_on_or_after","value":{"type":"exact","value":{"type":"date","start_date":"2025-01-01"}}}},{"property":"attendees","filter":{"operator":"person_contains","value":[{"type":"exact","value":{"table":"notion_user","id":"<user-id>"}}]}}]}</example> - Title contains both terms: <example>{"operator":"and","filters":[{"property":"title","filter":{"operator":"string_contains","value":{"type":"exact","value":"design"}}},{"property":"title","filter":{"operator":"string_contains","value":{"type":"exact","value":"review"}}}]}</example> - Title contains either term: <example>{"operator":"or","filters":[{"property":"title","filter":{"operator":"string_contains","value":{"type":"exact","value":"standup"}}},{"property":"title","filter":{"operator":"string_contains","value":{"type":"exact","value":"sync"}}}]}</example> */
      filter?: {
        /** Operator for combinator filters. */
        operator: "and" | "or"
        /** Nested filters; each may be a combinator (and/or) or property filter. */
        filters?: Array<unknown /* $ref #/$defs/meetingNotesPropertyFilter */ | {
          /** Whether every child must match, or any of them. */
          operator: "and" | "or"
          /** The conditions in this group. A group with no conditions matches nothing, so send at least one. */
          filters: Array<unknown /* $ref #/$defs/meetingNotesPropertyFilter */>
        }>
      }
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Query data across multiple Notion data sources using read-only SQLite SQL. If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. Use this tool for JOINs, UNIONs, comparisons, and aggregations that need two or more data sources. Queries across multiple data sources require a Business or Enterprise plan with Notion AI. Use query_data_sources instead when you need one data source or a saved database view. Prerequisites: 1. Use the "fetch" tool first to get each data source's schema and collection:// URL. 2. Data source URLs are found in <data-source url="..."> tags in fetch results. SQL: - Use each collection:// URL as a quoted SQLite table name in the query. - Bind untrusted values with ? placeholders and params; do not interpolate them into SQL. - Include every needed filter in WHERE. Saved-view filters and sorts are not automatically applied. - Checkbox values: use "__YES__" for checked and "__NO__" for unchecked. - Date properties expand to `date:<Name>:start`, `:end`, `:is_datetime`; `created_time` keeps its base name. Returns matching rows, the queried data source IDs, and whether results were truncated. */
    "mcp__claude_ai_Notion__notion-query-multiple-data-sources": {
      /** Read-only SQLite query to execute against the data sources. Use a data source URL as the table name, e.g. SELECT * FROM "collection://..." WHERE .... Use only table and column names shown in the fetched `<sqlite-table>` definition; date properties use the expanded column names listed there, not the base name. Example: if the fetched schema has a date property `Due`, use `"date:Due:start"`, not `"Due"`. Properties of type `created_time` or `last_edited_time` keep their exact fetched base columns (e.g. `"Created"` only if listed). A formula or another property with a date-looking name or result does not automatically have `date:` columns or become queryable. Copy actual fetched columns, not property labels. Include every needed filter in WHERE (filters on views of the data source are not automatically applied). For time comparisons or ordering, normalize text timestamps with datetime(...) or date(...). SQL text values can omit rich-text mentions and formatting, and links can lose their destination. Use faithful rows mode or fetch the page before rewriting a rich-text property. */
      query: string
      /** Notion data source URLs whose SQLite tables are available to the query; each data source is exposed as a table named by its URL. Obtain them from the fetch tool, in the format: collection://f336d0bc-b841-465b-8045-024475c079dd */
      data_source_urls: string[]
      /** Positional parameters bound to `?` placeholders in the query. Prefer parameterized queries over string interpolation. Use "__YES__" for checked checkboxes and "__NO__" for unchecked checkboxes. */
      params?: Array<string | number | boolean | null>
      /** Optional SQL mode marker. This tool only supports SQL queries. */
      mode?: "sql"
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** List agent sessions available to the integration. Filter, sort, or search by title. A bounded page can be empty while has_more is true; follow next_cursor until has_more is false. If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. */
    "mcp__claude_ai_Notion__notion-query-sessions": {
      /** A case-insensitive substring search over session titles. */
      query?: string
      /** A session property filter, or an and/or compound filter nested up to two levels deep. */
      filter?: unknown /* $ref #/$defs/sessionIdFilter */ | unknown /* $ref #/$defs/sessionAgentIdFilter */ | unknown /* $ref #/$defs/sessionStatusFilter */ | unknown /* $ref #/$defs/sessionTimestampFilter */ | {
        /** Return sessions that match every child filter. */
        and: Array<unknown /* $ref #/$defs/sessionNestedFilter */>
      } | {
        /** Return sessions that match any child filter. */
        or: Array<unknown /* $ref #/$defs/sessionNestedFilter */>
      }
      /** Ordered sort precedence. Defaults to updated_at descending. */
      sorts?: Array<{
        /** One of: `created_at`, `updated_at` */
        property: "created_at" | "updated_at"
        /** One of: `ascending`, `descending` */
        direction: "ascending" | "descending"
      }>
      /** The continuation cursor returned by the previous page. */
      start_cursor?: string
      /** The number of sessions to return. Maximum: 100. */
      page_size?: number
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Read the full visible content of one saved Custom Agent session event. If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. */
    "mcp__claude_ai_Notion__notion-read-session-event": {
      /** Use the complete session_url returned by session tools, unchanged. Format: session://<spaceId>/<sessionId>. Shorthand session://<sessionId> and thread://<sessionId> use the connected workspace. Fully qualified URLs must refer to that workspace. */
      session_url: string
      /** Committed event sequence number to read. */
      sequence: number
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Accept or reject one pending suggested edit. Use the exact suggested_edit_url, inspect it with get_suggested_edit first, and call this only after the user explicitly chooses accept or reject. If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. */
    "mcp__claude_ai_Notion__notion-resolve-suggested-edit": {
      /** Pending suggested-edit discussion URL returned by get_comments or create_suggested_edit. */
      suggested_edit_url: string
      /** Whether to apply or discard the suggestion. */
      action: "accept" | "reject"
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Restore Notion pages or databases from Trash to where they were before they were deleted. Use this when the user asks to undo a deletion or to restore something from Trash. Database rows are pages. Restoring something that is already out of Trash succeeds and changes nothing. To restore a page whose parent is in Trash, restore the parent. */
    "mcp__claude_ai_Notion__notion-restore-pages": {
      /** IDs of 1 to 20 pages or databases in Trash. Database rows are pages. Duplicate IDs are restored once. */
      page_ids: string[]
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Search Notion pages and databases, or look up a user by name or email. Does not search connected apps; use connector_search, when listed, for sources such as Slack, Google Drive, GitHub, mail, or calendar. When connector_search is listed, call it in parallel with search on the first search for an information need, unless the user names a source, the request is a user lookup, or the request is about Notion pages or databases themselves, such as finding a page to read or edit. Decisions, status updates, and discussions often live in connected sources. Preserve distinctive names and identifiers. Use a non-empty query for content searches. Leave the query empty only when you also send filters or a non-relevance sort, as in the browse example below. Omit optional parameters unless needed. Do not add filters or sorting just to fill in defaults. Business or Enterprise is required for filters.edited_by_user_ids, filters.last_edited_date_range, filters.title_only=true, filters.content_status, more than one distinct teamspace across teamspace_id and filters.teamspace_ids, and sort other than relevance. On other plans, those options are dropped with a notice in the result, and results may be broader. Keep filters nested inside "filters". Use page_size, not limit. For user lookup, set query_type="user" and provide a name or email. A document about a person is a content search, not a user lookup. <example description="Find a page by title"> {"query":"Q3 roadmap"} </example> <example description="Browse pages you edited most recently"> {"query":"","filters":{"edited_by_user_ids":["me"]},"sort":"last_edited"} </example> <example description="Find a user"> {"query":"alex@example.com","query_type":"user"} </example> */
    "mcp__claude_ai_Notion__notion-search": {
      /** Short, specific keywords for Notion content search. For user search, enter a name or email address. Provide a non-empty query unless intentionally browsing with filters or a non-relevance sort. */
      query: string
      /** Specify type of the query as either "internal" or "user". Always include this input if performing "user" search. */
      query_type?: "internal" | "user"
      /** Optionally restrict keyword search to a data source URL returned in a <data-source> tag. */
      data_source_url?: string
      /** Optionally restrict keyword search to a page and its descendants. Accepts a Notion page URL or ID. */
      page_url?: string
      /** Optionally, provide the ID of a teamspace to restrict search results to. This will perform a search over content within the specified teamspace only. Accepts the teamspace ID (UUIDv4) with or without dashes. */
      teamspace_id?: string
      /** Optional exact filters for Notion workspace search. Omit unless required by the request. Keep filter fields nested here; do not send them at the top level. Some filters require Business access. */
      filters?: {
        /** Optional filter to only produce search results created within the specified date range. */
        created_date_range?: {
          /** The start date of the date range as an ISO 8601 date string, if any. */
          start_date?: string
          /** The end date of the date range as an ISO 8601 date string, if any. */
          end_date?: string
        }
        /** Optional filter to only produce search results created by the Notion users that have the specified user IDs. Use "me" for the connected user. */
        created_by_user_ids?: string[]
        /** Optional filter to only produce search results edited by the Notion users that have the specified user IDs. Use "me" for the connected user. Available on the Business plan. */
        edited_by_user_ids?: string[]
        /** Optional filter to only produce search results last edited within the specified date range. Available on the Business plan. */
        last_edited_date_range?: {
          /** The start date of the date range as an ISO 8601 date string, if any. */
          start_date?: string
          /** The end date of the date range as an ISO 8601 date string, if any. */
          end_date?: string
        }
        /** Optional filter to only produce search results inside one of the specified teamspaces. Selecting more than one teamspace is available on the Business plan; use teamspace_id for one teamspace on other plans. */
        teamspace_ids?: string[]
        /** When true, match the query only against page and database titles instead of page content. Available on the Business plan. */
        title_only?: boolean
        /** Which pages to include by status. Omit for the default live pages. Supplying this field, even with the default value, requires Business access. */
        content_status?: "all_with_archived" | "all_without_archived" | "verified_only" | "archived_only"
      }
      /** Result ordering for Notion workspace search. Omit for the default "relevance" ordering. "last_edited" and "created" require Business access. */
      sort?: "relevance" | "last_edited" | "created"
      /** Maximum number of results to return (default 10). Lower values reduce response size. */
      page_size?: number
      /** Maximum character length for result highlights (default 200). Set to 0 to omit highlights entirely. */
      max_highlight_length?: number
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Search agents by name or description, or browse the current user's favorite agents and the workspace's newest agents. Queries return one page. Without a query, follow nextCursor until it is omitted, even when a bounded workspace page is empty. Use this instead of list_agents when personal favorites or relevance-ranked search are needed. If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. */
    "mcp__claude_ai_Notion__notion-search-agents": {
      /** Which agents to list: "favorites" for the current user's favorite agents, or "workspace" for agents shared with the workspace. */
      scope: "favorites" | "workspace"
      /** Search text matched against agent names and descriptions. Queries return one page and cannot use a cursor. When omitted, favorites are returned in sidebar order and workspace agents are returned newest first. */
      query?: string
      /** Maximum results to return (1-200). */
      limit?: number
      /** Opaque pagination cursor from the previous response. */
      cursor?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Search past agent sessions by topic in a periodically refreshed index and return matching session URLs and excerpts. Recently created or updated sessions may not appear; use query_sessions for recent sessions. If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. */
    "mcp__claude_ai_Notion__notion-search-sessions": {
      /** What you want to find in past sessions. */
      question: string
      /** How far back to search, such as "30d" or "1y". Leave it out to search the past year. */
      lookback?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Send a follow-up message to a Custom Agent session you can access. If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. */
    "mcp__claude_ai_Notion__notion-send-message-to-session": {
      /** Use the complete session_url returned by session tools, unchanged. Format: session://<spaceId>/<sessionId>. Shorthand session://<sessionId> and thread://<sessionId> use the connected workspace. Fully qualified URLs must refer to that workspace. */
      session_url: string
      /** Follow-up message to send. */
      message: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Add or remove your emoji reaction on a comment. Get the comment ID from get_comments or create_comment. Safe to repeat: setting the same state twice changes nothing. */
    "mcp__claude_ai_Notion__notion-set-comment-reaction": {
      /** The comment ID, with or without dashes. Use the id of a <comment> from get_comments, or the id returned by create_comment. */
      comment_id: string
      /** One standard Unicode emoji. */
      emoji: string
      /** True to add the reaction, false to remove it. */
      reacted: boolean
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Resolve or reopen a comment discussion. Get the discussion ID from get_comments or create_comment. Use this tool only when a human explicitly asks to resolve that discussion. Do not infer resolution from addressing feedback, replying, completing related work, passing checks, or changing task status. */
    "mcp__claude_ai_Notion__notion-set-discussion-resolved": {
      /** The discussion ID or URL, such as the id of a <discussion> from get_comments (discussion://pageId/blockId/discussionId) or the discussion_id returned by create_comment. */
      discussion_id: string
      /** True to resolve the discussion, false to reopen it. */
      resolved: boolean
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Start a session with a published Custom Agent. Use get_session_status or wait_session to check its progress. If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. */
    "mcp__claude_ai_Notion__notion-spawn-session": {
      /** Published Custom Agent URL in agent://<spaceId>/<agentId> format, as returned by search_agents. */
      agent_url: string
      /** Initial message for the new session. */
      initial_message: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Stop a running Custom Agent session you can access. If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. */
    "mcp__claude_ai_Notion__notion-stop-session": {
      /** Use the complete session_url returned by session tools, unchanged. Format: session://<spaceId>/<sessionId>. Shorthand session://<sessionId> and thread://<sessionId> use the connected workspace. Fully qualified URLs must refer to that workspace. */
      session_url: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Replace the text of a comment you wrote. Get the comment ID from get_comments or create_comment. The new text replaces the whole comment, so send the full corrected text. To fix a comment, update it instead of deleting it and posting a new one. You can only edit your own comments. */
    "mcp__claude_ai_Notion__notion-update-comment": {
      /** The comment ID, with or without dashes. Use the id of a <comment> from get_comments, or the id returned by create_comment. */
      comment_id: string
      /** The full replacement text for the comment, as inline Markdown. It replaces the whole comment, so include any text you want to keep. Use the same inline syntax as create_comment. Lists, headings, and other block-level Markdown are not supported in comments. */
      markdown: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Update a Notion data source's schema, title, attributes, or page layout. Schema changes use SQL DDL statements. Returns Markdown showing updated structure and schema. Accepts a data source ID (collection ID from fetch response's <data-source> tag) or a single-source database ID. Multi-source databases require the specific data source ID. The statements param accepts semicolon-separated DDL statements: - ADD COLUMN "Name" <type> - add a new property - DROP COLUMN "Name" - remove a property - RENAME COLUMN "Old" TO "New" - rename a property - ALTER COLUMN "Name" SET <type> - change type/options. For SELECT, MULTI_SELECT, and STATUS, list every option to keep; omitted options are removed. Existing options keep their id and can be recolored. STATUS options keep their group when the group is omitted. The page_layout param replaces the layout every page in the data source uses (pinned properties, sidebar, property sections, and a content tab next to views). Fetch the data source first to get the current layout, then edit it. See notion://docs/database-page-layouts for the format. Notes: Cannot delete/create title properties. Max one unique_id property. Cannot update synced databases. Use "fetch" first to see current schema and get the data source ID from <data-source url="collection://..."> tags. */
    "mcp__claude_ai_Notion__notion-update-data-source": {
      /** The data source to update. Accepts a collection:// URI from <data-source> tags, a bare UUID, or a database ID (only if the database has a single data source). */
      data_source_id: string
      /** Semicolon-separated SQL DDL statements to update the schema. Supports ADD COLUMN, DROP COLUMN, RENAME COLUMN, and ALTER COLUMN SET. Property type syntax: - Simple: TITLE, RICH_TEXT, DATE, PEOPLE, CHECKBOX, URL, EMAIL, PHONE_NUMBER, FILES - SELECT('opt':color, ...) / MULTI_SELECT('opt':color, ...) - STATUS('Backlog':gray:to_do, 'Building':blue:in_progress, 'Shipped':green:complete); groups are to_do, in_progress, complete - NUMBER [FORMAT 'dollar'] / FORMULA('expression') - RELATION('ds') for a one-way relation - RELATION('ds', DUAL) for a two-way relation - RELATION('ds', DUAL 'Children') with a synced property name - RELATION('ds', DUAL 'Children' 'children') with a synced name and synced_id (for self-relations) - ROLLUP('rel_prop', 'target_prop', 'function') - UNIQUE_ID [PREFIX 'X'] / CREATED_TIME / LAST_EDITED_TIME - Any column: COMMENT 'description text' Colors: default, gray, brown, orange, yellow, green, blue, purple, pink, red. Examples: - <example>ADD COLUMN "Priority" SELECT('High':red, 'Medium':yellow, 'Low':green); ADD COLUMN "Due Date" DATE</example> - <example>RENAME COLUMN "Status" TO "Project Status"</example> - <example>DROP COLUMN "Old Property"</example> - For a self-relation, add both relation properties in one call with matching DUAL names and IDs, such as <example>ADD COLUMN "Parent" RELATION('ds', DUAL 'Children' 'children')</example>. */
      statements?: string
      /** The new title of the data source. */
      title?: string
      /** The new description of the data source. */
      description?: string
      /** Whether the database should display inline (true) or as full page (false). Only applicable for single-source databases. */
      is_inline?: boolean
      /** Move data source to trash. Cannot be undone without Notion UI. */
      in_trash?: boolean
      /** Replaces the data source's page layout. Refer to existing properties by name. See notion://docs/database-page-layouts. Example: <example>{"main":[{"type":"title","pinnedProperties":["Status","Owner"]},{"type":"editor"},{"type":"discussions"}],"sidebar":[{"type":"properties"}]}</example>. */
      page_layout?: {
        /** Main area modules in order. Include a title, an editor (unless the layout has a tab), and discussions. */
        main: Array<{
          /** The module type. */
          type: "cover" | "editor" | "discussions" | "relations" | "backlinks" | "page_sections" | "bottom_controls"
        } | unknown /* $ref #/$defs/pageLayoutPropertiesModule */ | unknown /* $ref #/$defs/pageLayoutPropertiesSectionsModule */ | {
          /** The module type. */
          type: "title"
          /** Property names to show under the title. */
          pinnedProperties?: string[]
          /** Whether pinned properties show their names. */
          propertyLabels?: "show" | "hide"
        } | unknown /* $ref #/$defs/pageLayoutPropertyModule */ | {
          /** The module type. */
          type: "views"
          /** The name of a two-way relation property whose related pages show as a view. */
          relation: string
        }>
        /** Sidebar modules in order. Only properties and property modules are allowed. */
        sidebar?: Array<unknown /* $ref #/$defs/pageLayoutPropertiesModule */ | unknown /* $ref #/$defs/pageLayoutPropertiesSectionsModule */ | unknown /* $ref #/$defs/pageLayoutPropertyModule */>
        /** Puts page content in a tab next to database views. Omit for a simple layout. */
        tab?: {
          /** The existing tab ID from fetch. Omit for a new tab. Starts with view_tab_. */
          id?: string
          /** Tab modules in order. Must include an editor. Only properties, property modules, discussions, relations, and the editor are allowed. */
          modules: Array<{
            /** The module type. */
            type: "editor" | "discussions" | "relations"
          } | unknown /* $ref #/$defs/pageLayoutPropertiesModule */ | unknown /* $ref #/$defs/pageLayoutPropertiesSectionsModule */ | unknown /* $ref #/$defs/pageLayoutPropertyModule */>
        }
        /** Page display options. */
        format?: {
          /** Whether property icons show on the page. */
          propertyIcons?: "show" | "hide"
          /** Whether pages open at full width. */
          pageFullWidth?: boolean
        }
      }
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Enable Notion Skills for the current user, or turn them off for external MCP clients, Notion AI, or both. Adding a Skill URL enables it for the user on every surface. Removing one turns it off for the requested surfaces, which default to both. Changes only the current user's Skill settings. */
    "mcp__claude_ai_Notion__notion-update-enabled-skills": {
      /** Notion Skill page URLs to enable for the current user on every surface. */
      add_skill_urls?: string[]
      /** Notion Skill page URLs to turn off on the requested surfaces. */
      remove_skill_urls?: string[]
      /** Surfaces to turn remove_skill_urls off for. Defaults to both external MCP and Notion AI. Does not apply to add_skill_urls. */
      surfaces?: Array<"mcp" | "notion_ai">
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Update an existing Notion Folder with an explicit Folder operation. - Use add_files with file upload IDs returned by the upload tools. - Fetch the Folder first, then use remove_files with the exact file URLs from that fetch result. - Use add_subfolder to create and insert a new nested Folder. Use exactly one command shape; do not mix their arguments: - {"command":"add_files","file_upload_ids":["..."]} - {"command":"remove_files","file_urls":["..."]} - {"command":"add_subfolder","title":"..."} The Folder ID may be provided with or without dashes. */
    "mcp__claude_ai_Notion__notion-update-folder": {
      /** The ID of the Folder to update. */
      folder_id: string
      /** The Folder update to apply. */
      command: "add_files" | "remove_files" | "add_subfolder"
      /** Required for add_files. One or more file upload IDs returned by the file upload tools. */
      file_upload_ids?: string[]
      /** Required for remove_files. The exact file URLs shown in the Folder's latest fetch output. */
      file_urls?: string[]
      /** Required for add_subfolder. The new Folder's title. */
      title?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Update a Notion page's properties, content, icon, or cover. For only an icon or cover, use "update_properties" without "properties". ## Core rules **IMPORTANT**: Before writing page content, read the MCP resource `notion://docs/notion-flavored-markdown-spec` through your MCP client's resource-reading interface, or call the Notion "fetch" tool with this URI if your client does not support reading MCP resources. Do NOT pass this URI to any other URL-fetching tool. Don't guess Markdown syntax. By default, use native Notion mentions for references you add to existing Notion pages, databases, data sources, people, and dates. Use Markdown links only for external URLs or when the user requests a plain link. For a person, use a user mention with their user URL, found with search using query_type "user"; do not write "@Name" as plain text. For a specific date or time, such as a due date or meeting time, use a date mention. The Markdown specification gives the mention syntax. Before changing content, fetch unless already loaded. Match nearby headings, block types, nesting, lists, tables, and prose style. Make the smallest edit. Use "update_content" for targeted search-and-replace and "insert_content" only to prepend or append. Avoid "replace_content" when a targeted command works. Preserve unrelated wording, structure, order, and native references. Do not broadly rewrite unless asked. For "update_content", use the smallest exact old_str that uniquely matches the target. Ask before removing material content the user did not identify. Don't fetch just to verify an update that completed without warnings. Fetch to resolve warnings, or when a later step needs the page's exact saved state. For "replace_content", preserve child pages and databases with their exact fetched tags. If validation says child content would be deleted, show the list and ask first. Never retry with "allow_deleting_content": true without confirmation. Report any "warnings" in the result. */
    "mcp__claude_ai_Notion__notion-update-page": {
      /** The page ID, with or without dashes, or a Notion page URL. */
      page_id: string
      /** The update command to execute. */
      command: "update_properties" | "update_content" | "replace_content" | "insert_content" | "apply_template" | "update_verification"
      /** Used by the "update_properties" command, and required unless "icon", "cover", or "is_skill" is set. A JSON object that updates the page's properties. For pages in a database, fetch the page or its data source first and use the exact property names and SQLite schema definition shown in <database>. For page titles outside a database, use "title" in inline Markdown. For a Files property, an uploaded file can be provided as {"type":"file_upload","file_upload":{"id":"<file-upload-id>"}} inside the property's array. Use null to remove a property's value. **IMPORTANT**: Some property types require specific formats: - Date properties: Split into "date:{property}:start", "date:{property}:end" (optional), and "date:{property}:is_datetime" (0 or 1) - Place properties: Split into "place:{property}:name", "place:{property}:address", "place:{property}:latitude", "place:{property}:longitude", and "place:{property}:google_place_id" (optional) - Number properties: Use JavaScript numbers (not strings) - Checkbox properties: Use "__YES__" for checked, "__NO__" for unchecked - Relation properties: Use an array of related page URLs or page IDs, e.g. ["https://www.notion.so/26ab1f9f4c5f80b18d3bd10a6b1d2f4e", "26ab1f9f-4c5f-80b1-8d3b-d10a6b1d2f4e"] - Person properties: Use an array of user IDs, user or agent URLs, or group references copied from fetch output ("space_permission_group-<UUID>"). Bare group UUIDs are also supported. - Files properties: Use a JSON array of file IDs, Notion Folder URLs, and/or <folder> tags copied from fetch output. Folders are stored as native Folder references, not ordinary links. **Special property naming**: Properties named "id" or "url" (case insensitive) must be prefixed with "userDefined:" (e.g., "userDefined:URL", "userDefined:id") */
      properties?: {}
      /** Required for "replace_content" command. The new content string to replace the entire page content with. Preserve child pages and databases with their exact fetched <page url="..."> or <database url="..."> tags. For people and dates, use user and date mentions rather than plain text; notion://docs/notion-flavored-markdown-spec gives the syntax. */
      new_str?: string
      /** Required for "insert_content" command. The markdown content to insert into the page. For people and dates, use user and date mentions rather than plain text; notion://docs/notion-flavored-markdown-spec gives the syntax. */
      content?: string
      /** Required for "update_content" command. An array of search-and-replace operations, each with old_str (content to find) and new_str (replacement content). Operations that match are applied, and each one that matches nothing is reported in "warnings". The call fails only when no operation that changes content matches. */
      content_updates?: Array<{
        /** The existing content string to find and replace. Must exactly match the page content. */
        old_str: string
        /** The new content string to replace old_str with. For people and dates, use user and date mentions rather than plain text; notion://docs/notion-flavored-markdown-spec gives the syntax. */
        new_str: string
        /** If true, replaces all occurrences of old_str. If false (default), the operation fails if there are multiple matches. */
        replace_all_matches?: boolean
      }>
      /** Optional for "insert_content" command. Use {"type":"start"} to prepend content or {"type":"end"} to append content. Omit to append. */
      position?: {
        /** Insert the content at the start of the page. */
        type: "start"
      } | {
        /** Insert the content at the end of the page. */
        type: "end"
      }
      /** Optional for "replace_content" and "update_content" commands. Set to true to allow deletion of child pages and databases that are not referenced in the new content. If false or omitted, the operation will fail with an error listing the pages/databases that would be deleted. Show that list and ask the user for confirmation before retrying with true. */
      allow_deleting_content?: boolean
      /** Required for "apply_template" command. The ID of a template to apply to this page; any page ID can be used as a template. Template content is appended to any existing page content asynchronously. */
      template_id?: string
      /** Required for "update_verification" command. Set to "verified" to mark the page as verified, or "unverified" to remove verification. Requires a Business or Enterprise plan unless the page is in a wiki. When updating verification, the owner will be automatically set to the authenticated actor. */
      verification_status?: "verified" | "unverified"
      /** Optional for "update_verification" command when verification_status is "verified". Number of days until verification expires (e.g. 7, 30, 90). Omit for indefinite verification. */
      verification_expiry_days?: number
      /** An emoji character (e.g. "🚀"), a custom emoji by name (e.g. ":rocket_ship:"), a Notion icon identifier as returned by fetch (e.g. "icons/pizza_blue"), or an external image URL. Use "none" to remove the icon. Omit to leave unchanged. Can be set alongside any command. To change only the icon, use "update_properties" and omit "properties". Keep the title free of a duplicate leading emoji because the icon renders separately. */
      icon?: string
      /** An external image URL for the page cover. Use "none" to remove the cover. Omit to leave unchanged. Can be set alongside any command. To change only the cover, use "update_properties" and omit "properties". */
      cover?: string
      /** Set to true to mark this page as a skill, or false to remove the skill designation. Can be set alongside any command. To change only skill status, use "update_properties" and omit "properties". Before creating a skill, read the MCP resource `notion://docs/skills` through your MCP client's resource-reading interface. If your client does not support reading MCP resources, call the Notion "fetch" tool with this URI instead. Do NOT pass this URI to any other URL-fetching tool. */
      is_skill?: boolean
      /** Default to true for page updates. Set to false only when the next step needs the updated page immediately, or when async execution rejects the request as too large. When this update operation is accepted for background execution, it returns an async_task result. Use get_async_task to wait for a succeeded status before taking a dependent action on the page. For apply_template, a succeeded status does not mean template content is ready; fetch and retry until it is ready before changing or relying on that content. If omitted or false, the tool waits for a synchronous result when possible, but may still return a pollable async_task response if queued execution exceeds the synchronous wait deadline. */
      allow_async?: boolean
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Update a view's name, filters, sorts, or display configuration. Use "fetch" to get view IDs from database responses. Only include fields you want to change. The "configure" param uses the same DSL as create_view. Use CLEAR to remove settings: - CLEAR FILTER — remove all filters - CLEAR QUICK FILTER — remove all quick filters, or name properties to remove only theirs (CLEAR QUICK FILTER "Status") - CLEAR SORT — remove all sorts - CLEAR GROUP BY — remove grouping. Boards reject it; use GROUP BY with another property instead (CLEAR SUB GROUP BY still works). - CLEAR SUB GROUP BY — remove board sub-grouping Set board or gallery card layout with CARD LAYOUT default or CARD LAYOUT compact. BY OPTION and BY GROUP apply only to status properties and rollups that return status values (Show original or Show unique). For select and multi_select properties, omit both modifiers, even if the property is named "Status" (for example, GROUP BY "Status"). See notion://docs/view-dsl-spec resource for full syntax (readable via your MCP client's resource-reading interface, or by passing the URI to the Notion "fetch" tool). <example description="Rename">{"view_id": "abc123", "name": "Sprint Board"}</example> <example description="Update filter">{"view_id": "abc123", "configure": "FILTER "Status" = "Done""}</example> <example description="Add quick filters without criteria">{"view_id": "abc123", "configure": "QUICK FILTER "Status", "Assignee""}</example> <example description="Clear filter, add sort">{"view_id": "abc123", "configure": "CLEAR FILTER; SORT BY "Created" DESC"}</example> <example description="Update grouping">{"view_id": "abc123", "configure": "GROUP BY "Status" BY GROUP SHOW EMPTY; SUB GROUP BY "Priority"; CARD LAYOUT compact"}</example> */
    "mcp__claude_ai_Notion__notion-update-view": {
      /** The view to update. Accepts a view:// URI, a Notion URL with ?v= parameter, or a bare UUID. */
      view_id: string
      /** New name for the view. */
      name?: string
      /** View configuration DSL string. Supports FILTER, QUICK FILTER, SORT BY, GROUP BY, SUB GROUP BY, CARD LAYOUT, CALENDAR BY, TIMELINE BY, MAP BY, CHART, FORM, SHOW, HIDE, COVER, WRAP CELLS, FREEZE COLUMNS, and CLEAR directives. BY OPTION and BY GROUP apply only to status properties and rollups that return status values (Show original or Show unique). For select and multi_select properties, omit both modifiers, even if the property is named "Status" (for example, GROUP BY "Status"). */
      configure?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Import a spec-compliant Agent Skills directory into a page in a Skills database. First call action=prepare with page_id and the exact tar.gz content_length and checksum_crc32. PUT the raw archive bytes to upload_url with all upload_headers, then call action=complete with the same page_id and upload_token. The archive must contain SKILL.md with name/description YAML frontmatter, either at the root or in a single matching skill-name directory. Completion replaces the page title, Description, body, and Files; it preserves the page and uses the page-update diff engine rather than recreating all content blocks. SKILL.md becomes page content. Its sibling folders and files are added directly to Files, preserving nested directories without a skill-name wrapper. Previous folders are not deleted. For a new skill, create a page in a Skills database first. Maximum 20 MiB compressed, 25 MiB expanded, 1000 entries, 20 path levels, and 200 UTF-8 bytes per filename. Paths must be unique ignoring case. Only name and description are imported from frontmatter; optional fields are ignored. Links and special files are rejected. Upload URLs and tokens expire after ten minutes. Uploading never executes skill instructions or scripts. If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. */
    "mcp__claude_ai_Notion__notion-upload-skill": {
      /** Prepare an upload or complete a previously uploaded archive. */
      action: "prepare" | "complete"
      /** Target page in a Skills database. Create a new page first to import a new skill. */
      page_id: string
      /** Required for prepare. Exact compressed archive size in bytes (maximum 20 MiB). */
      content_length?: number
      /** Required for prepare. Base64-encoded big-endian CRC32 of the tar.gz bytes; S3 verifies it on upload. */
      checksum_crc32?: string
      /** Required for complete. Opaque token from prepare. Bound to the integration, workspace, and page; expires after ten minutes. */
      upload_token?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Read a Notion page or database as it looked at a past time. The open page and other reads show only current content, so use this for any question about what a page said, contained, or looked like at an earlier date, even when the page is already open. A page returns its Markdown and properties; each inline database is a database tag, and you can pass that tag's url to this tool to read the database at the same time. A database returns its data sources, views, and rows. A linked database leaves out the data sources, views, and rows that belong to another database. Requires edit access to the page. */
    "mcp__claude_ai_Notion__notion-view-version": {
      /** The page or database to read: a page URL, database URL, data source (collection://) URL, or ID. */
      page: string
      /** The moment to read, as an ISO 8601 time with a time zone offset. Convert the user's date and time in their own time zone, such as "2026-10-10T14:05:02-04:00" for 2:05 PM in New York. If the user names only a date, pick a time on that date in their time zone and tell them which. */
      time: string
      /** A database's next_cursor, to read its next rows. Pass the same page and time as the call that returned it. */
      cursor?: string
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** Wait for the latest turn in a Custom Agent session to stop running. If availability is not already known for this connection, call get_tool_access with {} before using this tool. Reuse the returned access map across tools; check the status and restricted_parameters. */
    "mcp__claude_ai_Notion__notion-wait-session": {
      /** Use the complete session_url returned by session tools, unchanged. Format: session://<spaceId>/<sessionId>. Shorthand session://<sessionId> and thread://<sessionId> use the connected workspace. Fully qualified URLs must refer to that workspace. */
      session_url: string
      /** Maximum number of seconds to wait. */
      seconds: number
      /** Notion setup instructions version, such as 0.0.2. Omit if unknown. */
      instructions_version?: string
    }
    /** PRIMARY TOOL — call FIRST for almost any question OR before an edit: how does X work, architecture, a bug, where/what is X, surveying an area, or the symbols you are about to change. Returns the verbatim source of the relevant symbols grouped by file in ONE capped call (Read-equivalent — treat the shown source as already Read; do NOT re-open those files), plus the call path among them. Query can be a natural-language question OR a bag of symbol/file names. Usually the ONLY call you need — more accurate context, in far fewer tokens and round-trips than a search/Read/Grep loop. */
    mcp__codegraph__codegraph_explore: {
      /** Symbol names, file names, or short code terms to explore (e.g., "AuthService loginUser session-manager", "GraphTraverser BFS impact traversal.ts"). For a flow question, name the symbols spanning the flow (e.g. "mutateElement renderScene"). A natural-language question works too — no prior codegraph_search needed. */
      query: string
      /** Maximum number of files to include source code from (default: 12) */
      maxFiles?: number
      /** Absolute path to the project to query (or any directory inside it) — codegraph uses the nearest .codegraph/ index at or above that path. Omit to use this session's default project. Pass it to query a second codebase, or when the server root has no index of its own (e.g. a monorepo where only sub-projects are indexed, so there is no default project). */
      projectPath: string
    }
    /** Build a knowledge corpus from filtered observations. Creates a queryable knowledge agent. Params: name (required), description, project, types (comma-separated), concepts (comma-separated), files (comma-separated), query, dateStart, dateEnd, limit */
    "mcp__plugin_claude-mem_mcp-search__build_corpus": {
      /** Corpus name (used as filename) */
      name: string
      /** What this corpus is about */
      description?: string
      /** Filter by project */
      project?: string
      /** Comma-separated observation types: decision,bugfix,feature,refactor,discovery,change */
      types?: string
      /** Comma-separated concepts to filter by */
      concepts?: string
      /** Comma-separated file paths to filter by */
      files?: string
      /** Semantic search query */
      query?: string
      /** Start date (ISO format) */
      dateStart?: string
      /** End date (ISO format) */
      dateEnd?: string
      /** Maximum observations (default 500) */
      limit?: number
    }
    /** Step 3: Fetch full details for filtered IDs. Params: ids (array of observation IDs, required), orderBy, limit, project */
    "mcp__plugin_claude-mem_mcp-search__get_observations": {
      /** Array of observation IDs to fetch (required) */
      ids: number[]
    }
    /** 3-LAYER WORKFLOW (ALWAYS FOLLOW): 1. search(query) → Get index with IDs (~50-100 tokens/result) 2. timeline(anchor=ID) → Get context around interesting results 3. get_observations([IDs]) → Fetch full details ONLY for filtered IDs NEVER fetch full details without filtering first. 10x token savings. */
    "mcp__plugin_claude-mem_mcp-search__important_workflow": {}
    /** List all knowledge corpora with their stats and priming status */
    "mcp__plugin_claude-mem_mcp-search__list_corpora": {}
    /** Prime a knowledge corpus — creates an AI session loaded with the corpus knowledge. Must be called before query_corpus. */
    "mcp__plugin_claude-mem_mcp-search__prime_corpus": {
      /** Name of the corpus to prime */
      name: string
    }
    /** Ask a question to a primed knowledge corpus. The corpus must be primed first with prime_corpus. */
    "mcp__plugin_claude-mem_mcp-search__query_corpus": {
      /** Name of the corpus to query */
      name: string
      /** The question to ask */
      question: string
    }
    /** Rebuild a knowledge corpus from its stored filter — re-runs the search to refresh with new observations. Does not re-prime the session. */
    "mcp__plugin_claude-mem_mcp-search__rebuild_corpus": {
      /** Name of the corpus to rebuild */
      name: string
    }
    /** Create a fresh knowledge agent session for a corpus, clearing prior Q&A context. Use when conversation has drifted or after rebuilding. */
    "mcp__plugin_claude-mem_mcp-search__reprime_corpus": {
      /** Name of the corpus to reprime */
      name: string
    }
    /** Step 1: Search memory. Returns index with IDs. Params: query, limit, project, platformSource, type, obs_type, dateStart, dateEnd, offset, orderBy */
    "mcp__plugin_claude-mem_mcp-search__search": {
      /** Search query */
      query?: string
      /** Max results (default 20) */
      limit?: number
      /** Filter by project name */
      project?: string
      /** Filter by platform source (e.g. claude, codex, cursor) — restricts results to that agent's own memory */
      platformSource?: string
      /** Document category to search: 'observations', 'sessions', or 'prompts' (default: all). Any other value is treated as an observation-type filter (alias for obs_type). */
      type?: string
      /** Filter observations by their type (e.g. bugfix, feature). Comma-separated for multiple. */
      obs_type?: string
      /** Start date filter (ISO) */
      dateStart?: string
      /** End date filter (ISO) */
      dateEnd?: string
      /** Pagination offset */
      offset?: number
      /** Sort order: date_desc or date_asc */
      orderBy?: string
    }
    /** Render the exact worker-mode SessionStart context for a project. Calls /api/context/inject and returns the same text hooks inject at startup. Params: project OR projects, platformSource, full, colors. */
    "mcp__plugin_claude-mem_mcp-search__session_start_context": {
      /** Project name, e.g. claude-mem/night-parsnip */
      project?: string
      /** Project chain for context injection. Array or comma-separated string; last project is treated as primary. */
      projects?: string[] | string
      /** Optional platform source filter, e.g. claude, codex, cursor */
      platformSource?: string
      /** When true, request full context instead of configured limits */
      full?: boolean
      /** When true, request human terminal-color formatting */
      colors?: boolean
    }
    /** Get structural outline of a file — shows all symbols (functions, classes, methods, types) with signatures but bodies folded. Much cheaper than reading the full file. */
    "mcp__plugin_claude-mem_mcp-search__smart_outline": {
      /** Path to the source file */
      file_path: string
    }
    /** Search codebase for symbols, functions, classes using tree-sitter AST parsing. Returns folded structural views with token counts. Use path parameter to scope the search. */
    "mcp__plugin_claude-mem_mcp-search__smart_search": {
      /** Search term — matches against symbol names, file names, and file content */
      query: string
      /** Root directory to search (default: current working directory) */
      path?: string
      /** Maximum results to return (default: 20) */
      max_results?: number
      /** Substring filter for file paths (e.g. ".ts", "src/services") */
      file_pattern?: string
    }
    /** Expand a specific symbol (function, class, method) from a file. Returns the full source code of just that symbol. Use after smart_search or smart_outline to read specific code. */
    "mcp__plugin_claude-mem_mcp-search__smart_unfold": {
      /** Path to the source file */
      file_path: string
      /** Name of the symbol to unfold (function, class, method, etc.) */
      symbol_name: string
    }
    /** Step 2: Get context around results. Params: anchor (observation ID) OR query (finds anchor automatically), depth_before, depth_after, project */
    "mcp__plugin_claude-mem_mcp-search__timeline": {
      /** Observation ID to center the timeline around */
      anchor?: number
      /** Query to find anchor automatically */
      query?: string
      /** Items before anchor (default 3) */
      depth_before?: number
      /** Items after anchor (default 3) */
      depth_after?: number
      /** Filter by project name */
      project?: string
    }
    /** Open the zeus dev stack pane (service states, logs, start/stop buttons). Call it after starting services with the zeus-dev:stack skill. */
    "mcp__zeus-dev__open_panel": {}
  }
}
