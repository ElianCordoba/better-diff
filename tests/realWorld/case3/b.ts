& NodeCheckFlags.ContextChecked)) {
  links.flags |= NodeCheckFlags.ContextChecked;
  const signature = firstOrUndefined(getSignaturesOfType(getTypeOfSymbol(getSymbolOfDeclaration(node)), SignatureKind.Call));
  if (!signature) {
    return;
  }
  function isAssignmentToReadonlyEntity(expr: Expression, symbol: Symbol, assignmentKind: AssignmentKind) {
    if (assignmentKind === AssignmentKind.None) {
      // no assigment means it doesn't matter whether the entity is readonly
      return false;
    }