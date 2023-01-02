type LineNumber = number;
type ExtraLinesBellow = number;

export class AlignmentTable {
  a: Record<LineNumber, ExtraLinesBellow> = {}
  b: Record<LineNumber, ExtraLinesBellow> = {}

  add(side: 'a' | 'b', line: LineNumber, newLines: number) {
    const _side = side === 'a' ? this.a : this.b
    const currentValue = _side[line] || 0

    if (side === 'a') {
      this.a[line] = currentValue + newLines
    } else {
      this.b[line] = currentValue + newLines
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