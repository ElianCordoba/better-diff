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

  getOffset(side: 'a' | 'b', line: number) {
    const _side = side === 'a' ? this.a : this.b

    let offset = 0;
    for (const lineWithAlignment of _side) {
      if (lineWithAlignment <= line) {
        offset++
      } else {
        break
      }
    }
    return offset
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