# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: Welcome back
      - generic [ref=e6]: Sign in to your Eximley account
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Email
        - textbox "Email" [ref=e11]:
          - /placeholder: john@company.com
          - text: testuser_v1@example.com
      - generic [ref=e12]:
        - generic [ref=e13]: Password
        - textbox "Password" [ref=e14]:
          - /placeholder: ••••••••
          - text: NewPass123!
      - button "Signing in..." [disabled]:
        - img
        - text: Signing in...
    - paragraph [ref=e16]:
      - text: Don't have an account?
      - link "Sign up" [ref=e17] [cursor=pointer]:
        - /url: /signup
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e23] [cursor=pointer]:
    - img [ref=e24]
  - alert [ref=e27]
```