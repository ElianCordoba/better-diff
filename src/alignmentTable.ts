export class AlignmentTable {
  // We store the line numbers where we will insert lines, on each side independently.
  a: Set<number> = new Set()
  b: Set<number> = new Set()

  add(side: 'a' | 'b', line: number) {
    if (side === 'a') {
      this.a.add(line)
    } else {
      this.b.add(line)
    }
  }

  print() {
    console.log('A alignment table');
    console.table(this.a)
    console.log('\n');

    console.log('B alignment table');
    console.table(this.b)
    console.log('\n');
  }
}