import ts, { SourceFile } from "typescript";

export function getSourceFile(source: string): SourceFile {
  return ts.createSourceFile(
    "source.ts",
    source,
    ts.ScriptTarget.ESNext,
    true,
  );
}

// All the bellow defined functions are wrappers of TS functions. This is because the underling TS is marked as internal thus there is no type information available

// An array of the positions (of characters) at which the lines in the source code start, for example:
// [0, 1, 5, 10] means that the first line start at 0 and ends at 1 (non inclusive), next one start at 1 and ends at 5 and so on.
export function getLineMap(source: string): number[] {
  const sourceFile = getSourceFile(source);
  return (ts as any).getLineStarts(sourceFile);
}

// Get the line number (1-indexed) of a given character
export function getLineNumber(sourceFile: ts.SourceFile, pos: number) {
  return (ts as any).getLineAndCharacterOfPosition(sourceFile, pos).line + 1;
}

export function getIfNodeCanBeMatchedAlone(kind: number) {
  const isLiteral = kind >= ts.SyntaxKind.FirstLiteralToken && kind <= ts.SyntaxKind.LastLiteralToken;
  const isIdentifier = kind === ts.SyntaxKind.Identifier || kind === ts.SyntaxKind.PrivateIdentifier;
  const isTemplate = kind === ts.SyntaxKind.FirstTemplateToken || kind === ts.SyntaxKind.LastTemplateToken;
  const other = kind === ts.SyntaxKind.DebuggerKeyword;

  if (isLiteral || isIdentifier || isTemplate || other) {
    return true;
  } else {
    return false;
  }
}
