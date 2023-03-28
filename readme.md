## VSCode extension investigation

- Views & Walkthoughs (https://code.visualstudio.com/api/ux-guidelines/overview)
- Extensionq que tiene un diff lateral como quiero (https://github.com/fabiospampinato/vscode-diff)
- Esta tambien (https://github.com/huizhougit/githd)
- Lista de ejemplos de extensions (https://github.com/microsoft/vscode-extension-samples)

## Profiling

```
r profile
r viewProfile pprof-time-96522.pb.gz
```

## Bench

```sh
time git diff ./internal/diff/midA.ts ./internal/diff/midB.ts > /dev/null
time git diff --patience ./internal/diff/midA.ts ./internal/diff/midB.ts > /dev/null
```
