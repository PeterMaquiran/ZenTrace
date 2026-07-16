# 🚀 ZenTrace — See What Your Code _Actually_ Does

> A JavaScript tracing debugger that shows function calls, arguments, and async flow in real time.

---

## ✨ Why ZenTrace?

Debugging JavaScript is painful when:

- You don’t know where a function was called from
- Async code becomes spaghetti
- Performance issues are invisible
- You’re stuck adding `console.log` everywhere

**ZenTrace fixes this.**

It lets you **see your code execution as a trace**, not guess it.

---

## ⚡ What You Get

- 🌳 **Function call tree** (parent → children)
- ⏱️ **Execution timing** (find slow code instantly)
- 🧠 **Arguments & results inspection**
- 🔗 **Async flow visualization**
- ❌ **Error tracing with full context**
- ⚡ **Explicit parent spans for predictable trace trees**

---

## 🔥 Example

### Your code

```ts
import { Span, trace } from 'zentrace'

class UserService {
  @trace()
  async getUser(id: string, span?: Span) {
    const user = await this.fetchUser(id, span!)
    return this.validateUser(user, span!)
  }

  @trace()
  async fetchUser(id: string, span: Span) {
    return { id, name: 'Peter' }
  }

  @trace()
  async validateUser(user: { id: string; name: string }, span: Span) {
    if (!user) throw new Error('Invalid user')
    return user
  }
}
```

---

### What you see

```
getUser (120ms)
 ├── fetchUser (40ms)
 └── validateUser (80ms)
```

👉 With full arguments, results, and timing.

---

## 🚀 Installation

```bash
npm install zentrace
```

---

## ⚡ Quick Start

```ts
import { Span, trace } from 'zentrace'

class CheckoutService {
  @trace()
  async checkout(userId: string, span?: Span) {
    const user = await this.getUser(userId, span!)
    return this.processPayment(user, span!)
  }

  @trace()
  async getUser(userId: string, span: Span) {
    return { id: userId }
  }

  @trace()
  async processPayment(user: { id: string }, span: Span) {
    return { userId: user.id, paid: true }
  }
}
```

Run your app and open the ZenTrace UI.

---

## 🖥️ UI Preview

- Trace list
- Call tree
- Timeline (waterfall view)
- Argument inspector

👉 Instantly understand what your code is doing.

---

## 🧠 How It Works

ZenTrace:

1. Wraps your functions with a decorator
2. Captures:
   - arguments
   - execution time
   - errors

3. Links calls when a parent `Span` is passed explicitly
4. Builds a trace tree
5. Renders it in a visual UI

---

## 🎯 Use Cases

### 🐛 Debugging complex bugs

See exactly how data flows through your code.

### ⚡ Performance analysis

Find slow functions instantly.

### 🔄 Async debugging

Understand nested promises and awaits.

### 📚 Learning codebases

Visualize execution instead of reading blindly.

### 🧪 Testing

Trace failing tests and inspect inputs.

---

## 🧩 Advanced

### 🔗 Trace propagation

Pass the parent `Span` as the last argument whenever a traced call should be a
child of another span:

```ts
class Service {
  @trace()
  async A(span?: Span) {
    await this.B(span!)
  }

  @trace()
  async B(span: Span) {}
}
```

#### ⚙️ How it works

- `@trace()` supplies the new span as the decorated method's last argument.
- Passing that span to another traced method makes the new span its child.
- Omitting the parent span starts a separate root trace.

Explicit propagation keeps parentage predictable across async and concurrent
work.

---

### 🧪 Argument control

```ts
@trace({ logArgs: true })
```

---

## ⚠️ Performance Notes

- Argument logging is **opt-in**
- Designed for **development use**
- Minimal overhead when disabled

---

## 🛣️ Roadmap

- [ ] Timeline visualization (waterfall)
- [ ] Function replay
- [ ] Express / Next.js plugins
- [ ] OpenTelemetry export

---

## 🤝 Philosophy

ZenTrace is not a replacement for production observability tools.

It’s built for:

> **Developers who want to understand their code instantly.**

---

## 💡 Inspiration

Built with ideas from distributed tracing systems, but designed for **local debugging and developer experience first**.

---

## 📦 Status

Early stage — feedback welcome!

---

## ⭐ Contributing

PRs and ideas are welcome. Let’s make debugging enjoyable.

---

## 🧠 Final Thought

Stop guessing what your code is doing.

**See it.**
