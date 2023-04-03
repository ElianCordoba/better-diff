function isNotOverload(declaration: Declaration): boolean {
  return (declaration.kind !== SyntaxKind.FunctionDeclaration && declaration.kind !== SyntaxKind.MethodDeclaration) ||
    !!(declaration as FunctionDeclaration).body;
}

/** @internal */
export function signatureHasLiteralTypes(s: Signature) {
  return !!(s.flags & SignatureFlags.HasLiteralTypes);
}