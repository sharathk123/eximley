# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: Create your account
      - generic [ref=e6]: Get started with Eximley to manage your export/import business.
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Full Name
        - textbox "Full Name" [ref=e11]:
          - /placeholder: John Doe
      - generic [ref=e12]:
        - generic [ref=e13]: Company Name
        - textbox "Company Name" [ref=e14]:
          - /placeholder: Acme Exports Ltd.
      - generic [ref=e15]:
        - generic [ref=e16]: Phone Number
        - textbox "Phone Number" [ref=e17]:
          - /placeholder: +91 98765 43210
      - generic [ref=e18]:
        - generic [ref=e19]: Email
        - textbox "Email" [ref=e20]:
          - /placeholder: john@company.com
      - generic [ref=e21]:
        - generic [ref=e22]: Password
        - textbox "Password" [ref=e23]:
          - /placeholder: ••••••••
      - button "Sign Up" [ref=e24]
    - paragraph [ref=e26]:
      - text: Already have an account?
      - link "Sign in" [ref=e27] [cursor=pointer]:
        - /url: /login
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e33] [cursor=pointer]:
    - img [ref=e34]
  - alert [ref=e37]
```