type LineNumber = number;

export class AlignmentTable {
  a: LineNumber[] = []
  b: LineNumber[] = []

  add(side: 'a' | 'b', line: LineNumber) {
    if (side === 'a') {
      this.a.push(line)
    } else {
      this.b.push(line)
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