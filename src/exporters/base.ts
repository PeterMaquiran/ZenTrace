export interface Exporter {
  export(span: any): Promise<void>
}
