## VSCode extension investigation

- Views & Walkthoughs (https://code.visualstudio.com/api/ux-guidelines/overview)
- Extensionq que tiene un diff lateral como quiero (https://github.com/fabiospampinato/vscode-diff)
- Esta tambien (https://github.com/huizhougit/githd)
- Lista de ejemplos de extensions (https://github.com/microsoft/vscode-extension-samples)

## Profiling

```
pprof-it ./dist/scripts/test.js
pprof -http=: pprof-time-XXX
```

## Bench

```sh
time git diff ./internal/diff/midA.ts ./internal/diff/midB.ts > /dev/null
```