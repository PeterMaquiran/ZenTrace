export class MockExporter {
  spans: any[] = []

  async export(span: any) {
    this.spans.push(span)
  }
}
