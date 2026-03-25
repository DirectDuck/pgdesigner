import type { IRpcError, RpcParams } from './rpc'

export class ApiRpcError extends Error {
  method: string
  params: RpcParams
  code: number | null
  data: unknown

  constructor({ method, params, error }: { method: string; params: RpcParams; error: IRpcError }) {
    super(error.message || `RPC error: ${method}`)
    this.name = 'ApiRpcError'
    this.method = method
    this.params = params
    this.code = error.code
    this.data = error.data
  }
}

export class ApiConnectionError extends Error {
  event: object

  constructor(event: unknown) {
    super('API Connection Error')
    this.name = 'ApiConnectionError'
    this.event = event as object
  }
}
