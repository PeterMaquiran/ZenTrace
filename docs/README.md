# 🚀 DevTrace — See What Your Code _Actually_ Does

> A zero-config JavaScript tracing debugger that shows function calls, arguments, and async flow in real time.

---

## ✨ Why DevTrace?

Debugging JavaScript is painful when:

- You don’t know where a function was called from
- Async code becomes spaghetti
- Performance issues are invisible
- You’re stuck adding `console.log` everywhere

**DevTrace fixes this.**

It lets you **see your code execution as a trace**, not guess it.

---

## ⚡ What You Get

- 🌳 **Function call tree** (parent → children)
- ⏱️ **Execution timing** (find slow code instantly)
- 🧠 **Arguments & results inspection**
- 🔗 **Async flow visualization**
- ❌ **Error tracing with full context**
- ⚡ **Zero config — works in seconds**

---

## 🔥 Example

### Your code

```ts
import { trace } from 'devtrace'

class UserService {
  @trace()
  async getUser(id: string) {
    const user = await this.fetchUser(id)
    return this.validateUser(user)
  }

  @trace()
  async fetchUser(id: string) {
    return { id, name: 'Peter' }
  }

  @trace()
  async validateUser(user: any) {
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
npm install devtrace
```

---

## ⚡ Quick Start

```ts
import { trace } from "devtrace"

@trace()
async function checkout(userId: string) {
  const user = await getUser(userId)
  const cart = await getCart(user.id)
  return processPayment(cart)
}
```

Run your app and open the DevTrace UI.

---

## 🖥️ UI Preview

- Trace list
- Call tree
- Timeline (waterfall view)
- Argument inspector

👉 Instantly understand what your code is doing.

---

## 🧠 How It Works

DevTrace:

1. Wraps your functions with a decorator
2. Captures:
   - arguments
   - execution time
   - errors

3. Propagates context across async calls
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

### 🔗 Context propagation

DevTrace automatically links function calls into a single trace:

```ts
@trace()
async function A() {
  await B()
}

@trace()
async function B() {}
```

👉 A → B will be connected in the same trace.

---

### 🧠 Manual trace propagation

For advanced use cases (APIs, services, boundaries), you can explicitly pass the trace context:

```ts
@trace()
async function A(traceCtx?: TraceContext) {
  await B(traceCtx)
}

@trace()
async function B(traceCtx?: TraceContext) {}
```

#### ⚙️ How it works

- DevTrace injects the current `traceCtx` as the **last argument**
- If a context is already provided, it is reused
- All calls remain part of the **same trace tree**

👉 This enables **cross-layer and cross-service tracing**

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
- [ ] Async context engine (AsyncLocalStorage)
- [ ] Express / Next.js plugins
- [ ] OpenTelemetry export

---

## 🤝 Philosophy

DevTrace is not a replacement for production observability tools.

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
