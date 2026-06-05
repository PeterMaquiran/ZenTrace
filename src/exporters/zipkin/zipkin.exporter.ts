import type { Exporter } from '../base'

export class ZipkinExporter implements Exporter {
  constructor(
    private endpoint: string,
    private authToken?: string,
  ) {}

  async export(span: any) {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken ? { Authorization: this.authToken } : {}),
      },
      body: JSON.stringify([span]),
    })

    if (!res.ok) {
      console.error('Zipkin export failed:', await res.text())
    }
  }
}
