# Product summary

The **COMP Department Inventory Borrowing System** is a web-based system (PC + mobile) that manages departmental inventory (including computers and their components), supports **borrow request → approval → assignment → pickup → return**, and keeps **status, location, purchase, warranty, and audit logs** clear and searchable.

---

---

### System context

```mermaid
flowchart LR
  U[User] -->|Borrow request / search| SYS[Inventory Borrowing System]
  OP[Operator] -->|Approve / assign / pickup / return| SYS
  AD[Admin] -->|All Operator actions + item management| SYS

  SYS -->|Daily request summary| EMAIL[Email Notification]
  SYS -->|Export / Import| XLS[Excel Files]
```