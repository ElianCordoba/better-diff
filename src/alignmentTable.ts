type LineNumber = number;

export class AlignmentTable {
  a: Record<LineNumber, boolean> = {}
  b: Record<LineNumber, boolean> = {}

  add(side: 'a' | 'b', line: LineNumber) {
    if (side === 'a') {
      this.a[line] = true
    } else {
      this.b[line] = true
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