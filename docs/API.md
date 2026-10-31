# API status

No business API handlers, webhooks, scheduler or Server Actions are exposed in M00. The web app serves public pages, Next-generated manifest/robots and static install assets. PRD §13 defines future `/api/v1` contracts and errors. Add endpoints only with validated identity, resource authorization, minimal DTOs and negative tests in their milestone. A future OpenAPI document must describe implemented endpoints rather than pretend the entire planned API exists.
