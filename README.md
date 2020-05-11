A small package for building custom multipurpose routers, similar to [express.js](https://expressjs.com/).

# Quick Start

```javascript

import { router } from "router-basic"

const testRouter = router({
    matches: (str, req) => str === request.endpoint
    response: {
        log: console.log
    }
})

const app = testRouter()

app.handle('hello-world', (req, res) => {
    res.log('Found the hello world endpoint!')
})

app.handle('goodbye-world', (req, res) => {
    res.log('Looks like we\'re leaving, huh...')
})

app.emit({ endpoint: 'hello-world' })
// Found the hello world endpoint!

app.emit({ endpoint: 'goodbye-world' })
// Looks like we're leaving, huh...

```
