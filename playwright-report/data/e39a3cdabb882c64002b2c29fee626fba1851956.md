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
      - button "Sign In" [ref=e15]
    - paragraph [ref=e17]:
      - text: Don't have an account?
      - link "Sign up" [ref=e18] [cursor=pointer]:
        - /url: /signup
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e24] [cursor=pointer]:
    - generic [ref=e27]:
      - text: Rendering
      - generic [ref=e28]:
        - generic [ref=e29]: .
        - generic [ref=e30]: .
        - generic [ref=e31]: .
  - alert [ref=e32]
```