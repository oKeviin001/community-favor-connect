<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep Kevin V2 management in a dedicated panel with authenticated server functions checking `is_admin` before importing privileged code; this preserves existing admin/master authorization and prevents browser exposure of connection secrets.
- Do not change the Kevin HMAC wire format or enable remote business mutations until the Central implementation is inspected; both independent apps must agree on signatures and durable idempotency.
